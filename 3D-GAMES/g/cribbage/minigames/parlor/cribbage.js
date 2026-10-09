// 8 GATES — CRIBBAGE [cribbage]. Minigame #7 (CARDS & DICE). A pegboard and a deck on a tavern table that fits any building on any world.
// Rules live in cribbage-rules.js (pure, tested). This file is the 3D table (board + pegs, cards, foxes), sound, CPU timing, demo and online sync.
// Modes: VS FOXES (1–3 CPU foxes) · PASS & PLAY (2–4 on one phone, a cover screen hides each hand) · ONLINE (2–4, host-run, hands stay secret) · DEMO.
// 4 players = two teams of partners (0+2 vs 1+3). Game to 121 (or a short game to 61).
// MERGE: createCribbage({ container, onState, theme, music }) stands alone; it only needs vendor/three, fox-kit.js, engine/cast.js, engine/textures.js,
// engine/save.js, engine/bake.js. Save keys all start 'cribbage.'.
import * as THREE from '../../vendor/three/three.module.js';
import { foxKit, PLAYER_MALE, PLAYER_FEMALE, KING_MIGHT } from '../../fox-kit.js';
import { castKit, loadCastRigs } from '../../engine/cast.js';
import { crestTex, canvasTex, FONT } from '../../engine/textures.js';
import { save } from '../../engine/save.js';
import { bakeCreature } from '../../engine/bake.js';
import { makeAudio } from './cribbage-audio.js';
import * as R from './cribbage-rules.js';

export const CRIBBAGE = { name: 'CRIBBAGE', room: 'cribbage', key: 'cribbage', maxPlayers: 4, number: 7 };
export const SK = k => 'cribbage.' + k;
export const COLS = [['RED', '#ec3013'], ['BLUE', '#38bdf8'], ['GOLD', '#ffd23a'], ['GREEN', '#22c55e']];
// DRAFT for Ben: gold + XP
export const PAY = { winPerRival: 15, skunkX: 2, bigHandAt: 20, bigHand: 5, perfect: 50, trophy: 'cribbageBoard', perfectItem: 'cribbage29', xpMatch: 8 };
// DRAFT for Ben: CPU table. Hope + Noble from engine/cast.js.
export const CPUS = [
  { key: 'hope', name: 'HOPE', cast: 'hope', skill: 0.9 },
  { key: 'noble', name: 'NOBLE', cast: 'noble', skill: 0.82 },
  { key: 'king', name: 'KING MIGHT', fox: { look: KING_MIGHT, torso: ['#7c3aed', '#e6b45a', '#3b0764'], outfit: 'royal', crown: true, mood: 'stern' }, skill: 0.97 },
  { key: 'marla', name: 'MARLA', fox: { look: PLAYER_FEMALE, torso: ['#f472b6', '#fce7f3', '#9d174d'], outfit: 'coat', mood: 'happy' }, skill: 0.6 }];
export const THEMES = {
  meru: { felt: '#1f5f44', wood: '#7a4a26', woodD: '#4f2e16', trim: '#e6b45a', back: '#c42d3c', table: '#5a3a22', wall: ['#3a2a4a', '#1a1426'] },
  gaya: { felt: '#2b5a8a', wood: '#8a6a4a', woodD: '#5a4230', trim: '#e2e8f0', back: '#2563eb', table: '#6a5240', wall: ['#2a3a5a', '#141a2c'] },
  jidda: { felt: '#0e6f7a', wood: '#c49a6c', woodD: '#8a6640', trim: '#ffd23a', back: '#0e7fb8', table: '#a4804e', wall: ['#2a5a6a', '#123038'] },
  kufa: { felt: '#7a3424', wood: '#b07a46', woodD: '#7a5028', trim: '#ffd23a', back: '#c2410c', table: '#8a6236', wall: ['#5a3a2a', '#2a1a12'] },
  luxor: { felt: '#2a2a2a', wood: '#5a4a3a', woodD: '#2a221a', trim: '#e6b45a', back: '#ec3013', table: '#3a302a', wall: ['#3a3434', '#141212'] },
  nebo: { felt: '#355f27', wood: '#8a5a2a', woodD: '#5a3a18', trim: '#f6d27a', back: '#15803d', table: '#6a4420', wall: ['#2a4030', '#121e16'] },
  ur: { felt: '#5f4580', wood: '#a88a5a', woodD: '#705a36', trim: '#e6b45a', back: '#7c3aed', table: '#806a44', wall: ['#4a3a5a', '#1e1628'] },
  zion: { felt: '#6f2828', wood: '#9a6a3a', woodD: '#643f1e', trim: '#ffd23a', back: '#b45309', table: '#7a5230', wall: ['#5a3a2a', '#24160e'] },
  home: { felt: '#1f5565', wood: '#8a5a3a', woodD: '#5a3a22', trim: '#f3f2f2', back: '#ec3013', table: '#6a4a30', wall: ['#3a3a4a', '#16161e'] },
  earth: { felt: '#1a5236', wood: '#6a4a3a', woodD: '#3a2a20', trim: '#d4d4d8', back: '#1e3a8a', table: '#4a3a30', wall: ['#30343e', '#121418'] },
  station: { felt: '#1e293b', wood: '#64748b', woodD: '#334155', trim: '#38bdf8', back: '#0369a1', table: '#475569', wall: ['#0f1a2e', '#04070f'] } };
// suit shapes (24×24), used by the 3D cards (Path2D) and the page (inline SVG): spades, hearts, diamonds, clubs
export const SUIT_PATH = [
  'M12 2C5 9 2 12 4.5 15.5C6.8 18.4 10.4 17.4 11.2 15.4L9 22L15 22L12.8 15.4C13.6 17.4 17.2 18.4 19.5 15.5C22 12 19 9 12 2Z',
  'M12 21C4 15 1 10.5 4 6.5C6.5 3.5 10.5 4 12 7.5C13.5 4 17.5 3.5 20 6.5C23 10.5 20 15 12 21Z',
  'M12 2L20 12L12 22L4 12Z',
  'M12 2.5a4.3 4.3 0 1 1 0 8.6a4.3 4.3 0 1 1 0-8.6ZM6.8 9.6a4.3 4.3 0 1 1 0 8.6a4.3 4.3 0 1 1 0-8.6ZM17.2 9.6a4.3 4.3 0 1 1 0 8.6a4.3 4.3 0 1 1 0-8.6ZM10.8 12L9 22L15 22L13.2 12Z'];
export const SUIT_COL4 = ['#201e1d', '#d7262e', '#1f5fd1', '#15803d'], SUIT_COL2 = ['#201e1d', '#d7262e', '#d7262e', '#201e1d'];
export const SUIT_NAME = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];

// ---------------- the DEMO (you vs Hope, Hope deals). Fixed cards so it always teaches the same things. ----------------
const C = (r, s) => s * 13 + r - 1;   // rank 1–13, suit 0 ♠ 1 ♥ 2 ♦ 3 ♣
export const DEMO_RIG = { dealer: 1, hands: [[C(5, 1), C(5, 3), C(6, 0), C(13, 2), C(9, 3), C(2, 1)], [C(7, 1), C(8, 3), C(8, 2), C(5, 2), C(12, 0), C(1, 2)]], starter: C(4, 2) };
export const DEMO = [
  { cap: 'Cribbage: the first to 121 points wins. You score while you play your cards, and again when you count your hand.', wait: 4200 },
  { cap: 'Hope dealt six cards each. Two of yours go face down into the CRIB, a bonus hand that belongs to the dealer.', wait: 4200 },
  { cap: 'Keep cards that work together. You keep 5, 5, 6 and King, and give the 9 and the 2 to Hope\'s crib.', key: 'TAP 9 + 2 · TO THE CRIB', acts: [{ a: 'pick', c: C(9, 3) }, { a: 'pick', c: C(2, 1) }, { a: 'disc', p: 0, pause: 900 }], wait: 1600 },
  { cap: 'Hope throws her two. The deck is cut: this STARTER card counts in every hand.', acts: [{ a: 'disc', p: 1, cards: [C(12, 0), C(1, 2)] }], wait: 3600 },
  { cap: 'PEGGING: take turns playing one card. The count adds up and can never go past 31. You lead the King: count 10.', key: 'TAP KING · PLAY', acts: [{ a: 'play', p: 0, c: C(13, 2) }], wait: 2800 },
  { cap: 'Hope plays a 5: count 15. Making exactly 15 scores 2. Her peg jumps on the board.', acts: [{ a: 'play', p: 1, c: C(5, 2) }], wait: 3400 },
  { cap: 'You play your 5 on hers: a PAIR scores 2.', key: 'PLAY 5', acts: [{ a: 'play', p: 0, c: C(5, 1) }], wait: 2800 },
  { cap: 'Hope plays an 8: count 28. Neither of you can play without going past 31.', acts: [{ a: 'play', p: 1, c: C(8, 3) }], wait: 2600 },
  { cap: 'That is a GO. Hope played last, so she scores 1 and the count starts again at 0.', wait: 3800 },
  { cap: 'You lead the 6. Hope answers with the 7: count 13.', key: 'PLAY 6', acts: [{ a: 'play', p: 0, c: C(6, 0) }, { a: 'play', p: 1, c: C(7, 1), pause: 1200 }], wait: 2000 },
  { cap: 'You play your last 5: 6, 7 and 5 make a RUN of three, in any order. 3 points.', key: 'PLAY 5', acts: [{ a: 'play', p: 0, c: C(5, 3) }], wait: 3200 },
  { cap: 'Hope adds the 8: a run of FOUR, 4 points. She also scores 1 for the last card.', acts: [{ a: 'play', p: 1, c: C(8, 2) }], wait: 4200 },
  { cap: 'THE SHOW: each hand is counted with the starter. Yours first: 4, 5, 5, 6 and King. Fifteens, a pair and two runs.', wait: 9800 },
  { cap: 'Then Hope counts her hand…', acts: [{ a: 'next' }], wait: 7000 },
  { cap: '…and her crib, because she dealt.', acts: [{ a: 'next' }], wait: 6200 },
  { cap: 'Next the deal moves to you, and the crib is yours. Keep going until someone reaches 121. Tap EXIT DEMO, then PLAY.', key: 'EXIT DEMO', wait: 6500 }];

const rr = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)], clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }, damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const hash = n => { const x = Math.sin(n * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); };

export async function createCribbage({ container, onState = () => {}, theme = 'meru', music = true } = {}) {
  const TH = THEMES[theme] || THEMES.meru, touch = matchMedia('(pointer: coarse)').matches, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CW = () => container.clientWidth || 1, CH = () => container.clientHeight || 1;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touch ? 1.75 : 2)); renderer.setSize(CW(), CH()); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !touch; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none'; container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, 0.05, 60), V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const grad = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  const cache = new Map(), toon = (c, extra) => { const k = c + (extra ? JSON.stringify(extra) : ''); if (!cache.has(k)) cache.set(k, new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...extra })); return cache.get(k); };
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1a1626, side: THREE.BackSide });
  function addOutline(mesh, t = 0.02, radius) { const g = mesh.geometry; g.computeBoundingBox(); const s = V3(); g.boundingBox.getSize(s); const o = new THREE.Mesh(g, outlineMat); if (radius) o.scale.setScalar(1 + t / radius); else o.scale.set(1 + 2 * t / Math.max(s.x, 0.01), 1 + 2 * t / Math.max(s.y, 0.01), 1 + 2 * t / Math.max(s.z, 0.01)); o.raycast = () => {}; mesh.add(o); return mesh; }
  function M(geo, mat, x = 0, y = 0, z = 0, parent, outline = 0.012, radius) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = !touch; if (outline) addOutline(m, outline, radius); (parent || scene).add(m); return m; }
  const texMat = (map, extra) => new THREE.MeshToonMaterial({ map, gradientMap: grad, ...extra });
  const sfx = makeAudio(); sfx.setMusic(music && save.stat(SK('music'), 1) !== 0);
  const vib = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
  try { if (document.fonts) await Promise.race([document.fonts.load('900 100px Archivo'), new Promise(r => setTimeout(r, 700))]); } catch (e) {}

  // ---- textures ----
  const woodTex = (base, dark, w = 256, h = 64, rep) => canvasTex(w, h, (g) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { g.strokeStyle = i % 3 ? dark : '#ffffff'; g.globalAlpha = i % 3 ? rr(0.1, 0.3) : rr(0.05, 0.12); g.lineWidth = rr(0.6, 2.2); g.beginPath(); let y = rr(0, h); g.moveTo(0, y); for (let x = 0; x <= w; x += 16) { y += rr(-1, 1); g.lineTo(x, y + Math.sin(x * 0.03 + i) * 1.4); } g.stroke(); }
    for (let k = 0; k < 2; k++) { const cx = rr(30, w - 30), cy = rr(12, h - 12); g.strokeStyle = dark; for (let r = 2; r < 12; r += 2.5) { g.globalAlpha = 0.3; g.beginPath(); g.ellipse(cx, cy, r * 2.4, r * 0.7, 0, 0, 7); g.stroke(); } } g.globalAlpha = 1; }, rep);
  const blobTex = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, 'rgba(0,0,0,0.5)'); r.addColorStop(0.55, 'rgba(0,0,0,0.22)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  const blob = (w, d, y, x = 0, z = 0, op = 1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: op })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 1; scene.add(m); return m; };
  function roundedBox(w, h, d, r, s = 3) { const g = new THREE.BoxGeometry(w, h, d, s, s, s), p = g.attributes.position, v = V3(), c = V3(), hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); c.set(clamp(v.x, -hw, hw), clamp(v.y, -hh, hh), clamp(v.z, -hd, hd)); const n = v.clone().sub(c); if (n.lengthSq() > 1e-10) v.copy(c).add(n.normalize().multiplyScalar(r)); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g; }

  // ---- room + table (same lamp-lit tavern table as Shut the Box) ----
  scene.background = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, TH.wall[0]); gr.addColorStop(1, TH.wall[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  scene.add(new THREE.HemisphereLight(0xfff2dc, 0x3a2a3a, 0.95));
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.4); sun.position.set(1.6, 6, 3.2); sun.castShadow = !touch; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0005; Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 14 }); scene.add(sun);
  const lamp = new THREE.PointLight(0xffc77a, 2.2, 9, 2); lamp.position.set(0.3, 2.3, 0.7); scene.add(lamp);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.12, 64), texMat(woodTex(TH.table, '#000000', 512, 512, [2, 2]))); table.position.y = -0.06; table.receiveShadow = !touch; scene.add(table);
  M(new THREE.CylinderGeometry(3.34, 3.2, 0.1, 64), toon(TH.woodD), 0, -0.16, 0, scene, 0);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), toon(TH.wall[1])); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.9; scene.add(floor);
  const glow = (w, a) => canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, `rgba(255,214,150,${a})`); r.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(64, 0.85), transparent: true, depthWrite: false })); lampGlow.position.set(0, 3.4, -1.2); lampGlow.scale.set(7, 7, 1); scene.add(lampGlow);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), new THREE.MeshBasicMaterial({ map: glow(64, 0.22), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.003; scene.add(pool);
  // felt play mat
  const MAT_W = 2.9, MAT_D = 1.3, MAT_Z = -0.12;
  const matTex = canvasTex(512, 192, (g, w, h) => { g.fillStyle = TH.felt; g.fillRect(0, 0, w, h); for (let i = 0; i < 7000; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.05)'; g.fillRect(rr(0, w), rr(0, h), rr(1, 2), 1); }
    const v = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.6); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.35)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
    g.strokeStyle = TH.trim; g.globalAlpha = 0.55; g.lineWidth = 3; g.strokeRect(10, 10, w - 20, h - 20); g.globalAlpha = 0.13; g.fillStyle = TH.trim; g.font = `900 46px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FIFTEEN TWO', w / 2, h * 0.52); g.globalAlpha = 1; });
  matTex.anisotropy = 8;
  blob(MAT_W + 0.3, MAT_D + 0.3, 0.002, 0, MAT_Z, 0.6);
  const mat = M(roundedBox(MAT_W, 0.012, MAT_D, 0.005, 1), [toon(TH.woodD), toon(TH.woodD), texMat(matTex), toon(TH.woodD), toon(TH.woodD), toon(TH.woodD)], 0, 0.006, MAT_Z, scene, 0);

  // ---- the cribbage board: one lane per side, 2 streets of 60 holes, finish hole 121, skunk line at 91 ----
  const board = new THREE.Group(); board.position.set(0, 0, 0.78); scene.add(board);
  const HX = 0.031, GX = 0.013, ROW = 59 * HX + 11 * GX, X0 = -ROW / 2, LANE = 0.052, holeX = i => X0 + i * HX + Math.floor(i / 5) * GX;
  let boardSides = 0, holesMesh = null, boardBase = null, boardBits = [], pegs = [];
  const bandZ = (b, lanes) => (b ? 1 : -1) * (lanes * LANE / 2 + 0.035);
  function holePos(side, n, lanes) { const lz = l => (l - (lanes - 1) / 2) * LANE;
    if (n >= 121) return V3(X0 - 0.1, 0.05, 0); if (n <= 0) return V3(X0 - (n === 0 ? 0.06 : 0.11), 0.05, bandZ(0, lanes) + lz(side));
    if (n <= 60) return V3(holeX(n - 1), 0.05, bandZ(0, lanes) + lz(side)); return V3(holeX(120 - n), 0.05, bandZ(1, lanes) + lz(lanes - 1 - side)); }
  function buildBoard(sides) { if (boardSides === sides.length && holesMesh) return; boardSides = sides.length;
    [boardBase, holesMesh, ...boardBits, ...pegs.flatMap(p => p.m)].forEach(o => o && o.parent && o.parent.remove(o)); boardBits = []; pegs = [];
    const L = sides.length, D = 2 * (L * LANE) + 0.17, W = ROW + 0.36;
    boardBase = M(roundedBox(W, 0.05, D, 0.02, 2), [toon(TH.woodD), toon(TH.woodD), texMat(woodTex(TH.wood, TH.woodD, 512, 128)), toon(TH.woodD), toon(TH.woodD), toon(TH.woodD)], 0, 0.025, 0, board, 0.012);
    boardBits.push(blob(W + 0.25, D + 0.25, 0.003, 0, board.position.z, 0.7));
    // coloured lane inlays + the brass skunk line + the finish ring
    for (let s = 0; s < L; s++) for (const b of [0, 1]) { const lz = (s - (L - 1) / 2) * LANE * (b ? -1 : 1), z = bandZ(b, L) + lz; const st = new THREE.Mesh(new THREE.PlaneGeometry(ROW + 0.02, 0.012), new THREE.MeshBasicMaterial({ color: sides[s].col, transparent: true, opacity: 0.55 })); st.rotation.x = -Math.PI / 2; st.position.set(0, 0.0505, z + LANE * 0.36); board.add(st); boardBits.push(st); }
    const sk = holePos(0, 91, L); const skl = M(new THREE.BoxGeometry(0.006, 0.004, L * LANE + 0.02), toon(TH.trim), sk.x + HX / 2, 0.052, bandZ(1, L), board, 0); boardBits.push(skl);
    const ring = M(new THREE.TorusGeometry(0.022, 0.005, 6, 20), toon(TH.trim), X0 - 0.1, 0.051, 0, board, 0); ring.rotation.x = Math.PI / 2; boardBits.push(ring);
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.05), new THREE.MeshBasicMaterial({ map: canvasTex(160, 50, (g) => { g.fillStyle = TH.trim; g.font = `900 30px ${FONT}`; g.textBaseline = 'middle'; g.fillText('121', 4, 27); }), transparent: true })); lbl.rotation.x = -Math.PI / 2; lbl.position.set(X0 - 0.1, 0.0515, 0.06); board.add(lbl); boardBits.push(lbl);
    for (const sx of [-1, 1]) { const plate = M(new THREE.BoxGeometry(0.05, 0.056, D - 0.04), toon(TH.trim, { emissive: new THREE.Color(TH.trim), emissiveIntensity: 0.08 }), sx * (W / 2 - 0.03), 0.028, 0, board, 0.006); boardBits.push(plate); }
    const cr = new THREE.Mesh(new THREE.CircleGeometry(0.055, 28), new THREE.MeshBasicMaterial({ map: crestTex('8', TH.trim) })); cr.rotation.x = -Math.PI / 2; cr.position.set(ROW / 2 + 0.12, 0.0515, 0); board.add(cr); boardBits.push(cr);
    // holes: one instanced mesh
    const n = L * 122 + 1; holesMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.004, 8), new THREE.MeshBasicMaterial({ color: 0x120c08 }), n); const d = new THREE.Object3D(); let k = 0;
    for (let s = 0; s < L; s++) for (let h = -1; h <= 120; h++) { d.position.copy(holePos(s, h, L)); d.position.y = 0.0505; d.updateMatrix(); holesMesh.setMatrixAt(k++, d.matrix); } d.position.copy(holePos(0, 121, L)); d.position.y = 0.0505; d.scale.setScalar(1.6); d.updateMatrix(); holesMesh.setMatrixAt(k++, d.matrix); board.add(holesMesh);
    // pegs: two per side, the back one leapfrogs the front one
    const pegGeo = new THREE.CylinderGeometry(0.011, 0.009, 0.08, 10), headGeo = new THREE.SphereGeometry(0.018, 12, 8);
    sides.forEach((sd, s) => { const mat = toon(sd.col, { emissive: new THREE.Color(sd.col), emissiveIntensity: 0.15 });
      const mk = h => { const g = new THREE.Group(); const b = new THREE.Mesh(pegGeo, mat); b.position.y = 0.04; const hd = new THREE.Mesh(headGeo, mat); hd.position.y = 0.085; addOutline(hd, 0.005, 0.018); g.add(b, hd); g.position.copy(holePos(s, h, L)); g.position.y = 0.022; board.add(g); return g; };
      pegs.push({ m: [mk(-1), mk(0)], h: [-1, 0], anim: [null, null] }); }); }
  function setPegs(scores) { pegs.forEach((P, s) => { const sc = scores[s]; if (sc == null || P.h.includes(sc) && (sc > 0 || P.h[0] + P.h[1] === -1)) return;
      if (sc <= 0) { P.h = [-1, 0]; P.m.forEach((m, k) => { P.anim[k] = { from: m.position.clone(), to: holePos(s, P.h[k], boardSides), t0: performance.now(), dur: 420 }; }); return; }
      const k = P.h[0] < P.h[1] ? 0 : 1; P.h[k] = sc; P.anim[k] = { from: P.m[k].position.clone(), to: holePos(s, Math.min(121, sc), boardSides), t0: performance.now(), dur: 520 }; setTimeout(() => sfx.peg(0, 1), 480); }); }
  const pops = [];
  function popScore(side, pts, col) { if (!pegs[side] || RM) return; const P = pegs[side], k = P.h[0] > P.h[1] ? 0 : 1, at = holePos(side, Math.min(121, P.h[k]), boardSides).add(board.position);
    const tex = canvasTex(128, 64, (g) => { g.font = `900 52px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = '#000'; g.strokeText('+' + pts, 64, 34); g.fillStyle = col; g.fillText('+' + pts, 64, 34); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false })); sp.scale.set(0.22, 0.11, 1); sp.position.copy(at).setY(0.2); sp.renderOrder = 5; sp.visible = false; scene.add(sp); pops.push({ sp, t0: performance.now() + 450, y: 0.2 }); }
  function stepPops(t) { for (let i = pops.length - 1; i >= 0; i--) { const o = pops[i], k = (t - o.t0) / 1300; o.sp.visible = k >= 0; if (k < 0) continue; o.sp.position.y = o.y + k * 0.25; o.sp.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3; if (k >= 1) { scene.remove(o.sp); o.sp.material.map.dispose(); o.sp.material.dispose(); pops.splice(i, 1); } } }
  function stepPegs(now) { pegs.forEach(P => P.m.forEach((m, k) => { const A = P.anim[k]; if (!A) return; const t = clamp((now - A.t0) / A.dur, 0, 1), e = t * t * (3 - 2 * t); m.position.lerpVectors(A.from, A.to, e); m.position.y = 0.022 + Math.sin(Math.PI * t) * 0.14; if (t >= 1) P.anim[k] = null; })); }

  // ---- cards ----
  const CW_ = 0.3, CD_ = 0.42, CT = 0.006, cardGeo = (() => { const g = roundedBox(CW_, CT, CD_, 0.0024, 1), G0 = g.groups; g.clearGroups(); g.addGroup(G0[0].start, G0[1].start + G0[1].count - G0[0].start, 0); g.addGroup(G0[2].start, G0[2].count, 1); g.addGroup(G0[3].start, G0[3].count, 2); g.addGroup(G0[4].start, G0[5].start + G0[5].count - G0[4].start, 0); return g; })();
  let fourColor = save.stat(SK('fourColor'), 1) !== 0;
  const suitPath = SUIT_PATH.map(d => { try { return new Path2D(d); } catch (e) { return null; } });
  function drawSuit(g, s, x, y, size, col) { const p = suitPath[s]; if (!p) return; g.save(); g.translate(x - size / 2, y - size / 2); g.scale(size / 24, size / 24); g.fillStyle = col; g.fill(p); g.restore(); }
  function drawCard(id) { const r = R.rank(id), s = R.suit(id), col = (fourColor ? SUIT_COL4 : SUIT_COL2)[s], txt = R.RANK_TXT[r];
    return canvasTex(200, 284, (g, w, h) => { g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2a211a'; g.lineWidth = 4; g.beginPath(); g.roundRect ? g.roundRect(5, 5, w - 10, h - 10, 14) : g.rect(5, 5, w - 10, h - 10); g.stroke();
      const corner = (rot) => { g.save(); if (rot) { g.translate(w, h); g.rotate(Math.PI); } g.fillStyle = col; g.font = `900 ${txt.length > 1 ? 40 : 48}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(txt, 34, 14); drawSuit(g, s, 34, 84, 34, col); g.restore(); };
      corner(false); corner(true);
      if (r >= 11) { g.fillStyle = col; g.globalAlpha = 0.12; g.fillRect(58, 54, w - 116, h - 108); g.globalAlpha = 1; g.strokeStyle = col; g.lineWidth = 3; g.strokeRect(58, 54, w - 116, h - 108);
        g.fillStyle = TH.trim; g.beginPath(); const cx = w / 2, cy = 104; g.moveTo(cx - 30, cy + 14); g.lineTo(cx - 30, cy - 10); g.lineTo(cx - 15, cy + 2); g.lineTo(cx, cy - 18); g.lineTo(cx + 15, cy + 2); g.lineTo(cx + 30, cy - 10); g.lineTo(cx + 30, cy + 14); g.closePath(); g.fill(); g.strokeStyle = '#2a211a'; g.lineWidth = 2; g.stroke();
        g.fillStyle = col; g.font = `900 92px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 26); drawSuit(g, s, w / 2, h - 82, 34, col); }
      else if (r === 1) drawSuit(g, s, w / 2, h / 2, 120, col);
      else { drawSuit(g, s, w / 2, h / 2 - 22, 88, col); g.fillStyle = col; g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 62); } }); }
  const backTex = canvasTex(200, 284, (g, w, h) => { g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, h); g.fillStyle = TH.back; g.fillRect(12, 12, w - 24, h - 24); g.strokeStyle = TH.trim; g.globalAlpha = 0.5; g.lineWidth = 2;
    for (let i = -h; i < w + h; i += 18) { g.beginPath(); g.moveTo(i, 12); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i, h - 12); g.lineTo(i + h, 0); g.stroke(); } g.globalAlpha = 1; g.lineWidth = 4; g.strokeRect(22, 22, w - 44, h - 44);
    g.fillStyle = TH.trim; g.beginPath(); g.arc(w / 2, h / 2, 34, 0, 7); g.fill(); g.fillStyle = TH.back; g.font = `900 44px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('8', w / 2, h / 2 + 3); });
  const edgeM = toon('#f2ece0'), backM = texMat(backTex), FLIP = new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), Math.PI);
  const faces = new Map(), backs = [];
  function faceMesh(id) { if (faces.has(id)) return faces.get(id); const fm = texMat(drawCard(id), { emissive: new THREE.Color('#ffd23a'), emissiveIntensity: 0 }); const m = new THREE.Mesh(cardGeo, [edgeM, fm, backM]); m.castShadow = !touch; m.visible = false; scene.add(m); const o = { m, fm, tp: V3(), tq: new THREE.Quaternion(), on: false, glow: 0 }; faces.set(id, o); return o; }
  function backMesh(k) { while (backs.length <= k) { const m = new THREE.Mesh(cardGeo, [edgeM, backM, backM]); m.castShadow = !touch; m.visible = false; scene.add(m); backs.push({ m, tp: V3(), tq: new THREE.Quaternion(), on: false }); } return backs[k]; }
  const deck = M(new THREE.BoxGeometry(CW_, 1, CD_), [edgeM, edgeM, backM, edgeM, edgeM, edgeM], 1.2, 0.1, MAT_Z - 0.28, scene, 0.008); deck.scale.y = 0.18;
  // dealer puck: a brass disc with a D, slides to whoever deals
  const puck = M(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 28), [toon(TH.trim), texMat(canvasTex(128, 128, (g) => { g.fillStyle = TH.trim; g.fillRect(0, 0, 128, 128); g.fillStyle = '#2a211a'; g.beginPath(); g.arc(64, 64, 50, 0, 7); g.fill(); g.fillStyle = TH.trim; g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('D', 64, 68); })), toon(TH.trim)], -1.0, 0.0125, 0.55, scene, 0.008); puck.visible = false;
  // confetti for the win (one instanced mesh)
  const CONF = 110, conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.035, 0.06), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CONF); conf.visible = false; conf.frustumCulled = false; scene.add(conf);
  const cP = [], cV = [], cR = [], cS = [], CCOL = ['#ec3013', '#ffd23a', '#38bdf8', '#22c55e', '#f3f2f2', '#a78bfa'], dummy = new THREE.Object3D(); let confT = 0;
  for (let i = 0; i < CONF; i++) { cP.push(V3()); cV.push(V3()); cR.push(new THREE.Euler()); cS.push(V3()); conf.setColorAt(i, new THREE.Color(CCOL[i % CCOL.length])); }
  function confetti() { if (RM) return; conf.visible = true; confT = 3.4; for (let i = 0; i < CONF; i++) { cP[i].set(rr(-0.8, 0.8), 0.3, rr(-0.5, 0.3)); cV[i].set(rr(-1.8, 1.8), rr(2.4, 4.4), rr(-1.4, 1)); cR[i].set(rr(0, 6), rr(0, 6), rr(0, 6)); cS[i].set(rr(-9, 9), rr(-9, 9), rr(-9, 9)); } }
  function stepConfetti(dt) { if (confT <= 0) return; confT -= dt; if (confT <= 0) { conf.visible = false; return; }
    for (let i = 0; i < CONF; i++) { const v = cV[i]; v.y -= 5.2 * dt; v.multiplyScalar(1 - 1.6 * dt); if (cP[i].y < 0.04) { cP[i].y = 0.04; v.set(0, 0, 0); } else cR[i].set(cR[i].x + cS[i].x * dt, cR[i].y + cS[i].y * dt, cR[i].z + cS[i].z * dt);
      cP[i].addScaledVector(v, dt); dummy.position.copy(cP[i]); dummy.rotation.copy(cR[i]); dummy.scale.setScalar(Math.min(1, confT / 0.6)); dummy.updateMatrix(); conf.setMatrixAt(i, dummy.matrix); } conf.instanceMatrix.needsUpdate = true; }
  const glowUntil = new Map();
  function redrawFaces() { for (const [id, o] of faces) { o.fm.map.dispose(); o.fm.map = drawCard(id); o.fm.needsUpdate = true; } }

  // ---- foxes (same seating as Shut the Box) ----
  const kit = foxKit({ THREE, scene, toon, M: (geo, mat, x, y, z, parent, outline = 0.02, radius) => M(geo, mat, x, y, z, parent, outline, radius), grad, outlineMat, crestTex, rr, pick, clamp, smooth, damp });
  let rigs = {}; try { rigs = await loadCastRigs(); } catch (e) {}
  const cast = castKit({ THREE, M: (geo, mat, x, y, z, parent, outline = 0.02, radius) => M(geo, mat, x, y, z, parent, outline, radius), toon, makeFox: kit.makeFox }, rigs);
  const foxCache = new Map(), seats = [], LOOK_YOU = V3(0, 2.4, 4), LOOK_TABLE = V3(0, 0.1, 0.1);
  function foxFor(spec) { const key = spec.key; if (foxCache.has(key)) return foxCache.get(key); let f;
    try { f = spec.cast ? cast.make(spec.cast) : kit.makeFox({ key, eyes: ['#38bdf8', '#38bdf8'], mood: 'neutral', outfit: 'armor', crest: '8', torso: spec.col || '#ec3013', look: PLAYER_MALE, ...(spec.fox || {}) }); } catch (e) { console.warn('cribbage fox', e); f = new THREE.Group(); scene.add(f); }
    try { (f.userData.P && f.userData.P.legs || []).forEach(l => l.visible = false); } catch (e) {}
    try { f.userData.joints = { P: f.userData.P, rig: f.userData.rig }; bakeCreature(THREE, f); delete f.userData.joints; } catch (e) {}
    f.visible = false; foxCache.set(key, f); return f; }
  const seatAng = (i, n) => n === 1 ? 0 : (i / (n - 1) - 0.5) * Math.min(1.5, 0.75 * (n - 1));
  let seatSig = '';
  function layoutSeats(list) { seats.length = 0; for (const f of foxCache.values()) f.visible = false; const n = list.length;
    list.forEach((s, i) => { const f = foxFor(s), a = seatAng(i, n), R2 = 2.65, sc = n > 2 ? 0.62 : 0.7; f.userData.seatY = -1.17 * sc; f.position.set(Math.sin(a) * R2, f.userData.seatY, -Math.cos(a) * R2); f.rotation.y = -a; f.scale.setScalar(sc); f.visible = true; f.userData.lookAt = LOOK_YOU; seats.push({ f, idx: s.idx, a }); }); fitCam(); }
  const seatOf = idx => seats.find(s => s.idx === idx);
  function foxMood(idx, mood, hop) { const s = seatOf(idx); if (!s) return; const u = s.f.userData; u.mood = mood; u.moodT = 2.5; if (hop) u.hop = 1; }

  // ---- camera: fit the table into the free part of the screen ----
  const SAFE = { top: 0, bottom: 0, left: 0, right: 0 }, fitC = new THREE.PerspectiveCamera(38, 1, 0.05, 60), shot = { pos: V3(0, 3, 3), look: V3() };
  function fitCam() { const W = CW(), H = CH(), w = Math.max(80, W - SAFE.left - SAFE.right), h = Math.max(80, H - SAFE.top - SAFE.bottom), asp = w / h, port = asp < 0.9;
    camera.aspect = asp; camera.fov = port ? 44 : 36; camera.setViewOffset(w, h, -SAFE.left, -SAFE.top, W, H); camera.updateProjectionMatrix(); fitC.aspect = asp; fitC.fov = camera.fov; fitC.updateProjectionMatrix();
    const el = port ? 0.95 : 1.08, dir = V3(0, Math.sin(el), Math.cos(el)), bz = board.position.z, bd = boardSides * LANE + 0.12, pts = [];
    for (const x of [-ROW / 2 - 0.2, ROW / 2 + 0.15]) pts.push(V3(x, 0.05, bz - bd), V3(x, 0.05, bz + bd));
    for (const x of [-MAT_W / 2, MAT_W / 2]) pts.push(V3(x, 0, MAT_Z - MAT_D / 2), V3(x, 0.05, MAT_Z + MAT_D / 2));
    seats.forEach(s => pts.push(V3(Math.sin(s.a) * 1.35, 0.02, -Math.cos(s.a) * 1.35)));
    if (port) seats.forEach(s => pts.push(V3(clamp(s.f.position.x, -1.5, 1.5), s.f.userData.seatY + 2.15 * s.f.scale.x, s.f.position.z)));
    const tgt = V3(); pts.forEach(p => tgt.add(p)); tgt.multiplyScalar(1 / pts.length); tgt.y = Math.min(tgt.y, 0.2);
    const _p = V3(), lim = 0.95, fits = d => { fitC.position.copy(tgt).addScaledVector(dir, d); fitC.lookAt(tgt); fitC.updateMatrixWorld(); let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for (const p of pts) { _p.copy(p).project(fitC); x0 = Math.min(x0, _p.x); x1 = Math.max(x1, _p.x); y0 = Math.min(y0, _p.y); y1 = Math.max(y1, _p.y); } return { ok: x0 >= -lim && x1 <= lim && y0 >= -lim && y1 <= lim, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; };
    let d = 4; for (let it = 0; it < 3; it++) { let lo = 0.6, hi = 30; for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; if (fits(m).ok) hi = m; else lo = m; } d = hi; const b = fits(d), th = Math.tan(fitC.fov * Math.PI / 360) * d;
      const right = V3().setFromMatrixColumn(fitC.matrixWorld, 0), up = V3().setFromMatrixColumn(fitC.matrixWorld, 1); tgt.addScaledVector(right, b.cx * th * asp).addScaledVector(up, b.cy * th); }
    shot.pos.copy(tgt).addScaledVector(dir, d); shot.look.copy(tgt); camera.position.copy(shot.pos); camera.lookAt(shot.look); }
  function resize() { renderer.setSize(CW(), CH()); fitCam(); }
  let ro = null; try { ro = new ResizeObserver(resize); ro.observe(container); } catch (e) { addEventListener('resize', resize); }

  // ---- match state ----
  let G = null, net = null, demo = null, demoTok = 0, sel = [], curtainAck = -1, lastViewer = 0, lastEv = 0, lastChange = performance.now(), showAt = 0, showSig = '', shownItems = 0, flash = null, sayTxt = '', paid = new Set(), endGold = 0, endNote = '', bigNote = null;
  let voice = !!save.stat(SK('voice'), 0); const disp = [];
  const isAuth = () => !net || net.hostId() === net.me;
  const clone = o => JSON.parse(JSON.stringify(o)), now = () => performance.now();
  const myIdx = () => !G ? -1 : net ? G.players.findIndex(p => p.id === net.me) : G.players.findIndex(p => p.kind === 'me');
  function actor() { if (!G) return -1; if (G.phase === 'discard') { const i = G.disc.findIndex((d, k) => !d && !G.players[k].gone && G.players[k].kind === 'local'); return i; } if (G.phase === 'peg') return G.peg.turn; return -1; }
  function viewer() { if (!G) return -1; if (G.mode === 'local') { const a = actor(); if (a >= 0 && G.players[a].kind === 'local') lastViewer = a; return lastViewer; } return myIdx(); }
  const curtainFor = () => { if (!G || G.mode !== 'local' || demo) return -1; const a = actor(); return a >= 0 && G.players[a].kind === 'local' && a !== curtainAck ? a : -1; };
  const controls = p => !demo && G && p >= 0 && !G.players[p].gone && (G.mode === 'local' ? G.players[p].kind === 'local' && p === actor() && curtainFor() < 0 : p === myIdx());
  const sideOf = p => G.players[p].side, sideName = s => { const m = G.sides[s].members, mi = myIdx(); if (G.mode !== 'local' && m.includes(mi)) return m.length > 1 ? 'YOU + ' + m.filter(x => x !== mi).map(x => G.players[x].name).join(' + ') : 'YOU'; return m.map(x => G.players[x].name).join(' + '); };
  const sideCol = s => G.players[G.sides[s].members[0]].col, pName = p => p === myIdx() && G.mode !== 'local' ? 'YOU' : G.players[p].name;

  function input(a) { sfx.on(); if (!G || demo) return; const vi = viewer();
    if (a.a === 'reveal') { const c = curtainFor(); if (c >= 0) { curtainAck = c; sel = []; sfx.turn(); emit(); } return; }
    if (a.a === 'next') { send(vi, { a: 'next', at: G.seq }); return; }
    if (!controls(vi)) return;
    if (a.a === 'pick') { const c = +a.c; if (!G.hands[vi].includes(c)) return;
      if (G.phase === 'discard') { if (G.disc[vi]) return; const n = R.discardN(G.players.length); if (sel.includes(c)) sel = sel.filter(x => x !== c); else { sel.push(c); if (sel.length > n) sel.shift(); } sfx.tick(); vib(8); emit(); return; }
      if (G.phase === 'peg') { if (G.peg.turn !== vi) return; if (R.val(c) + G.peg.count > 31) { sfx.bad(); flashMsg('TOO HIGH · COUNT WOULD PASS 31', '#ff9a8a'); return; } if (sel[0] === c) { input({ a: 'play' }); return; } sel = [c]; sfx.tick(); vib(8); emit(); return; } return; }
    if (a.a === 'disc') { const n = R.discardN(G.players.length); if (G.phase !== 'discard' || sel.length !== n) { sfx.bad(); flashMsg('PICK ' + n + (n > 1 ? ' CARDS' : ' CARD') + ' FOR THE CRIB', '#ff9a8a'); return; } const cs = sel.slice(); sel = []; send(vi, { a: 'disc', cards: cs }); return; }
    if (a.a === 'play') { if (G.phase !== 'peg' || !sel.length) { flashMsg('TAP A CARD TO PLAY IT', '#ffd23a'); return; } const c = sel[0]; sel = []; fromHint.set(c, 'me'); send(vi, { a: 'play', card: c }); return; } }
  function send(p, a) { if (isAuth()) act(p, a); else net.send('ev', { k: 'in', mid: G.mid, ...a }, net.hostId()); }
  function act(p, a) { const prev = clone(G); if (!R.applyAct(G, p, a)) return false; G.seq++; changed(prev); return true; }
  function changed(prev) { lastChange = now(); effects(prev, G); broadcast(); emit(); }
  function broadcast() { if (!net || !isAuth() || !G) return; G.players.forEach((pl, i) => { if (pl.id && pl.id !== net.me && !pl.gone) net.send('st', R.viewFor(G, i), pl.id); }); }

  // ---- what every client does when the match moves on ----
  const fromHint = new Map();
  function effects(A, B) { if (!B) return;
    if (!A || A.mid !== B.mid) { lastEv = B.evId; seatFoxes(); buildBoard(B.sides.map((s, i) => ({ col: B.players[s.members[0]].col }))); B.sides.forEach((s, i) => disp[i] = s.score); disp.length = B.sides.length; setPegs(disp.slice()); sel = []; curtainAck = -1; }
    for (const e of B.ev) { if (e.id <= lastEv) continue; lastEv = e.id;
      if (e.kind === 'disc') { sfx.place(0); }
      else if (e.kind === 'cut') { sfx.place(0.6); flashMsg('STARTER · ' + R.cardTxt(e.c), '#ffd23a'); speak('The starter is the ' + R.cardSay(e.c) + '.'); }
      else if (e.kind === 'play') { const s = seatOf(e.p); if (!fromHint.has(e.c)) fromHint.set(e.c, e.p === viewer() && !(B.mode === 'local' && e.p !== viewer()) ? 'me' : s ? 'seat:' + e.p : 'deck'); sfx.place(clamp((s ? Math.sin(s.a) : 0) * 0.8, -1, 1)); vib(10); }
      else if (e.kind === 'pts' && !e.show) { const who = pName(e.p); popScore(e.side, e.pts, B.players[e.p].col); if (e.peg && B.peg && B.peg.pile.length) glowUntil.set(B.peg.pile[B.peg.pile.length - 1].c, now() + 1600); flashMsg(who + ' · ' + e.why + ' FOR ' + e.pts, B.players[e.p].col); sfx.score(e.pts); foxMood(e.p, 'happy', e.pts >= 3); speak(who.toLowerCase() === 'you' ? 'You score ' + e.pts + '. ' + e.why.toLowerCase() + '.' : who + ' scores ' + e.pts + ', ' + e.why.toLowerCase() + '.'); } }
    if (B.peg && B.peg.go && B.peg.go.length && JSON.stringify(B.peg.go) !== JSON.stringify(A && A.peg && A.peg.go)) { sfx.go(); flashMsg(B.peg.go.map(pName).join(' + ') + ' · GO', '#7dd3fc'); }
    if (B.phase === 'discard' && (!A || A.phase !== 'discard' || A.dealNo !== B.dealNo)) { sel = []; curtainAck = -1; sfx.shuffle(); dealAnim(B); speak(pName(B.dealer) + (pName(B.dealer) === 'YOU' ? ' deal.' : ' deals.') + ' Choose ' + R.discardN(B.players.length) + ' for the crib.'); }
    if (B.phase === 'peg' && B.peg && (!A || !A.peg || A.peg.turn !== B.peg.turn || A.phase !== 'peg')) { const t = B.peg.turn; if (controls(t) || (B.mode === 'local' && B.players[t].kind === 'local')) { sfx.turn(); speak((B.mode === 'local' ? B.players[t].name + ', your' : 'Your') + ' turn. The count is ' + B.peg.count + '.'); } }
    if (B.phase === 'show' && B.show) { const sig = B.mid + ':' + B.dealNo + ':' + B.show.i; if (sig !== showSig) { showSig = sig; showAt = now(); shownItems = 0; bigNote = null; const c = B.show.cur; speak((c.kind === 'crib' ? pName(c.p) + "'s crib" : pName(c.p) === 'YOU' ? 'Your hand' : pName(c.p) + "'s hand") + '.'); } }
    if (B.phase === 'end' && (!A || A.phase !== 'end')) onEnd(B);
    syncDisp(); }
  function syncDisp() { if (!G) return; G.sides.forEach((s, i) => { let v = s.score; if (G.phase === 'show' && G.show && G.show.cur && sideOf(G.show.cur.p) === i && shownItems < G.show.cur.items.length) v = Math.max(s.prev, s.score - G.show.cur.total); disp[i] = v; }); setPegs(disp.slice()); }
  function onEnd(B) { const w = B.winner, mine = B.mode !== 'local' && B.sides[w].members.includes(myIdx()); setTimeout(() => { if (mine || B.mode === 'local') { sfx.win(); confetti(); B.sides[w].members.forEach(p => foxMood(p, 'excited', true)); } else sfx.lose(); emit(); }, 400);
    speak((B.mode === 'local' || !mine ? sideName(w) + ' wins' : 'You win') + (B.skunk ? ', with a ' + (B.skunk > 1 ? 'double ' : '') + 'skunk!' : '!')); reward(B); }
  function reward(B) { const k = 'end:' + B.mid; if (paid.has(k) || demo || B.mode === 'local') return; paid.add(k); const mi = myIdx(); if (mi < 0) return;
    save.setStat(SK('played'), save.stat(SK('played')) + 1); save.addXp(PAY.xpMatch); endGold = 0; endNote = '';
    if (B.sides[B.winner].members.includes(mi)) { const rivals = B.sides.length - 1; endGold = PAY.winPerRival * rivals * (B.skunk ? PAY.skunkX * B.skunk : 1); save.setStat(SK('wins'), save.stat(SK('wins')) + 1); if (B.mode === 'online') save.setStat(SK('onlineWins'), save.stat(SK('onlineWins')) + 1); if (B.skunk) save.setStat(SK('skunks'), save.stat(SK('skunks')) + 1);
      if (!save.flag(SK('firstWin'))) { save.setFlag(SK('firstWin')); save.give(PAY.trophy); endNote = 'trophy'; } }
    if (endGold) { save.addGold(endGold); setTimeout(() => sfx.gold(Math.min(8, 2 + Math.round(endGold / 10))), 900); } }
  function handReward(c) { if (demo || !G || G.mode === 'local' || c.kind !== 'hand' || c.p !== myIdx()) return; const k = 'hand:' + G.mid + ':' + G.dealNo; if (paid.has(k)) return; paid.add(k);
    if (c.total > save.stat(SK('bestHand'), 0)) save.setStat(SK('bestHand'), c.total);
    if (c.total === 29) { save.addGold(PAY.perfect); save.give(PAY.perfectItem); bigNote = 'THE PERFECT 29! +' + PAY.perfect + ' GOLD'; }
    else if (c.total >= PAY.bigHandAt) { save.addGold(PAY.bigHand); bigNote = 'BIG HAND · +' + PAY.bigHand + ' GOLD'; } }
  function seatFoxes() { const list = []; if (!G) list.push({ key: 'hope', cast: 'hope', idx: -1 });
    else { const mi = myIdx(); G.players.forEach((p, i) => { if (G.mode !== 'local' && i === mi) return; const cp = p.cpu ? CPUS.find(c => c.key === p.cpu) : null; list.push({ key: cp ? cp.key : 'p' + i + (p.id || ''), cast: cp ? cp.cast : null, fox: cp ? cp.fox : null, col: p.col, idx: i }); }); }
    const sig = list.map(s => s.key + s.idx).join('|'); if (sig !== seatSig) { seatSig = sig; layoutSeats(list); } }

  // ---- card layout: where every card should be right now ----
  const DECK_P = V3(1.2, 0, MAT_Z - 0.28), CRIB_P = V3(1.2, 0, MAT_Z + 0.27), SPENT_P = V3(-1.2, 0, MAT_Z - 0.02), ME_P = V3(0, 0.45, 1.55);
  const yawQ = y => new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), y);
  let dealT0 = 0, dealOrder = [];
  function dealAnim(B) { dealT0 = now(); const n = B.players.length; dealOrder = []; for (let k = 0; k < R.handSize(n); k++) for (let i = 1; i <= n; i++) dealOrder.push((B.dealer + i) % n);
    dealOrder.forEach((p, k) => { const s = seatOf(p); setTimeout(() => sfx.deal(0, s ? Math.sin(s.a) * 0.7 : 0), 350 + k * 70); }); faces.forEach(o => { o.on = false; }); }
  function fanPos(p, k, n) { const s = seatOf(p); if (!s) return null; const a = s.a, R1 = 1.4, spread = 0.09, off = (k - (n - 1) / 2) * spread; return { p: V3(Math.sin(a) * R1 + Math.cos(a) * off, 0.015 + k * 0.002, -Math.cos(a) * R1 + Math.sin(a) * off), q: yawQ(-a + (k - (n - 1) / 2) * 0.06).multiply(FLIP) }; }
  function layout() { const t = now(); faces.forEach(o => o.on = false); backs.forEach(o => o.on = false); if (!G) { deck.scale.y = 0.18; return; }
    const vi = viewer(), n = G.players.length, ph = G.phase; let bk = 0;
    // deck
    deck.scale.y = Math.max(0.01, G.deck.length * 0.0035) / 1; deck.position.y = deck.scale.y / 2 + 0.012;
    // opponents' fans (face down)
    G.players.forEach((pl, p) => { if (p === vi && G.mode !== 'local') return; if (ph === 'show' || ph === 'end') return; const cnt = G.hands[p].length; for (let k = 0; k < cnt; k++) { const f = fanPos(p, k, cnt); if (!f) continue; const b = backMesh(p * 6 + k); b.on = true; b.tp.copy(f.p); b.tq.copy(f.q); const di = dealOrder.findIndex((q, j) => q === p && dealOrder.slice(0, j).filter(x => x === p).length === k); if (di >= 0 && t < dealT0 + 350 + di * 70) b.tp.copy(DECK_P).setY(0.1); } });
    // crib (face down until its count)
    const cribShow = ph === 'show' && G.show && G.show.cur.kind === 'crib';
    if (!cribShow) G.crib.forEach((c, k) => { const b = backMesh(24 + k); b.on = true; b.tp.set(CRIB_P.x + k * 0.006, 0.015 + k * 0.006, CRIB_P.z - k * 0.004); b.tq.copy(yawQ(0.08 * k)).multiply(FLIP); });
    // starter on the deck
    if (G.starter != null && G.starter >= 0) { const o = faceMesh(G.starter); o.on = true; o.tp.set(DECK_P.x, deck.scale.y + 0.02, DECK_P.z); o.tq.copy(yawQ(0.04)); if (!o.m.visible) o.m.position.copy(o.tp).setY(o.tp.y + 0.02); }
    if (ph === 'peg' || ((ph === 'end') && !G.show)) { const P = G.peg; if (P) { const curN = P.seq.length, pile = P.pile; pile.forEach((e, k) => { const o = faceMesh(e.c); o.on = true; const cur = k >= pile.length - curN;
        if (cur) { const j = k - (pile.length - curN); o.tp.set(-0.72 + j * 0.235, 0.015 + j * 0.002, MAT_Z + (hash(e.c) - 0.5) * 0.05); o.tq.copy(yawQ((hash(e.c + 9) - 0.5) * 0.14)); }
        else { o.tp.set(SPENT_P.x + (hash(e.c) - 0.5) * 0.02, 0.015 + k * 0.004, SPENT_P.z); o.tq.copy(yawQ((hash(e.c) - 0.5) * 0.3)).multiply(FLIP); } }); } }
    if ((ph === 'show' || ph === 'end') && G.show && G.show.cur) { const c = G.show.cur, hi = new Set(c.items[Math.max(0, shownItems - 1)] && shownItems > 0 && shownItems <= c.items.length ? c.items[shownItems - 1].cards : []);
      if (G.peg) G.peg.pile.forEach((e, k) => { const o = faceMesh(e.c); o.on = true; o.tp.set(SPENT_P.x, 0.015 + k * 0.004, SPENT_P.z); o.tq.copy(yawQ((hash(e.c) - 0.5) * 0.3)).multiply(FLIP); });
      c.cards.forEach((id, k) => { if (id < 0) return; const o = faceMesh(id); o.on = true; o.tp.set(-0.82 + k * 0.335, 0.015 + (hi.has(id) ? 0.05 : 0), MAT_Z + 0.02 - (hi.has(id) ? 0.04 : 0)); o.tq.identity(); o.glow = hi.has(id) ? 1 : 0; });
      if (G.starter != null) { const o = faceMesh(G.starter); o.tp.set(0.62, 0.016 + (hi.has(G.starter) ? 0.05 : 0), MAT_Z + 0.02 - (hi.has(G.starter) ? 0.04 : 0)); o.glow = hi.has(G.starter) ? 1 : 0; } }
    faces.forEach((o, id) => { if (!o.on) o.glow = 0; }); }
  function stepCards(dt) { const k = 12;
    const upd = (o, startFn) => { if (o.on && !o.m.visible) { o.m.visible = true; startFn && startFn(o); } if (!o.on && o.m.visible) { o.m.visible = false; } if (!o.m.visible) return; o.m.position.x = damp(o.m.position.x, o.tp.x, k, dt); o.m.position.z = damp(o.m.position.z, o.tp.z, k, dt);
      const dxz = Math.hypot(o.m.position.x - o.tp.x, o.m.position.z - o.tp.z); o.m.position.y = damp(o.m.position.y, o.tp.y + Math.min(0.25, dxz * 0.35), k, dt); o.m.quaternion.slerp(o.tq, 1 - Math.exp(-k * dt)); };
    faces.forEach((o, id) => { upd(o, o2 => { const h = fromHint.get(id); if (h === 'me') o2.m.position.copy(ME_P); else if (h && h.startsWith('seat:')) { const f = fanPos(+h.slice(5), 0, 1); o2.m.position.copy(f ? f.p : DECK_P); o2.m.quaternion.copy(f ? f.q : FLIP); } else o2.m.position.copy(DECK_P).setY(0.1); });
      const g = o.glow || (glowUntil.get(id) || 0) > now() ? 0.35 + Math.sin(now() / 160) * 0.12 : 0; o.fm.emissiveIntensity = damp(o.fm.emissiveIntensity, g, 10, dt); });
    backs.forEach(o => upd(o, o2 => { o2.m.position.copy(DECK_P).setY(0.12); o2.m.quaternion.copy(FLIP); })); }

  // ---- HUD (what the DC page draws) ----
  function flashMsg(t, col = '#ffd23a') { flash = { t, col, until: now() + 2100 }; emit(); }
  function speak(t) { sayTxt = t; if (!voice || !window.speechSynthesis) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.rate = 1.05; speechSynthesis.speak(u); } catch (e) {} }
  let emitQ = false; function emit() { if (emitQ) return; emitQ = true; queueMicrotask(() => { emitQ = false; onState(hud()); }); }
  const cardOut = (c, extra) => ({ id: c, r: c < 0 ? '' : R.RANK_TXT[R.rank(c)], s: c < 0 ? -1 : R.suit(c), ...extra });
  function hud() {
    const base = { ready: true, music: sfx.music, voice, fourColor, gold: save.data.gold, wins: save.stat(SK('wins')), bestHand: save.stat(SK('bestHand')), played: save.stat(SK('played')), online: !!net, say: sayTxt,
      flash: flash && now() < flash.until ? flash : null, demo: demo ? { cap: demo.cap, key: demo.key, n: demo.n, of: DEMO.length, paused: !!demo.paused } : null };
    if (!G) return { ...base, phase: 'menu' };
    const vi = viewer(), cur = curtainFor(), n = G.players.length, ph = G.phase, mine = controls(vi), P = G.peg;
    const hand = cur >= 0 || vi < 0 || !(ph === 'discard' || ph === 'peg') ? [] : G.hands[vi].map(c => { const ok = ph === 'peg' && P && P.turn === vi && R.val(c) + P.count <= 31; return cardOut(c, { sel: sel.includes(c), play: ok, dim: ph === 'peg' && !ok, tap: mine && (ph === 'discard' ? !G.disc[vi] : P && P.turn === vi) }); });
    const show = (ph === 'show' || ph === 'end') && G.show && G.show.cur ? (() => { const c = G.show.cur, items = c.items.slice(0, shownItems); return { who: c.kind === 'crib' ? pName(c.p) + (pName(c.p) === 'YOU' ? 'R CRIB' : "'S CRIB") : pName(c.p) === 'YOU' ? 'YOUR HAND' : pName(c.p) + "'S HAND", col: G.players[c.p].col, kind: c.kind,
      cards: c.cards.map(x => cardOut(x, { hi: !!(items.length && items[items.length - 1].cards.includes(x)) })), starter: G.starter != null ? cardOut(G.starter, { hi: !!(items.length && items[items.length - 1].cards.includes(G.starter)) }) : null,
      items: items.map(it => ({ label: it.label, pts: it.pts, total: it.total })), total: items.length ? items[items.length - 1].total : 0, full: c.total, done: shownItems >= c.items.length, zero: !c.items.length, big: bigNote }; })() : null;
    const st = R.standings(G);
    return { ...base, phase: ph, mode: G.mode, target: G.target, dealNo: G.dealNo, teams: G.teams, seq: G.seq, n,
      sides: G.sides.map((s, i) => ({ name: sideName(i), col: sideCol(i), score: disp[i] ?? s.score, me: G.mode !== 'local' && s.members.includes(myIdx()), dealer: s.members.includes(G.dealer), turn: ph === 'peg' && P && s.members.includes(P.turn) })),
      players: G.players.map((p, i) => ({ name: pName(i), col: p.col, cards: G.hands[i].length, dealer: i === G.dealer, turn: ph === 'peg' && P && P.turn === i, done: ph === 'discard' && G.disc[i], gone: p.gone, cpu: !!p.cpu })),
      vi, viName: vi >= 0 ? pName(vi) : '', viCol: vi >= 0 ? G.players[vi].col : '#ffd23a', mine, curtain: cur >= 0 ? { name: G.players[cur].name, col: G.players[cur].col, why: ph === 'discard' ? 'Choose ' + R.discardN(n) + (R.discardN(n) > 1 ? ' cards' : ' card') + ' for the crib.' : 'Your turn to play a card. The count is ' + P.count + '.' } : null,
      hand, discN: R.discardN(n), selN: sel.length, discarded: vi >= 0 && G.disc[vi], canDisc: mine && ph === 'discard' && !G.disc[vi] && sel.length === R.discardN(n), canPlay: mine && ph === 'peg' && P && P.turn === vi && sel.length === 1,
      waitDisc: ph === 'discard' ? G.players.map((p, i) => !G.disc[i] ? pName(i) : null).filter(Boolean) : [],
      dealer: pName(G.dealer), dealerCol: G.players[G.dealer].col, cribMine: G.mode !== 'local' && G.players[G.dealer].side === (myIdx() >= 0 ? G.players[myIdx()].side : -9),
      peg: P ? { count: P.count, seq: P.seq.map(c => cardOut(c)), turn: pName(P.turn), turnCol: G.players[P.turn].col, myTurn: mine && P.turn === vi } : null,
      starter: G.starter != null && G.starter >= 0 ? cardOut(G.starter) : null, cribN: G.crib.length,
      show, showAuto: G.mode !== 'local', board: st.map((s, k) => ({ place: k + 1, name: sideName(s.i), col: sideCol(s.i), score: s.score, me: G.mode !== 'local' && s.members.includes(myIdx()) })),
      winner: ph === 'end' ? sideName(G.winner) : '', winMine: ph === 'end' && G.mode !== 'local' && G.sides[G.winner].members.includes(myIdx()), skunk: G.skunk, endGold, endNote };
  }

  // ---- authority driver: CPUs, auto-advance, players who left ----
  function drive(t) { if (!G || demo || !isAuth()) return; const since = t - lastChange, n = G.players.length;
    if (G.phase === 'discard') { if (since < 900) return; for (let i = 0; i < n; i++) { const p = G.players[i]; if (G.disc[i]) continue; const bot = p.cpu ? CPUS.find(c => c.key === p.cpu) : p.gone || (p.kind === 'net' && since > 60000) ? { skill: 0.7 } : null;
        if (bot) { const own = G.players[G.dealer].side === p.side; act(i, { a: 'disc', cards: R.cpuDiscard(G.hands[i], R.discardN(n), own, bot.skill, n) }); return; } } return; }
    if (G.phase === 'peg') { const p = G.players[G.peg.turn], bot = p.cpu ? CPUS.find(c => c.key === p.cpu) : p.gone || (p.kind === 'net' && since > 45000) ? { skill: 0.7 } : null;
      if (bot && since > 1000) { const c = R.cpuPlay(G.hands[G.peg.turn], G.peg.count, G.peg.seq, bot.skill); if (c != null) { fromHint.set(c, 'seat:' + G.peg.turn); act(G.peg.turn, { a: 'play', card: c }); } } return; }
    if (G.phase === 'show' && G.show) { const c = G.show.cur, need = 1400 + c.items.length * 750 + (G.mode === 'local' ? 6000 : 3400); if (t - showAt > need && since > 1200) act(-1, { a: 'next' }); } }

  // ---- frame loop ----
  let raf = 0, lastT = now(), alive = true, skipF = false, tAcc = 0;
  function frame(t) { if (!alive) return; raf = requestAnimationFrame(frame); const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t; tAcc += dt; if (document.hidden) return; if (touch && (skipF = !skipF)) { lastT = t - dt * 1000; return; }
    drive(t);
    if (G && (G.phase === 'show' || G.phase === 'end') && G.show && G.show.cur) { const c = G.show.cur, want = Math.min(c.items.length, Math.max(0, Math.floor((t - showAt - 700) / 750) + 1));
      if (want > shownItems) { shownItems = want; const it = c.items[want - 1]; sfx.score(it.pts); speak(it.label.toLowerCase() + ', ' + it.total); if (want === c.items.length) { handReward(c); syncDisp(); if (c.total) popScore(sideOf(c.p), c.total, G.players[c.p].col); if (c.total >= PAY.bigHandAt) { sfx.bigHand(); foxMood(c.p, 'excited', true); } } emit(); }
      if (!c.items.length && shownItems === 0 && t - showAt > 900) { shownItems = 0; syncDisp(); } }
    if (flash && t > flash.until) { flash = null; emit(); }
    layout(); stepCards(dt); stepPegs(t); stepPops(t); stepConfetti(dt);
    if (G) { puck.visible = true; const vi = viewer(), s = seatOf(G.dealer); const tgt = G.dealer === vi && !(G.mode === 'local' && s) ? V3(-1.05, 0.0125, 0.52) : s ? V3(Math.sin(s.a) * 1.05 + Math.cos(s.a) * 0.42, 0.0125, -Math.cos(s.a) * 1.05 + Math.sin(s.a) * 0.42) : V3(-1.05, 0.0125, 0.52); puck.position.x = damp(puck.position.x, tgt.x, 5, dt); puck.position.z = damp(puck.position.z, tgt.z, 5, dt); } else puck.visible = false;
    for (const s of seats) { const u = s.f.userData; if (u.moodT > 0) { u.moodT -= dt; if (u.moodT <= 0) u.mood = u.base || 'neutral'; } kit.animFox(s.f, dt, 0); const active = G && ((G.phase === 'peg' && G.peg && G.peg.turn === s.idx) || (G.phase === 'discard' && !G.disc[s.idx])); u.lookAt = active ? LOOK_TABLE : LOOK_YOU; s.f.position.y = damp(s.f.position.y, u.seatY + (G && G.phase === 'peg' && G.peg && G.peg.turn === s.idx ? 0.1 : 0), 6, dt); }
    const sw = RM ? 0 : 1; camera.position.set(shot.pos.x + Math.sin(tAcc * 0.3) * 0.015 * sw, shot.pos.y + Math.sin(tAcc * 0.23) * 0.01 * sw, shot.pos.z); camera.lookAt(shot.look);
    renderer.render(scene, camera); }
  seatFoxes(); buildBoard([{ col: COLS[0][1] }, { col: COLS[1][1] }]); fitCam(); raf = requestAnimationFrame(frame); emit();
  const onVis = () => sfx.suspend(document.hidden); document.addEventListener('visibilitychange', onVis);

  // ---- DEMO ----
  let skip = null; const wait = ms => new Promise(r => { let left = ms, last = performance.now(); const tk = () => { const t = performance.now(); if (!demo || !demo.paused) left -= t - last; last = t; if (left <= 0 || skip === 'go') { if (skip === 'go') skip = null; r(); } else setTimeout(tk, 50); }; setTimeout(tk, 50); });
  async function demoRun(tok) { const ok = () => demo && tok === demoTok;
    for (let i = 0; i < DEMO.length; i++) { if (!ok()) return; const st = DEMO[i]; demo.n = i + 1; demo.cap = st.cap; demo.key = st.key || ''; speak(st.cap); emit();
      for (const a of st.acts || []) { if (!ok()) return; await wait(a.pause ?? 800); if (!ok()) return;
        if (a.a === 'pick') { sel.push(a.c); sfx.tick(); emit(); }
        else if (a.a === 'disc') { const cs = a.cards || sel.slice(); sel = []; act(a.p, { a: 'disc', cards: cs }); }
        else if (a.a === 'play') { fromHint.set(a.c, a.p === 0 ? 'me' : 'seat:' + a.p); act(a.p, { a: 'play', card: a.c }); }
        else if (a.a === 'next') act(-1, { a: 'next' }); }
      await wait(st.wait ?? 2500); }
    if (ok()) api.demoStop(); }

  // ---- public API ----
  const api = {
    hud, input, isAuth, get state() { return G; }, _dbg: { scene, camera, renderer, SAFE },
    setSafe(top, bottom, left = 0, right = 0) { if ([top - SAFE.top, bottom - SAFE.bottom, left - SAFE.left, right - SAFE.right].some(v => Math.abs(v) > 2)) { Object.assign(SAFE, { top, bottom, left, right }); fitCam(); } },
    // offline: mode 'cpu' (n = CPU foxes 1–3) | 'local' (n = players 2–4). teams: 4 players as partners. target 121 or 61.
    start({ mode = 'cpu', n = 1, target = 121, teams = true, cpus } = {}) { sfx.on(); api.netEnd(true); demo = null; demoTok++; let players;
      if (mode === 'local') players = Array.from({ length: clamp(n, 2, 4) }, (_, i) => ({ name: COLS[i][0], col: COLS[i][1], kind: 'local' }));
      else { players = [{ name: 'YOU', col: COLS[0][1], kind: 'me' }]; const ks = (cpus && cpus.length ? cpus : CPUS.map(c => c.key)).slice(0, clamp(n, 1, 3)); ks.forEach((k, i) => players.push({ name: CPUS.find(c => c.key === k).name, col: COLS[i + 1][1], kind: 'cpu', cpu: k })); }
      const prev = G; G = R.newMatch({ players, target, mode, teams }); endGold = 0; endNote = ''; changed(prev); },
    rematch() { if (!G || net) return; api.start({ mode: G.mode, n: G.mode === 'local' ? G.players.length : G.players.length - 1, target: G.target, teams: G.teams, cpus: G.players.filter(p => p.cpu).map(p => p.cpu) }); },
    toMenu() { demo = null; demoTok++; api.netEnd(true); G = null; seatFoxes(); layout(); emit(); },
    demoStart() { sfx.on(); api.netEnd(true); demoTok++; demo = { n: 0, cap: '', key: '', paused: false }; const prev = G;
      G = R.newMatch({ players: [{ name: 'YOU', col: COLS[0][1], kind: 'me' }, { name: 'HOPE', col: COLS[1][1], kind: 'cpu', cpu: 'hope' }], target: 121, mode: 'cpu' }); G.dealer = DEMO_RIG.dealer; G.dealNo = 0; R.startDeal(G, DEMO_RIG); G.demo = true; changed(prev); demoRun(demoTok); },
    demoStop() { if (!demo) return; demo = null; demoTok++; try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} api.toMenu(); },
    setMusic(on) { sfx.on(); sfx.setMusic(on); save.setStat(SK('music'), on ? 1 : 0); emit(); },
    setVoice(on) { voice = !!on; save.setStat(SK('voice'), voice ? 1 : 0); if (voice) speak('Voice on.'); else if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) {} emit(); },
    setFourColor(on) { fourColor = !!on; save.setStat(SK('fourColor'), on ? 1 : 0); redrawFaces(); emit(); },
    sound: () => sfx,
    demoPause() { if (!demo) return; demo.paused = !demo.paused; if (window.speechSynthesis) try { demo.paused ? speechSynthesis.pause() : speechSynthesis.resume(); } catch (e) {} emit(); },
    demoNext() { if (!demo) return; demo.paused = false; skip = 'go'; emit(); },
    // HINT for learners: what a strong fox would do right now (selects it; you still confirm)
    hint() { sfx.on(); if (!G || demo) return null; const vi = viewer(); if (!controls(vi)) return null; const n = G.players.length;
      if (G.phase === 'discard' && !G.disc[vi]) { const own = G.players[G.dealer].side === G.players[vi].side; const d = R.cpuDiscard(G.hands[vi], R.discardN(n), own, 1, n); sel = d.slice(); flashMsg('HINT · GIVE ' + d.map(R.cardTxt).join(' + ') + ' TO ' + (own ? 'YOUR' : pName(G.dealer) + "'S") + ' CRIB', '#7dd3fc'); speak('Hint: put the ' + d.map(R.cardSay).join(' and the ') + ' in the crib.'); emit(); return d; }
      if (G.phase === 'peg' && G.peg.turn === vi) { const c = R.cpuPlay(G.hands[vi], G.peg.count, G.peg.seq, 1); if (c == null) return null; sel = [c]; const pp = R.pegPoints([...G.peg.seq, c], G.peg.count + R.val(c)).pts; flashMsg('HINT · PLAY ' + R.cardTxt(c) + (pp ? ' FOR ' + pp : ''), '#7dd3fc'); speak('Hint: play the ' + R.cardSay(c) + '.'); emit(); return [c]; }
      return null; },
    // ONLINE: the page runs the lobby (engine/duel-net.js); the host's device runs the match and sends each player only what they may see
    netBegin({ me, players, send, hostId, target = 121, teams = true }) { net = { me, send, hostId }; endGold = 0; demo = null;
      if (isAuth()) { const prev = G; G = R.newMatch({ players: players.map(p => ({ id: p.id, name: p.name, col: p.col, kind: 'net' })), target, mode: 'online', teams }); changed(prev); }
      else { G = null; flashMsg('WAITING FOR THE HOST…', '#7dd3fc'); } },
    netRecv(t, d, from) { if (!net || !d) return;
      if (t === 'st') { if (isAuth() && G && from !== net.hostId()) return; if (G && d.mid === G.mid && d.seq <= G.seq) return; const prev = G; G = d; lastChange = now(); effects(prev, G); emit(); return; }
      if (t === 'ev' && d.k === 'in' && isAuth() && G && d.mid === G.mid) { const p = G.players.findIndex(x => x.id === from); if (p < 0 && d.a !== 'next') return; if (d.a === 'play') fromHint.set(+d.card, 'seat:' + p); act(p, { a: d.a, cards: d.cards, card: d.card, at: d.at }); } },
    netDrop(id) { if (!net || !G) return; const i = G.players.findIndex(p => p.id === id); if (i < 0 || G.players[i].gone) return; if (isAuth()) { const prev = clone(G); G.players[i].gone = true; G.seq++; changed(prev); flashMsg(G.players[i].name + ' LEFT · A FOX PLAYS FOR THEM', '#ff9a8a'); } },
    netHostCheck() { if (net && G && isAuth()) { G.seq++; broadcast(); lastChange = now(); } },
    netOn: () => !!net,
    netEnd(silent) { net = null; if (G && G.mode === 'online') { G = null; seatFoxes(); } if (!silent) emit(); },
    destroy() { alive = false; sfx.stop(); document.removeEventListener('visibilitychange', onVis); cancelAnimationFrame(raf); ro && ro.disconnect(); removeEventListener('resize', resize); try { speechSynthesis && speechSynthesis.cancel(); } catch (e) {} renderer.dispose(); renderer.domElement.remove(); },
  };
  return api;
}
