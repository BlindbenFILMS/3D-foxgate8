/* AIRPORT TSA . the terminal: layout, colliders, nav graph, props */
import * as THREE from '../../vendor/three/three.module.js';
import { Builder, SignAtlas, toonMat, inkMat, basicVC } from './airport-kit.js';
import { XW, XH } from './airport-xray.js';

const PI = Math.PI;
export const HALL = { x0: -40, x1: 40, z0: -34, z1: 34, h: 16 };
const C = {
  floor: '#dcd6c8', zone: '#bcc6cf', carpet: '#2e8f88', carpet2: '#2a7f99', wood: '#b07a4a', woodD: '#7c5233',
  white: '#f4f1ea', wall: '#ece5d6', wall2: '#d9d1c1', dark: '#2f323d', dark2: '#22252e', metal: '#b3bbc4', metalD: '#7b8794',
  blue: '#2c4d8f', blue2: '#2f6fb3', red: '#ec3013', yellow: '#ffd23a', green: '#3fa35b', green2: '#2f8a48', pot: '#e7e2d8',
  belt: '#2a2b31', frame: '#5d6673',
};

/* One security lane. s = -1 is lane 1 (the player's), s = +1 is lane 2. */
export function laneSpec(s, i) {
  const px = s * 9.6, bx = s * 4.6, ox = s * 7;
  return {
    i, s, px, bx, ox,
    agent: { x: ox, z: 3.4, ry: s * PI / 2 },
    op: { x: ox + s * 1.5, z: 1.25, ry: Math.atan2(-s * 1.5, -1.65) },
    p0: { x: px, z: 3.4, ry: -s * PI / 2 },
    slot: k => ({ x: px, z: 5.5 + 1.9 * k }),
    entry: { x: px, z: 19.4 },
    arch: { x: px, z: -3 }, collect: { x: px, z: -8.6 }, out: { x: s * 11.4, z: 3.4 },
    beltStart: { x: bx, y: 1.22, z: 3.1 }, tunnel: { x: bx, y: 1.22, z: -3 }, beltEnd: { x: bx, y: 1.22, z: -9.6 },
    table: { x: s * 7.2, y: 1.2, z: -8.5 },
    screen: { x: ox, y: 2.65, z: -0.43, w: 2.24, h: 1.4 },
  };
}

export function buildAirport({ group, env, full }) {
  const S = new Builder();           /* static props, in the play group */
  const OH = new Builder();          /* overhead board + banner, hidden when it blocks the view */
  const overhead = new THREE.Group(); group.add(overhead);
  const COLS = full ? new Builder() : null;
  const E = full ? new Builder() : null; /* room shell and outside, standalone only */
  const LB = full ? new Builder() : null; /* glowing ceiling panels */
  const GL = [], EGL = [];
  const AT = new SignAtlas(2048, 40);
  const colliders = [];
  const col = (x0, x1, z0, z1, fullOnly) => { if (fullOnly && !full) return; colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) }); };
  const colC = (x, z, w, d, f) => col(x - w / 2, x + w / 2, z - d / 2, z + d / 2, f);
  const disposables = [];

  /* ---------- floor ---------- */
  const fc = document.createElement('canvas'); fc.width = fc.height = 128;
  const fx = fc.getContext('2d');
  fx.fillStyle = C.floor; fx.fillRect(0, 0, 128, 128);
  fx.fillStyle = '#d2cbbb'; fx.fillRect(0, 0, 64, 64); fx.fillRect(64, 64, 64, 64);
  fx.fillStyle = '#c5bdab'; fx.fillRect(0, 0, 128, 3); fx.fillRect(0, 0, 3, 128); fx.fillRect(0, 63, 128, 2); fx.fillRect(63, 0, 2, 128);
  const ftex = new THREE.CanvasTexture(fc); ftex.wrapS = ftex.wrapT = THREE.RepeatWrapping; ftex.repeat.set(20, 17); ftex.colorSpace = THREE.SRGBColorSpace; ftex.anisotropy = 4;
  const floorMat = toonMat(0xffffff, { map: ftex });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 68), floorMat);
  floor.rotation.x = -PI / 2; group.add(floor);
  disposables.push(ftex, floorMat, floor.geometry);

  const flat = (x, z, w, d, color, y = 0.012) => S.box(x, y, z, w, 0.02, d, color, { ink: false });
  flat(0, -4, 24, 16, C.zone);
  flat(-24, -24.5, 22, 18.6, C.carpet); flat(24, -24.5, 22, 18.6, C.carpet);
  flat(31, 10, 14, 9.6, '#c99b6b');
  flat(0, 32, 12, 3.4, C.dark, 0.016);
  flat(-26, 26.6, 22, 6.4, '#3a5a9a');
  flat(0, -28.6, 15, 8.2, '#efe9dc');
  flat(16, -6, 4, 12, '#c9d1d8');

  /* ---------- small helpers ---------- */
  const post = (x, z) => { S.cyl(x, 0, z, 0.32, 0.36, 0.1, C.metalD); S.cyl(x, 0.1, z, 0.08, 0.08, 1.35, C.metal); S.sph(x, 1.48, z, 0.12, C.metal); };
  const ropeX = (x0, x1, z) => { for (let x = x0; x < x1 - 0.01; x += 3) { const xe = Math.min(x + 3, x1); post(x, z); S.box((x + xe) / 2, 1.3, z, xe - x, 0.13, 0.06, C.blue, { ink: false }); } post(x1, z); col(x0 - 0.2, x1 + 0.2, z - 0.15, z + 0.15); };
  const ropeZ = (x, z0, z1) => { for (let z = z0; z < z1 - 0.01; z += 2.8) { const ze = Math.min(z + 2.8, z1); post(x, z); S.box(x, 1.3, (z + ze) / 2, 0.06, 0.13, ze - z, C.blue, { ink: false }); } post(x, z1); col(x - 0.15, x + 0.15, z0 - 0.2, z1 + 0.2); };
  function glassWall(axis, c, a0, a1, h = 3.4) {
    const lo = Math.min(a0, a1), hi = Math.max(a0, a1), len = hi - lo, n = Math.max(1, Math.round(len / 2.6)), st = len / n, mid = (lo + hi) / 2;
    for (let k = 0; k <= n; k++) { const a = lo + k * st; if (axis === 'x') S.box(c, 0, a, 0.2, h, 0.2, C.frame); else S.box(a, 0, c, 0.2, h, 0.2, C.frame); }
    if (axis === 'x') { S.box(c, h - 0.14, mid, 0.16, 0.14, len, C.frame); S.box(c, 0, mid, 0.18, 0.28, len, C.frame); GL.push({ x: c, y: h / 2, z: mid, w: len, h: h - 0.4, ry: PI / 2 }); col(c - 0.16, c + 0.16, lo, hi); }
    else { S.box(mid, h - 0.14, c, len, 0.14, 0.16, C.frame); S.box(mid, 0, c, len, 0.28, 0.18, C.frame); GL.push({ x: mid, y: h / 2, z: c, w: len, h: h - 0.4, ry: 0 }); col(lo, hi, c - 0.16, c + 0.16); }
  }
  function plant(x, z, big) {
    S.box(x, 0, z, 1.5, 1.0, 1.5, C.pot); S.box(x, 1.0, z, 1.3, 0.06, 1.3, '#5a4030', { ink: false });
    S.sph(x, 1.75, z, 0.72, C.green, { seg: 10, seg2: 7 }); S.sph(x + 0.4, 2.35, z - 0.2, 0.52, C.green2, { seg: 10, seg2: 7 }); S.sph(x - 0.35, 2.45, z + 0.3, 0.48, '#4cbf6a', { seg: 10, seg2: 7 });
    if (big) S.add(new THREE.ConeGeometry(0.7, 2.4, 8), C.green2, { x, y: 3.7, z });
    colC(x, z, 1.6, 1.6);
  }
  const bin = (x, z) => { S.cyl(x, 0, z, 0.45, 0.4, 1.2, C.dark); S.cyl(x, 1.2, z, 0.5, 0.5, 0.15, C.metal); S.box(x, 1.36, z, 0.5, 0.05, 0.12, C.yellow, { ink: false }); colC(x, z, 1.0, 1.0); };
  const rollers = (bx, z0, n, step) => { for (let k = 0; k < n; k++) S.add(new THREE.CylinderGeometry(0.07, 0.07, 2.05, 7), '#d8dde3', { x: bx, y: 1.13, z: z0 + k * step, rz: PI / 2, ink: false }); };

  /* ---------- security checkpoint, two lanes ---------- */
  const lanes = [laneSpec(-1, 0), laneSpec(1, 1)];
  for (const L of lanes) {
    const s = L.s, bx = L.bx;
    /* ID podium */
    S.box(s * 8.3, 0, 3.4, 0.9, 1.7, 2.2, C.dark); S.box(s * 8.3, 1.7, 3.4, 1.15, 0.1, 2.4, C.white);
    S.box(s * 8.3, 1.8, 2.8, 0.5, 0.08, 0.7, C.dark2); S.cyl(s * 8.3, 1.8, 4.2, 0.05, 0.05, 0.7, C.metal); S.sph(s * 8.3, 2.55, 4.2, 0.15, C.blue2);
    S.box(s * 8.3 + s * 0.46, 0.4, 3.4, 0.03, 0.18, 2.0, C.yellow, { ink: false });
    colC(s * 8.3, 3.4, 1.2, 2.5);
    /* bin table with rollers */
    S.box(bx, 0, 1.6, 2.0, 1.0, 4.6, C.metal); S.box(bx - 1.1, 1.0, 1.6, 0.1, 0.32, 4.6, C.metalD); S.box(bx + 1.1, 1.0, 1.6, 0.1, 0.32, 4.6, C.metalD);
    rollers(bx, -0.5, 12, 0.38);
    colC(bx, 1.6, 2.4, 4.7);
    /* stack of grey bins */
    S.box(bx, 0, 4.9, 1.6, 0.45, 1.1, C.metalD);
    for (let k = 0; k < 5; k++) S.box(bx, 0.45 + k * 0.26, 4.9, 1.5, 0.24, 1.0, k % 2 ? '#8796a5' : '#6f7c8a');
    colC(bx, 4.9, 1.7, 1.2);
    /* X-ray machine */
    S.box(bx, 0, -3, 3.0, 2.8, 4.4, '#dfe4ea'); S.box(bx, 2.8, -3, 3.1, 0.25, 4.5, C.blue);
    S.box(bx, 0.95, -0.79, 2.1, 1.3, 0.04, C.dark2, { ink: false }); S.box(bx, 0.95, -5.21, 2.1, 1.3, 0.04, C.dark2, { ink: false });
    for (let k = 0; k < 6; k++) { S.box(bx - 0.88 + k * 0.35, 1.0, -0.75, 0.3, 1.2, 0.03, '#454b57', { ink: false }); S.box(bx - 0.88 + k * 0.35, 1.0, -5.25, 0.3, 1.2, 0.03, '#454b57', { ink: false }); }
    S.box(bx + s * 1.52, 1.2, -3, 0.04, 0.5, 2.6, C.yellow, { ink: false }); S.box(bx - s * 1.52, 1.2, -3, 0.04, 0.5, 2.6, C.yellow, { ink: false });
    colC(bx, -3, 3.1, 4.5);
    AT.add('X-RAY', 2.4, 0.5, { bg: C.blue, fg: '#ffffff' }, { x: bx, y: 2.5, z: -0.76 });
    /* exit rollers and end stop */
    S.box(bx, 0, -7.85, 2.0, 1.0, 4.9, C.metal); S.box(bx - 1.1, 1.0, -7.85, 0.1, 0.32, 4.9, C.metalD); S.box(bx + 1.1, 1.0, -7.85, 0.1, 0.32, 4.9, C.metalD);
    S.box(bx, 1.0, -10.25, 2.3, 0.4, 0.12, C.metalD);
    rollers(bx, -5.6, 12, -0.38);
    colC(bx, -7.85, 2.4, 5.0);
    /* bag search table */
    S.box(L.table.x, 0, L.table.z, 1.7, 1.1, 2.3, C.white); S.box(L.table.x, 1.1, L.table.z, 1.9, 0.07, 2.5, C.metalD);
    S.cyl(L.table.x - s * 0.7, 0, L.table.z - 1.35, 0.05, 0.05, 2.6, C.metal);
    AT.add('BAG CHECK', 1.8, 0.5, { bg: C.red, fg: '#ffffff' }, { x: L.table.x - s * 0.7, y: 2.4, z: L.table.z - 1.3, both: true });
    colC(L.table.x, L.table.z, 1.9, 2.5);
    /* x-ray monitor and keyboard desk */
    S.cyl(L.ox, 0, -0.6, 0.12, 0.12, 1.9, C.metalD); S.box(L.ox, 0, -0.6, 1.0, 0.12, 0.8, C.dark);
    S.box(L.ox, 1.85, -0.6, 2.5, 1.62, 0.3, C.dark);
    S.box(L.ox, 0, 0.35, 1.8, 1.2, 0.7, C.metalD); S.box(L.ox, 1.2, 0.35, 2.0, 0.06, 0.9, C.white); S.box(L.ox - 0.2, 1.26, 0.35, 1.0, 0.05, 0.35, C.dark2, { ink: false });
    S.box(L.ox + 0.65, 1.26, 0.4, 0.22, 0.05, 0.28, C.red, { ink: false });
    colC(L.ox, 0, 2.6, 1.6);
    /* metal detector arch */
    S.box(L.px - 1.15, 0, -3, 0.36, 3.3, 0.9, '#d3d8de'); S.box(L.px + 1.15, 0, -3, 0.36, 3.3, 0.9, '#d3d8de');
    S.box(L.px, 3.3, -3, 2.66, 0.55, 0.9, '#d3d8de'); S.box(L.px, 3.32, -2.54, 2.2, 0.42, 0.03, C.dark, { ink: false });
    S.box(L.px - 0.3, 0.012, -3, 0.32, 0.03, 0.6, C.yellow, { ink: false }); S.box(L.px + 0.3, 0.012, -3, 0.32, 0.03, 0.6, C.yellow, { ink: false });
    colC(L.px - 1.15, -3, 0.42, 1.0); colC(L.px + 1.15, -3, 0.42, 1.0);
    /* queue ropes and side glass */
    ropeZ(L.px - 1.3, 4.4, 18.4); ropeZ(L.px + 1.3, 4.4, 18.4);
    glassWall('x', s * 12, -12, 1);
    S.box(L.px, 0.02, 4.45, 2.4, 0.03, 0.16, C.yellow, { ink: false });
    AT.add('WAIT HERE', 2.2, 0.6, { bg: C.yellow, fg: '#111111' }, { x: L.px, y: 0.045, z: 5.1, rx: -PI / 2 });
    AT.add('LANE ' + (L.i + 1), 3.0, 0.9, { bg: '#111111', fg: C.yellow }, { x: L.px - s * 0.6, y: 5.2, z: 3.4, both: true });
    S.cyl(L.px - s * 0.6, 5.65, 3.4, 0.04, 0.04, 1.4, C.metalD, { ink: false });
    S.cyl(bx - s * 1.25, 0, 4.45, 0.05, 0.05, 2.0, C.metal);
    AT.add('PLACE BAGS\nIN BINS', 1.8, 0.9, { bg: '#ffffff', fg: '#111111', rule: C.red }, { x: bx - s * 1.25, y: 2.4, z: 4.5 });
    S.box(bx - s * 1.25, 1.92, 4.43, 1.9, 0.98, 0.06, C.dark);
  }
  AT.add('STAFF', 1.6, 0.6, { bg: C.yellow, fg: '#111111' }, { x: 0, y: 0.045, z: 3.4, rx: -PI / 2 });

  /* departure board and banner over the checkpoint */
  OH.box(0, 7.0, 4.6, 16.8, 4.8, 0.5, C.dark);
  OH.box(0, 5.4, 4.6, 14.4, 1.3, 0.3, C.dark);
  AT.add('SECURITY CHECKPOINT', 14, 1.1, { bg: C.red, fg: '#ffffff', icon: 'shield' }, { x: 0, y: 6.05, z: 4.77, list: 'over' });
  AT.add('THANK YOU FOR FLYING SAFE', 14, 1.4, { bg: '#111111', fg: C.yellow }, { x: 0, y: 9.4, z: 4.34, ry: PI, list: 'over' });
  const bcv = document.createElement('canvas'); bcv.width = 1024; bcv.height = 288;
  const btex = new THREE.CanvasTexture(bcv); btex.colorSpace = THREE.SRGBColorSpace; btex.anisotropy = 4;
  const bmat = new THREE.MeshBasicMaterial({ map: btex });
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 4.5), bmat); boardMesh.position.set(0, 9.4, 4.86); overhead.add(boardMesh);
  disposables.push(btex, bmat, boardMesh.geometry);
  if (E) { E.cyl(-6, 11.8, 4.6, 0.06, 0.06, 4.2, C.metalD, { ink: false }); E.cyl(6, 11.8, 4.6, 0.06, 0.06, 4.2, C.metalD, { ink: false }); }

  /* x-ray monitors (one canvas each) */
  const monitors = lanes.map(L => {
    const cv = document.createElement('canvas'); cv.width = XW; cv.height = XH;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L.screen.w, L.screen.h), mat);
    m.position.set(L.screen.x, L.screen.y, L.screen.z); group.add(m);
    disposables.push(tex, mat, m.geometry);
    return { canvas: cv, ctx: cv.getContext('2d'), tex, mesh: m };
  });
  /* metal detector lights */
  const archLights = lanes.map(L => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: '#36d36b' }));
    m.position.set(L.px, 3.98, -3); group.add(m); disposables.push(m.geometry, m.material);
    return m;
  });

  /* ---------- partition between landside and airside ---------- */
  glassWall('z', -12, -33, -12); glassWall('z', -12, 12, 14); glassWall('z', -12, 18, 40);
  glassWall('x', 14, -12, 0); glassWall('x', 18, -12, 0);
  S.box(16, 3.6, 0, 4.4, 0.6, 0.4, C.dark); S.box(16, 3.6, -12, 4.4, 0.6, 0.4, C.dark);
  AT.add('NO ENTRY', 4.0, 0.9, { bg: C.red, fg: '#ffffff' }, { x: 16, y: 4.7, z: 0.22 });
  AT.add('EXIT  NO RE-ENTRY', 4.2, 0.9, { bg: C.red, fg: '#ffffff', icon: 'arrow' }, { x: 16, y: 4.7, z: -12.22, ry: PI });
  S.box(16, 4.2, 0, 4.2, 1.0, 0.1, C.dark); S.box(16, 4.2, -12, 4.2, 1.0, 0.1, C.dark);
  S.box(14.85, 0.5, -6, 1.5, 0.8, 0.1, C.metalD); S.box(17.15, 0.5, -6, 1.5, 0.8, 0.1, C.metalD);
  S.cyl(14.15, 0, -6, 0.12, 0.12, 1.4, C.metal); S.cyl(17.85, 0, -6, 0.12, 0.12, 1.4, C.metal);
  plant(13, -9.5); plant(13, -4); plant(13, -0.6);

  /* ---------- staff room ---------- */
  S.box(-33.2, 0, -10.3, 0.4, 6.2, 3.4, C.wall2); S.box(-33.2, 0, -4.7, 0.4, 6.2, 3.4, C.wall2); S.box(-33.2, 4.0, -7.5, 0.4, 2.2, 2.2, C.wall2);
  S.box(-36.6, 0, -3.2, 7.2, 6.2, 0.4, C.wall2); S.box(-36.6, 0, -11.8, 7.2, 6.2, 0.4, C.wall2); S.box(-36.6, 6.2, -7.5, 7.6, 0.3, 9.2, C.dark);
  S.box(-32.98, 0, -8.7, 0.12, 4.0, 0.16, C.dark); S.box(-32.98, 0, -6.3, 0.12, 4.0, 0.16, C.dark); S.box(-32.98, 3.92, -7.5, 0.12, 0.16, 2.56, C.dark);
  S.box(-32.95, 1.6, -5.75, 0.12, 0.5, 0.32, C.dark2); S.box(-32.86, 1.95, -5.75, 0.04, 0.08, 0.14, '#36d36b', { ink: false });
  S.box(-32.98, 0.6, -4.4, 0.05, 0.22, 3.0, C.red, { ink: false }); S.box(-32.98, 0.6, -10.6, 0.05, 0.22, 2.6, C.red, { ink: false });
  AT.add('STAFF ONLY', 3.0, 0.8, { bg: C.red, fg: '#ffffff' }, { x: -32.94, y: 4.75, z: -7.5, ry: PI / 2 });
  col(-40, -33, -12, -3);
  const doorB = new Builder(); doorB.box(0, 0, 1.1, 0.12, 3.85, 2.2, '#c9563c'); doorB.box(0.1, 1.7, 1.85, 0.08, 0.1, 0.4, C.metal); doorB.box(0.07, 2.6, 1.1, 0.02, 0.8, 1.2, '#ffffff', { ink: false });
  const doorPivot = new THREE.Group(); doorPivot.position.set(-33.0, 0, -8.6); doorPivot.add(doorB.build()); group.add(doorPivot);
  let doorOpen = 0, doorWant = 0;

  /* ---------- check-in (landside left) ---------- */
  S.box(-26, 0, 19.6, 22, 6.2, 0.6, C.blue); S.box(-26, 6.2, 19.6, 22.4, 0.3, 0.8, C.dark);
  S.box(-26, 0, 20.6, 21, 0.8, 1.0, C.belt);
  for (let k = 0; k < 4; k++) {
    const x = -33.5 + k * 5;
    S.box(x, 0, 22.4, 4.2, 1.6, 1.3, '#355caa'); S.box(x, 1.6, 22.4, 4.4, 0.1, 1.5, C.white);
    S.box(x - 1.0, 1.7, 22.0, 0.9, 0.6, 0.08, C.dark2); S.box(x - 1.0, 1.7, 22.1, 0.12, 0.1, 0.3, C.dark2);
    S.box(x + 2.5, 0, 22.4, 0.8, 0.45, 1.3, C.metalD, { ink: false });
    AT.add(String(k + 1), 0.9, 0.9, { bg: C.yellow, fg: '#111111' }, { x, y: 3.4, z: 19.92 });
  }
  AT.add('FOXAIR  CHECK-IN', 12, 1.5, { bg: C.blue, fg: '#ffffff', icon: 'plane' }, { x: -26, y: 4.9, z: 19.92 });
  col(-37, -15, 19.2, 23.2);
  ropeX(-35, -17, 26.0); ropeX(-35, -17, 29.2);

  /* info desk */
  S.cyl(0, 0, 22, 2.2, 2.2, 1.6, C.white, { seg: 24 }); S.cyl(0, 1.6, 22, 2.35, 2.35, 0.12, C.blue, { seg: 24 }); S.cyl(0, 0.25, 22, 2.24, 2.24, 0.3, C.blue, { seg: 24, ink: false });
  AT.add('INFO', 3, 1.0, { bg: C.blue, fg: '#ffffff', icon: 'info' }, { x: 0, y: 5.2, z: 22, both: true });
  S.cyl(0, 5.7, 22, 0.04, 0.04, 1.6, C.metalD, { ink: false });
  colC(0, 22, 4.6, 4.6);

  /* benches by the entrance, facing the checkpoint */
  const benches = [];
  for (const bxp of [-8, 8]) {
    S.box(bxp, 0.7, 27, 4.2, 0.25, 1.1, C.woodD); S.box(bxp - 1.7, 0, 27, 0.3, 0.7, 0.9, C.dark); S.box(bxp + 1.7, 0, 27, 0.3, 0.7, 0.9, C.dark);
    colC(bxp, 27, 4.4, 1.3);
    benches.push({ x: bxp - 1.2, z: 27, y: 0.95, ry: PI, fx: bxp - 1.2, fz: 25.3, row: 'b' + bxp, k: 0 }, { x: bxp + 1.2, z: 27, y: 0.95, ry: PI, fx: bxp + 1.2, fz: 25.3, row: 'b' + bxp, k: 1 });
  }

  /* café */
  S.box(35, 0, 10, 1.4, 1.6, 7.6, C.woodD); S.box(35, 1.6, 10, 1.7, 0.12, 7.9, C.white);
  S.box(35, 1.72, 7.3, 0.9, 0.9, 1.1, C.red); S.box(35, 2.62, 7.3, 0.95, 0.1, 1.2, C.metal); S.cyl(34.6, 1.72, 8.4, 0.12, 0.1, 0.3, '#ffffff'); S.cyl(34.6, 1.72, 8.8, 0.12, 0.1, 0.3, '#ffffff');
  S.box(35, 1.72, 11.6, 0.9, 0.1, 2.4, C.metal); GL.push({ x: 34.55, y: 2.2, z: 11.6, w: 2.4, h: 0.85, ry: PI / 2 });
  for (let k = 0; k < 5; k++) S.sph(35, 1.95, 10.8 + k * 0.4, 0.16, k % 2 ? '#d9a35a' : '#a8642e', { ink: false, seg: 8, seg2: 6 });
  S.box(38.7, 0, 10, 0.4, 5.6, 9, C.woodD);
  S.box(38.35, 2.6, 12.2, 0.5, 0.1, 3.6, C.wood); for (let k = 0; k < 6; k++) S.cyl(38.35, 2.7, 10.7 + k * 0.6, 0.14, 0.14, 0.42, ['#e6b422', '#ec3013', '#3fa35b', '#2c6fbb'][k % 4], { ink: false, seg: 8 });
  AT.add('PAW & BREW', 6.5, 1.2, { bg: '#111111', fg: C.yellow, icon: 'cup' }, { x: 38.48, y: 4.4, z: 10, ry: -PI / 2 });
  AT.add('LATTE 4\nMOCHA 5\nCHAI 4', 2.4, 1.6, { bg: '#1d1d1d', fg: '#ffffff', align: 'left' }, { x: 38.48, y: 2.4, z: 7.2, ry: -PI / 2 });
  col(34.1, 35.9, 6.0, 14.0); col(38.4, 39.0, 5.4, 14.6);
  for (const [tx, tz] of [[27, 8], [30.5, 11.5], [27, 12.8]]) {
    S.cyl(tx, 0, tz, 0.5, 0.5, 0.06, C.dark); S.cyl(tx, 0, tz, 0.12, 0.12, 1.35, C.dark); S.cyl(tx, 1.35, tz, 1.0, 1.0, 0.1, C.white, { seg: 18 });
    for (const sx of [-1, 1]) { S.box(tx + sx * 1.5, 0, tz, 0.8, 0.95, 0.8, '#e8742c'); S.box(tx + sx * 1.86, 0.95, tz, 0.12, 0.9, 0.8, '#e8742c'); }
    colC(tx, tz, 4.2, 1.6);
  }

  /* baggage carousel */
  const cx = 24, cz = 24.3, hl = 4.5, rr = 2.3;
  S.box(cx, 0, cz, hl * 2, 0.9, rr * 2, C.metal); S.cyl(cx - hl, 0, cz, rr, rr, 0.9, C.metal, { seg: 24 }); S.cyl(cx + hl, 0, cz, rr, rr, 0.9, C.metal, { seg: 24 });
  S.box(cx, 0.9, cz, hl * 2, 0.08, rr * 2 + 0.3, C.belt, { ink: false }); S.cyl(cx - hl, 0.9, cz, rr + 0.15, rr + 0.15, 0.08, C.belt, { seg: 24, ink: false }); S.cyl(cx + hl, 0.9, cz, rr + 0.15, rr + 0.15, 0.08, C.belt, { seg: 24, ink: false });
  S.box(cx, 0.9, cz, hl * 2, 0.5, 1.3, C.white); S.cyl(cx - hl, 0.9, cz, 0.65, 0.65, 0.5, C.white, { seg: 16 }); S.cyl(cx + hl, 0.9, cz, 0.65, 0.65, 0.5, C.white, { seg: 16 });
  AT.add('BAGGAGE CLAIM  1', 7, 1.1, { bg: C.yellow, fg: '#111111', icon: 'bag' }, { x: cx, y: 6, z: cz, both: true });
  S.cyl(cx - 2.5, 6.5, cz, 0.04, 0.04, 1.4, C.metalD, { ink: false }); S.cyl(cx + 2.5, 6.5, cz, 0.04, 0.04, 1.4, C.metalD, { ink: false });
  col(cx - hl - rr - 0.2, cx + hl + rr + 0.2, cz - rr - 0.3, cz + rr + 0.3);
  const NB = 8, cbGeo = new THREE.BoxGeometry(1.1, 0.6, 0.75), cbInkGeo = new THREE.BoxGeometry(1.2, 0.7, 0.85);
  const cbags = new THREE.InstancedMesh(cbGeo, toonMat(0xffffff), NB), cbink = new THREE.InstancedMesh(cbInkGeo, inkMat(), NB);
  const bagCols = ['#c0392b', '#2c6fbb', '#2f2f2f', '#e6b422', '#3f8f5a', '#8e44ad', '#d35400', '#7f8c8d'];
  for (let k = 0; k < NB; k++) cbags.setColorAt(k, new THREE.Color(bagCols[k]));
  group.add(cbags); group.add(cbink); disposables.push(cbGeo, cbInkGeo);
  const track = 1.6, Lstr = hl * 2, Lloop = 2 * Lstr + 2 * PI * track;
  const dm = new THREE.Object3D();
  function carousel(t) {
    for (let k = 0; k < NB; k++) {
      let u = ((t * 0.9 + k * Lloop / NB) % Lloop + Lloop) % Lloop, x, z, a;
      if (u < Lstr) { x = cx - hl + u; z = cz + track; a = 0; }
      else if (u < Lstr + PI * track) { const th = (u - Lstr) / track; x = cx + hl + Math.sin(th) * track; z = cz + Math.cos(th) * track; a = -th; }
      else if (u < 2 * Lstr + PI * track) { x = cx + hl - (u - Lstr - PI * track); z = cz - track; a = PI; }
      else { const th = (u - 2 * Lstr - PI * track) / track; x = cx - hl - Math.sin(th) * track; z = cz - Math.cos(th) * track; a = PI - th; }
      dm.position.set(x, 1.3, z); dm.rotation.set(0, a + (k % 3) * 0.25, 0); dm.updateMatrix();
      cbags.setMatrixAt(k, dm.matrix); cbink.setMatrixAt(k, dm.matrix);
    }
    cbags.instanceMatrix.needsUpdate = true; cbink.instanceMatrix.needsUpdate = true;
  }
  carousel(0);

  /* plants, bins */
  [[-13.6, 6], [13.6, 6], [-9.2, 32.4], [9.2, 32.4], [-38, 32], [38, 32], [-14.5, -14.6, true], [38, -31, true], [-38, -31, true], [-38, 1, true], [38, 17]].forEach(p => plant(p[0], p[1], p[2]));
  [[-17, -14.6], [17, -15.2], [-11.6, 28.6], [11.6, 28.6], [22, 5.2], [-30, 14]].forEach(p => bin(p[0], p[1]));

  /* ---------- airside: gates ---------- */
  const seats = [];
  for (const gs of [-1, 1]) {
    const gx0 = gs < 0 ? -32 : 16.6, rows = [-19, -23.5, -28], gate = gs < 0 ? 'A1' : 'A2';
    rows.forEach((rz, ri) => {
      const xa = gx0, xb = gx0 + 7 * 2.2, xm = (xa + xb) / 2;
      S.box(xm, 0.42, rz + 0.25, xb - xa + 1.9, 0.14, 0.3, C.metalD);
      for (const lx of [xa - 0.4, xm, xb + 0.4]) S.box(lx, 0, rz + 0.25, 0.22, 0.45, 1.2, C.metalD);
      for (let k = 0; k < 8; k++) {
        const x = gx0 + k * 2.2;
        S.box(x, 0.66, rz, 1.9, 0.32, 1.5, C.blue2); S.box(x, 0.98, rz + 0.66, 1.9, 1.3, 0.24, C.blue2);
        if (k < 7) S.box(x + 1.1, 0.98, rz + 0.05, 0.14, 0.42, 1.2, C.metal);
        seats.push({ x, z: rz, y: 0.98, ry: PI, fx: x, fz: rz - 2.0, gate, row: gate + ri, k });
      }
      col(xa - 1.1, xb + 1.1, rz - 0.85, rz + 0.85);
    });
    const dx = gs * 24;
    S.box(dx, 0, -31.7, 5, 1.6, 1.4, C.blue); S.box(dx, 1.6, -31.7, 5.2, 0.1, 1.6, C.white); S.box(dx - 1.4, 1.7, -32.0, 1.0, 0.6, 0.08, C.dark2);
    AT.add(gs < 0 ? 'FX 204  KYOTO' : 'FX 318  MERU STATION', 4.6, 0.8, { bg: '#111111', fg: C.yellow }, { x: dx, y: 0.85, z: -30.98 });
    AT.add('GATE ' + gate, 4, 1.2, { bg: C.yellow, fg: '#111111', icon: 'plane' }, { x: dx, y: 6.2, z: -31.0, both: true });
    S.cyl(dx, 6.8, -31.0, 0.04, 0.04, 1.6, C.metalD, { ink: false });
    colC(dx, -31.7, 5.4, 1.6);
  }
  AT.add('GATES A1  A2', 7, 1.1, { bg: C.yellow, fg: '#111111', icon: 'plane' }, { x: 0, y: 6.4, z: -14, both: true });
  S.cyl(-2.5, 6.9, -14, 0.04, 0.04, 1.6, C.metalD, { ink: false }); S.cyl(2.5, 6.9, -14, 0.04, 0.04, 1.6, C.metalD, { ink: false });

  /* duty free */
  S.box(0, 0, -32.7, 15, 5.2, 0.5, C.white);
  AT.add('DUTY FREE', 8, 1.4, { bg: '#111111', fg: '#ffffff', rule: C.red }, { x: 0, y: 4.1, z: -32.43 });
  col(-7.5, 7.5, -33.2, -32.4);
  const prod = ['#ec3013', '#ffd23a', '#2c6fbb', '#3fa35b', '#8e44ad', '#f4f1ea', '#e8742c', '#2bb3b1'];
  for (const sz of [-27.2, -29.8]) {
    S.box(0, 0, sz, 10, 0.3, 1.0, C.white); S.box(0, 0.3, sz, 10, 2.1, 0.1, C.wall2); S.box(-5, 0, sz, 0.15, 2.5, 1.05, C.white); S.box(5, 0, sz, 0.15, 2.5, 1.05, C.white);
    for (const lv of [0.3, 1.05, 1.8]) {
      if (lv > 0.5) S.box(0, lv - 0.06, sz, 9.8, 0.06, 1.0, C.white, { ink: false });
      for (let k = 0; k < 11; k++) for (const side of [-1, 1]) S.box(-4.5 + k * 0.9, lv, sz + side * 0.28, 0.6, 0.5 + ((k + lv * 3) % 3) * 0.08, 0.35, prod[(k + (side > 0 ? 3 : 0) + Math.round(lv * 2)) % prod.length], { ink: false });
    }
    col(-5.2, 5.2, sz - 0.6, sz + 0.6);
  }
  S.box(5.6, 0, -24.8, 2.8, 1.5, 1.1, C.red); S.box(5.6, 1.5, -24.8, 3.0, 0.08, 1.3, C.white); S.box(5.0, 1.58, -24.8, 0.6, 0.4, 0.5, C.dark2);
  colC(5.6, -24.8, 3.0, 1.3);

  /* restrooms, vending, water */
  for (const [rz, rc] of [[-22, C.blue2], [-17, C.red]]) { S.box(39.75, 0, rz, 0.3, 4.2, 2.4, C.dark); S.box(39.55, 0, rz, 0.1, 3.9, 2.0, rc); col(39.2, 40, rz - 1.3, rz + 1.3); }
  AT.add('RESTROOMS', 4, 0.9, { bg: '#111111', fg: '#ffffff' }, { x: 39.5, y: 5.0, z: -19.5, ry: -PI / 2 });
  S.box(39, 0, -27, 1.2, 3.2, 2.2, C.red); S.box(38.38, 1.0, -27.2, 0.04, 1.8, 1.4, C.dark2, { ink: false }); S.box(38.38, 2.95, -27, 0.04, 0.2, 1.8, C.yellow, { ink: false });
  col(38.3, 40, -28.2, -25.8);
  S.box(39.5, 0, -13.6, 0.8, 1.3, 0.9, C.metal); col(39, 40, -14.1, -13.1);

  /* ---------- room shell, columns, outside (standalone only) ---------- */
  if (full) {
    const wallP = (x, y, z, w, h, ry, color) => E.add(new THREE.PlaneGeometry(w, h), color, { x, y, z, ry, ink: false });
    wallP(-23, 8, 34, 34, 16, PI, C.wall); wallP(23, 8, 34, 34, 16, PI, C.wall); wallP(0, 11, 34, 12, 10, PI, C.wall);
    wallP(-40, 8, 0, 68, 16, PI / 2, C.wall); wallP(40, 8, 0, 68, 16, -PI / 2, C.wall);
    wallP(0, 0.3, -34, 80, 0.6, 0, C.dark); wallP(0, 15, -34, 80, 2, 0, C.wall);
    E.box(-39.9, 0, 0, 0.2, 1.2, 68, C.dark, { ink: false }); E.box(39.9, 0, 0, 0.2, 1.2, 68, C.dark, { ink: false });
    E.box(-23, 0, 33.9, 34, 1.2, 0.2, C.dark, { ink: false }); E.box(23, 0, 33.9, 34, 1.2, 0.2, C.dark, { ink: false });
    E.add(new THREE.PlaneGeometry(80, 68), '#f2efe8', { y: 16, rx: PI / 2, ink: false });
    for (const lx of [-30, -15, 0, 15, 30]) for (const lz of [-26, -14, -2, 10, 22, 30]) LB.add(new THREE.PlaneGeometry(6, 1.2), '#fff7dc', { x: lx, y: 15.9, z: lz, rx: PI / 2, ink: false });
    for (let x = -40; x <= 40; x += 4) E.box(x, 0.6, -33.8, 0.3, 13.4, 0.3, C.frame, { ink: false });
    E.box(0, 5, -33.8, 80, 0.2, 0.25, C.frame, { ink: false }); E.box(0, 10, -33.8, 80, 0.2, 0.25, C.frame, { ink: false });
    EGL.push({ x: 0, y: 7.3, z: -33.86, w: 80, h: 13.4, ry: 0 });
    for (const gx of [-30, 30]) { E.box(gx, 0, -33.7, 3.2, 4.4, 0.3, C.dark); E.box(gx, 0, -33.55, 2.6, 4.0, 0.1, '#3a3d4a', { ink: false }); }
    for (const dx of [-6, -3, 0, 3, 6]) E.box(dx, 0, 34, 0.3, 6, 0.5, C.frame);
    E.box(0, 6, 34, 12.4, 0.4, 0.6, C.frame); EGL.push({ x: 0, y: 3, z: 34, w: 12, h: 6, ry: 0 });
    AT.add('WELCOME TO 8 GATES INTERNATIONAL', 30, 2.2, { bg: C.red, fg: '#ffffff' }, { x: -39.85, y: 10.5, z: 6, ry: PI / 2, list: 'env' });
    AT.add('DEPARTURES', 10, 1.6, { bg: '#111111', fg: C.yellow, icon: 'plane' }, { x: 0, y: 12.8, z: 33.85, ry: PI, list: 'env' });
    AT.add('ARRIVALS  BAGGAGE CLAIM', 16, 1.6, { bg: '#111111', fg: '#ffffff', icon: 'bag' }, { x: 39.85, y: 10, z: 22, ry: -PI / 2, list: 'env' });
    AT.add('AIRSIDE', 10, 1.6, { bg: C.blue, fg: '#ffffff', icon: 'plane' }, { x: 39.85, y: 10, z: -22, ry: -PI / 2, list: 'env' });
    for (const [x, z] of [[-20, 10], [20, 10], [-28, 0], [28, 0], [-20, -14.5], [21, -14.5]]) {
      COLS.cyl(x, 0, z, 0.9, 0.9, 16, C.white, { seg: 20 }); COLS.cyl(x, 0, z, 1.02, 1.02, 1.2, C.dark, { seg: 20 }); COLS.cyl(x, 6, z, 0.94, 0.94, 0.3, C.yellow, { seg: 20, ink: false });
      colC(x, z, 2.0, 2.0, true);
    }
    /* outside */
    E.add(new THREE.PlaneGeometry(320, 160), '#6b7178', { y: -0.06, z: -114, rx: -PI / 2, ink: false });
    E.add(new THREE.PlaneGeometry(320, 60), '#8fbf74', { y: -0.08, z: -224, rx: -PI / 2, ink: false });
    for (let z = -40; z > -180; z -= 8) E.box(0, -0.04, z, 0.5, 0.02, 4, C.yellow, { ink: false });
    E.box(0, -0.04, -100, 300, 0.02, 0.5, C.yellow, { ink: false });
    airplane(E, AT, -24, -58, 0);
    airplane(E, AT, 30, -62, 0.12);
    E.box(-28.5, 3.0, -38.5, 3.0, 3.0, 9, '#c9ced6'); E.box(-28.5, 0, -42, 0.5, 3.0, 0.5, C.metalD);
    E.box(28.5, 3.0, -39.5, 3.0, 3.0, 11, '#c9ced6'); E.box(28.5, 0, -43, 0.5, 3.0, 0.5, C.metalD);
    for (const [vx, vz, vc] of [[-12, -46, C.yellow], [8, -50, '#ffffff'], [14, -44, C.yellow]]) { E.box(vx, 0.4, vz, 2.6, 1.3, 4, vc); E.box(vx, 1.7, vz - 0.8, 2.4, 1.0, 1.8, C.dark2); for (const wx of [-1.1, 1.1]) for (const wz of [-1.3, 1.3]) E.add(new THREE.CylinderGeometry(0.45, 0.45, 0.4, 10), C.dark, { x: vx + wx, y: 0.45, z: vz + wz, rz: PI / 2 }); }
    for (let k = 0; k < 14; k++) { const h = 6 + ((k * 37) % 11) * 2; E.box(-120 + k * 18, 0, -205 - (k % 3) * 6, 12, h, 8, ['#a9c4d6', '#b8cfdd', '#9db7c9'][k % 3], { ink: false }); }
  }

  /* ---------- build meshes ---------- */
  const statics = S.build(); group.add(statics);
  const signs = AT.build(); if (signs.main) group.add(signs.main); if (signs.env && full) env.add(signs.env); if (signs.over) overhead.add(signs.over);
  overhead.add(OH.build());
  let columns = null; if (full) { columns = COLS.build(); env.add(columns); }
  disposables.push(signs.tex, signs.mat);
  const glassMat = new THREE.MeshBasicMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  disposables.push(glassMat);
  const glassMesh = (list) => {
    const P = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), a = new THREE.Vector3();
    for (const g of list) {
      const geo = new THREE.PlaneGeometry(g.w, g.h).toNonIndexed(); e.set(0, g.ry, 0); q.setFromEuler(e); v.set(g.x, g.y, g.z); m.compose(v, q, sc);
      const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { a.fromBufferAttribute(pos, i).applyMatrix4(m); P.push(a.x, a.y, a.z); }
      geo.dispose();
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, glassMat); mesh.renderOrder = 5; return mesh;
  };
  if (GL.length) group.add(glassMesh(GL));
  if (full) {
    env.add(E.build());
    env.add(LB.build({ mat: basicVC(), ink: false }));
    if (EGL.length) env.add(glassMesh(EGL));
    const hemi = new THREE.HemisphereLight('#ffffff', '#b8a98f', 1.25); env.add(hemi);
    const sun = new THREE.DirectionalLight('#fff6e8', 1.7); sun.position.set(30, 60, 40); env.add(sun); env.add(sun.target);
  }

  /* ---------- navigation graph (for walkers) ---------- */
  const NODES = [
    [0, 31], [-12, 31], [12, 31], [-24, 31.5], [24, 31], [-36, 31.5], [36, 30], [-12, 25.5], [12, 25.5], [-5, 24.5], [5, 24.5],
    [-13.6, 18.8], [13.6, 18.8], [-11.8, 10], [11.8, 10], [-5.6, 9], [5.6, 9], [0, 7], [-7, 6.3], [7, 6.3], [-25, 14], [-34, 14], [-36, 24.4], [-16, 24.4],
    [22, 18], [33, 18], [24, 3], [32, 3], [22, 12], [16, 6], [-24, 6], [-34, 6], [-30, -1], [-20, -4], [-28.5, -7.5], [-14, -4], [-13.6, 3.2], [13.6, 3.2],
    [16, 1.5], [16, -6], [16, -13.6], [25, -5], [35, -5], [35, 3],
    [0, 3.6], [0, -3], [0, -10.6], [-7, -11], [7, -11], [-9.6, -11], [9.6, -11], [0, -13.8], [-10, -14], [10, -14], [-24, -15.4], [24, -15.4], [-36, -15.4], [36, -15.4],
    [-13, -21.2], [-13, -25.8], [-13, -30.6], [-35, -21.2], [-35, -25.8], [-35, -30.6], [-24, -21.2], [-24, -25.8], [-24, -30.2],
    [13, -21.2], [13, -25.8], [13, -30.6], [35, -21.2], [35, -25.8], [35, -30.6], [24, -21.2], [24, -25.8], [24, -30.2],
    [-8.5, -23.5], [8.5, -23.5], [0, -23.6], [-8.5, -31], [8.5, -31], [-30, -32.4], [30, -32.4], [37, -19.5], [37, -12.6],
  ].map(([x, z]) => ({ x, z, e: [] }));
  const inside = (c, x, z) => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1;
  function segClear(ax, az, bx, bz, ign) {
    const pad = 0.45;
    for (const c of colliders) {
      if (ign && ign.includes(c)) continue;
      const x0 = c.x0 - pad, x1 = c.x1 + pad, z0 = c.z0 - pad, z1 = c.z1 + pad;
      let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
      let ok = true;
      for (const [p, d, lo, hi] of [[ax, dx, x0, x1], [az, dz, z0, z1]]) {
        if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) { ok = false; break; } }
        else { let ta = (lo - p) / d, tb = (hi - p) / d; if (ta > tb) { const t = ta; ta = tb; tb = t; } t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { ok = false; break; } }
      }
      if (ok) return false;
    }
    return true;
  }
  for (let i = 0; i < NODES.length; i++) for (let j = i + 1; j < NODES.length; j++) {
    const a = NODES[i], b = NODES[j], d = Math.hypot(a.x - b.x, a.z - b.z);
    if (d < 26 && segClear(a.x, a.z, b.x, b.z)) { a.e.push([j, d]); b.e.push([i, d]); }
  }
  function nearestNode(x, z) {
    const ign = colliders.filter(c => inside(c, x, z));
    let best = -1, bd = 1e9;
    NODES.forEach((n, i) => { const d = Math.hypot(n.x - x, n.z - z); if (d < bd && segClear(x, z, n.x, n.z, ign)) { bd = d; best = i; } });
    if (best < 0) NODES.forEach((n, i) => { const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function nav(ax, az, bx, bz) {
    const ignA = colliders.filter(c => inside(c, ax, az)), ignB = colliders.filter(c => inside(c, bx, bz));
    if (segClear(ax, az, bx, bz, ignA.concat(ignB))) return [{ x: bx, z: bz }];
    const s = nearestNode(ax, az), g = nearestNode(bx, bz);
    const dist = new Array(NODES.length).fill(1e9), prev = new Array(NODES.length).fill(-1), done = new Array(NODES.length).fill(false);
    dist[s] = 0;
    for (;;) {
      let u = -1, ud = 1e9; for (let i = 0; i < NODES.length; i++) if (!done[i] && dist[i] < ud) { ud = dist[i]; u = i; }
      if (u < 0 || u === g) break; done[u] = true;
      for (const [v, w] of NODES[u].e) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
    }
    const path = []; let u = g; if (dist[g] < 1e9) { while (u >= 0) { path.unshift({ x: NODES[u].x, z: NODES[u].z }); u = prev[u]; } }
    /* trim the first node if we can skip it */
    while (path.length > 1 && segClear(ax, az, path[1].x, path[1].z, ignA)) path.shift();
    while (path.length > 1 && segClear(path[path.length - 2].x, path[path.length - 2].z, bx, bz, ignB)) path.pop();
    path.push({ x: bx, z: bz });
    return path;
  }

  const spills = [[-6, 20], [6, 14.5], [28, 17.4], [0, -18], [-10, -17.5], [10, -20], [-24, -15.6], [24, -15.6], [30, 2.4], [-30, 10.5], [-24, 2], [-4, 28]].map(([x, z]) => ({ x, z }));

  return {
    colliders, lanes, seats, benches, spills, monitors, archLights, nav, segClear, overhead, columns,
    bounds: { x0: HALL.x0 + 0.6, x1: HALL.x1 - 0.6, z0: HALL.z0 + 0.6, z1: HALL.z1 - 0.6 },
    entrance: { x: 0, z: 32.5 }, gateDoor: { A1: { x: -30, z: -32.6 }, A2: { x: 30, z: -32.6 } },
    staffDoor: { x: -32.6, z: -7.5, front: { x: -31.0, z: -7.5 }, set(v) { doorWant = v ? 1 : 0; } },
    exitLane: { x: 16, z: -4 },
    board: { canvas: bcv, ctx: bcv.getContext('2d'), tex: btex },
    update(t, dt) {
      carousel(t);
      doorOpen += (doorWant - doorOpen) * (1 - Math.exp(-dt * 5));
      doorPivot.rotation.y = doorOpen * 1.25;
    },
    dispose() { disposables.forEach(d => d.dispose && d.dispose()); },
  };
}

/* ---------- airplane (outside the windows) ---------- */
function airplane(B, AT, x, z, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const P = (lx, ly, lz, geo, color, o = {}) => B.add(geo, color, { ...o, x: x + lx * c + lz * s, y: ly, z: z - lx * s + lz * c, ry: ry + (o.ry || 0), order: 'YXZ' });
  P(0, 4.5, 0, new THREE.CylinderGeometry(3, 3, 30, 20), '#f7f7f7', { rx: PI / 2 });
  P(0, 4.5, 15, new THREE.SphereGeometry(3, 20, 12), '#f7f7f7');
  P(0, 5.0, -20, new THREE.CylinderGeometry(0.9, 3, 10, 20), '#f7f7f7', { rx: -PI / 2 });
  P(0, 3.4, 1, new THREE.BoxGeometry(30, 0.5, 5), '#e5e8ec');
  for (const ex of [-6.5, 6.5]) { P(ex, 2.3, 2.6, new THREE.CylinderGeometry(1.15, 1.15, 4.2, 14), '#c9ced6', { rx: PI / 2 }); P(ex, 2.3, 4.72, new THREE.CylinderGeometry(0.85, 0.85, 0.05, 14), '#2f323d', { rx: PI / 2, ink: false }); }
  P(0, 9.2, -21.5, new THREE.BoxGeometry(0.5, 6.4, 5), '#ec3013', { rx: -0.35 });
  P(0, 5.4, -22.5, new THREE.BoxGeometry(11, 0.35, 3), '#e5e8ec');
  P(0, 5.25, 2, new THREE.BoxGeometry(6.08, 0.45, 22), '#2f323d', { ink: false });
  P(0, 3.8, 0, new THREE.BoxGeometry(6.06, 0.3, 27), '#ec3013', { ink: false });
  P(0, 5.7, 16.5, new THREE.BoxGeometry(2.6, 0.55, 1.2), '#2f323d', { rx: -0.6, ink: false });
  for (const [gx, gz] of [[0, 12], [-2.5, 0], [2.5, 0]]) P(gx, 0.6, gz, new THREE.CylinderGeometry(0.6, 0.6, 0.5, 12), '#22252e', { rz: PI / 2 });
  for (const [gx, gz] of [[0, 12], [-2.5, 0], [2.5, 0]]) P(gx, 1.2, gz, new THREE.BoxGeometry(0.3, 1.8, 0.3), '#7b8794');
  AT.add('FX', 2.4, 1.6, { bg: '#ec3013', fg: '#ffd23a' }, { x: x + 0.27 * c + -21.3 * s, y: 9.4, z: z - 0.27 * s + -21.3 * c, ry: ry + PI / 2, list: 'env' });
  AT.add('FX', 2.4, 1.6, { bg: '#ec3013', fg: '#ffd23a' }, { x: x - 0.27 * c + -21.3 * s, y: 9.4, z: z + 0.27 * s + -21.3 * c, ry: ry - PI / 2, list: 'env' });
}

/* ---------- small dynamic props ---------- */
export function makeProp(kind, o = {}) {
  const b = new Builder();
  if (kind === 'suitcase') {
    const col = o.color || '#2c6fbb';
    if (o.type === 'duffel') {
      b.add(new THREE.CapsuleGeometry(0.32, 0.6, 4, 10), col, { y: 0.34, rz: PI / 2 });
      b.box(0, 0.62, 0, 0.5, 0.06, 0.08, '#2f323d'); b.box(-0.25, 0.5, 0, 0.06, 0.2, 0.08, '#2f323d'); b.box(0.25, 0.5, 0, 0.06, 0.2, 0.08, '#2f323d');
    } else if (o.type === 'backpack') {
      b.add(new THREE.CapsuleGeometry(0.3, 0.35, 4, 10), col, { y: 0.48 });
      b.box(0, 0.12, 0.24, 0.42, 0.34, 0.16, col); b.box(0, 0.86, 0, 0.18, 0.06, 0.06, '#2f323d');
    } else {
      b.box(0, 0.08, 0, 0.72, 0.84, 0.38, col); b.box(0, 0.4, 0.2, 0.74, 0.06, 0.03, '#ffffff', { ink: false });
      b.box(-0.2, 0.92, 0, 0.05, 0.16, 0.05, '#2f323d'); b.box(0.2, 0.92, 0, 0.05, 0.16, 0.05, '#2f323d'); b.box(0, 1.06, 0, 0.45, 0.05, 0.06, '#2f323d');
      b.cyl(-0.25, 0, 0, 0.07, 0.07, 0.08, '#22252e', { ink: false }); b.cyl(0.25, 0, 0, 0.07, 0.07, 0.08, '#22252e', { ink: false });
    }
  } else if (kind === 'cone') {
    b.box(0, 0, 0, 0.9, 0.08, 0.9, '#ffd23a'); b.add(new THREE.ConeGeometry(0.34, 1.2, 12), '#ffd23a', { y: 0.68 }); b.cyl(0, 0.5, 0, 0.23, 0.26, 0.16, '#ffffff', { ink: false });
  } else if (kind === 'puddle') {
    b.cyl(0, 0.01, 0, 1.2, 1.2, 0.025, '#6b3d1f', { seg: 18, ink: false }); b.cyl(0.9, 0.01, 0.6, 0.5, 0.5, 0.025, '#6b3d1f', { seg: 12, ink: false });
    b.add(new THREE.CylinderGeometry(0.14, 0.11, 0.38, 10), '#ffffff', { x: 0.4, y: 0.12, z: -0.5, rz: PI / 2 });
  } else if (kind === 'wallet') {
    b.box(0, 0, 0, 0.42, 0.1, 0.3, '#7a4a2a'); b.box(0, 0.1, 0.05, 0.3, 0.02, 0.18, '#ffd23a', { ink: false });
  } else if (kind === 'crate') {
    b.box(0, 0, 0, 0.6, 0.42, 0.5, '#c79a5a'); b.box(0, 0.42, 0, 0.62, 0.03, 0.08, '#8a6a3a', { ink: false });
  } else if (kind === 'ring') {
    const g = new THREE.TorusGeometry(1.25, 0.08, 6, 32); g.rotateX(PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#ffd23a' }));
    const grp = new THREE.Group(); grp.add(m);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.6, 4), new THREE.MeshBasicMaterial({ color: '#ffd23a' })); arrow.rotation.x = PI; arrow.position.y = 3.9; grp.add(arrow);
    grp.userData.arrow = arrow; grp.userData.own = [g, m.material, arrow.geometry, arrow.material];
    return grp;
  } else if (kind === 'chair') {
    b.cyl(0, 0.3, 0, 0.95, 0.75, 0.3, '#2b2d42', { seg: 18 }); b.box(0, 0.6, -0.1, 1.2, 0.3, 1.1, '#3a3d55'); b.box(0, 0.9, -0.62, 1.2, 1.5, 0.22, '#2b2d42');
    b.box(-0.68, 0.9, -0.05, 0.16, 0.4, 0.9, '#3a3d55'); b.box(0.68, 0.9, -0.05, 0.16, 0.4, 0.9, '#3a3d55'); b.box(0, 2.15, -0.62, 0.5, 0.08, 0.16, '#ec3013', { ink: false });
  }
  return b.build();
}
