/* 8 GATES 3D : TRACK & FIELD
   Four events on one stadium: 100M DASH, LONG JUMP, JAVELIN, 110M HURDLES.
   Standalone page or WORLD MODE (opts.world = { renderer, camera, parent }). */
import * as THREE from '../../vendor/three/three.module.js';
import * as R from './trackfield-rules.js';
import { createAudio } from './trackfield-audio.js';

export const GAME = { key: 'trackField', name: 'TRACK & FIELD', maxPlayers: 4 };

const M = R.M;
const DEG = Math.PI / 180;
const INK = '#1a1626', FUR = '#e8692a', CREAM = '#fff4e2';

/* ---------- layout (local units, origin = centre, y = 0 ground, +z = player side) ---------- */
const LANE_Z = [1.5, -1.5, 4.5, -4.5];
const FINISH_X = 70;
const TRACK_X0 = -92, TRACK_X1 = 82, TRACK_HALF = 6.2;
const LJ_Z = -16, BOARD_X = 10, LJ_RUN = 40, PIT_X0 = BOARD_X + 1.4, PIT_X1 = BOARD_X + 10.2 * M;
const JV_Z = -34, FOUL_X = -36, JV_RUN = 30, SECTOR_LEN = 112 * M;
const HURDLE_H = 1.15, HURDLE_GU = 30, HURDLE_VY = 9.5;
const FOX_SCALE = 0.9;
const raceStartX = (ev) => FINISH_X - ev.dist * M;

/* ---------- toon helpers ---------- */
function gradMap() {
  const t = new THREE.DataTexture(new Uint8Array([95, 175, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
const _olCache = new Map();
function outlineMat(th) {
  if (_olCache.has(th)) return _olCache.get(th);
  const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n transformed += normalize( normal ) * ' + th.toFixed(4) + ';');
  };
  m.customProgramCacheKey = () => 'tf-outline-' + th;
  _olCache.set(th, m);
  return m;
}
function mx(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
}
/* merge [{ g, m, c }] into one non-indexed geometry with vertex colours */
function merge(parts) {
  const list = parts.map((p) => {
    const g = p.g.index ? p.g.toNonIndexed() : p.g.clone();
    if (p.m) g.applyMatrix4(p.m);
    if (!g.attributes.normal) g.computeVertexNormals();
    return [g, new THREE.Color(p.c)];
  });
  let n = 0; list.forEach(([g]) => { n += g.attributes.position.count; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  list.forEach(([g, c]) => {
    const cnt = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    for (let i = 0; i < cnt; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
    o += cnt; g.dispose();
  });
  parts.forEach((p) => p.g.dispose());
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}
const smooth = (cur, goal, k) => cur + (goal - cur) * k;

/* =================================================================== */
export async function createTrackField({ container, onState = () => {}, opts = {} } = {}) {
  const world = opts.world || null;
  const touch = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
  const GRAD = gradMap();
  const disposables = [GRAD];

  /* ---------- renderer / scene ---------- */
  let renderer;
  if (world) renderer = world.renderer;
  else {
    renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const c = renderer.domElement;
    c.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;-webkit-tap-highlight-color:transparent;';
    container.appendChild(c);
  }
  const root = new THREE.Group(); root.name = 'trackField';
  const envScene = new THREE.Scene();           /* lights, sky, stands: thrown away in world mode */
  let scene = null;
  if (world) world.parent.add(root);
  else {
    scene = envScene; scene.add(root);
    scene.background = new THREE.Color('#9fdcff');
    scene.fog = new THREE.Fog('#9fdcff', 170, 420);
  }

  const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 900);
  const wcam = new THREE.PerspectiveCamera(42, 1, 0.3, 900);
  const _q = new THREE.Quaternion();

  /* ---------- materials ---------- */
  const mats = new Map();
  function toon(hex) {
    if (!mats.has(hex)) { const m = new THREE.MeshToonMaterial({ color: hex, gradientMap: GRAD }); mats.set(hex, m); disposables.push(m); }
    return mats.get(hex);
  }
  const toonVC = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GRAD }); disposables.push(toonVC);
  function mk(geo, mat, outline = 0.035) {
    const m = new THREE.Mesh(geo, mat);
    if (outline) m.add(new THREE.Mesh(geo, outlineMat(outline)));
    disposables.push(geo);
    return m;
  }

  /* ---------- environment (standalone only gets rendered) ---------- */
  envScene.add(new THREE.HemisphereLight('#dff4ff', '#4f6a3a', 1.25));
  const sun = new THREE.DirectionalLight('#ffffff', 1.9); sun.position.set(40, 90, 60); envScene.add(sun);
  {
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(700, 420), toon('#58a447'));
    grass.rotation.x = -Math.PI / 2; grass.position.set(10, -0.02, -40); envScene.add(grass); disposables.push(grass.geometry);
    /* stands behind the field, facing the camera */
    const parts = [];
    for (let i = 0; i < 7; i++) {
      parts.push({ g: new THREE.BoxGeometry(250, 1.4, 2.6), m: mx(10, (i + 1) * 0.7, -74 - i * 2.6, 0, 0, 0, 1, i + 1, 1), c: i % 2 ? '#d8d0c0' : '#c4baa8' });
    }
    parts.push({ g: new THREE.BoxGeometry(250, 16, 1.5), m: mx(10, 8, -93), c: '#3a3836' });
    parts.push({ g: new THREE.BoxGeometry(250, 1.2, 22), m: mx(10, 16.5, -84), c: '#ec3013' });
    for (let k = 0; k < 6; k++) parts.push({ g: new THREE.BoxGeometry(0.8, 16, 0.8), m: mx(-110 + k * 48, 8, -74), c: '#3a3836' });
    const stands = mk(merge(parts), toonVC, 0.06); envScene.add(stands);
  }
  /* crowd: instanced fox heads on the tiers */
  const CROWD_N = touch ? 160 : 280;
  const crowdGeo = merge([
    { g: new THREE.SphereGeometry(0.55, 8, 6), m: mx(0, 0.55, 0), c: '#ffffff' },
    { g: new THREE.ConeGeometry(0.2, 0.45, 5), m: mx(-0.3, 1.1, 0, 0, 0, 0.3), c: '#ffffff' },
    { g: new THREE.ConeGeometry(0.2, 0.45, 5), m: mx(0.3, 1.1, 0, 0, 0, -0.3), c: '#ffffff' },
  ]);
  disposables.push(crowdGeo);
  const crowd = new THREE.InstancedMesh(crowdGeo, toonVC, CROWD_N);
  const crowdBase = [];
  {
    const pal = ['#e8692a', '#ec3013', '#ffd23a', '#2f6fd6', '#16a3a0', '#7b4fd6', '#ffffff', '#3fae3a', '#e8692a'];
    const c = new THREE.Color(), d = new THREE.Object3D();
    for (let i = 0; i < CROWD_N; i++) {
      const tier = i % 6, x = -105 + Math.random() * 230;
      const y = (tier + 1) * 1.4, z = -74 - tier * 2.6;
      crowdBase.push([x, y, z, Math.random() * 6.28]);
      d.position.set(x, y, z); d.updateMatrix(); crowd.setMatrixAt(i, d.matrix);
      crowd.setColorAt(i, c.set(pal[i % pal.length]));
    }
  }
  envScene.add(crowd);

  /* ---------- playable stadium (goes into the group) ---------- */
  function canvasTex(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    disposables.push(t);
    return t;
  }
  {
    /* track straight */
    const W = 2048, H = 160, span = TRACK_X1 - TRACK_X0;
    const U = (x) => ((x - TRACK_X0) / span) * W, V = (z) => ((z + TRACK_HALF) / (TRACK_HALF * 2)) * H;
    const tex = canvasTex(W, H, (g) => {
      g.fillStyle = '#c94a2c'; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(0,0,0,0.06)'; for (let i = 0; i < 400; i++) g.fillRect(Math.random() * W, Math.random() * H, 3, 2);
      g.fillStyle = '#ffffff';
      [-6, -3, 0, 3, 6].forEach((z) => g.fillRect(0, V(z) - 1.5, W, 3));
      const sx100 = FINISH_X - 100 * M, sx110 = FINISH_X - 110 * M;
      g.fillRect(U(sx100) - 2, V(-6), 4, V(6) - V(-6));
      g.fillRect(U(sx110) - 2, V(-6), 4, V(6) - V(-6));
      /* finish: checker */
      const fx = U(FINISH_X);
      for (let r = 0; r < 24; r++) for (let k = 0; k < 2; k++) {
        g.fillStyle = (r + k) % 2 ? '#1a1626' : '#ffffff';
        g.fillRect(fx - 6 + k * 6, V(-6) + (r * (V(6) - V(-6))) / 24, 6, (V(6) - V(-6)) / 24 + 1);
      }
      /* hurdle marks */
      g.fillStyle = '#ffd23a';
      R.HURDLES.forEach((m) => [-4.5, -1.5, 1.5, 4.5].forEach((z) => {
        const x = U(sx110 + m * M); g.fillRect(x - 1.5, V(z - 1.3), 3, 5); g.fillRect(x - 1.5, V(z + 1.3) - 5, 3, 5);
      }));
      /* lane numbers */
      g.font = 'bold 24px Archivo, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffffff';
      [[-4.5, '1'], [-1.5, '2'], [1.5, '3'], [4.5, '4']].forEach(([z, s]) => { g.fillText(s, U(sx110) - 18, V(z)); g.fillText(s, U(FINISH_X) + 26, V(z)); });
    });
    const track = new THREE.Mesh(new THREE.PlaneGeometry(span, TRACK_HALF * 2), new THREE.MeshToonMaterial({ map: tex, gradientMap: GRAD }));
    disposables.push(track.geometry, track.material);
    track.rotation.x = -Math.PI / 2; track.position.set((TRACK_X0 + TRACK_X1) / 2, 0.05, 0);
    root.add(track);
    /* curbs */
    const curb = mk(merge([
      { g: new THREE.BoxGeometry(span, 0.12, 0.25), m: mx((TRACK_X0 + TRACK_X1) / 2, 0.06, TRACK_HALF + 0.12), c: '#ffffff' },
      { g: new THREE.BoxGeometry(span, 0.12, 0.25), m: mx((TRACK_X0 + TRACK_X1) / 2, 0.06, -TRACK_HALF - 0.12), c: '#ffffff' },
    ]), toonVC, 0.03);
    root.add(curb);
  }
  {
    /* long jump: runway, board, pit, metre ticks */
    const rx0 = BOARD_X - LJ_RUN * M - 3, parts = [
      { g: new THREE.BoxGeometry(BOARD_X - rx0, 0.06, 2.4), m: mx((BOARD_X + rx0) / 2, 0.03, LJ_Z), c: '#c94a2c' },
      { g: new THREE.BoxGeometry(0.3, 0.08, 2.4), m: mx(BOARD_X - 0.15, 0.04, LJ_Z), c: '#ffffff' },
      { g: new THREE.BoxGeometry(0.12, 0.085, 2.4), m: mx(BOARD_X + 0.06, 0.042, LJ_Z), c: '#ffd23a' },
      { g: new THREE.BoxGeometry(1.4, 0.06, 2.4), m: mx(BOARD_X + 0.7, 0.03, LJ_Z), c: '#c94a2c' },
      { g: new THREE.BoxGeometry(PIT_X1 - PIT_X0, 0.1, 3.6), m: mx((PIT_X0 + PIT_X1) / 2, 0.05, LJ_Z), c: '#ecd08a' },
      { g: new THREE.BoxGeometry(PIT_X1 - PIT_X0 + 0.5, 0.14, 0.25), m: mx((PIT_X0 + PIT_X1) / 2, 0.07, LJ_Z + 1.92), c: '#ffffff' },
      { g: new THREE.BoxGeometry(PIT_X1 - PIT_X0 + 0.5, 0.14, 0.25), m: mx((PIT_X0 + PIT_X1) / 2, 0.07, LJ_Z - 1.92), c: '#ffffff' },
      { g: new THREE.BoxGeometry(0.25, 0.14, 4.1), m: mx(PIT_X1 + 0.12, 0.07, LJ_Z), c: '#ffffff' },
      { g: new THREE.BoxGeometry(BOARD_X - rx0 + 12, 0.03, 9), m: mx((BOARD_X + rx0) / 2 + 6, 0.015, LJ_Z), c: '#4e9a3e' },
    ];
    for (let m = 2; m <= 10; m++) parts.push({ g: new THREE.BoxGeometry(0.1, 0.15, 0.5), m: mx(BOARD_X + m * M, 0.08, LJ_Z + 2.2), c: m % 2 ? '#ffffff' : '#ffd23a' });
    root.add(mk(merge(parts), toonVC, 0));
  }
  {
    /* javelin: runway + foul line + sector plane with arcs */
    const rx0 = FOUL_X - JV_RUN * M - 4;
    root.add(mk(merge([
      { g: new THREE.BoxGeometry(FOUL_X - rx0, 0.06, 4), m: mx((FOUL_X + rx0) / 2, 0.03, JV_Z), c: '#c94a2c' },
      { g: new THREE.BoxGeometry(0.22, 0.08, 4.4), m: mx(FOUL_X, 0.04, JV_Z), c: '#ffffff' },
    ]), toonVC, 0));
    const len = SECTOR_LEN + 6, half = 30, W = 1024, H = 400;
    const ax = FOUL_X - 8;                          /* sector apex */
    const U = (x) => ((x - FOUL_X) / len) * W, V = (z) => ((z - (JV_Z - half)) / (half * 2)) * H;
    const tex = canvasTex(W, H, (g) => {
      g.fillStyle = '#5aa848'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#62b150' : '#56a244'; g.fillRect((i * W) / 16, 0, W / 16 + 1, H); }
      const t = Math.tan(10 * DEG);
      g.strokeStyle = '#ffffff'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(U(FOUL_X), V(JV_Z - (FOUL_X - ax) * t)); g.lineTo(U(FOUL_X + len), V(JV_Z - (FOUL_X + len - ax) * t));
      g.moveTo(U(FOUL_X), V(JV_Z + (FOUL_X - ax) * t)); g.lineTo(U(FOUL_X + len), V(JV_Z + (FOUL_X + len - ax) * t)); g.stroke();
      g.font = 'bold 22px Archivo, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let m = 10; m <= 110; m += 10) {
        const x = FOUL_X + m * M, hw = (x - ax) * t;
        g.strokeStyle = m % 50 ? 'rgba(255,255,255,0.75)' : '#ffd23a'; g.lineWidth = m % 50 ? 2 : 3;
        g.beginPath(); g.moveTo(U(x), V(JV_Z - hw)); g.lineTo(U(x), V(JV_Z + hw)); g.stroke();
        g.fillStyle = '#ffffff'; g.fillText(String(m), U(x), V(JV_Z + hw) + 16);
      }
    });
    const sector = new THREE.Mesh(new THREE.PlaneGeometry(len, half * 2), new THREE.MeshToonMaterial({ map: tex, gradientMap: GRAD }));
    disposables.push(sector.geometry, sector.material);
    sector.rotation.x = -Math.PI / 2; sector.position.set(FOUL_X + len / 2, 0.035, JV_Z);
    root.add(sector);
  }
  /* hurdles: 4 lanes x 10, instanced */
  const hurdleGeo = merge([
    { g: new THREE.BoxGeometry(0.1, 0.24, 0.8), m: mx(0, HURDLE_H - 0.12, -0.8), c: '#ffffff' },
    { g: new THREE.BoxGeometry(0.1, 0.24, 0.8), m: mx(0, HURDLE_H - 0.12, 0), c: INK },
    { g: new THREE.BoxGeometry(0.1, 0.24, 0.8), m: mx(0, HURDLE_H - 0.12, 0.8), c: '#ffffff' },
    { g: new THREE.BoxGeometry(0.09, HURDLE_H, 0.09), m: mx(0, HURDLE_H / 2, -1.2), c: '#d8d0c0' },
    { g: new THREE.BoxGeometry(0.09, HURDLE_H, 0.09), m: mx(0, HURDLE_H / 2, 1.2), c: '#d8d0c0' },
    { g: new THREE.BoxGeometry(0.7, 0.07, 0.1), m: mx(-0.3, 0.035, -1.2), c: '#3a3836' },
    { g: new THREE.BoxGeometry(0.7, 0.07, 0.1), m: mx(-0.3, 0.035, 1.2), c: '#3a3836' },
  ]);
  disposables.push(hurdleGeo);
  const HN = 40;
  const hurdles = new THREE.InstancedMesh(hurdleGeo, toonVC, HN);
  const hurdlesOL = new THREE.InstancedMesh(hurdleGeo, outlineMat(0.03), HN);
  const hurdleFall = new Float32Array(HN), hurdleGoal = new Float32Array(HN);
  root.add(hurdles, hurdlesOL);
  function placeHurdles() {
    const d = new THREE.Object3D(), sx = FINISH_X - 110 * M;
    for (let l = 0; l < 4; l++) for (let k = 0; k < 10; k++) {
      const i = l * 10 + k;
      d.position.set(sx + R.HURDLES[k] * M, 0, LANE_Z[l]); d.rotation.set(0, 0, -hurdleFall[i]); d.updateMatrix();
      hurdles.setMatrixAt(i, d.matrix); hurdlesOL.setMatrixAt(i, d.matrix);
    }
    hurdles.instanceMatrix.needsUpdate = true; hurdlesOL.instanceMatrix.needsUpdate = true;
  }
  function resetHurdles() { hurdleFall.fill(0); hurdleGoal.fill(0); placeHurdles(); }
  resetHurdles();

  /* javelin, aim arrow, sand puff, landing peg, blob shadows */
  const javelin = new THREE.Group();
  javelin.add(mk(merge([
    { g: new THREE.CylinderGeometry(0.045, 0.045, 3.6, 6), m: mx(0, 0, 0, 0, 0, Math.PI / 2), c: '#d8d0c0' },
    { g: new THREE.ConeGeometry(0.06, 0.4, 6), m: mx(2.0, 0, 0, 0, 0, -Math.PI / 2), c: '#3a3836' },
    { g: new THREE.CylinderGeometry(0.07, 0.07, 0.4, 6), m: mx(-0.1, 0, 0, 0, 0, Math.PI / 2), c: '#ec3013' },
  ]), toonVC, 0.025));
  javelin.visible = false; root.add(javelin);

  const arrow = new THREE.Group();
  {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.12); shape.lineTo(2.6, -0.12); shape.lineTo(2.6, -0.34); shape.lineTo(3.3, 0); shape.lineTo(2.6, 0.34); shape.lineTo(2.6, 0.12); shape.lineTo(0, 0.12);
    const am = new THREE.MeshBasicMaterial({ color: '#ffd23a', depthTest: false, transparent: true, opacity: 0.95 });
    const a = new THREE.Mesh(new THREE.ShapeGeometry(shape), am); a.renderOrder = 10;
    disposables.push(a.geometry, am);
    arrow.add(a); arrow.visible = false; root.add(arrow);
  }
  const puffMat = new THREE.MeshBasicMaterial({ color: '#f3dda0', transparent: true, opacity: 0, depthWrite: false });
  const puff = new THREE.Mesh(new THREE.RingGeometry(0.4, 1.1, 20), puffMat);
  puff.rotation.x = -Math.PI / 2; puff.visible = false; root.add(puff); disposables.push(puff.geometry, puffMat);
  let puffT = 0;
  const peg = mk(merge([
    { g: new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), m: mx(0, 0.6, 0), c: '#ffffff' },
    { g: new THREE.BoxGeometry(0.05, 0.35, 0.55), m: mx(0, 1.05, 0.3), c: '#ffd23a' },
  ]), toonVC, 0.025);
  peg.visible = false; root.add(peg);
  const shadowMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false });
  const shadowGeo = new THREE.CircleGeometry(0.75, 16); disposables.push(shadowMat, shadowGeo);

  /* ---------- fox adapter ---------- */
  function placeholderFox(def) {
    const [c1, c2, c3] = def.torso;
    const g = new THREE.Group();
    const bodyParts = [
      { g: new THREE.CapsuleGeometry(0.42, 0.5, 4, 10), m: mx(0, 1.6, 0, 0, 0, 0, 1, 1, 0.85), c: c1 },
      { g: new THREE.BoxGeometry(0.5, 0.42, 0.06), m: mx(0, 1.62, 0.36), c: '#ffffff' },
      { g: new THREE.BoxGeometry(0.22, 0.06, 0.07), m: mx(0, 1.68, 0.38), c: INK },
      { g: new THREE.SphereGeometry(0.26, 10, 8), m: mx(0, 1.15, -0.72, -0.45, 0, 0, 1, 1, 2.3), c: FUR },
      { g: new THREE.SphereGeometry(0.17, 8, 6), m: mx(0, 0.86, -1.3), c: CREAM },
    ];
    if (def.outfit === 'vest') bodyParts.push({ g: new THREE.CylinderGeometry(0.45, 0.45, 0.12, 12), m: mx(0, 1.33, 0), c: c2 === '#ffffff' ? '#2f6fd6' : c2 });
    if (def.outfit === 'coat') bodyParts.push({ g: new THREE.CylinderGeometry(0.47, 0.52, 0.5, 12), m: mx(0, 1.22, 0), c: c2 });
    const body = mk(merge(bodyParts), toonVC, 0.035);
    const head = new THREE.Group(); head.position.set(0, 2.12, 0);
    const hp = [
      { g: new THREE.SphereGeometry(0.4, 14, 10), m: mx(0, 0.3, 0), c: FUR },
      { g: new THREE.SphereGeometry(0.27, 12, 8), m: mx(0, 0.18, 0.24, 0, 0, 0, 1.15, 0.75, 1), c: CREAM },
      { g: new THREE.ConeGeometry(0.15, 0.38, 10), m: mx(0, 0.2, 0.5, Math.PI / 2), c: FUR },
      { g: new THREE.SphereGeometry(0.07, 8, 6), m: mx(0, 0.2, 0.7), c: INK },
      { g: new THREE.SphereGeometry(0.065, 8, 6), m: mx(-0.15, 0.4, 0.33), c: def.eyes || INK },
      { g: new THREE.SphereGeometry(0.065, 8, 6), m: mx(0.15, 0.4, 0.33), c: def.eyes || INK },
      { g: new THREE.ConeGeometry(0.15, 0.38, 8), m: mx(-0.22, 0.72, -0.02, 0, 0, 0.3), c: FUR },
      { g: new THREE.ConeGeometry(0.15, 0.38, 8), m: mx(0.22, 0.72, -0.02, 0, 0, -0.3), c: FUR },
      { g: new THREE.ConeGeometry(0.08, 0.2, 6), m: mx(-0.22, 0.68, 0.04, 0, 0, 0.3), c: INK },
      { g: new THREE.ConeGeometry(0.08, 0.2, 6), m: mx(0.22, 0.68, 0.04, 0, 0, -0.3), c: INK },
    ];
    if (def.glasses) hp.push({ g: new THREE.BoxGeometry(0.58, 0.14, 0.07), m: mx(0, 0.41, 0.37), c: INK });
    head.add(mk(merge(hp), toonVC, 0.035));
    const arms = [-1, 1].map((s) => {
      const p = new THREE.Group(); p.position.set(0.53 * s, 1.98, 0);
      const ap = [
        { g: new THREE.CapsuleGeometry(0.13, 0.18, 3, 8), m: mx(0, -0.16, 0), c: c2 },
        { g: new THREE.CapsuleGeometry(0.1, 0.42, 3, 8), m: mx(0, -0.52, 0), c: FUR },
        { g: new THREE.SphereGeometry(0.13, 8, 6), m: mx(0, -0.82, 0), c: FUR },
      ];
      if (def.cane && s > 0) {
        ap.push({ g: new THREE.CylinderGeometry(0.03, 0.03, 1.55, 6), m: mx(0, -1.25, 0.32, -0.42), c: '#ffffff' });
        ap.push({ g: new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6), m: mx(0, -1.92, 0.62, -0.42), c: '#ec3013' });
      }
      p.add(mk(merge(ap), toonVC, 0.03));
      return p;
    });
    const legs = [-1, 1].map((s) => {
      const p = new THREE.Group(); p.position.set(0.22 * s, 1.12, 0);
      p.add(mk(merge([
        { g: new THREE.CapsuleGeometry(0.15, 0.6, 3, 8), m: mx(0, -0.5, 0), c: c3 },
        { g: new THREE.BoxGeometry(0.25, 0.15, 0.44), m: mx(0, -1.02, 0.1), c: '#ffffff' },
        { g: new THREE.BoxGeometry(0.26, 0.05, 0.45), m: mx(0, -1.1, 0.1), c: INK },
      ]), toonVC, 0.03));
      return p;
    });
    g.add(body, head, ...arms, ...legs);
    g.scale.setScalar(FOX_SCALE);
    g.userData.P = { body, head, arms, legs };
    return g;
  }
  function makeFox(def) {
    let fox = null;
    if (opts.kit && typeof opts.kit.makeFox === 'function') {
      try { fox = opts.kit.makeFox({ torso: def.torso, outfit: def.outfit || 'tee', mood: def.mood || 'happy' }); } catch (e) { fox = null; }
      if (fox && fox.userData && fox.userData.P) {
        const P = fox.userData.P;
        if (def.cane && P.arms && P.arms[1]) {
          const cane = mk(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), toon('#ffffff'), 0.02);
          cane.position.set(0, -1.2, 0.3); cane.rotation.x = -0.42; P.arms[1].add(cane);
        }
        if (def.glasses && P.head) {
          const gl = mk(new THREE.BoxGeometry(0.56, 0.13, 0.07), toon(INK), 0);
          gl.position.set(0, 0.4, 0.37); P.head.add(gl);
        }
      } else fox = null;
    }
    if (!fox) fox = placeholderFox(def);
    const inner = new THREE.Group(); inner.add(fox);
    const P = fox.userData.P;
    const rest = {
      body: P.body.rotation.x, head: P.head.rotation.x,
      arms: P.arms.map((a) => a.rotation.x), armsZ: P.arms.map((a) => a.rotation.z),
      legs: P.legs.map((l) => l.rotation.x),
    };
    return { inner, fox, P, rest };
  }
  function makeChair() {
    const g = new THREE.Group();
    g.add(mk(merge([
      { g: new THREE.BoxGeometry(1.05, 0.16, 1.0), m: mx(0, 0.97, 0), c: '#24202e' },
      { g: new THREE.BoxGeometry(1.05, 1.1, 0.14), m: mx(0, 1.5, -0.52, -0.12), c: '#24202e' },
      { g: new THREE.BoxGeometry(0.1, 0.38, 1.0), m: mx(-0.58, 1.12, 0.02), c: '#3a3836' },
      { g: new THREE.BoxGeometry(0.1, 0.38, 1.0), m: mx(0.58, 1.12, 0.02), c: '#3a3836' },
      { g: new THREE.CylinderGeometry(0.42, 0.3, 0.42, 10), m: mx(0, 0.66, 0), c: '#3a3836' },
      { g: new THREE.BoxGeometry(0.8, 0.08, 0.5), m: mx(0, 0.62, 0.55), c: '#ec3013' },
    ]), toonVC, 0.035));
    const glowM = new THREE.MeshBasicMaterial({ color: '#4ff0ff' }); disposables.push(glowM);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.07, 6, 20), glowM); disposables.push(ring.geometry);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.4; g.add(ring);
    return g;
  }

  /* ---------- state ---------- */
  const S = {
    mode: ['cpu', 'local', 'demo'].includes(opts.mode) ? opts.mode : 'cpu',
    level: Number.isInteger(opts.level) ? R.clamp(opts.level, 0, 2) : 1,
    players: R.clamp(opts.players || 2, 2, 4),
    eventSel: opts.event || 'meet',
    sound: true, music: !world,
    athletes: [], events: [], ei: 0, ev: null,
    phase: 'idle', pt: 0, raceT: 0, setDur: 1.2,
    heats: [], heat: 0, inHeat: [],
    order: [], round: 0, turn: 0, cur: null, plan: null, lastHuman: null,
    marks: {}, attemptMark: null, foul: false, landX: 0,
    jv: { x: 0, y: 0, vx: 0, vy: 0, fly: false, landed: false },
    banner: null, bannerUntil: 0, caption: null, captionUntil: 0, card: null, after: null,
    paused: false, timeScale: 1, lastInput: performance.now(), dirty: true, autoT: 0,
    nextLeader: null,
  };
  const audio = createAudio({ music: S.music });

  /* storage */
  const store = (() => {
    const sv = opts.save;
    const ls = {
      get(k, d) { try { const v = localStorage.getItem('trackField.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
      set(k, v) { try { localStorage.setItem('trackField.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    };
    return {
      get: (k, d) => (sv && sv.stat ? sv.stat('trackField.' + k, d) : ls.get(k, d)),
      set: (k, v) => (sv && sv.setStat ? sv.setStat('trackField.' + k, v) : ls.set(k, v)),
      addGold: (n) => { if (sv && sv.addGold) sv.addGold(n); else ls.set('gold', ls.get('gold', 0) + n); },
    };
  })();

  function rnd() { return Math.random(); }
  function banner(text, sub = '', tone = 'white', dur = 1.4) { S.banner = { text, sub, tone }; S.bannerUntil = performance.now() + dur * 1000; S.dirty = true; }
  function caption(text, dur = 5) { S.caption = text; S.captionUntil = performance.now() + dur * 1000; S.dirty = true; }
  const humans = () => S.athletes.filter((a) => a.human);

  /* ---------- athletes ---------- */
  function clearAthletes() {
    S.athletes.forEach((a) => { root.remove(a.holder); root.remove(a.shadow); });
    S.athletes = [];
  }
  function addAthlete(def, human, slot) {
    const holder = new THREE.Group(); holder.rotation.y = Math.PI / 2;
    const f = makeFox(def);
    holder.add(f.inner);
    let chair = null;
    if (def.chair) { chair = makeChair(); holder.add(chair); f.inner.position.y = 0.21; }
    const shadow = new THREE.Mesh(shadowGeo, shadowMat); shadow.rotation.x = -Math.PI / 2;
    root.add(holder, shadow);
    const a = {
      id: S.athletes.length, name: def.name, color: def.torso[0], human, slot, def,
      skill: def.skill ?? 0.5, title: def.title || '', holder, inner: f.inner, P: f.P, rest: f.rest, chair, shadow,
      x: 0, y: 0, z: 0, v: 0, vy: 0, vxm: 0, vym: 0, rate: 0, phi: 0, lastStep: 0,
      done: false, time: null, fs: 0, dq: false, trace: [], ghost: null, airborne: false,
      angle: 0, angleOn: false, holdT: 0, anim: 'idle', animT: 0, lane: 0,
      pts: 0, golds: 0, medals: [0, 0, 0], seed: rnd() * 6.28, react: 0.2, effort: 0.9, lead: [],
      eventMark: null,
    };
    S.athletes.push(a);
    return a;
  }
  function buildField() {
    clearAthletes();
    if (S.mode === 'demo') {
      addAthlete(R.CAST.HOPE, false); addAthlete(R.CAST.NOBLE, false);
    } else if (S.mode === 'local') {
      for (let i = 0; i < S.players; i++) addAthlete({ ...R.PLAYERS[i], name: 'P' + (i + 1) }, true, i);
    } else {
      addAthlete(R.PLAYERS[0], true, 0);
      R.LEVELS[S.level].rivals.forEach((k) => addAthlete(R.CAST[k], false));
    }
    S.athletes.forEach((a, i) => { a.lane = i; });
  }

  /* ---------- posing ---------- */
  function setLimbs(a, legL, legR, armL, armR, lean = 0, head = 0, armSpread = 0) {
    const P = a.P, r = a.rest;
    P.legs[0].rotation.x = r.legs[0] - legL; P.legs[1].rotation.x = r.legs[1] - legR;
    P.arms[0].rotation.x = r.arms[0] - armL; P.arms[1].rotation.x = r.arms[1] - armR;
    P.arms[0].rotation.z = r.armsZ[0] - armSpread; P.arms[1].rotation.z = r.armsZ[1] + armSpread;
    P.head.rotation.x = r.head - head;
    a.inner.rotation.x = lean;
  }
  function poseAthlete(a, dt) {
    a.animT += dt;
    const sp = R.clamp(a.v / R.VMAX, 0, 1);
    const sitting = !!a.chair;
    let bob = 0;
    const s = Math.sin(a.phi);
    switch (a.anim) {
      case 'crouch':
        if (sitting) setLimbs(a, 1.45, 1.45, 0.9, 0.9, 0.25, -0.2);
        else { setLimbs(a, 1.1, -0.35, 0.75, 0.75, 0.95, -0.6); bob = -0.55; }
        break;
      case 'set':
        if (sitting) setLimbs(a, 1.45, 1.45, 1.2, 1.2, 0.35, -0.1);
        else { setLimbs(a, 0.9, -0.5, 0.65, 0.65, 1.1, -0.5); bob = -0.3; }
        break;
      case 'run': {
        const amp = 0.35 + sp * 0.85;
        if (sitting) setLimbs(a, 1.45, 1.45, 0.6 + s * amp, 0.6 + s * amp, 0.15 + sp * 0.15, -0.1);
        else setLimbs(a, s * amp, -s * amp, -s * amp * 0.9, s * amp * 0.9, 0.08 + sp * 0.22, -0.1);
        bob = sitting ? 0 : Math.abs(Math.cos(a.phi)) * 0.14 * (0.4 + sp);
        break;
      }
      case 'hurdle': setLimbs(a, sitting ? 1.45 : 1.55, sitting ? 1.45 : -0.9, 1.4, -0.4, 0.45, 0.1); break;
      case 'windup': {
        const k = R.clamp(a.angle / 60, 0, 1);
        setLimbs(a, s * 0.6, -s * 0.6, 0.4 + s * 0.3, -0.9 - k * 0.3, -0.1 - k * 0.15, 0.1 + k * 0.3);
        break;
      }
      case 'throw': { const k = R.clamp(a.animT / 0.25, 0, 1); setLimbs(a, 0.5, -0.4, -0.3, -1 + k * 3.6, 0.35 * k, -0.1); break; }
      case 'air': {
        const k = R.clamp(a.animT / 0.5, 0, 1);
        setLimbs(a, sitting ? 1.45 : 0.6 + k * 0.6, sitting ? 1.45 : -0.4 + k * 1.6, 2.6 - k * 1.2, 2.6 - k * 1.2, 0.1 - k * 0.2, 0.2);
        break;
      }
      case 'land': setLimbs(a, sitting ? 1.45 : 1.4, sitting ? 1.45 : 1.4, 1.6, 1.6, 0.6, -0.3); bob = sitting ? 0 : -0.6; break;
      case 'celebrate': {
        const w = Math.sin(a.animT * 9);
        setLimbs(a, sitting ? 1.45 : 0, sitting ? 1.45 : 0, 2.9 + w * 0.15, 2.9 - w * 0.15, -0.05, 0.25, 0.25);
        bob = sitting ? 0 : Math.abs(Math.sin(a.animT * 6)) * 0.35;
        break;
      }
      case 'sad': setLimbs(a, sitting ? 1.45 : 0, sitting ? 1.45 : 0, 0.15, 0.15, 0.25, -0.5); break;
      default: {
        const br = Math.sin(a.animT * 2 + a.seed) * 0.04;
        setLimbs(a, sitting ? 1.45 : 0, sitting ? 1.45 : 0, 0.08 + br, 0.08 - br, 0, br);
      }
    }
    a.inner.position.y = (sitting ? 0.21 : 0) + bob;
    if (a.chair) a.chair.position.y = Math.sin(a.animT * 3 + a.seed) * 0.06 + (a.anim === 'run' ? 0.08 : 0);
    a.holder.position.set(a.x, a.y, a.z);
    a.shadow.position.set(a.x, a.z < -10 ? 0.1 : 0.08, a.z);
    a.shadow.scale.setScalar(Math.max(0.4, 1 - a.y * 0.12));
    a.shadow.visible = a.holder.visible;
  }
  function stride(a, dx) {
    const before = a.phi;
    a.phi += (dx / M) / 2.3 * Math.PI * 2;
    if (Math.floor(before / Math.PI) !== Math.floor(a.phi / Math.PI) && focusAthlete() === a && a.y < 0.05) audio.play('step');
  }

  /* ---------- meet flow ---------- */
  function newMeet() {
    S.card = null; S.paused = false; S.timeScale = 1; S.lastHuman = null;
    buildField();
    S.events = S.eventSel === 'meet' ? R.EVENTS.slice() : [R.eventByKey(S.eventSel)];
    S.ei = 0;
    S.athletes.forEach((a) => { a.pts = 0; a.golds = 0; a.medals = [0, 0, 0]; });
    startEvent();
  }
  function startEvent() {
    S.ev = S.events[S.ei];
    S.marks = {}; S.card = null; S.timeScale = 1;
    S.athletes.forEach((a) => { a.eventMark = null; a.fs = 0; a.dq = false; a.trace = []; a.ghost = null; a.time = null; a.holder.visible = true; });
    peg.visible = false; javelin.visible = false; arrow.visible = false;
    hurdles.visible = hurdlesOL.visible = S.ev.key === 'hurdles';
    resetHurdles();
    if (S.mode === 'demo') caption(R.DEMO[S.ev.key][0], 6);
    if (S.ev.kind === 'race') {
      const hs = humans();
      S.heats = hs.length > 1 ? hs.map((h) => [h]) : [S.athletes.slice()];
      S.heat = 0; startHeat();
    } else {
      S.order = S.athletes.slice(); S.round = 0; S.turn = 0; startAttempt();
    }
    snapNext = true;
  }

  /* ----- races ----- */
  function startHeat() {
    const heat = S.heats[S.heat];
    const ghosts = S.heats.length > 1 ? S.heats.slice(0, S.heat).map((h) => h[0]) : [];
    S.inHeat = heat.concat(ghosts);
    resetHurdles();
    const sx = raceStartX(S.ev);
    S.athletes.forEach((a) => {
      const on = S.inHeat.includes(a);
      a.holder.visible = on;
      a.x = sx - 0.6; a.y = 0; a.z = LANE_Z[a.lane]; a.v = 0; a.rate = 0; a.vy = 0; a.airborne = false; a.done = false; a.phi = 0;
      a.anim = on ? 'crouch' : 'idle';
      a.react = R.aiReaction(a.skill, rnd()); a.effort = R.aiEffort(a.skill);
      a.lead = R.HURDLES.map(() => R.aiHurdleLead(a.skill, rnd()));
      a.ghost = ghosts.includes(a) ? a.trace.slice() : null;
      if (!a.ghost && on) { a.trace = []; a.time = null; }
    });
    const runner = heat[0];
    if (S.heats.length > 1) {
      handoff(runner, S.ev.name + ', HEAT ' + (S.heat + 1) + ' OF ' + S.heats.length, () => toMarks());
    } else toMarks();
  }
  function toMarks() {
    S.phase = 'marks'; S.pt = 0; S.raceT = 0; S.dirty = true;
    S.inHeat.forEach((a) => { if (!a.done) a.anim = a.dq ? 'idle' : 'crouch'; });
    banner('ON YOUR MARKS', S.ev.name, 'white', 1.3); audio.play('beep');
    const h = S.inHeat.find((a) => a.human && !a.ghost);
    if (h && S.mode !== 'demo') caption(S.ev.tip, 4.5);
  }
  function toSet() {
    S.phase = 'set'; S.pt = 0; S.setDur = 0.8 + rnd() * 1.2; S.dirty = true;
    S.inHeat.forEach((a) => { if (!a.dq) a.anim = 'set'; });
    banner('SET', '', 'yellow', 1.0); audio.play('beep');
  }
  function toGo() {
    S.phase = 'race'; S.pt = 0; S.raceT = 0; S.dirty = true;
    banner('GO', '', 'red', 0.8); audio.play('gun');
    if (S.mode === 'demo') caption(R.DEMO[S.ev.key][1], 5);
  }
  function falseStart(a) {
    a.fs++; audio.play('foul');
    if (a.fs >= 2) { a.dq = true; a.time = null; banner('DISQUALIFIED', a.name + ', SECOND FALSE START', 'red', 2); }
    else banner('FALSE START', 'One more and you are out', 'red', 1.8);
    S.phase = 'restart'; S.pt = 0; S.dirty = true;
  }
  function jump(a) {
    if (a.airborne || a.done) return;
    a.airborne = true; a.vy = HURDLE_VY; a.v *= 0.97; a.anim = 'hurdle'; a.animT = 0;
    if (a.human) audio.play('jump');
  }
  function updateRace(dt) {
    S.raceT += dt;
    const ev = S.ev, sx = raceStartX(ev), hurdlesOn = ev.key === 'hurdles';
    let allDone = true;
    S.inHeat.forEach((a) => {
      if (a.dq) { a.anim = 'idle'; return; }
      if (a.ghost) {
        const f = S.raceT * 20, i = Math.floor(f), tr = a.ghost;
        if (i >= tr.length / 2 - 1) {
          a.x = tr[tr.length - 2]; a.y = 0; a.v = 0; a.done = true; a.anim = 'idle';
        } else {
          const k = f - i, nx = smooth(tr[i * 2], tr[i * 2 + 2], k);
          a.v = Math.max(0, (nx - a.x) / Math.max(dt, 1e-4) / M); stride(a, nx - a.x);
          a.x = nx; a.y = smooth(tr[i * 2 + 1], tr[i * 2 + 3], k);
          a.anim = a.y > 0.1 ? 'hurdle' : 'run'; allDone = false;
        }
        return;
      }
      let target;
      if (a.done) { a.v = Math.max(0, a.v - 5 * dt); }
      else {
        if (a.human) { a.rate *= Math.exp(-R.RATE_DECAY * dt); target = Math.max(R.JOG, R.humanTarget(a.rate)); }
        else target = S.raceT < a.react ? 0 : R.VMAX * a.effort * (1 + 0.012 * Math.sin(S.raceT * 2.3 + a.seed));
        a.v += (target - a.v) * Math.min(1, dt * R.accelK(target, a.v));
      }
      const px = a.x, dx = a.v * M * dt;
      a.x += dx; stride(a, dx);
      if (a.airborne) {
        a.vy -= HURDLE_GU * dt; a.y += a.vy * dt;
        if (a.y <= 0) { a.y = 0; a.airborne = false; }
      }
      if (hurdlesOn && !a.done) {
        for (let k = 0; k < 10; k++) {
          const hx = sx + R.HURDLES[k] * M, idx = a.lane * 10 + k;
          if (!a.human && !a.airborne && hx > a.x && hx - a.x < a.lead[k] * M && hx - a.x > 0.5) jump(a);
          if (px < hx && a.x >= hx && hurdleGoal[idx] === 0) {
            if (a.y < HURDLE_H * 0.8) {
              hurdleGoal[idx] = 1.45; a.v *= 0.55; a.rate *= 0.6;
              if (a.human || focusAthlete() === a) { audio.play('hit'); if (a.human) banner('HIT', '', 'red', 0.6); }
            }
          }
        }
      }
      if (!a.done && a.x >= FINISH_X) {
        const frac = dx > 0 ? (a.x - FINISH_X) / dx : 0;
        a.time = S.raceT - frac * dt; a.done = true;
        if (!S.inHeat.some((b) => b !== a && b.done && b.time != null && b.time < a.time)) audio.play('cheer');
        if (a.human) { a.trace.push(a.x, 0); banner(a.time.toFixed(2), a.name, 'yellow', 1.6); }
      }
      if (a.human && !a.done) while (a.trace.length / 2 <= S.raceT * 20) a.trace.push(a.x, a.y);
      if (!a.done) allDone = false;
      a.anim = a.airborne ? 'hurdle' : a.v > 0.3 ? 'run' : 'idle';
    });
    if (allDone || S.raceT > 45) {
      S.inHeat.forEach((a) => { if (!a.done && !a.ghost && !a.dq) { a.time = null; a.done = true; } });
      S.phase = 'raceEnd'; S.pt = 0; S.dirty = true;
      const best = S.inHeat.filter((a) => a.time != null).sort((p, q) => p.time - q.time)[0];
      S.inHeat.forEach((a) => { a.anim = a === best ? 'celebrate' : 'idle'; a.animT = 0; a.v = Math.min(a.v, 3); });
    }
  }
  function endHeat() {
    S.heats[S.heat].forEach((a) => { S.marks[a.id] = a.dq ? null : a.time; });
    S.heat++;
    if (S.heat < S.heats.length) startHeat(); else finishEvent();
  }

  /* ----- field events ----- */
  function zLine() { return S.ev.key === 'long' ? LJ_Z : JV_Z; }
  function runStartX() { return S.ev.key === 'long' ? BOARD_X - LJ_RUN * M : FOUL_X - JV_RUN * M; }
  function startAttempt() {
    const a = S.order[S.turn];
    S.cur = a;
    if (a.human && humans().length > 1 && S.lastHuman !== a) {
      S.lastHuman = a;
      handoff(a, S.ev.name + ', ATTEMPT ' + (S.round + 1) + ' OF ' + S.ev.attempts, beginAttempt);
    } else { if (a.human) S.lastHuman = a; beginAttempt(); }
  }
  function beginAttempt() {
    const a = S.cur, z = zLine(), x0 = runStartX();
    S.timeScale = 1; S.foul = false; S.attemptMark = null;
    let j = 0;
    S.athletes.forEach((b) => {
      b.holder.visible = true; b.y = 0; b.v = 0; b.airborne = false; b.angleOn = false; b.angle = 0;
      if (b === a) { b.x = x0; b.z = z; b.anim = 'idle'; }
      else { b.x = x0 - 3 - j * 2.4; b.z = z - 3.4; b.anim = 'idle'; j++; }
    });
    a.rate = 0; a.phi = 0;
    if (S.ev.key === 'jav') javelin.visible = true;
    S.jv.fly = false; S.jv.landed = false;
    if (!a.human) {
      const p = S.ev.key === 'long' ? R.aiLongJumpPlan(a.skill, rnd(), rnd(), rnd()) : R.aiJavelinPlan(a.skill, rnd(), rnd(), rnd());
      S.plan = p; a.effort = R.aiEffort(a.skill);
    } else S.plan = null;
    S.phase = 'ready'; S.pt = 0; S.dirty = true;
    banner(a.name, 'ATTEMPT ' + (S.round + 1) + ' OF ' + S.ev.attempts, a.human ? 'yellow' : 'white', 1.5);
    if (a.human && S.mode !== 'demo') caption(S.ev.tip, 5);
    else if (S.mode === 'demo') caption(R.DEMO[S.ev.key][S.round % 2], 6);
    snapNext = true;
  }
  function toApproach() { S.phase = 'approach'; S.pt = 0; S.dirty = true; }
  function startHold() {
    const a = S.cur; if (!a) return;
    a.angleOn = true; a.angle = 0; a.holdT = 0;
    S.phase = 'takeoff'; S.pt = 0; S.dirty = true;
    if (a.human) audio.play('tap');
  }
  function release() {
    const a = S.cur; if (!a || S.phase !== 'takeoff') return;
    a.angleOn = false; S.dirty = true;
    if (S.ev.key === 'long') {
      S.foul = a.x > BOARD_X + 0.3 * M;
      const vl = R.longJumpLaunch(a.v, a.angle);
      a.vxm = vl * Math.cos(a.angle * DEG); a.vym = vl * Math.sin(a.angle * DEG);
      a.airborne = true; a.anim = 'air'; a.animT = 0;
      audio.play('jump');
    } else {
      S.foul = a.x > FOUL_X;
      const vl = R.javelinSpeed(a.v);
      S.jv.x = a.x + 0.4; S.jv.y = 2.5; S.jv.vx = vl * Math.cos(a.angle * DEG); S.jv.vy = vl * Math.sin(a.angle * DEG);
      S.jv.fly = true; S.jv.landed = false;
      a.anim = 'throw'; a.animT = 0;
      audio.play('throw');
    }
    S.phase = 'flight'; S.pt = 0;
  }
  function updateApproach(dt) {
    const a = S.cur, ev = S.ev;
    let target;
    if (a.human) { a.rate *= Math.exp(-R.RATE_DECAY * dt); target = Math.max(S.pt > 0.4 ? R.JOG : 0, R.humanTarget(a.rate)); }
    else target = R.VMAX * a.effort;
    a.v += (target - a.v) * Math.min(1, dt * R.accelK(target, a.v));
    const dx = a.v * M * dt; a.x += dx; stride(a, dx);
    a.anim = 'run';
    if (!a.human && S.phase === 'approach' && S.plan) {
      const holdT = S.plan.angle / R.ANGLE_RATE;
      const rx = ev.key === 'long' ? BOARD_X - S.plan.safety * M : FOUL_X - (R.brakeDistance(a.v) + S.plan.margin) * M;
      if (a.x + a.v * M * holdT >= rx) startHold();
    }
    if (ev.key === 'long' && a.x > BOARD_X + 0.6 && S.phase === 'approach') {
      /* ran through: foul */
      S.foul = true; a.vxm = a.v * 0.5; a.vym = 1.2; a.airborne = true; a.anim = 'air'; a.animT = 0;
      S.phase = 'flight'; S.pt = 0; S.dirty = true;
    }
    if (ev.key === 'jav' && a.x > FOUL_X && S.phase === 'approach') javRunFoul(a);
  }
  function javRunFoul(a) {
    S.foul = true; a.angleOn = false; S.phase = 'flight'; S.pt = 0; S.jv.fly = false; S.jv.landed = true; S.dirty = true;
    S.jv.x = a.x; S.jv.y = 0;
  }
  function updateTakeoff(dt) {
    const a = S.cur;
    a.holdT += dt;
    a.angle = Math.min(R.ANGLE_MAX, a.angle + R.ANGLE_RATE * dt);
    a.v *= Math.exp(-0.12 * dt);
    const dx = a.v * M * dt; a.x += dx; stride(a, dx);
    a.anim = S.ev.key === 'jav' ? 'windup' : 'run';
    if (S.ev.key === 'jav' && a.x > FOUL_X) { javRunFoul(a); return; }
    if (!a.human && S.plan && a.angle >= S.plan.angle) release();
    else if (a.angle >= R.ANGLE_MAX) release();
    else if (S.ev.key === 'long' && a.x > BOARD_X + 3) release();
  }
  function updateFlight(dt) {
    const a = S.cur, ev = S.ev;
    if (ev.key === 'long') {
      a.x += a.vxm * M * dt; a.vym -= R.G * dt; a.y += a.vym * M * dt;
      if (a.y <= 0 && a.vym < 0) {
        a.y = 0; a.airborne = false; a.v = 0; a.anim = 'land'; a.animT = 0;
        S.landX = a.x - 0.35;
        S.attemptMark = S.foul ? null : Math.max(0, (S.landX - BOARD_X) / M);
        if (S.landX > PIT_X0 - 0.5) { puff.position.set(a.x, 0.1, a.z); puff.visible = true; puffT = 0; audio.play('land'); }
        toMark();
      }
    } else {
      /* athlete brakes */
      if (a.v > 0) {
        a.v = Math.max(0, a.v - R.BRAKE * dt); const dx = a.v * M * dt; a.x += dx; stride(a, dx);
        if (a.x > FOUL_X + 0.1) S.foul = true;
        if (a.v === 0) a.anim = 'idle';
      }
      const J = S.jv;
      if (J.fly) {
        const sp = Math.hypot(J.vx, J.vy);
        J.vx += -R.JAV_DRAG * sp * J.vx * dt; J.vy += (-R.G - R.JAV_DRAG * sp * J.vy) * dt;
        J.x += J.vx * M * dt; J.y += J.vy * M * dt;
        javelin.position.set(J.x, J.y, a.z); javelin.rotation.set(0, 0, Math.atan2(J.vy, J.vx));
        if (J.y <= 0.15 && J.vy < 0) {
          J.fly = false; J.landed = true; J.y = 0.15;
          javelin.position.y = 1.0; javelin.rotation.z = Math.max(-0.9, Math.atan2(J.vy, J.vx));
          audio.play('stick');
        }
      }
      if (J.landed && a.v === 0 && S.pt > 0.3) {
        S.landX = J.x;
        S.attemptMark = S.foul ? null : Math.max(0, (J.x - FOUL_X) / M);
        toMark();
      }
    }
  }
  function toMark() {
    const a = S.cur, ev = S.ev;
    S.phase = 'mark'; S.pt = 0; S.dirty = true;
    const m = S.attemptMark;
    if (m == null) { banner('FOUL', a.name, 'red', 2); audio.play('whistle'); a.anim = a.human ? 'sad' : 'idle'; }
    else {
      const prevLead = Math.max(-1, ...S.athletes.map((b) => (S.marks[b.id] == null ? -1 : S.marks[b.id])));
      if (R.isBetter(ev, m, S.marks[a.id])) S.marks[a.id] = m;
      const pb = a.human && R.isBetter(ev, m, store.get('best.' + ev.key, null));
      banner(R.fmtDist(m), pb ? 'PERSONAL BEST' : a.name, 'yellow', 2.2);
      if (m > prevLead) { audio.play('cheer'); a.anim = 'celebrate'; a.animT = 0; }
      peg.position.set(S.landX, 0, a.z + 1.6); peg.visible = true;
    }
  }
  function nextAttempt() {
    S.turn++;
    if (S.turn >= S.order.length) { S.turn = 0; S.round++; }
    if (S.round >= S.ev.attempts) finishEvent(); else startAttempt();
  }

  /* ----- results ----- */
  function handoff(a, sub, then) {
    S.phase = 'handoff'; S.after = then; S.dirty = true;
    S.card = { kind: 'handoff', title: 'PASS TO ' + a.name, sub, rows: [], next: 'READY' };
  }
  function finishEvent() {
    const ev = S.ev;
    const ranked = R.rank(S.athletes.map((a) => ({ id: a.id, mark: S.marks[a.id] ?? null })), ev.better);
    const rows = ranked.map((r) => {
      const a = S.athletes[r.id];
      const pts = r.mark == null ? 0 : R.PLACE_POINTS[r.place] || 0;
      a.pts += pts; a.eventMark = r.mark;
      if (r.mark != null && r.place < 3) { a.medals[r.place]++; if (r.place === 0) a.golds++; }
      let pb = false;
      if (a.human && S.mode === 'cpu' && r.mark != null && R.isBetter(ev, r.mark, store.get('best.' + ev.key, null))) { store.set('best.' + ev.key, r.mark); pb = true; }
      return { place: R.placeName(r.place), name: a.name, color: a.color, mark: R.fmtMark(ev, r.mark), pts: '+' + pts, medal: r.mark != null && r.place < 3 ? R.MEDALS[r.place] : '', pb: pb ? 'PB' : '' };
    });
    const winner = S.athletes[ranked[0].id];
    const human = humans()[0];
    if (winner.human) audio.play('win'); else if (human) audio.play('lose'); else audio.play('cheer');
    S.athletes.forEach((a) => { a.anim = a === winner ? 'celebrate' : 'idle'; a.animT = 0; a.holder.visible = true; });
    const last = S.ei >= S.events.length - 1;
    S.card = {
      kind: 'event', title: ev.name, sub: (winner.human ? winner.name === 'YOU' ? 'YOU WIN' : winner.name + ' WINS' : winner.name + ' WINS') + ', EVENT ' + (S.ei + 1) + ' OF ' + S.events.length,
      rows, next: last ? 'FINAL RESULTS' : 'NEXT EVENT',
    };
    S.phase = 'card'; S.autoT = 0; S.dirty = true;
    javelin.visible = false; arrow.visible = false;
  }
  function finishMeet() {
    const st = S.athletes.slice().sort((p, q) => q.pts - p.pts || q.golds - p.golds || p.id - q.id);
    const human = humans()[0];
    const place = human ? st.indexOf(human) : -1;
    let gold = 0, stars = 0, best = 0, newBest = false, score = human ? human.pts : st[0].pts;
    if (S.mode === 'cpu') {
      gold = R.meetGold(S.level, place, human.golds);
      stars = R.meetStars(place, st.length);
      const key = 'best.meet.' + S.level + '.' + S.eventSel;
      best = store.get(key, 0);
      if (score > best) { store.set(key, score); best = score; newBest = true; }
      if (gold) store.addGold(gold);
      store.set('xp', store.get('xp', 0) + 10 + human.pts * 4 + (place === 0 ? 25 : 0));
      const sk = 'stars.' + S.level; store.set(sk, Math.max(store.get(sk, 0), stars));
    } else if (S.mode === 'local') {
      gold = 10; store.addGold(gold);
      best = store.get('best.local', 0); if (st[0].pts > best) { store.set('best.local', st[0].pts); best = st[0].pts; newBest = true; }
      score = st[0].pts; stars = 3;
    }
    const top = st[0];
    const title = S.mode === 'cpu' ? (place === 0 ? 'YOU WIN THE MEET' : top.name + ' WINS THE MEET') : top.name + ' WINS THE MEET';
    if (S.mode === 'cpu') audio.play(place === 0 ? 'win' : 'lose'); else audio.play('win');
    S.athletes.forEach((a) => { a.anim = a === top ? 'celebrate' : 'idle'; a.animT = 0; });
    S.card = {
      kind: 'meet', title, sub: S.mode === 'cpu' ? 'YOU PLACED ' + R.placeName(place) + ', ' + R.LEVELS[S.level].name : S.mode === 'demo' ? 'DEMO, TAP MENU TO PLAY' : 'PASS AND PLAY',
      rows: st.map((a, i) => ({ place: R.placeName(i), name: a.name, color: a.color, mark: a.medals[0] + 'G ' + a.medals[1] + 'S ' + a.medals[2] + 'B', pts: a.pts + ' PTS', medal: i === 0 ? 'GOLD' : '', pb: '' })),
      score, best, gold, stars, newBest, next: 'PLAY AGAIN',
    };
    S.phase = 'card'; S.autoT = 0; S.ei = S.events.length; S.dirty = true;
  }
  function next() {
    const c = S.card; if (!c) return;
    audio.unlock(); audio.play('tap');
    if (c.kind === 'handoff') { S.card = null; const f = S.after; S.after = null; S.dirty = true; if (f) f(); return; }
    if (c.kind === 'event') { S.card = null; S.ei++; if (S.ei < S.events.length) startEvent(); else finishMeet(); return; }
    if (c.kind === 'meet') newMeet();
  }

  /* ---------- input ---------- */
  function focusAthlete() {
    if (!S.ev) return null;
    if (S.ev.kind === 'field') return S.cur;
    const live = S.inHeat.filter((a) => !a.dq);
    const h = live.find((a) => a.human && !a.ghost);
    if (h) return h;
    return live.slice().sort((p, q) => q.x - p.x)[0] || null;
  }
  function humanRacer() { return S.ev && S.ev.kind === 'race' ? S.inHeat.find((a) => a.human && !a.ghost && !a.dq) : null; }
  function aiTurn() { return S.ev && S.ev.kind === 'field' && S.cur && !S.cur.human; }
  function touchInput() { S.lastInput = performance.now(); audio.unlock(); }
  function run() {
    touchInput();
    if (S.card || S.paused) return;
    const ph = S.phase;
    if (S.ev && S.ev.kind === 'race') {
      const h = humanRacer();
      if (!h) { skip(); return; }
      if (ph === 'set') { falseStart(h); return; }
      if (ph === 'race' && !h.done) h.rate += 1;
      if (ph === 'raceEnd' && S.pt > 0.6) endHeat();
      return;
    }
    if (aiTurn()) { skip(); return; }
    const a = S.cur; if (!a) return;
    if (ph === 'ready') { toApproach(); a.rate += 1; }
    else if (ph === 'approach') a.rate += 1;
    else if (ph === 'mark' && S.pt > 0.6) nextAttempt();
  }
  function actionDown() {
    touchInput();
    if (S.card || S.paused) return;
    const ph = S.phase;
    if (S.ev && S.ev.kind === 'race') {
      const h = humanRacer();
      if (h && S.ev.key === 'hurdles' && ph === 'race') jump(h);
      else if (h && ph === 'set') falseStart(h);
      return;
    }
    if (aiTurn()) { skip(); return; }
    if (ph === 'approach' || ph === 'ready') { if (ph === 'ready') toApproach(); startHold(); }
    else if (ph === 'takeoff') release();
    else if (ph === 'mark' && S.pt > 0.6) nextAttempt();
  }
  function actionUp() {
    if (S.phase === 'takeoff' && S.cur && S.cur.human && S.cur.holdT > 0.12) release();
  }
  function skip() {
    if (S.card) return;
    if (S.ev && S.ev.kind === 'field' && aiTurn()) {
      if (S.phase === 'mark') { if (S.pt > 0.3) nextAttempt(); }
      else S.timeScale = 4;
    } else if (S.phase === 'raceEnd' && S.pt > 0.4) endHeat();
    else if (S.ev && S.ev.kind === 'race' && !humanRacer() && S.phase === 'race') S.timeScale = 3;
  }
  const RUN_KEYS = ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'KeyZ', 'KeyX', 'KeyJ', 'KeyL'];
  const ACT_KEYS = ['Space', 'ArrowUp', 'KeyW', 'KeyK'];
  function key(e) {
    if (!e) return;
    const code = e.code || '', up = e.type === 'keyup';
    if (S.card && !up && (code === 'Space' || code === 'Enter')) { if (!e.repeat) next(); e.preventDefault && e.preventDefault(); return; }
    if (RUN_KEYS.includes(code)) { if (!up && !e.repeat) run(); e.preventDefault && e.preventDefault(); return; }
    if (ACT_KEYS.includes(code)) {
      if (up) actionUp(); else if (!e.repeat) actionDown();
      e.preventDefault && e.preventDefault();
    }
  }
  const el = renderer.domElement;
  function onCanvasDown(e) {
    if (world) {
      if (e.target !== el) return;
      e.preventDefault(); e.stopImmediatePropagation();
      camera.updateMatrixWorld();
    }
    run();
  }
  const onKeyDown = (e) => { if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; key(e); };
  const onKeyUp = (e) => key(e);
  if (world) window.addEventListener('pointerdown', onCanvasDown, true);
  else {
    el.addEventListener('pointerdown', onCanvasDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  /* ---------- camera ---------- */
  let safe = { top: 0, bottom: 0, left: 0, right: 0 };
  let snapNext = true;
  const camPos = new THREE.Vector3(0, 10, 40), camLook = new THREE.Vector3();
  const goalPos = new THREE.Vector3(), goalLook = new THREE.Vector3();
  const _v = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  function viewSize() {
    if (world) { const d = world.renderer.domElement; return [d.clientWidth || 1, d.clientHeight || 1]; }
    return [container.clientWidth || 1, container.clientHeight || 1];
  }
  function fit(points, back) {
    const [W, H] = viewSize();
    const fw = Math.max(60, W - safe.left - safe.right), fh = Math.max(60, H - safe.top - safe.bottom);
    const tanV = Math.tan((camera.fov / 2) * DEG);
    const tV = tanV * (fh / H) * 0.9, tH = tanV * (fw / H) * 0.9;
    const min = new THREE.Vector3(Infinity, Infinity, Infinity), max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    points.forEach((p) => { min.min(p); max.max(p); });
    _c.addVectors(min, max).multiplyScalar(0.5);
    _b.copy(back).normalize(); _r.crossVectors(UP, _b).normalize(); _u.crossVectors(_b, _r);
    let D = 6;
    points.forEach((p) => {
      _v.subVectors(p, _c);
      const x = Math.abs(_v.dot(_r)), y = Math.abs(_v.dot(_u)), z = _v.dot(_b);
      D = Math.max(D, z + x / tH, z + y / tV);
    });
    goalPos.copy(_c).addScaledVector(_b, D);
    goalLook.copy(_c);
    const ox = (safe.left + fw / 2 - W / 2) / (W / 2), oy = -(safe.top + fh / 2 - H / 2) / (H / 2);
    const sx = ox * D * tanV * (W / H), sy = oy * D * tanV;
    goalPos.addScaledVector(_r, -sx).addScaledVector(_u, -sy);
    goalLook.addScaledVector(_r, -sx).addScaledVector(_u, -sy);
  }
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const BACK_RACE = V3(-0.3, 0.42, 1), BACK_FIELD = V3(-0.25, 0.4, 1);
  const BACK_RACE_P = V3(-1, 0.62, 0.42), BACK_FIELD_P = V3(-1, 0.66, 0.5), BACK_SIDE_P = V3(-0.75, 0.6, 1);
  function aimCamera(dt) {
    const [W, H] = viewSize();
    const portrait = H > W * 1.05;
    camera.fov = world ? world.camera.fov : portrait ? 54 : 40;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    const ev = S.ev, pts = [];
    if (ev && ev.kind === 'race') {
      const f = focusAthlete(), sx = raceStartX(ev);
      if (S.phase === 'marks' || S.phase === 'set' || S.phase === 'restart' || S.phase === 'handoff' || !f) {
        pts.push(V3(sx - (portrait ? 2 : 3), 0, -6.5), V3(sx + (portrait ? 16 : 10), 3, 6.5));
      } else {
        const lead = S.inHeat.filter((a) => !a.dq).reduce((m, a) => Math.max(m, a.x), -999);
        const back = portrait ? 2 : 5, fwd = portrait ? 16 : 11, reach = portrait ? 26 : 20;
        const x0 = Math.min(f.x - back, FINISH_X + 4), x1 = Math.max(f.x + fwd, Math.min(lead + 3, f.x + reach));
        pts.push(V3(x0, 0, -6.5), V3(x1, 3.2, 6.5));
        if (S.phase === 'raceEnd' || S.phase === 'card') pts.push(V3(FINISH_X - 6, 0, 0), V3(FINISH_X + 6, 0, 0));
      }
      fit(pts, portrait ? BACK_RACE_P : BACK_RACE);
    } else if (ev && ev.kind === 'field') {
      const a = S.cur, z = zLine();
      if (!a || S.phase === 'card' || S.phase === 'handoff') {
        const x0 = runStartX();
        pts.push(V3(x0 - 6, 0, z - 4), V3(x0 + 14, 3, z + 3));
      } else if (S.phase === 'flight' && ev.key === 'jav' && (S.jv.fly || S.jv.landed)) {
        const J = S.jv, r = portrait ? 7 : 12;
        pts.push(V3(J.x - r, 0, z - 3), V3(J.x + r + 2, Math.max(3, J.y + 3), z + 3));
        fit(pts, portrait ? BACK_SIDE_P : BACK_FIELD); pts.length = 0;
      } else if (S.phase === 'mark' || (S.phase === 'flight' && ev.key === 'long')) {
        const x = S.phase === 'mark' ? S.landX : a.x;
        pts.push(V3(x - (portrait ? 6 : 9), 0, z - 3), V3(x + (portrait ? 5 : 7), Math.max(3.2, a.y + 3.2), z + 3));
        if (ev.key === 'long' && !portrait) pts.push(V3(BOARD_X - 2, 0, z));
        fit(pts, portrait ? BACK_SIDE_P : BACK_FIELD); pts.length = 0;
      } else {
        const ahead = ev.key === 'long' ? BOARD_X : FOUL_X;
        const wide = W / H > 1.5 ? 20 : 14;
        const x1 = Math.max(a.x + (portrait ? 18 : wide), ahead - a.x < 24 ? ahead + 4 : -999);
        pts.push(V3(a.x - (portrait ? 2 : 5), 0, z - 3.5), V3(x1, 3.2, z + 3));
      }
      if (pts.length) fit(pts, portrait ? BACK_FIELD_P : BACK_FIELD);
    } else {
      pts.push(V3(-20, 0, -8), V3(20, 3, 8)); fit(pts, BACK_RACE);
    }
    if (snapNext) { camPos.copy(goalPos); camLook.copy(goalLook); snapNext = false; }
    else {
      const k = 1 - Math.exp(-dt * 3.2);
      camPos.lerp(goalPos, k); camLook.lerp(goalLook, k);
    }
    camera.position.copy(camPos); camera.lookAt(camLook); camera.updateMatrixWorld();
    if (world) {
      root.updateWorldMatrix(true, false);
      wcam.position.copy(camera.position); root.localToWorld(wcam.position);
      root.getWorldQuaternion(_q); wcam.quaternion.copy(_q).multiply(camera.quaternion);
      wcam.fov = camera.fov; wcam.aspect = camera.aspect; wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
    }
  }

  /* ---------- main update ---------- */
  function update(dt) {
    const ph = S.phase;
    switch (ph) {
      case 'marks': S.pt += dt; if (S.pt > 1.4) toSet(); break;
      case 'set': S.pt += dt; if (S.pt > S.setDur) toGo(); break;
      case 'restart': S.pt += dt; if (S.pt > 1.8) toMarks(); break;
      case 'race': S.pt += dt; updateRace(dt); break;
      case 'raceEnd':
        S.pt += dt;
        S.inHeat.forEach((a) => { if (a.v > 0) { a.v = Math.max(0, a.v - 4 * dt); const dx = a.v * M * dt; a.x += dx; stride(a, dx); if (a.anim !== 'celebrate') a.anim = a.v > 0.3 ? 'run' : 'idle'; } });
        if (S.pt > 2.6) endHeat();
        break;
      case 'ready':
        S.pt += dt;
        if (!S.cur.human && S.pt > 0.9) toApproach();
        break;
      case 'approach': S.pt += dt; updateApproach(dt); break;
      case 'takeoff': S.pt += dt; updateTakeoff(dt); break;
      case 'flight': S.pt += dt; updateFlight(dt); break;
      case 'mark': S.pt += dt; if (S.pt > (S.cur && S.cur.human ? 2.6 : 2.0)) nextAttempt(); break;
      case 'card':
        S.autoT += dt;
        if (S.mode === 'demo' && S.autoT > (S.card && S.card.kind === 'meet' ? 6 : 4)) next();
        break;
      default: break;
    }
    /* hurdle falls */
    let hd = false;
    for (let i = 0; i < HN; i++) if (hurdleFall[i] !== hurdleGoal[i]) { hurdleFall[i] = Math.min(hurdleGoal[i], hurdleFall[i] + dt * 7); hd = true; }
    if (hd) placeHurdles();
    /* javelin carried */
    if (S.ev && S.ev.key === 'jav' && S.cur && !S.jv.fly && !S.jv.landed && javelin.visible) {
      const a = S.cur, ang = a.angleOn ? a.angle * DEG : 0.12;
      javelin.position.set(a.x - 0.2, a.y + 2.35 + (a.anim === 'run' ? Math.abs(Math.cos(a.phi)) * 0.1 : 0), a.z + 0.35);
      javelin.rotation.set(0, 0, ang);
    }
    /* aim arrow */
    const a = S.cur;
    if (a && a.angleOn && S.phase === 'takeoff') {
      arrow.visible = true; arrow.position.set(a.x + 0.4, a.y + (S.ev.key === 'long' ? 1.2 : 2.4), a.z + 0.8); arrow.rotation.set(0, 0, a.angle * DEG);
    } else arrow.visible = false;
    if (puff.visible) { puffT += dt; const k = puffT / 0.7; puff.scale.setScalar(1 + k * 2.2); puffMat.opacity = Math.max(0, 0.8 * (1 - k)); if (k >= 1) puff.visible = false; }
    S.athletes.forEach((b) => poseAthlete(b, dt));
  }

  let crowdT = 0, cheerT = 0;
  const _d = new THREE.Object3D();
  function animateCrowd(dt) {
    if (world) return;
    crowdT += dt; cheerT = Math.max(0, cheerT - dt);
    const amp = 0.08 + (S.phase === 'raceEnd' || S.phase === 'mark' || S.phase === 'card' ? 0.4 : S.phase === 'race' ? 0.25 : 0);
    for (let i = 0; i < CROWD_N; i++) {
      const [x, y, z, p] = crowdBase[i];
      _d.position.set(x, y + Math.max(0, Math.sin(crowdT * 8 + p)) * amp, z); _d.updateMatrix();
      crowd.setMatrixAt(i, _d.matrix);
    }
    crowd.instanceMatrix.needsUpdate = true;
  }

  /* ---------- HUD ---------- */
  function hud() {
    const ev = S.ev, now = performance.now();
    if (S.banner && now > S.bannerUntil) S.banner = null;
    if (S.caption && now > S.captionUntil) S.caption = null;
    const a = S.cur, race = ev && ev.kind === 'race';
    const f = focusAthlete();
    const hr = race ? humanRacer() : null;
    let sub = '', readout = '', readLabel = '';
    if (ev) {
      if (race) {
        sub = S.heats.length > 1 ? 'HEAT ' + (S.heat + 1) + ' OF ' + S.heats.length + ', ' + (S.heats[S.heat] ? S.heats[S.heat][0].name : '') : 'FINAL';
        readLabel = 'TIME';
        const me = S.inHeat.find((b) => b.human && !b.ghost);
        readout = ['race', 'raceEnd', 'card'].includes(S.phase) ? (me && me.done && me.time != null ? me.time : S.raceT).toFixed(2) : '0.00';
      } else if (a) {
        sub = a.name + ', ATTEMPT ' + Math.min(S.round + 1, ev.attempts) + ' OF ' + ev.attempts;
        readLabel = 'BEST';
        const bm = S.marks[a.id];
        readout = S.phase === 'mark' ? R.fmtDist(S.attemptMark) : bm == null ? '--' : bm.toFixed(2) + ' M';
        if (S.phase === 'mark') readLabel = 'MARK';
      }
    }
    const humanTurn = ev && !S.card && (race ? !!hr && !hr.done && ['marks', 'set', 'race', 'restart'].includes(S.phase) : a && a.human && ['ready', 'approach', 'takeoff'].includes(S.phase));
    let action = null;
    if (ev && humanTurn) action = ev.key === 'hurdles' ? 'JUMP' : ev.key === 'long' ? 'JUMP' : ev.key === 'jav' ? 'THROW' : null;
    let hint = null;
    if (humanTurn && !S.paused && now - S.lastInput > 3000) {
      hint = 'run';
      if (!race && S.phase === 'approach') {
        const left = (ev.key === 'long' ? BOARD_X : FOUL_X - R.brakeDistance(a.v) * M) - a.x;
        if (left < 18) hint = 'action';
      }
      if (S.phase === 'takeoff') hint = 'action';
      if (race && (S.phase === 'marks' || S.phase === 'set')) hint = null;
    }
    const sp = f ? R.clamp(f.v / R.VMAX, 0, 1) : 0;
    let toLine = null, toHurdle = null;
    if (ev && !race && a && ['ready', 'approach', 'takeoff'].includes(S.phase)) toLine = Math.round(((ev.key === 'long' ? BOARD_X : FOUL_X) - a.x) / M * 10) / 10;
    if (ev && ev.key === 'hurdles' && hr && S.phase === 'race') {
      const sx = raceStartX(ev), nx = R.HURDLES.map((m) => sx + m * M).find((x) => x > hr.x);
      if (nx != null) toHurdle = Math.round((nx - hr.x) / M * 10) / 10;
    }
    return {
      toLine, toHurdle, lineName: ev && ev.key === 'long' ? 'BOARD' : 'LINE',
      key: GAME.key, world: !!world, phase: S.phase, mode: S.mode, level: S.level, levelName: R.LEVELS[S.level].name,
      players: S.players, eventSel: S.eventSel, sound: S.sound, music: S.music, paused: S.paused,
      eventKey: ev ? ev.key : null, eventName: ev ? ev.name : '', eventNo: Math.min(S.ei + 1, S.events.length), eventCount: S.events.length,
      sub, readout, readLabel, speed: Math.round(sp * 100) / 100,
      angle: a && a.angleOn ? Math.round(a.angle) : null, angleBest: ev && ev.best ? ev.best : null,
      banner: S.banner, caption: S.caption, hint,
      athletes: S.athletes.map((b) => ({ name: b.name, color: b.color, pts: b.pts, human: b.human, active: b === (race ? f : a), title: b.title })),
      controls: { run: !!humanTurn, action, hold: !!(a && a.angleOn && a.human), skip: !humanTurn && !S.card && !!ev },
      card: S.card,
      tip: ev ? ev.tip : '',
    };
  }
  let lastEmit = 0;
  function emit(force) {
    const now = performance.now();
    if (!force && !S.dirty && now - lastEmit < 100) return;
    lastEmit = now; S.dirty = false;
    try { onState(hud()); } catch (e) { /* page error must not stop the game */ }
  }

  /* ---------- loop ---------- */
  let raf = 0, last = performance.now(), alive = true;
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    if (!S.paused) {
      const total = dt * S.timeScale, n = Math.max(1, Math.ceil(total / (1 / 60) - 1e-6)), step = total / n;
      for (let i = 0; i < n; i++) update(step);
    }
    animateCrowd(dt);
    aimCamera(dt);
    if (!world) renderer.render(scene, camera);
    emit(false);
  }
  let ro = null;
  function resize() {
    if (world) return;
    const [W, H] = viewSize();
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    snapNext = true;
  }
  if (!world) {
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(resize); ro.observe(container); }
    resize();
  }

  newMeet();
  raf = requestAnimationFrame(frame);
  emit(true);

  /* ---------- API ---------- */
  const api = {
    hud,
    setSafe(s = {}) {
      safe = { top: +s.top || 0, bottom: +s.bottom || 0, left: +s.left || 0, right: +s.right || 0 };
    },
    start(mode) { if (['cpu', 'local', 'demo'].includes(mode)) S.mode = mode; newMeet(); snapNext = true; emit(true); },
    key,
    get camera() { return world ? wcam : camera; },
    snapCam() { snapNext = true; aimCamera(0); },
    run() { run(); emit(true); },
    actionDown() { actionDown(); emit(true); },
    actionUp() { actionUp(); emit(true); },
    next() { next(); emit(true); },
    skip() { skip(); },
    restart() { newMeet(); emit(true); },
    pause(on) { S.paused = !!on; S.dirty = true; emit(true); },
    setLevel(n) { S.level = R.clamp(n | 0, 0, 2); if (S.mode !== 'cpu') S.mode = 'cpu'; newMeet(); emit(true); },
    setPlayers(n) { S.players = R.clamp(n | 0, 2, 4); S.mode = 'local'; newMeet(); emit(true); },
    setEvent(k) { S.eventSel = k === 'meet' || R.EVENTS.some((e) => e.key === k) ? k : 'meet'; newMeet(); emit(true); },
    setSound(on) { S.sound = !!on; audio.setSfx(S.sound); S.dirty = true; emit(true); },
    setMusic(on) { S.music = !!on; audio.setMusic(S.music); S.dirty = true; emit(true); },
    stats() { return { gold: store.get('gold', 0), xp: store.get('xp', 0), best: Object.fromEntries(R.EVENTS.map((e) => [e.key, store.get('best.' + e.key, null)])) }; },
    destroy() {
      alive = false; cancelAnimationFrame(raf);
      if (world) window.removeEventListener('pointerdown', onCanvasDown, true);
      else {
        el.removeEventListener('pointerdown', onCanvasDown);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      }
      if (ro) ro.disconnect();
      audio.close();
      if (world) { world.parent.remove(root); }
      else {
        renderer.dispose();
        if (el.parentNode) el.parentNode.removeChild(el);
      }
      disposables.forEach((d) => { try { d.dispose(); } catch (e) { /* ignore */ } });
    },
  };
  return api;
}

export const create = createTrackField;
export default createTrackField;
