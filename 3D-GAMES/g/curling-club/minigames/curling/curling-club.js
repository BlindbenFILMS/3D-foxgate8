// 8 GATES — CURLING CLUB [curlingClub] · minigame #67 (Curling). An interior that drops into any building on any world.
// One sheet of ice in a small club hall. Tap the ice to set the skip's broom, pick the curl, hold THROW to set the weight,
// then hold SWEEP (or hold anywhere on the ice) while the stone runs: sweeping carries it further and straighter.
// Modes: vs CPU (ROOKIE / CLUB / PRO) · PASS & PLAY on one phone (2-5, any seat can be CPU) · ONLINE 2-5 (engine/duel-net.js, driven by the page).
//
// NO STATIC IMPORTS on purpose: the page hands in THREE, the fox kit, CAST and the shared save. Module-to-module relative imports
// break when the Design canvas packs each file on its own (the black-screen bug), so this file never imports anything.
//   createCurling({ THREE, container, foxKit, CAST, looks, save, onState, phone }) → game
//   game.start({ mode, players:[{ name, col, cpu, level, netId, me }], ends, net })
//
// Save keys (shared save, engine/save.js): stats curling.games · curling.wins · curling.bestEnd · curling.proWins; flags curling.played · curling.beatPro; item curlingTrophy.

export const CURLING = { key: 'curling', name: 'CURLING CLUB', room: 'curlingClub' };
export const COLORS = [['RED', '#ec3013'], ['BLUE', '#38bdf8'], ['GOLD', '#ffd23a'], ['GREEN', '#22c55e'], ['VIOLET', '#a78bfa']];
export const SHEET = { W: 4.4, NEAR: -2.4, LAUNCH: 0.3, HOG1: 6.4, HOG2: 22, TEE: 28, BACK: 29.83, FAR: 31.6, R: 1.83, r: 0.16 };
export const LEVELS = { rookie: { name: 'ROOKIE', ax: 0.34, ap: 0.05, top: 5, gold: 10, xp: 15 }, club: { name: 'CLUB', ax: 0.17, ap: 0.024, top: 2, gold: 20, xp: 25 }, pro: { name: 'PRO', ax: 0.06, ap: 0.01, top: 1, gold: 35, xp: 40 } };
export const STONES_EACH = { 1: 8, 2: 4, 3: 3, 4: 2, 5: 2 };
const PH = { mu: 0.8, curl: 0.22, s0: 0.55, sweepMu: 0.72, sweepCurl: 0.45, e: 0.86 };
const S_ = SHEET, R2 = (2 * S_.r) * (2 * S_.r);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));

// ---------- weight: meter 0..1 → release speed. 0..0.7 = where it stops (z 19 → 31), 0.7..1 = takeout weight ----------
const ZF0 = 19, ZF1 = 31, PK = 0.7, VMAX = 11;
const vFor = zf => Math.sqrt(2 * PH.mu * (zf - S_.LAUNCH));
export function weightV(p) { p = clamp(p, 0, 1); if (p <= PK) return vFor(ZF0 + (ZF1 - ZF0) * p / PK); const v1 = vFor(ZF1); return v1 + (VMAX - v1) * (p - PK) / (1 - PK); }
const pForZ = z => clamp((z - ZF0) / (ZF1 - ZF0) * PK, 0, PK);
export const ZONES = [
  { id: 'hog', name: 'HOG', a: 0, b: pForZ(S_.HOG2 - 0.1), col: '#7d7979' },
  { id: 'guard', name: 'GUARD', a: pForZ(S_.HOG2 - 0.1), b: pForZ(S_.TEE - S_.R - S_.r), col: '#38bdf8' },
  { id: 'house', name: 'HOUSE', a: pForZ(S_.TEE - S_.R - S_.r), b: pForZ(S_.BACK), col: '#22c55e' },
  { id: 'hit', name: 'HIT', a: pForZ(S_.BACK), b: 1, col: '#ec3013' }];
export const zoneOf = p => ZONES.find(z => p >= z.a && p <= z.b) || ZONES[0];

// ---------- physics (shared by live play, the guide line and the CPU) ----------
export function launch(shot) { const v0 = weightV(shot.p), dx = shot.bx, dz = shot.bz - S_.LAUNCH, L = Math.hypot(dx, dz) || 1; return { x: 0, z: S_.LAUNCH, vx: v0 * dx / L, vz: v0 * dz / L, spin: shot.turn || 0 }; }
export function stepWorld(S, dt, ctl) {
  const ev = []; const sweepId = ctl && ctl.sweeping ? ctl.sweepId : null;
  for (const s of S) {
    if (!s.alive) continue; let sp = Math.hypot(s.vx, s.vz); if (sp <= 0) continue;
    const sw = s.id === sweepId;
    if (s.spin && sp > 0.02) { const k = s.spin * PH.curl * (sw ? PH.sweepCurl : 1) / (sp + PH.s0) * dt; const ux = s.vz / sp, uz = -s.vx / sp; s.vx += ux * k; s.vz += uz * k; sp = Math.hypot(s.vx, s.vz); }
    const dec = PH.mu * (sw ? PH.sweepMu : 1) * dt;
    if (sp <= dec) { s.vx = 0; s.vz = 0; } else { const f = (sp - dec) / sp; s.vx *= f; s.vz *= f; }
    s.x += s.vx * dt; s.z += s.vz * dt;
  }
  for (let i = 0; i < S.length; i++) {
    const a = S[i]; if (!a.alive) continue;
    for (let j = i + 1; j < S.length; j++) {
      const b = S[j]; if (!b.alive) continue;
      const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz; if (d2 >= R2 || d2 === 0) continue;
      const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      const o = 2 * S_.r - d; a.x -= nx * o / 2; a.z -= nz * o / 2; b.x += nx * o / 2; b.z += nz * o / 2;
      if (rel > 0) { const J = (1 + PH.e) / 2 * rel; a.vx -= J * nx; a.vz -= J * nz; b.vx += J * nx; b.vz += J * nz; a.spin *= 0.25; b.spin = 0; a.touched = b.touched = true; ev.push({ type: 'hit', imp: rel, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }); }
    }
  }
  for (const s of S) {
    if (!s.alive) continue;
    if (Math.abs(s.x) > S_.W / 2 - S_.r || s.z - S_.r > S_.BACK || s.z < S_.NEAR) { s.alive = false; s.vx = s.vz = 0; ev.push({ type: 'out', id: s.id, why: s.z - S_.r > S_.BACK ? 'back' : 'side' }); }
  }
  return ev;
}
const moving = S => S.some(s => s.alive && (s.vx !== 0 || s.vz !== 0));
function hogCheck(S, id) { const s = S.find(q => q.id === id); if (s && s.alive && !s.touched && s.z + S_.r < S_.HOG2) { s.alive = false; return true; } return false; }
const cloneS = S => S.filter(s => s.alive).map(s => ({ id: s.id, pi: s.pi, x: s.x, z: s.z, vx: s.vx, vz: s.vz, spin: s.spin, alive: true, touched: s.touched }));
export function simulate(stones, shot, pi, dt = 1 / 60, path) {
  const S = cloneS(stones), L = launch(shot), me = { id: '_sim', pi, ...L, alive: true, touched: false }; S.push(me);
  let t = 0; while (t < 22 && moving(S)) { stepWorld(S, dt); t += dt; if (path && me.alive && path.length < 1400) path.push(me.x, me.z); }
  hogCheck(S, '_sim'); return S;
}
const distB = s => Math.hypot(s.x, s.z - S_.TEE);
export function scoreEnd(stones) {
  const inH = stones.filter(s => s.alive && distB(s) <= S_.R + S_.r).sort((a, b) => distB(a) - distB(b));
  if (!inH.length) return { pi: -1, pts: 0, ids: [] };
  const pi = inH[0].pi, other = inH.find(s => s.pi !== pi), lim = other ? distB(other) : Infinity;
  const ids = inH.filter(s => s.pi === pi && distB(s) < lim).map(s => s.id); return { pi, pts: ids.length, ids };
}

// ---------- CPU skip: try a spread of shots in the real physics, keep the best, then miss a little by level ----------
function evalFor(S, me, lastStone) {
  const sc = scoreEnd(S); let v = sc.pi === me ? sc.pts : sc.pi >= 0 ? -sc.pts * 1.1 : 0;
  if (lastStone) return v;
  for (const s of S) { if (!s.alive) continue; const d = distB(s), mine = s.pi === me;
    if (d <= S_.R + S_.r) v += (mine ? 0.22 : -0.2) * (1 - d / (S_.R + S_.r) * 0.5);
    else if (mine && sc.pi === me && s.z > S_.HOG2 && s.z < S_.TEE - S_.R && Math.abs(s.x) < 1.2) v += 0.12; }
  return v;
}
export function cpuShot(stones, me, level, lastStone, rnd = Math.random) {
  const L = LEVELS[level] || LEVELS.club, C = [];
  for (const turn of [-1, 1]) {
    for (let bx = -1.5; bx <= 1.51; bx += 0.5) for (const p of [0.47, 0.525, 0.575]) C.push({ bx, bz: S_.TEE, turn, p });
    for (const s of stones) if (s.alive && s.pi !== me && s.z > S_.HOG2) for (const p of [0.82, 1]) C.push({ bx: s.x + turn * 0.12 * (1 - p), bz: s.z, turn, p });
    for (const bx of [-0.5, 0, 0.5]) C.push({ bx, bz: S_.TEE, turn, p: 0.33 });
  }
  const scored = C.map(c => ({ c, v: evalFor(simulate(stones, c, me, 1 / 45), me, lastStone) })).sort((a, b) => b.v - a.v);
  const pickN = Math.min(L.top, scored.length), ch = scored[Math.floor(rnd() * pickN)].c, g = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  return { bx: clamp(ch.bx + g() * L.ax, -2, 2), bz: ch.bz, turn: ch.turn, p: clamp(ch.p + g() * L.ap * (ch.p > PK ? 0.6 : 1), 0.02, 1) };
}

// =====================================================================================================================
export async function createCurling({ THREE, container, foxKit, CAST, looks, save, onState, phone }) {
  phone = phone ?? (matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600);
  const renderer = new THREE.WebGLRenderer({ antialias: !phone, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1.5 : 2));
  renderer.shadowMap.enabled = !phone; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#1b2230'); scene.fog = new THREE.Fog('#1b2230', 34, 60);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);

  // ---------- toon kit (the ctx fox-kit.js expects) ----------
  const grad = new THREE.DataTexture(new Uint8Array([96, 176, 255]), 3, 1, THREE.RedFormat); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  const tc = {}; const toon = (col, o) => { if (!o) { if (!tc[col]) tc[col] = new THREE.MeshToonMaterial({ color: col, gradientMap: grad }); return tc[col]; } return new THREE.MeshToonMaterial({ color: col, gradientMap: grad, ...o }); };
  const outlineMat = new THREE.MeshBasicMaterial({ color: '#1e293b', side: THREE.BackSide });
  const OL_MIN = phone ? 0.02 : 0.001;
  function M(geo, mat, x = 0, y = 0, z = 0, parent, ol = 0, r) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (parent) parent.add(m);
    if (ol >= OL_MIN) { if (!r) { geo.computeBoundingSphere(); r = geo.boundingSphere ? geo.boundingSphere.radius : 0.2; } const o = new THREE.Mesh(geo, outlineMat); o.scale.setScalar(1 + ol / Math.max(0.02, r)); o.userData.outline = true; m.add(o); }
    if (!phone) m.castShadow = true; return m;
  }
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = phone ? 2 : 4; return t; };
  const crestTex = (letter, bg = '#38bdf8', fg = '#ffffff', ring = '#0b1430') => canvasTex(128, 128, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 128, 128); g.fillStyle = ring; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill(); g.fillStyle = fg; g.font = '900 72px Archivo, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letter, 64, 70); });
  const rr = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)], smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  let kit = null; try { if (foxKit) kit = foxKit({ THREE, scene, toon, M, grad, outlineMat, crestTex, rr, pick, clamp, smooth, damp }); } catch (e) { console.warn('[curling] fox kit failed, using stand-ins', e); kit = null; }

  // ---------- the hall ----------
  const hemi = new THREE.HemisphereLight('#f4f8ff', '#55607a', 1.25); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 1.5); sun.position.set(3, 12, 6); sun.target.position.set(0, 0, 14); scene.add(sun, sun.target);
  if (!phone) { sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera; sc.left = -5; sc.right = 5; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 40; sun.shadow.bias = -0.0006; }
  const LEN = S_.FAR - S_.NEAR, MIDZ = (S_.FAR + S_.NEAR) / 2;
  const iceTex = canvasTex(256, 2048, (g, w, h) => {
    const zy = z => (z - S_.NEAR) / LEN * h, xx = x => (x + S_.W / 2) / S_.W * w;
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#dbe9f3'); gr.addColorStop(0.5, '#f4f9fd'); gr.addColorStop(1, '#dbe9f3'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,150,180,0.10)'; for (let i = 0; i < 2600; i++) g.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
    const line = (z, col, lw) => { g.fillStyle = col; g.fillRect(0, zy(z) - lw / 2, w, lw); };
    line(S_.HOG1, '#c42d3c', 9); line(S_.HOG2, '#c42d3c', 9); line(S_.TEE, '#201e1d', 2.5); line(S_.BACK, '#201e1d', 3); line(0, '#201e1d', 2.5);
    g.fillStyle = 'rgba(32,30,29,0.45)'; g.fillRect(xx(0) - 0.7, zy(-0.4), 1.4, zy(S_.BACK) - zy(-0.4));
    g.fillStyle = 'rgba(30,41,59,0.55)'; g.fillRect(0, 0, 5, h); g.fillRect(w - 5, 0, 5, h);
  }); iceTex.wrapS = iceTex.wrapT = THREE.ClampToEdgeWrapping;
  const ice = new THREE.Mesh(new THREE.PlaneGeometry(S_.W, LEN), new THREE.MeshToonMaterial({ map: iceTex, gradientMap: grad, color: '#ffffff' }));
  ice.rotation.x = -Math.PI / 2; ice.position.set(0, 0, MIDZ); ice.receiveShadow = true; scene.add(ice);
  // canvas row 0 = the near end: v=1 is local +y, which the -90° x rotation turns to world -z (default flipY keeps row 0 at v=1)
  const houseTex = canvasTex(1024, 1024, (g, w) => { const c = w / 2, k = c / 2.0; const ring = (r, col) => { g.fillStyle = col; g.beginPath(); g.arc(c, c, r * k, 0, 7); g.fill(); };
    ring(S_.R, '#2563eb'); ring(1.22, '#f7fbff'); ring(0.61, '#ec3013'); ring(0.15, '#f7fbff');
    g.strokeStyle = '#201e1d'; g.lineWidth = 3; g.beginPath(); g.arc(c, c, S_.R * k, 0, 7); g.stroke(); g.lineWidth = 2; g.beginPath(); g.moveTo(c - S_.R * k, c); g.lineTo(c + S_.R * k, c); g.moveTo(c, c - S_.R * k); g.lineTo(c, c + S_.R * k); g.stroke();
    g.fillStyle = '#201e1d'; g.font = '800 34px Archivo, Arial, sans-serif'; g.textAlign = 'center'; g.fillText('8', c, c - 0.9 * k); });
  const houses = [S_.TEE, 0].map(z => { const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshToonMaterial({ map: houseTex, gradientMap: grad, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.004, z); m.receiveShadow = true; scene.add(m); return m; });
  houses[1].visible = false;
  // boards, walkways, walls, lights, banners
  const ink = toon('#201e1d'), board = toon('#f3f2f2'), mat = toon('#2b3240'), wall = toon('#d8dee6'), wallD = toon('#aeb8c6');
  for (const s of [-1, 1]) {
    M(new THREE.BoxGeometry(0.14, 0.16, LEN), board, s * (S_.W / 2 + 0.07), 0.08, MIDZ, scene, 0.012, 0.1);
    M(new THREE.BoxGeometry(0.15, 0.04, LEN), toon('#ec3013'), s * (S_.W / 2 + 0.07), 0.17, MIDZ, scene);
    M(new THREE.BoxGeometry(1.4, 0.06, LEN + 4), mat, s * (S_.W / 2 + 0.85), -0.02, MIDZ - 2, scene).receiveShadow = true;
    M(new THREE.BoxGeometry(0.3, 8, LEN + 8), wall, s * 3.75, 4, MIDZ - 2, scene).receiveShadow = true;
    M(new THREE.BoxGeometry(0.32, 1.1, LEN + 8), wallD, s * 3.74, 0.55, MIDZ - 2, scene);
    for (let z = -2; z < 34; z += 6) { const lamp = M(new THREE.BoxGeometry(0.22, 0.08, 3.2), new THREE.MeshBasicMaterial({ color: '#fffbe8' }), s * 1.3, 7.7, z, scene); lamp.castShadow = false; }
    M(new THREE.BoxGeometry(0.34, 0.5, LEN + 8), toon('#8a5a36'), s * 3.72, 1.35, MIDZ - 2, scene);
    for (let z = -4; z < 34; z += 4.5) M(new THREE.BoxGeometry(0.4, 8, 0.3), wallD, s * 3.62, 4, z, scene);
  }
  M(new THREE.BoxGeometry(S_.W + 0.3, 0.3, 0.14), board, 0, 0.15, S_.FAR + 0.07, scene, 0.012, 0.15);
  M(new THREE.BoxGeometry(8, 8, 0.3), toon('#c4ccd8'), 0, 4, S_.FAR + 2.4, scene); M(new THREE.BoxGeometry(8, 8, 0.3), wall, 0, 4, S_.NEAR - 3.6, scene);
  M(new THREE.BoxGeometry(8, 0.2, LEN + 8), toon('#2a303c'), 0, 8, MIDZ - 2, scene);
  for (let z = -4; z < 34; z += 4.5) M(new THREE.BoxGeometry(7.4, 0.35, 0.25), toon('#3a4252'), 0, 7.8, z, scene);
  for (const z of [-0.12]) for (const s of [-1, 1]) M(new THREE.BoxGeometry(0.14, 0.05, 0.22), ink, s * 0.11, 0.025, z, scene);
  const bannerCols = COLORS.map(c => c[1]);
  for (let i = 0; i < 5; i++) { const z = 4 + i * 5.2, s = i % 2 ? 1 : -1; const b = M(new THREE.PlaneGeometry(1.0, 2.0), toon(bannerCols[i], { side: THREE.DoubleSide }), s * 3.58, 4.6, z, scene); b.rotation.y = -s * Math.PI / 2; b.castShadow = false; }
  // scoreboard on the far wall
  const sbCanvas = document.createElement('canvas'); sbCanvas.width = 1024; sbCanvas.height = 512; const sbTex = new THREE.CanvasTexture(sbCanvas); sbTex.colorSpace = THREE.SRGBColorSpace;
  const sb = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3), new THREE.MeshBasicMaterial({ map: sbTex })); sb.position.set(0, 3.4, S_.FAR + 2.24); sb.rotation.y = Math.PI; scene.add(sb);
  M(new THREE.BoxGeometry(4.8, 2.5, 0.08), ink, 0, 3.4, S_.FAR + 2.3, scene);

  // ---------- stones ----------
  const stoneGeo = new THREE.LatheGeometry([[0, 0], [0.12, 0], [0.152, 0.018], [0.16, 0.05], [0.154, 0.085], [0.128, 0.104], [0, 0.11]].map(([x, y]) => new THREE.Vector2(x, y)), phone ? 18 : 26);
  const granite = toon('#9ba3ad'), band = toon('#5b6270');
  function makeStoneMesh(col) {
    const g = new THREE.Group(); M(stoneGeo, granite, 0, 0, 0, g, 0.012, 0.16); M(new THREE.CylinderGeometry(0.161, 0.161, 0.022, phone ? 18 : 26), band, 0, 0.05, 0, g);
    const cm = toon(col); M(new THREE.CylinderGeometry(0.1, 0.1, 0.014, 18), cm, 0, 0.112, 0, g);
    M(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 8), cm, 0, 0.135, -0.03, g); const h = M(new THREE.BoxGeometry(0.045, 0.034, 0.16), cm, 0, 0.16, 0.03, g, 0.008, 0.05); h.rotation.x = 0.12;
    return g;
  }
  const meshPool = new Map(); // stone id → mesh
  const ringGeo = new THREE.RingGeometry(0.19, 0.25, 28); const countRings = [];
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.006; m.visible = false; scene.add(m); countRings.push(m); }

  // ---------- broom target, aim line, guide path ----------
  const broom = new THREE.Group(); scene.add(broom);
  const broomRing = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.27, 32), new THREE.MeshBasicMaterial({ color: '#ec3013', transparent: true, opacity: 0.95, depthWrite: false })); broomRing.rotation.x = -Math.PI / 2; broomRing.position.y = 0.008; broom.add(broomRing);
  const broomPad = M(new THREE.BoxGeometry(0.42, 0.06, 0.14), toon('#ec3013'), 0, 0.05, 0, broom, 0.01, 0.2); const broomStick = M(new THREE.CylinderGeometry(0.018, 0.018, 1.25, 8), toon('#e6b45a'), 0, 0.68, 0, broom, 0.006, 0.6);
  const aimGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.01, S_.LAUNCH), new THREE.Vector3(0, 0.01, S_.TEE)]);
  const aimLine = new THREE.Line(aimGeo, new THREE.LineDashedMaterial({ color: '#201e1d', dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: 0.55 })); aimLine.computeLineDistances(); scene.add(aimLine);
  const guideGeo = new THREE.BufferGeometry(); guideGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 220), 3)); guideGeo.setDrawRange(0, 0);
  const guideLine = new THREE.Line(guideGeo, new THREE.LineBasicMaterial({ color: '#ec3013', transparent: true, opacity: 0.85 })); scene.add(guideLine);
  const ghost = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.17, 24), new THREE.MeshBasicMaterial({ color: '#ec3013', transparent: true, opacity: 0.8, depthWrite: false })); ghost.rotation.x = -Math.PI / 2; ghost.position.y = 0.009; scene.add(ghost);

  // ---------- foxes ----------
  const FUR = [null, { fur: '#9aa3ad', furDark: '#5b6270', paw: '#9aa3ad', tailBase: '#5b6270', tailMid: '#9aa3ad' }, { fur: '#b5452a', furDark: '#7a2a18', paw: '#b5452a', tailBase: '#7a2a18', tailMid: '#b5452a' }, { fur: '#e0a24a', furDark: '#a8701e', paw: '#e0a24a', tailBase: '#a8701e', tailMid: '#e0a24a' }, { fur: '#3b3330', furDark: '#1c1917', paw: '#3b3330', tailBase: '#1c1917', tailMid: '#3b3330' }];
  function makeStandIn(col) { const g = new THREE.Group(), P = {}; P.body = new THREE.Group(); g.add(P.body); M(new THREE.CapsuleGeometry(0.26, 0.5, 4, 10), toon(col), 0, 0.85, 0, P.body, 0.02, 0.4); M(new THREE.SphereGeometry(0.22, 12, 10), toon('#f2741f'), 0, 1.45, 0.02, P.body, 0.02, 0.22); P.arms = [new THREE.Group(), new THREE.Group()]; P.legs = []; g.userData.P = P; g.userData.standIn = true; return g; }
  function makePlayerFox(i, col, cpu) {
    let f = null;
    if (kit) { try {
      const base = (CAST && CAST.player) || {}, look0 = base.look || (looks && looks.player) || undefined;
      const look = cpu ? { ...(look0 || {}), ...(FUR[3]) } : i === 0 ? look0 : { ...(look0 || {}), ...(FUR[i % FUR.length] || {}) };
      f = kit.makeFox({ ...base, look, torso: [col, '#201e1d', '#f3f2f2'], crest: '', gear: 'none', outfit: 'vest', mood: 'determined', eyes: base.eyes || ['#38bdf8', '#38bdf8'] });
      const P = f.userData.P; if (P && P.sword) P.sword.visible = false; if (P && P.gun) P.gun.visible = false;
    } catch (e) { console.warn('[curling] fox failed', e); f = null; } }
    if (!f) f = makeStandIn(col); scene.add(f); return f;
  }
  let sweeper = null; const sweepBroom = new THREE.Group(); scene.add(sweepBroom); sweepBroom.visible = false;
  const sbStick = M(new THREE.CylinderGeometry(0.018, 0.018, 1, 8), toon('#e6b45a'), 0, 0, 0, sweepBroom); const sbPad = M(new THREE.BoxGeometry(0.4, 0.05, 0.12), toon('#201e1d'), 0, 0, 0, sweepBroom, 0.008, 0.2);
  function ensureSweeper() { if (sweeper) return; if (kit) { try { const base = (CAST && CAST.player) || {}; sweeper = kit.makeFox({ ...base, look: { ...(base.look || {}), ...FUR[1] }, torso: ['#201e1d', '#f3f2f2', '#ec3013'], crest: '', gear: 'none', outfit: 'vest', mood: 'excited' }); const P = sweeper.userData.P; if (P && P.sword) P.sword.visible = false; if (P && P.gun) P.gun.visible = false; scene.add(sweeper); } catch (e) { sweeper = null; } } if (!sweeper) { sweeper = makeStandIn('#201e1d'); scene.add(sweeper); } sweeper.visible = false; }
  const anim = (f, dt, sp) => { if (!f || f.userData.standIn) return; try { kit && kit.animFox && kit.animFox(f, dt, sp); } catch (e) {} };

  // ---------- sound (tiny synth; starts on the first tap) ----------
  let AC = null, muted = false, rumble = null, brush = null;
  function audio() { if (AC) return AC; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    const len = AC.sampleRate * 1.5, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const loop = (type, f, q) => { const s = AC.createBufferSource(); s.buffer = buf; s.loop = true; const fl = AC.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = AC.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(AC.destination); s.start(); return { g, fl }; };
    rumble = loop('lowpass', 180, 0.8); brush = loop('bandpass', 2600, 0.9); AC._buf = buf; return AC; }
  function clack(v) { if (!AC || muted) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(820, t); o.frequency.exponentialRampToValueAtTime(260, t + 0.08); g.gain.setValueAtTime(Math.min(0.5, 0.12 + v * 0.06), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + 0.2); }
  function cheer(big) { if (!AC || muted) return; const t = AC.currentTime, s = AC.createBufferSource(); s.buffer = AC._buf; const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 0.5; const g = AC.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(big ? 0.22 : 0.12, t + 0.25); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4); s.connect(f); f.connect(g); g.connect(AC.destination); s.start(t); s.stop(t + 1.5); }
  function tone(f, d = 0.12, v = 0.08) { if (!AC || muted) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02); }
  const buzz = ms => { if (G && G.mode === 'demo') return; try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

  // ---------- game state ----------
  const G = { phase: 'idle', mode: 'cpu', players: [], ends: 4, end: 1, extra: 0, order: [], t: 0, total: 0, each: 4, stones: [], cur: null, endLog: [], shot: { bx: 0.9, bz: S_.TEE, turn: -1, p: 0.525 }, charge: null, sweepHeld: false, sweepTap: -9, fast: false, guide: true, card: null, over: null, banner: '', hint: '', msg: '', runT: 0, settleT: 0, cpuT: 0, net: null, waitSettle: null, firstThrow: true, sweepPct: 0 };
  let foxes = [], thrower = null, throwerZ = -0.6, throwerV = 0, camMode = 'aim', camT = 0, shake = 0, clock = 0;
  const camPos = new THREE.Vector3(0, 9, 17), camLook = new THREE.Vector3(0, 0, 27);
  const isLocal = pi => { const p = G.players[pi]; if (!p) return false; if (G.mode === 'online') return !!p.me; return !p.cpu; };
  const curPi = () => G.order[G.t % G.players.length];
  const leftFor = pi => { const np = G.players.length; let n = 0; for (let k = G.t; k < G.total; k++) if (G.order[k % np] === pi) n++; return n; };

  function clearStones() { for (const [, m] of meshPool) scene.remove(m); meshPool.clear(); G.stones = []; countRings.forEach(r => r.visible = false); }
  function placeBench() {
    foxes.forEach((f, i) => { if (!f) return; f.visible = true; f.position.set(S_.W / 2 + 0.7, 0, -1.6 + i * 0.95); f.rotation.set(0, -Math.PI / 2, 0); f.userData.lookAt = null; });
  }
  function start(cfg) {
    if (cfg.mode !== 'demo') { audio(); if (AC && AC.state === 'suspended') AC.resume(); }
    foxes.forEach(f => f && scene.remove(f)); foxes = [];
    G.cfg = cfg; G.mode = cfg.mode || 'cpu'; G.players = cfg.players.map((p, i) => ({ name: p.name, col: p.col, cpu: !!p.cpu, level: p.level || 'club', netId: p.netId || null, me: !!p.me, score: 0, ends: [], gone: false }));
    G.ends = cfg.ends || 4; G.end = 1; G.extra = 0; G.endLog = []; G.over = null; G.card = null; G.net = cfg.net || null; G.firstThrow = !cfg.skipTips;
    G.each = STONES_EACH[G.players.length] || 2; G.order = G.players.map((_, i) => i);
    foxes = G.players.map((p, i) => makePlayerFox(i, p.col, p.cpu)); ensureSweeper(); placeBench();
    houses[1].visible = true; drawBoard(); beginEnd();
  }
  function beginEnd() { clearStones(); G.t = 0; G.total = G.each * G.players.length; G.card = null; beginTurn(); }
  function beginTurn() {
    const pi = curPi(), p = G.players[pi]; G.cur = null; G.charge = null; G.sweepHeld = false; G.fast = false; G.waitSettle = null;
    placeBench(); thrower = foxes[pi]; if (thrower) { thrower.position.set(0, 0, -0.62); thrower.rotation.set(0, 0, 0); } throwerZ = -0.62; throwerV = 0;
    const st = { id: G.end + '-' + G.t, pi, x: 0, z: S_.LAUNCH, vx: 0, vz: 0, spin: 0, alive: true, touched: false, onDeck: true }; G.stones.push(st); stoneMesh(st);
    G.shot = { bx: (G.shot && G.shot.turn ? -G.shot.turn : 1) * 0.9, bz: S_.TEE, turn: G.shot && G.shot.turn ? G.shot.turn : -1, p: 0.525 };
    if (p.gone) { st.alive = false; G.phase = 'settle'; G.settleT = 0.3; return emit(true); }
    camMode = 'aim'; camT = 0;
    if (G.mode === 'online' && !isLocal(pi)) { G.phase = 'wait'; G.banner = p.name + ' IS AIMING'; G.hint = 'Watch the broom. Their stone comes next.'; }
    else if (p.cpu) { G.phase = 'cpu'; G.cpuT = G.mode === 'demo' ? 1.3 : 0.9; G.banner = p.name + ' IS READING THE ICE'; G.hint = G.mode === 'demo' ? '1 · The skip picks a spot. Tap the ice to set the broom there.' : ''; }
    else { G.phase = 'aim'; G.banner = (G.mode === 'cpu' ? 'YOUR THROW' : p.name + ' · YOUR THROW'); G.hint = G.firstThrow ? 'Tap the ice to set the broom. Then hold THROW.' : 'Set the broom · pick the curl · hold THROW'; tone(660, 0.08, 0.05); }
    updateAim(); emit(true);
  }
  function stoneMesh(s) { let m = meshPool.get(s.id); if (!m) { m = makeStoneMesh(G.players[s.pi].col); meshPool.set(s.id, m); scene.add(m); } m.position.set(s.x, 0, s.z); m.visible = true; m.scale.setScalar(1); return m; }

  // ---------- aim ----------
  function setBroom(x, z) { if (!(G.phase === 'aim' || G.phase === 'charge')) return; G.shot.bx = clamp(x, -2.05, 2.05); G.shot.bz = clamp(z, S_.HOG2 + 1, S_.FAR - 0.4); G.firstThrow && G.phase === 'aim' && (G.hint = 'Good. Pick the curl, then hold THROW to set the weight.'); updateAim(); netAim(); emit(); }
  function nudge(dx, dz = 0) { setBroom(G.shot.bx + dx, G.shot.bz + dz); }
  function setTurn(t) { if (!(G.phase === 'aim' || G.phase === 'charge')) return; G.shot.turn = t === 'R' ? -1 : t === 'L' ? 1 : -G.shot.turn; updateAim(); netAim(); emit(); }
  let lastNetAim = 0; function netAim() { if (G.mode !== 'online' || !G.net) return; const n = performance.now(); if (n - lastNetAim < 110) return; lastNetAim = n; G.net.send({ k: 'aim', t: G.t, end: G.end, bx: G.shot.bx, bz: G.shot.bz, turn: G.shot.turn }); }
  function updateAim() {
    const show = G.phase === 'aim' || G.phase === 'charge' || G.phase === 'wait' || G.phase === 'cpu' || G.phase === 'cpuaim' || G.phase === 'cpucharge';
    const col = G.players[curPi()] ? G.players[curPi()].col : '#ec3013';
    broom.visible = show; broom.position.set(G.shot.bx, 0, G.shot.bz); broomRing.material.color.set(col); broomPad.material = toon(col);
    aimLine.visible = show && G.phase !== 'cpu'; const a = aimGeo.attributes.position; a.setXYZ(0, 0, 0.012, S_.LAUNCH); a.setXYZ(1, G.shot.bx, 0.012, G.shot.bz); a.needsUpdate = true; aimLine.computeLineDistances();
    const gOn = show && G.guide && (G.phase === 'aim' || G.phase === 'charge') && isLocal(curPi());
    guideLine.visible = ghost.visible = gOn;
    if (gOn) { const path = [], p = G.charge ? G.charge.p : G.shot.p, S = simulate([], { ...G.shot, p }, curPi(), 1 / 40, path); const pos = guideGeo.attributes.position, n = Math.min(220, path.length / 2), step = Math.max(1, Math.floor(path.length / 2 / 220));
      let k = 0; for (let i = 0; i < path.length / 2 && k < 220; i += step, k++) pos.setXYZ(k, path[i * 2], 0.014, path[i * 2 + 1]); pos.needsUpdate = true; guideGeo.setDrawRange(0, k); guideGeo.computeBoundingSphere();
      const me = S.find(s => s.id === '_sim'); ghost.visible = !!me; if (me) ghost.position.set(me.x, 0.009, me.z); guideLine.material.color.set(col); ghost.material.color.set(col); }
  }
  // ---------- weight: hold to charge (ping-pong), release to throw. A quick tap starts it; the next tap throws ----------
  function chargeDown() {
    if (G.phase === 'aim') { G.phase = 'charge'; G.charge = { p: 0, dir: 1, t0: performance.now() }; G.hint = 'Let go in the zone you want.'; emit(true); return; }
    if (G.phase === 'charge' && G.charge && G.charge.tapMode) release();
  }
  function chargeUp() { if (G.phase !== 'charge' || !G.charge) return; if (performance.now() - G.charge.t0 < 180 && !G.charge.tapMode) { G.charge.tapMode = true; G.hint = 'Tap THROW again to let go.'; emit(true); return; } if (!G.charge.tapMode) release(); }
  function cancelCharge() { if (G.phase === 'charge') { G.phase = 'aim'; G.charge = null; updateAim(); emit(true); } }
  function release() { const p = G.charge ? G.charge.p : 0.5; G.charge = null; G.firstThrow = false; throwShot({ ...G.shot, p }, true); }
  function throwShot(shot, local) {
    const pi = curPi(), st = G.stones.find(s => s.onDeck); if (!st) return; st.onDeck = false;
    const L = launch(shot); Object.assign(st, { x: L.x, z: L.z, vx: L.vx, vz: L.vz, spin: L.spin });
    G.shot = { ...shot }; G.cur = st.id; G.phase = 'run'; G.runT = 0; G.sweepHeld = false; G.sweepTap = -9; G.sweepPct = 0; G.sweepFrames = 0; G.runFrames = 0;
    camMode = 'throw'; camT = 0; throwerZ = st.z - 0.62; throwerV = Math.hypot(L.vx, L.vz) * 0.95;
    G.demoSweep = G.mode === 'demo' && shot.p < 0.7 && Math.random() < 0.75 ? [8 + Math.random() * 5, 17 + Math.random() * 6] : null;
    const zn = zoneOf(shot.p); G.banner = zn.name + ' WEIGHT'; G.hint = isLocal(pi) && !G.players[pi].cpu ? 'HOLD SWEEP (or hold the ice) to carry it further and straighter.' : '';
    if (G.mode === 'demo') G.hint = '4 · ' + (G.demoSweep ? 'Hold SWEEP while it runs: further and straighter.' : 'No sweep needed on this one.');
    if (local && G.mode === 'online' && G.net) G.net.send({ k: 'throw', t: G.t, end: G.end, shot });
    broom.visible = aimLine.visible = guideLine.visible = ghost.visible = false; tone(440, 0.06, 0.05); buzz(15); emit(true);
  }
  function sweep(on) { if (G.phase !== 'run' || !isLocal(curPi())) { G.sweepHeld = false; return; } if (on && !G.sweepHeld) G.sweepTap = clock; G.sweepHeld = !!on; if (G.mode === 'online' && G.net) G.net.send({ k: 'sw', t: G.t, on: !!on }); emit(true); }
  const sweeping = () => { if (G.mode === 'demo' && G.demoSweep && G.phase === 'run') { const s = G.stones.find(q => q.id === G.cur); return !!(s && s.z > G.demoSweep[0] && s.z < G.demoSweep[1]); } return G.sweepHeld || clock - G.sweepTap < 0.3; };

  // ---------- run + settle ----------
  function stepRun(dt) {
    const sub = G.fast ? 6 : 2, h = dt / 2, sw = sweeping();
    for (let i = 0; i < sub; i++) {
      const ev = stepWorld(G.stones, h, { sweepId: G.cur, sweeping: sw });
      for (const e of ev) { if (e.type === 'hit') { clack(e.imp); buzz(Math.min(40, 10 + e.imp * 6)); shake = Math.min(0.25, 0.05 + e.imp * 0.03); } if (e.type === 'out') outFx(e.id); }
    }
    G.runT += dt; G.runFrames++; if (sw) G.sweepFrames++;
    if (!moving(G.stones)) {
      const hog = hogCheck(G.stones, G.cur); if (hog) { outFx(G.cur); G.banner = 'HOGGED'; G.hint = 'It must pass the far red line.'; tone(180, 0.25, 0.08); }
      G.phase = 'settle'; G.settleT = G.fast ? 0.5 : 1.3; G.sweepHeld = false; showCount(); afterRun(); emit(true);
    }
  }
  function outFx(id) { const s = G.stones.find(q => q.id === id); if (!s) return; s.outT = 0.001; }
  function afterRun() {
    const sc = scoreEnd(G.stones); const s = G.stones.find(q => q.id === G.cur);
    if (s && s.alive && G.banner !== 'HOGGED') { const d = distB(s); G.banner = d < 0.3 ? 'ON THE BUTTON' : d <= S_.R + S_.r ? (sc.ids.includes(s.id) ? 'SHOT STONE' : 'IN THE HOUSE') : s.z < S_.TEE - S_.R ? 'GUARD' : 'BITER'; }
    else if (s && !s.alive && G.banner !== 'HOGGED') G.banner = 'THROUGH';
    G.hint = sc.pts ? G.players[sc.pi].name + ' SITTING ' + sc.pts : 'NO STONE IN THE HOUSE YET';
    if (G.mode === 'online' && G.net && isLocal(curPi())) G.net.send({ k: 'settle', t: G.t, end: G.end, stones: G.stones.map(s => ({ id: s.id, pi: s.pi, x: +s.x.toFixed(4), z: +s.z.toFixed(4), alive: s.alive, touched: !!s.touched })) });
    if (G.mode === 'online' && !isLocal(curPi())) { G.waitSettle = G.waitSettle && G.waitSettle.got ? G.waitSettle : { since: clock, got: null }; }
  }
  function applySettle(d) { for (const q of d.stones) { let s = G.stones.find(z => z.id === q.id); if (!s) { s = { id: q.id, pi: q.pi, vx: 0, vz: 0, spin: 0 }; G.stones.push(s); } s.x = q.x; s.z = q.z; s.vx = s.vz = 0; s.touched = q.touched; if (s.alive && !q.alive) s.outT = 0.001; s.alive = q.alive; s.onDeck = false; } }
  function showCount() { const sc = scoreEnd(G.stones); countRings.forEach(r => r.visible = false); sc.ids.forEach((id, i) => { const s = G.stones.find(q => q.id === id), r = countRings[i]; if (!s || !r) return; r.visible = true; r.position.set(s.x, 0.006, s.z); r.material.color.set(G.players[sc.pi].col); }); }
  function nextTurn() {
    G.t++; countRings.forEach(r => r.visible = false);
    if (G.t >= G.total) return endOfEnd();
    let guard = 0; while (G.players[curPi()].gone && guard++ < G.total) { const st = { id: G.end + '-' + G.t, pi: curPi(), x: 0, z: 0, alive: false }; G.stones.push(st); G.t++; if (G.t >= G.total) return endOfEnd(); }
    beginTurn();
  }
  function endOfEnd() {
    const sc = scoreEnd(G.stones); G.players.forEach((p, i) => p.ends.push(i === sc.pi ? sc.pts : 0)); if (sc.pi >= 0) G.players[sc.pi].score += sc.pts;
    G.endLog.push(sc); showCount(); drawBoard();
    if (sc.pts) { cheer(sc.pts >= 2); buzz([30, 40, 30]); }
    if (sc.pi >= 0 && sc.pts && isLocal(sc.pi) && save) try { save.best('curling.bestEnd', sc.pts); } catch (e) {}
    // next order: the end's scorer throws first (gives up the hammer); a blank end keeps the order
    if (sc.pi >= 0 && sc.pts) { const k = G.order.indexOf(sc.pi); G.order = [...G.order.slice(k), ...G.order.slice(0, k)]; }
    const last = G.end >= G.ends + G.extra, top = Math.max(...G.players.map(p => p.score)), leaders = G.players.filter(p => p.score === top);
    const tied = last && leaders.length > 1 && G.extra < 2; if (tied) G.extra++;
    G.phase = 'endcard'; camMode = 'house';
    G.card = { end: G.end, title: sc.pts ? G.players[sc.pi].name + (G.players[sc.pi].name === 'YOU' ? ' SCORE ' : ' SCORES ') + sc.pts : 'BLANK END', col: sc.pi >= 0 ? G.players[sc.pi].col : '#f3f2f2', sub: sc.pts ? (sc.pts === 1 ? 'One stone closest to the button.' : sc.pts + ' stones closer than anyone else’s best.') : 'Nobody in the house. The order stays.', extra: tied, final: last && !tied, autoT: G.mode === 'online' ? 5 : G.mode === 'demo' ? 3.5 : 0 };
    G.banner = 'END ' + G.end; G.hint = ''; emit(true);
  }
  function nextEnd() {
    if (G.phase !== 'endcard') return;
    if (G.card && G.card.final) return gameOver();
    G.end++; beginEnd();
  }
  function gameOver() {
    const top = Math.max(...G.players.map(p => p.score)), win = G.players.map((p, i) => ({ ...p, i })).filter(p => p.score === top);
    const solo = win.length === 1 ? win[0] : null; let reward = null;
    try { if (save && G.mode !== 'demo') { save.setFlag('curling.played'); save.setStat('curling.games', save.stat('curling.games') + 1);
      const meWon = solo && isLocal(solo.i) && !solo.cpu;
      if (G.mode === 'cpu' && meWon) { const cpu = G.players.find(p => p.cpu), L = LEVELS[cpu ? cpu.level : 'club']; save.addGold(L.gold); save.addXp(L.xp); save.setStat('curling.wins', save.stat('curling.wins') + 1); reward = '+' + L.gold + ' GOLD · +' + L.xp + ' XP';
        if (cpu && cpu.level === 'pro') { save.setStat('curling.proWins', save.stat('curling.proWins') + 1); if (!save.flag('curling.beatPro')) { save.setFlag('curling.beatPro'); save.give('curlingTrophy', 1); reward += ' · CURLING TROPHY'; } } }
      else if (G.mode === 'online' && meWon) { save.addGold(10); save.addXp(10); save.setStat('curling.wins', save.stat('curling.wins') + 1); reward = '+10 GOLD · +10 XP'; }
      else if (G.mode !== 'cpu') { save.addXp(5); reward = '+5 XP FOR PLAYING'; } } } catch (e) {}
    G.phase = 'over'; G.card = null; camMode = 'house';
    G.over = { title: solo ? solo.name + (solo.name === 'YOU' ? ' WIN' : ' WINS') : 'A TIE', col: solo ? solo.col : '#f3f2f2', rows: G.players.map(p => ({ name: p.name, col: p.col, score: p.score, ends: p.ends.slice() })).sort((a, b) => b.score - a.score), reward };
    cheer(true); emit(true);
  }
  function quit() { G.phase = 'idle'; G.card = null; G.over = null; clearStones(); foxes.forEach(f => f && scene.remove(f)); foxes = []; if (sweeper) sweeper.visible = false; sweepBroom.visible = false; broom.visible = aimLine.visible = guideLine.visible = ghost.visible = false; camMode = 'intro'; G.players = []; drawBoard(); emit(true); }

  // ---------- online messages (the page owns the room; it forwards game messages here) ----------
  function netMsg(d, from) {
    if (!d || G.mode !== 'online') return; const pi = curPi(), owner = G.players[pi];
    if (d.k === 'aim' && d.t === G.t && d.end === G.end && G.phase === 'wait' && owner && owner.netId === from) { G.shot.bx = d.bx; G.shot.bz = d.bz; G.shot.turn = d.turn; updateAim(); }
    else if (d.k === 'throw' && d.t === G.t && d.end === G.end && G.phase === 'wait' && owner && owner.netId === from) throwShot(d.shot, false);
    else if (d.k === 'sw' && d.t === G.t && owner && owner.netId === from) { G.sweepHeld = !!d.on; if (d.on) G.sweepTap = clock; }
    else if (d.k === 'settle' && d.end === G.end && owner && owner.netId === from) { if (d.t === G.t) { if (G.phase === 'settle' || G.phase === 'run') { applySettle(d); if (G.phase === 'run') { G.phase = 'settle'; G.settleT = 0.6; afterRun(); } G.waitSettle = { got: true }; showCount(); } else G.pendingSettle = d; } }
  }
  function netDrop(id) { const i = G.players.findIndex(p => p.netId === id); if (i < 0) return; G.players[i].gone = true; G.msg = G.players[i].name + ' LEFT'; if (G.phase === 'wait' && curPi() === i) { const st = G.stones.find(s => s.onDeck); if (st) st.alive = false; G.phase = 'settle'; G.settleT = 0.4; G.waitSettle = { got: true }; } emit(true); }

  // ---------- scoreboard texture ----------
  function drawBoard() {
    const g = sbCanvas.getContext('2d'), W = 1024, H = 512; g.fillStyle = '#201e1d'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ec3013'; g.fillRect(0, 0, W, 86); g.fillStyle = '#ffffff'; g.font = '800 52px Archivo, Arial, sans-serif'; g.textBaseline = 'middle'; g.fillText('CURLING CLUB', 32, 46);
    g.textAlign = 'right'; g.font = '800 36px Archivo, Arial, sans-serif'; g.fillText(G.players.length ? 'END ' + Math.min(G.end, G.ends + G.extra) + ' / ' + (G.ends + G.extra) : 'SHEET 8', W - 32, 46); g.textAlign = 'left';
    const n = Math.max(1, G.players.length), rowH = Math.min(84, (H - 110) / n), E = G.ends + G.extra, cw = Math.min(64, 520 / Math.max(1, E));
    G.players.forEach((p, i) => { const y = 104 + i * rowH; g.fillStyle = p.col; g.fillRect(32, y + 8, 22, rowH - 16); g.fillStyle = '#ffffff'; g.font = '800 ' + Math.round(rowH * 0.45) + 'px Archivo, Arial, sans-serif'; g.fillText(p.name.slice(0, 9), 70, y + rowH / 2);
      for (let e = 0; e < E; e++) { const x = 330 + e * cw; g.strokeStyle = '#444141'; g.lineWidth = 2; g.strokeRect(x, y + 6, cw - 6, rowH - 12); const v = p.ends[e]; if (v != null) { g.fillStyle = v ? p.col : '#7d7979'; g.textAlign = 'center'; g.fillText(String(v), x + (cw - 6) / 2, y + rowH / 2); g.textAlign = 'left'; } }
      g.fillStyle = '#ffd23a'; g.textAlign = 'right'; g.fillText(String(p.score), W - 36, y + rowH / 2); g.textAlign = 'left'; });
    if (!G.players.length) { g.fillStyle = '#cfcac4'; g.font = '600 34px Archivo, Arial, sans-serif'; g.fillText('Pick a game to start.', 32, 200); }
    sbTex.needsUpdate = true;
  }
  drawBoard();

  // ---------- pointer on the ice: tap / drag = broom, hold = sweep ----------
  const ray = new THREE.Raycaster(), nd = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const el = renderer.domElement; let dragging = false;
  function icePoint(e) { const r = el.getBoundingClientRect(); nd.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(nd, camera); return ray.ray.intersectPlane(plane, hit) ? hit : null; }
  const onDown = e => { audio(); if (AC && AC.state === 'suspended') AC.resume();
    if (G.phase === 'aim' && isLocal(curPi())) { const p = icePoint(e); if (p) { dragging = true; try { el.setPointerCapture(e.pointerId); } catch (er) {} setBroom(p.x, p.z); } }
    else if (G.phase === 'run' && isLocal(curPi())) { dragging = true; try { el.setPointerCapture(e.pointerId); } catch (er) {} sweep(true); } };
  const onMove = e => { if (!dragging) return; if (G.phase === 'aim') { const p = icePoint(e); if (p) setBroom(p.x, p.z); } };
  const onUp = () => { if (!dragging) return; dragging = false; if (G.phase === 'run') sweep(false); };
  el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);

  // ---------- camera ----------
  const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
  function aimCam(out, look) { const a = camera.aspect; if (a < 0.8) { out.set(0, 7.2, 20.4); look.set(0, 0, 27.0); camera.fov = 58; } else if (a < 1.3) { out.set(0, 6.6, 20.6); look.set(0, 0, 27.2); camera.fov = 50; } else { out.set(0, 4.6, 21.6); look.set(0, 0, 27.4); camera.fov = 44; } }
  function camTarget(dt) {
    const s = G.cur ? G.stones.find(q => q.id === G.cur) : null; const a = camera.aspect;
    if (camMode === 'intro') { const t = clock * 0.12; tmpP.set(Math.sin(t) * 1.4, 2.6, 6 + Math.sin(t * 0.7) * 2); tmpL.set(0, -0.6, 26); camera.fov = a < 0.8 ? 62 : 48; return; }
    if (camMode === 'aim' || camMode === 'house') { aimCam(tmpP, tmpL); return; }
    if (camMode === 'throw' && s) {
      const far = smooth(16, 23, s.z), hx = s.x * 0.6, early = 1 - smooth(4, 9, s.z);
      const chase = tmpP.set(hx - 0.85 - early * 1.7, (a < 0.8 ? 3.3 : 2.6) - early * 0.9, s.z - (a < 0.8 ? 5.2 : 4.4) + early * 1.1), cl = new THREE.Vector3(hx * 0.5, 0.1, s.z + 7.5 - early * 1.5);
      const hp = new THREE.Vector3(), hl = new THREE.Vector3(); aimCam(hp, hl);
      tmpP.lerpVectors(chase, hp, far); tmpL.lerpVectors(cl, hl, far); camera.fov = lerp(a < 0.8 ? 60 : 48, camera.fov, far); return;
    }
    aimCam(tmpP, tmpL);
  }
  function resize() { const w = container.clientWidth || 1, h = container.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  // ---------- frame ----------
  let raf = 0, last = performance.now(), emitT = 0, alive = true;
  function frame(now) {
    if (!alive) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt; if (document.hidden) return;
    if (G.phase === 'charge' && G.charge) { const c = G.charge; c.p += c.dir * dt / 1.5; if (c.p >= 1) { c.p = 1; c.dir = -1; } if (c.p <= 0) { c.p = 0; c.dir = 1; } if ((emitT += dt) > 0.033) updateAim(); }
    if (G.phase === 'cpu') { G.cpuT -= dt; if (G.cpuT <= 0) { const pi = curPi(), mine = G.stones.filter(s => !s.onDeck); const last1 = leftFor(pi) === 1 && G.t >= G.total - G.players.length; const shot = cpuShot(mine, pi, G.players[pi].level, last1); G.shot.bx = shot.bx; G.shot.bz = shot.bz; G.shot.turn = shot.turn; updateAim(); G.phase = 'cpuaim'; G.cpuT = G.mode === 'demo' ? 1.6 : 0.8; G.cpuShot = shot; G.banner = G.players[pi].name + ' SETS THE BROOM'; if (G.mode === 'demo') G.hint = '2 · Broom set, curl ' + (shot.turn === -1 ? 'right' : 'left') + '. The stone bends as it slows.'; emit(true); } }
    else if (G.phase === 'cpuaim') { G.cpuT -= dt; if (G.cpuT <= 0) { if (G.mode === 'demo') { G.phase = 'cpucharge'; G.charge = { p: 0, dir: 1, t0: performance.now() }; G.banner = G.players[curPi()].name + ' THROWS'; G.hint = '3 · Hold THROW. The bar fills. Let go in the zone you want.'; emit(true); } else throwShot(G.cpuShot, false); } }
    else if (G.phase === 'cpucharge') { const c = G.charge; c.p = Math.min(G.cpuShot.p, c.p + dt / 1.5); if (c.p >= G.cpuShot.p) { c.hold = (c.hold || 0) + dt; if (c.hold > 0.35) { G.charge = null; throwShot(G.cpuShot, false); } } }
    else if (G.phase === 'over' && G.mode === 'demo') { G.demoT = (G.demoT ?? 4) - dt; if (G.demoT <= 0) { G.demoT = null; start(G.cfg); } }
    else if (G.phase === 'run') stepRun(dt);
    else if (G.phase === 'settle') {
      G.settleT -= dt; if (G.pendingSettle && G.pendingSettle.t === G.t) { applySettle(G.pendingSettle); G.pendingSettle = null; G.waitSettle = { got: true }; showCount(); }
      const waiting = G.mode === 'online' && !isLocal(curPi()) && G.waitSettle && !G.waitSettle.got && clock - G.waitSettle.since < 7 && !G.players[curPi()].gone;
      if (G.settleT <= 0 && !waiting) nextTurn();
    } else if (G.phase === 'endcard' && G.card && G.card.autoT) { G.card.autoT -= dt; if (G.card.autoT <= 0) nextEnd(); }
    // stones
    for (const s of G.stones) { const m = meshPool.get(s.id); if (!m) continue;
      if (s.outT) { s.outT += dt; m.position.y = -s.outT * 0.25; m.scale.setScalar(Math.max(0.01, 1 - s.outT * 1.6)); if (s.outT > 0.7) { m.visible = false; s.outT = 0; } continue; }
      if (!s.alive) { m.visible = false; continue; }
      m.position.set(s.x, 0, s.z); if (s.vx || s.vz) m.rotation.y += (s.spin || 0.2) * dt * 1.4; }
    // thrower slide
    if (thrower) { const s = G.cur ? G.stones.find(q => q.id === G.cur) : null;
      if (G.phase === 'run' && s && s.z < 3.4 && throwerV > 0) { throwerZ = s.z - 0.62; throwerV = Math.hypot(s.vx, s.vz); }
      else if (throwerV > 0) { throwerV = Math.max(0, throwerV - dt * 10); throwerZ += throwerV * dt; }
      thrower.position.z = throwerZ; thrower.position.x = s && G.phase === 'run' ? Math.min(Math.max(s.x * 0.5, -0.4), 0.4) : 0;
      anim(thrower, dt, 0); const P = thrower.userData.P; const crouch = G.phase === 'aim' || G.phase === 'charge' || G.phase === 'cpu' || G.phase === 'cpuaim' || G.phase === 'cpucharge' || G.phase === 'wait' || throwerV > 0.3;
      if (P && P.body && crouch && !thrower.userData.standIn) { P.body.rotation.x = 0.42; if (P.arms && P.arms[1]) P.arms[1].rotation.x = -1.15; if (P.legs && P.legs[0]) { P.legs[0].rotation.x = -0.7; P.legs[1].rotation.x = 0.9; } } }
    foxes.forEach(f => { if (f && f !== thrower) anim(f, dt, 0); });
    // sweeper
    { const s = G.cur ? G.stones.find(q => q.id === G.cur) : null, on = G.phase === 'run' && s && s.alive && s.z > 7.5 && s.z < 19.5;
      if (sweeper) { if (on) { if (!sweeper.visible) { sweeper.visible = true; sweeper.position.set(s.x + 0.62, 0, s.z + 0.5); } const sp = Math.hypot(s.vx, s.vz); sweeper.position.x = damp(sweeper.position.x, s.x + 0.62, 8, dt); sweeper.position.z = damp(sweeper.position.z, s.z + 0.55, 8, dt); sweeper.rotation.y = -Math.PI / 2 + 0.5; anim(sweeper, dt, sp * 1.2);
          const sw = sweeping(), wig = sw ? Math.sin(clock * 34) * 0.16 : Math.sin(clock * 3) * 0.03; tmpP.set(s.x + wig, 0.03, s.z + 0.4 + (sw ? 0 : 0.25)); const hand = new THREE.Vector3(sweeper.position.x - 0.18, 0.95, sweeper.position.z - 0.05);
          sweepBroom.visible = true; sbPad.position.copy(tmpP); const mid = hand.clone().add(tmpP).multiplyScalar(0.5); sbStick.position.copy(mid); sbStick.scale.set(1, hand.distanceTo(tmpP), 1); sbStick.lookAt(tmpP); sbStick.rotateX(Math.PI / 2); sbPad.rotation.set(0, 0, 0);
          if (sweeper.userData.P && sweeper.userData.P.arms) { const A = sweeper.userData.P.arms; A[0].rotation.x = -0.9 + wig; A[1].rotation.x = -0.7 - wig; } }
        else { sweeper.visible = false; sweepBroom.visible = false; } } }
    // sound levels
    if (AC && rumble) { const s = G.cur ? G.stones.find(q => q.id === G.cur) : null, sp = G.phase === 'run' && s ? Math.hypot(s.vx, s.vz) : 0; rumble.g.gain.value = muted ? 0 : Math.min(0.25, sp * 0.03); brush.g.gain.value = muted || G.phase !== 'run' ? 0 : sweeping() ? 0.07 + 0.05 * Math.abs(Math.sin(clock * 34)) : 0; }
    // broom bob
    if (broom.visible) { broomStick.rotation.z = Math.sin(clock * 2.2) * 0.08; broomRing.scale.setScalar(1 + Math.sin(clock * 4) * 0.06); }
    // camera
    camTarget(dt); const k = camMode === 'throw' ? 5 : 3.2; camPos.x = damp(camPos.x, tmpP.x, k, dt); camPos.y = damp(camPos.y, tmpP.y, k, dt); camPos.z = damp(camPos.z, tmpP.z, k, dt); camLook.x = damp(camLook.x, tmpL.x, k, dt); camLook.y = damp(camLook.y, tmpL.y, k, dt); camLook.z = damp(camLook.z, tmpL.z, k, dt);
    if (shake > 0) { shake = Math.max(0, shake - dt * 0.8); } camera.position.set(camPos.x + (Math.random() - 0.5) * shake, camPos.y + (Math.random() - 0.5) * shake, camPos.z); camera.lookAt(camLook); camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    emitT += dt; if (G.phase === 'run' || G.phase === 'charge' || G.phase === 'cpucharge' ? emitT > 0.066 : emitT > 0.25) emit();
  }
  camMode = 'intro'; camPos.set(0, 2.6, 6); camLook.set(0, -0.6, 26); raf = requestAnimationFrame(frame);

  // ---------- HUD snapshot for the page ----------
  function hud() {
    const pi = G.players.length ? curPi() : -1, cp = G.players[pi], sc = G.stones.length ? scoreEnd(G.stones) : { pi: -1, pts: 0, ids: [] };
    const mini = G.stones.filter(s => s.alive && !s.onDeck && s.z > S_.TEE - 4.4).map(s => ({ x: s.x, z: s.z, col: G.players[s.pi] ? G.players[s.pi].col : '#fff', count: sc.ids.includes(s.id), moving: !!(s.vx || s.vz) }));
    return { demo: G.mode === 'demo', phase: G.phase, mode: G.mode, end: G.end, ends: G.ends + G.extra, extra: G.extra, curPi: pi, curName: cp ? cp.name : '', curCol: cp ? cp.col : '#ec3013', mine: pi >= 0 && isLocal(pi) && !(cp && cp.cpu), cpu: !!(cp && cp.cpu),
      players: G.players.map((p, i) => ({ name: p.name, col: p.col, score: p.score, left: G.players.length ? leftFor(i) - (G.phase === 'run' || G.phase === 'settle' ? 0 : 0) : 0, cur: i === pi, cpu: p.cpu, gone: p.gone, me: p.me })),
      each: G.each, banner: G.banner, hint: G.hint, msg: G.msg, turn: G.shot.turn === -1 ? 'R' : 'L', p: G.charge ? G.charge.p : null, tapMode: !!(G.charge && G.charge.tapMode), zone: G.charge ? zoneOf(G.charge.p) : null,
      sweeping: G.phase === 'run' && sweeping(), canSweep: G.phase === 'run' && pi >= 0 && isLocal(pi) && !(cp && cp.cpu), fast: G.fast, guide: G.guide, muted,
      sitting: sc.pts ? { name: G.players[sc.pi].name, col: G.players[sc.pi].col, pts: sc.pts } : null, mini, broom: { x: G.shot.bx, z: G.shot.bz }, card: G.card, over: G.over, sweepPct: G.runFrames ? Math.round(100 * G.sweepFrames / G.runFrames) : 0 };
  }
  let lastEmit = 0; function emit(force) { const n = performance.now(); if (!force && n - lastEmit < 60) return; lastEmit = n; emitT = 0; try { onState && onState(hud()); } catch (e) { console.warn(e); } }

  return {
    start, setBroom, nudge, setTurn, chargeDown, chargeUp, cancelCharge, sweep, quit, nextEnd, netMsg, netDrop, hud, resize,
    sweepTap() { if (G.phase === 'run' && isLocal(curPi())) { G.sweepTap = clock; emit(true); } },
    setFast(on) { G.fast = !!on; emit(true); }, setGuide(on) { G.guide = !!on; updateAim(); emit(true); }, setMuted(on) { muted = !!on; emit(true); },
    get state() { return G; },
    destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp); try { AC && AC.close(); } catch (e) {} renderer.dispose(); el.remove(); },
  };
}
