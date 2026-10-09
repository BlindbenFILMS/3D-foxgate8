// 8 GATES — BACKGAMMON CLUB [backgammonClub]. A café corner (any building, any world): one table, a 3D backgammon board, dice, foxes at the table.
// Modes: VS FOX (Pip · ROOKIE, Hope · CLUB, Noble · MASTER), PASS & PLAY (two on one phone), ONLINE (room of up to 5: 2 play, 3 watch and
// take the next game, winner stays on), WATCH THE DEMO. Roll, tap a checker, tap where it goes (or drag). Rules + CPU: ./backgammon-rules.js (CPU in a Worker).
// Built from the Checkers Club (minigame #2) code, copied so the games share no files.
// MERGE: createBackgammonClub({ container, onState }) stands alone. buildParlor(ctx) builds just the room + table into any scene/origin.
// Save keys: everything under 'backgammonClub.*' (stats in engine/save.js; resume + prefs in localStorage).
import * as THREE from '../../vendor/three/three.module.js';
import { foxKit, PLAYER_MALE, PLAYER_FEMALE } from '../../fox-kit.js';
import { CAST, castKit, loadCastRigs } from '../../engine/cast.js';
import { crestTex, canvasTex, FONT } from '../../engine/textures.js';
import { save } from '../../engine/save.js';
import { Backgammon, think, BAR, OFF, COLOR_WORD, pointNum } from './backgammon-rules.js';
import { createBackgammonAudio } from './backgammon-audio.js';

export const GAME = { key: 'backgammonClub', name: 'BACKGAMMON CLUB', room: 'backgammonClub', maxRoom: 5 };
const RESUME_KEY = 'backgammonClub.resume', PREFS_KEY = 'backgammonClub.prefs';
// Opponents + rewards + lines: DRAFT for Ben (no backgammon in the 2D game files). Gold is per point won (gammon ×2, backgammon ×3).
export const OPPONENTS = [
  { level: 0, id: 'rookie', tag: 'ROOKIE', name: 'PIP', who: 'Club kid · loves rolling doubles', gold: 5, xp: 10,
    lines: { hello: ['Dice! I love dice. Do I want high numbers? I always want high numbers.', 'You can go first. If you roll higher. That is the rule!'], take: ['Bonk! To the bar you go!', 'Got your lonely one!'], lost: ['Hey! My checker!', 'Back to the start, little guy.'], doubles: ['DOUBLES! Four moves!'], win: ['I WON! The dice like me!'], lose: ['Good game! Your checkers were so fast.'], gammon: ['That was a lot of points. For you.'] } },
  { level: 1, id: 'club', tag: 'CLUB', name: 'HOPE', who: 'Counts the pips by ear', gold: 14, xp: 24,
    lines: { hello: ['I keep the pip count in my head. Ask me any time.', 'Roll when you are ready.'], take: ['A blot. Thank you.', 'I heard that one land alone.'], lost: ['Fair hit.', 'I will come back in.'], doubles: ['Doubles. Lovely.'], win: ['Good game. Again?'], lose: ['Well played. You raced well.'], gammon: ['A gammon. You earned that one.'] } },
  { level: 2, id: 'master', tag: 'MASTER', name: 'NOBLE', who: 'Club champion', gold: 35, xp: 55,
    lines: { hello: ['Luck evens out. Choices do not.', 'Sit. Let us see how you handle a bad roll.'], take: ['Exposed. Mine.', 'You left that open.'], lost: ['Hm. Good shot.', 'I will be back.'], doubles: ['Doubles.'], win: ['Again. You are close.'], lose: ['...Well played. Very well played.'], gammon: ['A gammon. Respect.'] } }];
const NET_COLS = [['RED', '#ec3013'], ['BLUE', '#38bdf8'], ['GOLD', '#ffd23a'], ['GREEN', '#22c55e'], ['PINK', '#f472b6']];
export const REACTS = ['NICE', 'WOW', 'OOF', 'GG'];

// ---------------- small helpers (copied, so this game has no shared-file edits) ----------------
const rr = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const smooth = t => t * t * (3 - 2 * t), pick = a => a[Math.floor(Math.random() * a.length)];
function makeGradient() { const d = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; }
function glowTexture() { return canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }); }
function mergeGeos(list) {   // tiny mergeGeometries: positions + normals only
  const parts = list.map(g => (g.index ? g.toNonIndexed() : g)); let n = 0; parts.forEach(g => n += g.attributes.position.count);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const g of parts) { if (!g.attributes.normal) g.computeVertexNormals(); pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return out;
}
function inflate(geo, t) {   // outline hull: push every vertex out along its smoothed normal
  const g = geo.clone(), p = g.attributes.position, key = i => `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`, acc = new Map(), nm = g.attributes.normal;
  for (let i = 0; i < p.count; i++) { const k = key(i), a = acc.get(k) || [0, 0, 0]; a[0] += nm.getX(i); a[1] += nm.getY(i); a[2] += nm.getZ(i); acc.set(k, a); }
  const out = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; out[i * 3] = p.getX(i) + a[0] / l * t; out[i * 3 + 1] = p.getY(i) + a[1] / l * t; out[i * 3 + 2] = p.getZ(i) + a[2] / l * t; }
  g.setAttribute('position', new THREE.BufferAttribute(out, 3)); return g;
}

// ---------------- sizes (fox units: a standing fox is ~2.8 tall, hips at 0.75) ----------------
export const P = 0.1;                                   // one point's width
const PL = 0.44, BARW = 0.1, TRAYW = 0.12, MARG = 0.05, PX0 = 6 * P + BARW / 2, ZH = PL + 0.07;
const BWID = 2 * (PX0 + 0.02 + TRAYW) + 2 * MARG, BDEP = 2 * ZH + 2 * MARG;
const TABLE_Y = 0.95, BOARD_Y = TABLE_Y + 0.045, SEAT_Z = 1.2, CR = 0.044, CHH = 0.02, DS = 0.056, TRAYX = PX0 + 0.02 + TRAYW / 2;
const BOARD_LOOK = new THREE.Vector3(0, BOARD_Y, 0);
// White's points 1–12 (idx 0–11) run along the near edge right → left, 13–24 (idx 12–23) along the far edge left → right; the bar is x = 0
export function pointX(i) { if (i < 12) return PX0 - (i + 0.5) * P - (i >= 6 ? BARW : 0); const k = i - 12; return -PX0 + (k + 0.5) * P + (k >= 6 ? BARW : 0); }
const pointZ0 = i => i < 12 ? ZH : -ZH, pointDir = i => i < 12 ? -1 : 1;
const slotPos = (i, j) => { const layer = Math.floor(j / 5), k = j % 5; return new THREE.Vector3(pointX(i), BOARD_Y + layer * CHH, pointZ0(i) + pointDir(i) * (CR + 0.004 + k * 2 * CR + layer * CR)); };
const barPos = (c, j) => new THREE.Vector3(0, BOARD_Y + Math.floor(j / 4) * CHH, (c === 'w' ? 1 : -1) * (0.09 + (j % 4) * 2 * CR));
const offPos = (c, j) => new THREE.Vector3(TRAYX, BOARD_Y + CR, (c === 'w' ? 1 : -1) * (ZH - 0.02 - j * (CHH + 0.006)));   // borne off: standing on edge in the tray

// ---------------- the room (exported for worlds) ----------------
// ctx: { toon, M, scene?, origin? } → { group, lamp }
// ---------------- the room (exported for worlds) ----------------
// ctx: { toon, M, scene?, origin? } → { group, lamp }
export function buildParlor({ toon, M, scene, origin }) {
  const G = new THREE.Group(); if (origin) G.position.copy(origin); (scene || M.scene).add(G);
  const W = 7.2, D = 7.2, H = 3.4;
  const planks = canvasTex(512, 512, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = ['#8a5a3a', '#94623f', '#7f5335', '#8f5e3c'][i % 4]; g.fillRect(0, i * 64, 512, 64); g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, i * 64, 512, 3); const off = (i * 197) % 512; g.fillRect(off, i * 64, 3, 64); g.fillStyle = 'rgba(255,255,255,0.05)'; for (let k = 0; k < 6; k++) g.fillRect(rr(0, 512), i * 64 + rr(8, 56), rr(40, 140), 2); } }, [5, 5]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshToonMaterial({ map: planks, gradientMap: toon.grad })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; G.add(floor);
  const wallTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#efe4cf'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(160,130,90,0.08)'; for (let k = 0; k < 60; k++) g.fillRect(rr(0, w), rr(0, h * 0.62), rr(10, 40), rr(2, 6)); const t = h * 0.34 / 4; for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) { const x = c * 32, y = h * 0.66 + r * t; g.fillStyle = (r + c) & 1 ? '#1f4e8c' : '#e9eef6'; g.fillRect(x, y, 32, t); g.fillStyle = (r + c) & 1 ? '#e9eef6' : '#1f4e8c'; g.beginPath(); g.moveTo(x + 16, y + 3); g.lineTo(x + 29, y + t / 2); g.lineTo(x + 16, y + t - 3); g.lineTo(x + 3, y + t / 2); g.closePath(); g.fill(); } g.fillStyle = '#c8901e'; g.fillRect(0, h * 0.64, w, 6); }, [3, 1]);   // white plaster over blue tiles: a café corner
  const wallMat = new THREE.MeshToonMaterial({ map: wallTex, gradientMap: toon.grad });
  for (const [x, z, ry] of [[0, -D / 2, 0], [0, D / 2, Math.PI], [-W / 2, 0, Math.PI / 2], [W / 2, 0, -Math.PI / 2]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat); w.position.set(x, H / 2, z); w.rotation.y = ry; G.add(w); }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), toon('#1d2b29')); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; G.add(ceil);
  // rug
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshToonMaterial({ gradientMap: toon.grad, map: canvasTex(512, 512, (g, w) => { g.fillStyle = '#7a1d2a'; g.fillRect(0, 0, w, w); g.fillStyle = '#e6b45a'; g.fillRect(16, 16, w - 32, w - 32); g.fillStyle = '#1f4e8c'; g.fillRect(28, 28, w - 56, w - 56); const n = 5, q = (w - 56) / n; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const x = 28 + c * q + q / 2, y = 28 + r * q + q / 2; g.fillStyle = (r + c) & 1 ? '#c42d3c' : '#f1e2c0'; g.beginPath(); g.moveTo(x, y - q * 0.42); g.lineTo(x + q * 0.42, y); g.lineTo(x, y + q * 0.42); g.lineTo(x - q * 0.42, y); g.closePath(); g.fill(); g.fillStyle = '#e6b45a'; g.beginPath(); g.moveTo(x, y - q * 0.16); g.lineTo(x + q * 0.16, y); g.lineTo(x, y + q * 0.16); g.lineTo(x - q * 0.16, y); g.closePath(); g.fill(); } }) }));   // a kilim rug
  rug.rotation.x = -Math.PI / 2; rug.rotation.z = 0.12; rug.position.y = 0.006; rug.receiveShadow = true; G.add(rug);
  // the table: round-cornered top, pedestal, foot
  const wood = toon('#5a3520'), woodL = toon('#7a4a2c'), brass = toon('#e6b45a');
  M(new THREE.BoxGeometry(1.75, 0.07, 1.55), wood, 0, TABLE_Y - 0.035, 0, G, 0.02);
  M(new THREE.BoxGeometry(1.6, 0.06, 1.4), woodL, 0, TABLE_Y - 0.09, 0, G, 0);
  M(new THREE.CylinderGeometry(0.12, 0.16, TABLE_Y - 0.12, 12), wood, 0, (TABLE_Y - 0.12) / 2, 0, G, 0.02, 0.14);
  M(new THREE.CylinderGeometry(0.5, 0.56, 0.06, 20), wood, 0, 0.03, 0, G, 0.02, 0.5);
  // stools on both sides
  for (const z of [SEAT_Z, -SEAT_Z]) { M(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 18), toon('#9c2a36'), 0, 0.56, z, G, 0.02, 0.3); M(new THREE.CylinderGeometry(0.05, 0.07, 0.52, 8), brass, 0, 0.26, z, G, 0.015, 0.06); M(new THREE.CylinderGeometry(0.22, 0.24, 0.04, 14), brass, 0, 0.02, z, G, 0.015, 0.22); }
  // pendant lamp
  const shade = M(new THREE.CylinderGeometry(0.42, 0.5, 0.12, 24), toon('#b8862b'), 0, H - 0.06, 0, G, 0.02, 0.45);   // a flush brass ceiling lamp (never in the camera's way)
  const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 24), new THREE.MeshBasicMaterial({ color: 0xfff1c8 })); bulb.position.set(0, H - 0.13, 0); G.add(bulb);
  const lamp = new THREE.PointLight(0xffe2b0, 2.6, 7, 1.2); lamp.position.set(0, H - 0.5, 0); G.add(lamp);
  // window with night/day glow, bookshelf, a sign, a plant, a wall clock
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshBasicMaterial({ map: canvasTex(256, 192, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1b2350'); gr.addColorStop(1, '#5a4a8a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; for (let i = 0; i < 26; i++) g.fillRect(rr(0, w), rr(0, h * 0.7), 2, 2); g.fillStyle = '#ffe9b0'; g.beginPath(); g.arc(w * 0.75, h * 0.25, 16, 0, 7); g.fill(); g.fillStyle = '#141a33'; g.fillRect(0, h * 0.78, w, h); }) }));
  win.position.set(-W / 2 + 0.01, 1.85, -0.6); win.rotation.y = Math.PI / 2; G.add(win);
  for (const [y, z, w, h] of [[1.85, -0.6, 0.08, 1.32], [1.85, -0.6 - 0.84, 0.08, 1.32], [1.85, -0.6 + 0.84, 0.08, 1.32]]) M(new THREE.BoxGeometry(0.08, h, w), wood, -W / 2 + 0.04, y, z, G, 0.01);
  M(new THREE.BoxGeometry(0.08, 0.08, 1.76), wood, -W / 2 + 0.04, 2.48, -0.6, G, 0.01); M(new THREE.BoxGeometry(0.14, 0.08, 1.76), wood, -W / 2 + 0.06, 1.24, -0.6, G, 0.01);
  const shelf = new THREE.Group(); shelf.position.set(1.9, 0, -D / 2 + 0.3); shelf.rotation.y = Math.PI / 2; G.add(shelf);
  M(new THREE.BoxGeometry(0.5, 2.2, 1.6), wood, 0, 1.1, 0, shelf, 0.02);
  const bookCols = ['#c42d3c', '#e6b45a', '#38bdf8', '#22c55e', '#f3f2f2', '#7c3aed', '#ec3013'];
  const jarCols = ['#c2410c', '#b91c1c', '#eab308', '#4d7c0f', '#7c2d12', '#f97316'];   // spice jars, café style
  for (let r = 0; r < 4; r++) { M(new THREE.BoxGeometry(0.46, 0.03, 1.5), woodL, -0.03, 0.3 + r * 0.5, 0, shelf, 0); for (let k = 0; k < 4; k++) { const z = -0.54 + k * 0.36, jar = new THREE.Group(); jar.position.set(-0.06, 0.32 + r * 0.5, z); shelf.add(jar); M(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 14), new THREE.MeshToonMaterial({ color: '#dff3ff', gradientMap: toon.grad, transparent: true, opacity: 0.55 }), 0, 0.13, 0, jar, 0.012, 0.11); for (let b = 0; b < 7; b++) M(new THREE.SphereGeometry(0.04, 8, 6), toon(pick(jarCols)), rr(-0.06, 0.06), rr(0.04, 0.2), rr(-0.06, 0.06), jar, 0); M(new THREE.CylinderGeometry(0.115, 0.115, 0.04, 14), toon('#c8901e'), 0, 0.28, 0, jar, 0.01, 0.115); } }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), new THREE.MeshBasicMaterial({ map: canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#141a33'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e6b45a'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#f6e7c8'; g.font = `900 50px ${FONT}`; g.textBaseline = 'middle'; g.fillText('BACKGAMMON', 26, h / 2 + 4); g.fillStyle = '#ec3013'; g.fillRect(w - 86, 30, 54, 68); g.fillStyle = '#fff'; g.font = `900 52px ${FONT}`; g.fillText('8', w - 74, h / 2 + 4); }) }));
  sign.position.set(0, 2.75, -D / 2 + 0.02); G.add(sign);
  const pot = new THREE.Group(); pot.position.set(-W / 2 + 0.6, 0, D / 2 - 0.7); G.add(pot);
  M(new THREE.CylinderGeometry(0.22, 0.17, 0.4, 14), toon('#c2410c'), 0, 0.2, 0, pot, 0.02, 0.2);
  for (let i = 0; i < 6; i++) M(new THREE.SphereGeometry(rr(0.16, 0.24), 10, 8), toon(pick(['#2f6b2a', '#3f8a35', '#2a5a26'])), rr(-0.15, 0.15), rr(0.55, 1.0), rr(-0.15, 0.15), pot, 0.015, 0.2);
  const clock = M(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 24), toon('#f6e7c8'), -1.8, 2.3, -D / 2 + 0.04, G, 0.02, 0.28); clock.rotation.x = Math.PI / 2;
  for (const [l, a] of [[0.18, 0.4], [0.24, 2.2]]) { const hnd = M(new THREE.BoxGeometry(0.025, l, 0.01), toon('#141a33'), -1.8 + Math.sin(a) * l / 2, 2.3 + Math.cos(a) * l / 2, -D / 2 + 0.075, G, 0); hnd.rotation.z = -a; }
  // second (decor) table by the shelf, set for a game
  for (const [x, z, s] of [[-2.7, -2.5, 1], [-2.15, -2.85, 0.8], [2.7, 2.6, 1.1]]) { const am = new THREE.Group(); am.position.set(x, 0, z); am.scale.setScalar(s); G.add(am); M(new THREE.LatheGeometry([[0, 0], [0.12, 0], [0.26, 0.25], [0.3, 0.5], [0.22, 0.78], [0.1, 0.88], [0.11, 0.98], [0.14, 1.0], [0, 1.0]].map(([a, b]) => new THREE.Vector2(a, b)), 16), toon('#c2602d'), 0, 0, 0, am, 0.02, 0.3); M(new THREE.TorusGeometry(0.27, 0.015, 6, 20).rotateX(Math.PI / 2), toon('#1f4e8c'), 0, 0.5, 0, am, 0, 0); }   // clay amphorae
  return { group: G, lamp, shade, bulb, W, D, H };
}

// ---------------- the pieces: a ridged checker; dice with painted pips ----------------
function pieceGeos() {
  const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  const R = CR, H = CHH;
  const disc = lathe([[0, 0], [R * 0.92, 0], [R, 0.004], [R, H - 0.005], [R * 0.95, H], [R * 0.8, H], [R * 0.74, H - 0.003], [R * 0.45, H - 0.003], [R * 0.4, H], [0, H]]);
  disc.computeBoundingBox(); disc.userData.out = inflate(disc, 0.0035);
  const parts = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, g = new THREE.BoxGeometry(0.004, H * 0.6, 0.005); g.rotateY(-a); g.translate(Math.cos(a) * (R + 0.0012), H * 0.5, Math.sin(a) * (R + 0.0012)); parts.push(g); }
  const top = new THREE.TorusGeometry(R * 0.6, 0.004, 6, 28); top.rotateX(Math.PI / 2); top.translate(0, H - 0.0015, 0); parts.push(top);
  const ridge = mergeGeos(parts);
  const die = new THREE.BoxGeometry(DS, DS, DS);
  return { disc, ridge, die };
}
// die faces in BoxGeometry material order (+x, −x, +y, −y, +z, −z); opposite faces add to 7
const FACE_VAL = [3, 4, 1, 6, 2, 5], FACE_N = { 3: [1, 0, 0], 4: [-1, 0, 0], 1: [0, 1, 0], 6: [0, -1, 0], 2: [0, 0, 1], 5: [0, 0, -1] };

// ================================================================================================
export async function createBackgammonClub({ container, onState = () => {}, opts = {} } = {}) {
  const touch = matchMedia('(pointer: coarse)').matches, CW = () => container.clientWidth || 1, CH = () => container.clientHeight || 1;
  const renderer = new THREE.WebGLRenderer({ antialias: !touch || devicePixelRatio < 2 }); renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.75 : 2)); renderer.setSize(CW(), CH());
  renderer.shadowMap.enabled = !touch; renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none'; container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#141a20'); const camera = new THREE.PerspectiveCamera(42, CW() / CH(), 0.05, 60);
  const grad = makeGradient(), glowTex = glowTexture(), cache = new Map(), V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const toon = (c, extra) => { const k = c + (extra ? JSON.stringify(extra) : ''); if (!cache.has(k)) cache.set(k, new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...extra })); return cache.get(k); }; toon.grad = grad;
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1a1626, side: THREE.BackSide });
  function addOutline(mesh, t = 0.04, radius) { const g = mesh.geometry; g.computeBoundingBox(); const s = V3(); g.boundingBox.getSize(s); const o = new THREE.Mesh(g, outlineMat); if (radius) o.scale.setScalar(1 + t / radius); else o.scale.set(1 + 2 * t / Math.max(s.x, 0.01), 1 + 2 * t / Math.max(s.y, 0.01), 1 + 2 * t / Math.max(s.z, 0.01)); mesh.add(o); return mesh; }
  function M(geo, mat, x = 0, y = 0, z = 0, parent, outline = 0.02, radius) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = !touch; if (outline) addOutline(m, outline, radius); (parent || scene).add(m); return m; }
  M.scene = scene;
  const kit = foxKit({ THREE, scene, toon, M, grad, outlineMat, crestTex, rr, pick, clamp, smooth, damp });
  scene.add(new THREE.HemisphereLight(0xfff1dd, 0x3a2a2a, 1.1)); const sun = new THREE.DirectionalLight(0xfff0d8, 1.25); sun.position.set(-3, 6, 2); sun.castShadow = !touch; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); scene.add(sun);
  const room = buildParlor({ toon, M, scene });
  // polish: a cool rim light from behind each seat so silhouettes separate from the walls, a warm pool of lamp light on the table, dust in the light
  const rim = new THREE.DirectionalLight(0x9fc4ff, 0.55); rim.position.set(2, 3.5, -5); scene.add(rim); const rim2 = new THREE.DirectionalLight(0xffd9a8, 0.35); rim2.position.set(-2, 3, 5); scene.add(rim2);
  const pool1 = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffc77a, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })); pool1.position.y = 0.012; scene.add(pool1);
  const dust = (() => { const n = 70, g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), seed = []; for (let i = 0; i < n; i++) { seed.push([rr(-1.3, 1.3), rr(0.9, 3.1), rr(-1.3, 1.3), rr(0, 6)]); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color: 0xffe6b8, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(pts);
    return { pts, seed, step(t) { for (let i = 0; i < n; i++) { const [x, y, z, ph] = seed[i]; pos[i * 3] = x + Math.sin(t * 0.13 + ph) * 0.25; pos[i * 3 + 1] = y + Math.sin(t * 0.09 + ph * 2) * 0.2; pos[i * 3 + 2] = z + Math.cos(t * 0.11 + ph) * 0.25; } g.attributes.position.needsUpdate = true; } }; })();
  // a thought bubble over a fox that is thinking
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true, map: (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.c = c; return t; })() })); bubble.scale.set(0.5, 0.25, 1); bubble.renderOrder = 45; bubble.visible = false; scene.add(bubble);
  function drawBubble(k) { const c = bubble.material.map.userData.c, g = c.getContext('2d'); g.clearRect(0, 0, 256, 128); g.fillStyle = '#fbf4e4'; g.strokeStyle = '#1a1626'; g.lineWidth = 7; g.beginPath(); g.ellipse(128, 56, 112, 46, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(70, 112, 10, 0, 7); g.fill(); g.stroke();
    for (let i = 0; i < 3; i++) { g.fillStyle = i === k ? '#ec3013' : '#1a1626'; g.beginPath(); g.arc(80 + i * 48, 56, 13, 0, 7); g.fill(); } bubble.material.map.needsUpdate = true; }

  // ---------- board: one canvas texture holds the felt, the points, labels and every highlight; real rails around it ----------
  const BW = 1024, BH = Math.round(1024 * BDEP / BWID), bCan = document.createElement('canvas'); bCan.width = BW; bCan.height = BH; const bg = bCan.getContext('2d'), bTex = new THREE.CanvasTexture(bCan); bTex.colorSpace = THREE.SRGBColorSpace; bTex.anisotropy = 8;
  const U = x => (x + BWID / 2) / BWID * BW, V = z => (z + BDEP / 2) / BDEP * BH, SX = BW / BWID;
  M(new THREE.BoxGeometry(BWID + 0.02, 0.045, BDEP + 0.02), toon('#3a2214'), 0, TABLE_Y + 0.0225, 0, scene, 0.012);
  const boardTop = new THREE.Mesh(new THREE.PlaneGeometry(BWID, BDEP), new THREE.MeshToonMaterial({ map: bTex, gradientMap: grad })); boardTop.rotation.x = -Math.PI / 2; boardTop.position.y = BOARD_Y + 0.0005; boardTop.receiveShadow = !touch; scene.add(boardTop);
  { const rail = toon('#4a2c18'), rh = 0.022, y = BOARD_Y + rh / 2;   // raised rails: outer frame, the bar's two edges, the tray divider
    M(new THREE.BoxGeometry(BWID + 0.02, rh, MARG * 0.7), rail, 0, y, BDEP / 2 - MARG * 0.35, scene, 0.006); M(new THREE.BoxGeometry(BWID + 0.02, rh, MARG * 0.7), rail, 0, y, -BDEP / 2 + MARG * 0.35, scene, 0.006);
    M(new THREE.BoxGeometry(MARG * 0.7, rh, BDEP), rail, BWID / 2 - MARG * 0.35, y, 0, scene, 0.006); M(new THREE.BoxGeometry(MARG * 0.7, rh, BDEP), rail, -BWID / 2 + MARG * 0.35, y, 0, scene, 0.006);
    for (const sx of [1, -1]) M(new THREE.BoxGeometry(0.012, rh, BDEP - MARG * 1.4), rail, sx * (PX0 + 0.01), y, 0, scene, 0.004);
    M(new THREE.BoxGeometry(TRAYW + 0.02, rh, 0.012), rail, TRAYX, y, 0, scene, 0.004);
    const brass = toon('#e6b45a'); for (const z of [0.32, -0.32]) { M(new THREE.BoxGeometry(0.036, 0.004, 0.07), toon('#b8862b'), 0, BOARD_Y + 0.002, z, scene, 0.002); M(new THREE.CylinderGeometry(0.005, 0.005, 0.07, 8).rotateX(Math.PI / 2), brass, 0, BOARD_Y + 0.006, z, scene, 0); } }   // a folding case: brass hinges on the bar
  // leather dice cups, one by each player's right hand; they shake and pour on every roll
  const cups = {}; for (const c of ['w', 'b']) { const g = new THREE.Group(), sx = c === 'w' ? 1 : -1; g.position.set(sx * (BWID / 2 - 0.12), TABLE_Y, sx * (BDEP / 2 + 0.12)); scene.add(g);
    M(new THREE.LatheGeometry([[0, 0], [0.05, 0], [0.052, 0.01], [0.058, 0.11], [0.062, 0.12], [0.056, 0.12], [0.05, 0.02], [0, 0.02]].map(([x, y]) => new THREE.Vector2(x, y)), 20), toon(c === 'w' ? '#6b3a1f' : '#3a1e12'), 0, 0, 0, g, 0.008, 0.06);
    M(new THREE.TorusGeometry(0.059, 0.006, 6, 20).rotateX(Math.PI / 2), toon('#e6b45a'), 0, 0.118, 0, g, 0);
    g.userData = { home: g.position.clone(), t: -1, sx }; cups[c] = g; }
  const THEMES = { wood: { felt: '#21503d', a: '#ecd9ae', b: '#a3302f', frame: '#3a2214', bar: '#4a2c18', tray: '#2b1a10', acc: '#e6b45a', num: 'rgba(240,226,190,0.9)' },
    contrast: { felt: '#0b1020', a: '#ffffff', b: '#ffd23a', frame: '#000000', bar: '#1d2433', tray: '#000000', acc: '#38bdf8', num: '#ffffff' } };

  // ---------- state ----------
  let prefs = { sound: true, music: true, pips: true, autoRoll: false, speak: false, theme: 'wood', autoFlip: true, view: 'play', color: 'w', level: 1, tc: 'none' };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')); } catch (e) {}
  const savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {} };
  let game = new Backgammon(), phase = 'menu', mode = 'cpu', level = prefs.level, myColor = 'w', practice = false, over = null, sel = null, targets = [], hint = null, promoAsk = null;
  let turnPlays = [], prefix = [], rolling = false, opening = null, first = 'w', committing = false;
  let cpuBusy = false, cpuTok = 0, hintBusy = false, anims = [], say = null, toast = null, live = '', povColor = 'w', clocks = null, safe = { top: 0, bottom: 0, left: 0, right: 0 };
  let started = 0, cursor = -1, flash = null, topple = null, lastTick = -1;

  // ---------- pieces + dice ----------
  const pGrad = (() => { const d = new Uint8Array([150, 150, 150, 255, 210, 210, 210, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
  const GEOS = pieceGeos(), pool = { w: [], b: [] };
  let stacks = Array.from({ length: 24 }, () => []), barS = { w: [], b: [] }, offS = { w: [], b: [] };
  const PMAT = { w: new THREE.MeshToonMaterial({ color: '#f4ead6', gradientMap: pGrad }), b: new THREE.MeshToonMaterial({ color: '#c42d3c', gradientMap: pGrad, emissive: '#2a0408' }) };
  const RIDGE = { w: new THREE.MeshToonMaterial({ color: '#cdbb98', gradientMap: pGrad }), b: new THREE.MeshToonMaterial({ color: '#8e1d28', gradientMap: pGrad }) };
  const shadowTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 4, 32, 32, 31); r.addColorStop(0, 'rgba(20,10,0,0.55)'); r.addColorStop(0.6, 'rgba(20,10,0,0.25)'); r.addColorStop(1, 'rgba(20,10,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }), shadowGeo = new THREE.PlaneGeometry(0.12, 0.12).rotateX(-Math.PI / 2);
  function makeChecker(c) { const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const m = new THREE.Mesh(GEOS.disc, PMAT[c]); m.castShadow = !touch; body.add(m, new THREE.Mesh(GEOS.disc.userData.out, outlineMat), new THREE.Mesh(GEOS.ridge, RIDGE[c]));
    const sh = new THREE.Mesh(shadowGeo, shadowMat); sh.position.y = 0.002; sh.renderOrder = 1; g.add(sh); g.userData = { c, body, sh }; scene.add(g); return g; }
  function take(c) { const L = pool[c], p = L.find(o => !o.visible) || (L.push(makeChecker(c)), L[L.length - 1]); p.visible = true; p.userData.body.rotation.set(0, 0, 0); p.userData.body.position.set(0, 0, 0); p.userData.body.scale.setScalar(1); p.userData.pop = 0; p.userData.edge = false; return p; }
  function place(o, pos, edge = false) { o.position.copy(pos); o.userData.edge = edge; o.userData.body.rotation.x = edge ? Math.PI / 2 : 0; o.userData.body.position.y = edge ? 0 : 0; }
  function syncPieces() {   // place every checker from the game (no animation)
    anims = anims.filter(a => a.die); for (const L of Object.values(pool)) L.forEach(p => p.visible = false); stacks = Array.from({ length: 24 }, () => []); barS = { w: [], b: [] }; offS = { w: [], b: [] };
    game.p.forEach((v, i) => { const c = v > 0 ? 'w' : 'b'; for (let j = 0; j < Math.abs(v); j++) { const o = take(c); place(o, slotPos(i, j)); stacks[i].push(o); } });
    for (const c of ['w', 'b']) { for (let j = 0; j < game.bar[c]; j++) { const o = take(c); place(o, barPos(c, j)); barS[c].push(o); } for (let j = 0; j < game.off[c]; j++) { const o = take(c); place(o, offPos(c, j), true); offS[c].push(o); } }
  }
  function flushAnims() { for (const a of anims) { if (a.fin || a.die) continue; a.o.position.copy(a.b); if (a.edge) a.o.userData.body.rotation.x = Math.PI / 2; a.fin = true; a.done && a.done(); } anims = anims.filter(a => a.die && !a.fin); }
  // one step on the visual board (game state is updated separately). Returns the duration.
  function animStep(s, c, delay = 0) {
    const src = s.from === BAR ? barS[c] : stacks[s.from], o = src.pop(); if (!o) { syncPieces(); return 0.3; }
    const dur = 0.36, pan = s.to === OFF ? 0.7 : clamp(pointX(s.to) / 0.8, -0.7, 0.7), op = c === 'w' ? 'b' : 'w';
    if (s.hit) { const v = stacks[s.to].pop(); if (v) { barS[op].push(v); const dst = barPos(op, barS[op].length - 1); anims.push({ o: v, a: v.position.clone(), b: dst, t: -delay - dur * 0.55, dur: 0.5, hop: 0.2, spin: rr(-9, 9), done: () => { v.userData.spin = 0; v.userData.body.rotation.set(0, 0, 0); } }); puffAt.push([v.position.clone(), delay + dur * 0.55]); } }
    let dst, edge = false; if (s.to === OFF) { offS[c].push(o); dst = offPos(c, offS[c].length - 1); edge = true; } else { stacks[s.to].push(o); dst = slotPos(s.to, stacks[s.to].length - 1); }
    anims.push({ o, a: o.position.clone(), b: dst, t: -delay, dur, hop: s.from === BAR ? 0.14 : 0.07, edge, done: () => { if (edge) o.userData.body.rotation.x = Math.PI / 2; sfx(s.hit ? 'hit' : s.to === OFF ? 'off' : s.from === BAR ? 'enter' : 'move', { pan }); } });
    return dur;
  }
  const puffAt = [];
  // dice: canvas faces with pips, ivory for White, red for Red
  function dieFaces(bgc, pip) { return FACE_VAL.map(v => new THREE.MeshToonMaterial({ gradientMap: pGrad, transparent: true, map: canvasTex(128, 128, (g) => { g.fillStyle = bgc; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 8; g.strokeRect(4, 4, 120, 120);
    const P2 = { 1: [[64, 64]], 2: [[36, 36], [92, 92]], 3: [[34, 34], [64, 64], [94, 94]], 4: [[36, 36], [92, 36], [36, 92], [92, 92]], 5: [[34, 34], [94, 34], [64, 64], [34, 94], [94, 94]], 6: [[36, 30], [92, 30], [36, 64], [92, 64], [36, 98], [92, 98]] }[v];
    g.fillStyle = pip; for (const [x, y] of P2) { g.beginPath(); g.arc(x, y, 11, 0, 7); g.fill(); } }) })); }
  const DIEMAT = { w: dieFaces('#fbf4e4', '#1a1626'), b: dieFaces('#c42d3c', '#fbf4e4') };
  const dice3 = [0, 1].map(() => { const g = new THREE.Group(), m = new THREE.Mesh(GEOS.die, DIEMAT.w); m.castShadow = !touch; g.add(m); const o = new THREE.Mesh(GEOS.die, outlineMat); o.scale.setScalar(1.08); g.add(o); g.visible = false; g.userData = { m }; scene.add(g); return g; });
  const UP = new THREE.Vector3(0, 1, 0);
  const dieQuat = (v, yaw) => { const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...FACE_N[v]), UP); return new THREE.Quaternion().setFromAxisAngle(UP, yaw).multiply(q); };
  function setDieMat(k, c) { dice3[k].userData.m.material = DIEMAT[c]; }
  function dieOpacity(k, a) { for (const mt of dice3[k].userData.m.material) mt.opacity = a; }
  // roll animation: from the roller's edge, tumbling, landing on the roller's right half. cols: colour per die
  function rollAnim(vals, cols, sideX) {
    anims = anims.filter(a => !a.die); const zEdge = cols[0] === 'w' ? ZH * 0.9 : -ZH * 0.9, twoCups = cols[0] !== cols[1];
    for (const c of new Set(cols)) { const cp = cups[c]; if (cp) cp.userData.t = 0; }
    vals.forEach((v, k) => { const g = dice3[k]; setDieMat(k, cols[k]); dieOpacity(k, 1); g.visible = false; const cp = cups[cols[k]], a = cp ? cp.userData.home.clone().add(new THREE.Vector3(-cp.userData.sx * 0.05 + (twoCups ? 0 : (k ? 0.02 : -0.02)), 0.2, -cp.userData.sx * 0.06)) : new THREE.Vector3(sideX + (k ? 0.08 : -0.08), BOARD_Y + 0.28, zEdge), b = new THREE.Vector3(sideX + (k ? 0.055 : -0.055) + rr(-0.015, 0.015), BOARD_Y + DS / 2 + 0.001, rr(-0.03, 0.03));
      const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(rr(0, 6), rr(0, 6), rr(0, 6))), q1 = dieQuat(v, rr(-0.5, 0.5)), axis = new THREE.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize();
      g.position.copy(a); anims.push({ die: true, o: g, a, b, q0, q1, axis, t: -0.32 - k * 0.05, dur: 0.85 }); });
  }

  // ---------- puffs + sound + speech ----------
  const sparks = []; for (let i = 0; i < 18; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(0.12); scene.add(s); sparks.push({ s, life: 0, v: V3() }); } let spI = 0;
  function puff(p, col = 0xffffff, n = 3) { for (let i = 0; i < n; i++) { const k = sparks[spI = (spI + 1) % sparks.length]; k.s.position.copy(p); k.s.material.color.setHex(col); k.life = 1; k.v.set(rr(-0.4, 0.4), rr(0.4, 0.9), rr(-0.4, 0.4)); } }
  const urlMusic = !/[?&]music=0/.test(location.search), urlSfx = !/[?&]sfx=0/.test(location.search);
  const audio = createBackgammonAudio({ sound: prefs.sound && urlSfx, music: prefs.music && urlMusic });
  const ac = () => audio.unlock();
  const unlockAll = () => audio.unlock(); document.addEventListener('pointerdown', unlockAll, true); document.addEventListener('keydown', unlockAll, true);
  const uiClick = e => { if (e.target && e.target.closest && e.target.closest('button')) audio.sfx('ui'); }; document.addEventListener('click', uiClick, true);
  const buzz = ms => { try { if (mode !== 'demo' && navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(ms); } catch (e) {} };
  function sfx(k, o) { audio.sfx(k === 'sel' ? 'pick' : k, o); if (k === 'move' || k === 'enter') buzz(8); else if (k === 'hit') buzz([12, 30, 12]); else if (k === 'dice') buzz(10); }
  const where = (c, i) => i === BAR ? 'the bar' : i === OFF ? 'off' : String(pointNum(c, i));
  function whatIs(i) { const pc = povColor; if (i === BAR) return 'The bar: ' + game.bar.w + ' white, ' + game.bar.b + ' red'; if (i === OFF) return 'Borne off: ' + game.off.w + ' white, ' + game.off.b + ' red';
    const v = game.p[i]; return 'Point ' + pointNum(pc, i) + (v ? ', ' + Math.abs(v) + ' ' + (v > 0 ? 'white' : 'red') : ', empty'); }
  function describe(h) {   // spoken / screen-reader words for a turn
    if (!h) return ''; const who = COLOR_WORD[h.color], c = h.color, roll = h.dice[0] + ' and ' + h.dice[1];
    if (!h.steps.length) return who + ' rolls ' + roll + ': no move';
    return who + ' rolls ' + roll + ': ' + h.steps.map(s => where(c, s.from) + ' to ' + where(c, s.to) + (s.hit ? ', hit' : '')).join('; ');
  }
  function speak(text) { if (!prefs.speak || !text || !window.speechSynthesis) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 1.05; u.onstart = () => audio.duck(true); u.onend = u.onerror = () => audio.duck(false); speechSynthesis.speak(u); } catch (e) {} }

  // ---------- board drawing ----------
  const port = () => CH() > CW();
  function triPath(i, inset = 0) { const x = pointX(i), z0 = pointZ0(i), d = pointDir(i); bg.beginPath(); bg.moveTo(U(x - P / 2 + inset), V(z0)); bg.lineTo(U(x + P / 2 - inset), V(z0)); bg.lineTo(U(x), V(z0 + d * (PL - inset * 2))); bg.closePath(); }
  function drawBoard() {
    const T = THEMES[prefs.theme] || THEMES.wood;
    bg.fillStyle = T.frame; bg.fillRect(0, 0, BW, BH);
    bg.fillStyle = T.felt; for (const s of [1, -1]) { const x0 = s > 0 ? BARW / 2 : -PX0, x1 = s > 0 ? PX0 : -BARW / 2; bg.fillRect(U(x0), V(-ZH), U(x1) - U(x0), V(ZH) - V(-ZH)); }
    bg.fillStyle = T.bar; bg.fillRect(U(-BARW / 2), V(-ZH - 0.02), U(BARW / 2) - U(-BARW / 2), V(ZH + 0.02) - V(-ZH - 0.02));
    bg.fillStyle = T.tray; bg.fillRect(U(PX0 + 0.02), V(-ZH), U(PX0 + 0.02 + TRAYW) - U(PX0 + 0.02), V(ZH) - V(-ZH)); bg.fillRect(U(-PX0 - 0.02 - TRAYW), V(-ZH), U(-PX0 - 0.02) - U(-PX0 - 0.02 - TRAYW), V(ZH) - V(-ZH));
    if (prefs.theme === 'wood') { bg.globalAlpha = 0.06; bg.fillStyle = '#000'; for (let k = 0; k < 300; k++) bg.fillRect(rr(0, BW), rr(0, BH), rr(1, 3), rr(1, 3)); bg.globalAlpha = 1; }
    const myTurn = humanCanMove() && game.dice && !rolling, next = myTurn ? nextSteps() : [], last = game.history[game.history.length - 1];
    for (let i = 0; i < 24; i++) {
      triPath(i); bg.fillStyle = i % 2 ? T.b : T.a; bg.fill();
      bg.strokeStyle = 'rgba(0,0,0,0.25)'; bg.lineWidth = 2; bg.stroke();
      if (last && !prefix.length && last.steps.some(s => s.from === i || s.to === i)) { triPath(i, 0.012); bg.fillStyle = 'rgba(255,210,58,0.35)'; bg.fill(); }
      if (hint && hint.some(s => s.from === i || s.to === i)) { triPath(i, 0.01); bg.fillStyle = 'rgba(56,189,248,0.55)'; bg.fill(); }
      if (sel === i) { triPath(i, 0.006); bg.fillStyle = 'rgba(255,210,58,0.75)'; bg.fill(); }
      else if (sel == null && next.some(s => s.from === i)) { triPath(i, 0.008); bg.strokeStyle = 'rgba(255,210,58,0.95)'; bg.lineWidth = 5; bg.stroke(); }
      if (targets.some(s => s.to === i)) { triPath(i, 0.008); bg.fillStyle = 'rgba(34,197,94,0.45)'; bg.fill(); const n = stacks[i].length, p = slotPos(i, game.p[i] && Math.sign(game.p[i]) !== (game.turn === 'w' ? 1 : -1) ? 0 : n); bg.strokeStyle = 'rgba(240,255,240,0.95)'; bg.lineWidth = 5; bg.beginPath(); bg.arc(U(p.x), V(p.z), CR * SX * 0.95, 0, 7); bg.stroke(); }
    }
    // the bar and the trays light up when they are a source or a target
    if (sel === BAR || (sel == null && next.some(s => s.from === BAR))) { bg.strokeStyle = 'rgba(255,210,58,0.95)'; bg.lineWidth = 6; bg.strokeRect(U(-BARW / 2) + 3, V(-ZH) + 3, U(BARW / 2) - U(-BARW / 2) - 6, V(ZH) - V(-ZH) - 6); }
    if (targets.some(s => s.to === OFF)) { bg.fillStyle = 'rgba(34,197,94,0.5)'; bg.fillRect(U(PX0 + 0.02), V(game.turn === 'w' ? 0.006 : -ZH), U(PX0 + 0.02 + TRAYW) - U(PX0 + 0.02), V(ZH) - V(0.006) ); }
    // point numbers from the viewer's side, in the margins
    const ang = port() && prefs.view !== 'table' ? -Math.PI / 2 : povColor === 'b' ? Math.PI : 0;
    bg.fillStyle = T.num; bg.font = `800 ${Math.round(SX * 0.03)}px ${FONT}`; bg.textAlign = 'center'; bg.textBaseline = 'middle';
    for (let i = 0; i < 24; i++) { const x = pointX(i), z = pointZ0(i) + (i < 12 ? 1 : -1) * MARG * 0.55 * 0.9; bg.save(); bg.translate(U(x), V(z)); bg.rotate(ang); bg.fillText(pointNum(povColor, i), 0, 0); bg.restore(); }
    // home boards: a dashed gold outline + a small HOME tag by the tray
    bg.save(); bg.setLineDash([10, 8]); bg.strokeStyle = 'rgba(230,180,90,0.55)'; bg.lineWidth = 3; for (const zs of [1, -1]) { const z0 = zs > 0 ? 0.02 : -ZH + 0.01, z1 = zs > 0 ? ZH - 0.01 : -0.02; bg.strokeRect(U(BARW / 2 + 0.006), V(z0), U(PX0 - 0.006) - U(BARW / 2 + 0.006), V(z1) - V(z0)); } bg.restore();
    bg.textAlign = 'center'; bg.textBaseline = 'middle';
    // arrows: the last turn in gold, the steps you are making now in green
    const spot = (c, i, n) => i === BAR ? [U(0), V((c === 'w' ? 1 : -1) * 0.12)] : i === OFF ? [U(TRAYX), V((c === 'w' ? 1 : -1) * ZH * 0.55)] : (() => { const p = slotPos(i, Math.max(0, Math.min(4, n))); return [U(p.x), V(p.z)]; })();
    const arrow = (from, to, col, w) => { const [x0, y0] = from, [x1, y1] = to, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, bend = Math.min(60, L * 0.18), cx = mx - dy / L * bend, cy = my + dx / L * bend;
      bg.strokeStyle = col; bg.lineWidth = w; bg.lineCap = 'round'; bg.beginPath(); bg.moveTo(x0, y0); bg.quadraticCurveTo(cx, cy, x1, y1); bg.stroke();
      const ax = x1 - cx, ay = y1 - cy, al = Math.hypot(ax, ay) || 1, ux = ax / al, uy = ay / al, hs = w * 3.2; bg.fillStyle = col; bg.beginPath(); bg.moveTo(x1, y1); bg.lineTo(x1 - ux * hs - uy * hs * 0.6, y1 - uy * hs + ux * hs * 0.6); bg.lineTo(x1 - ux * hs + uy * hs * 0.6, y1 - uy * hs - ux * hs * 0.6); bg.closePath(); bg.fill(); };
    if (last && !prefix.length) last.steps.forEach(st => arrow(spot(last.color, st.from, 0), spot(last.color, st.to, st.to === OFF ? 0 : Math.abs(game.p[st.to]) - 1), 'rgba(255,210,58,0.75)', 7));
    prefix.forEach(st => arrow(spot(game.turn, st.from, 0), spot(game.turn, st.to, st.to === OFF ? 0 : Math.abs(game.p[st.to]) - 1), 'rgba(110,231,140,0.9)', 7));
    // more than five on a point: a count badge just past the fifth checker
    for (let i = 0; i < 24; i++) { const n = Math.abs(game.p[i]); if (n <= 5) continue; const z = pointZ0(i) + pointDir(i) * (CR + 0.004 + 5 * 2 * CR - CR * 0.2), x = pointX(i); bg.fillStyle = game.p[i] > 0 ? '#f4ead6' : '#c42d3c'; bg.strokeStyle = '#1a1626'; bg.lineWidth = 4; bg.beginPath(); bg.arc(U(x), V(z), SX * 0.022, 0, 7); bg.fill(); bg.stroke();
      bg.fillStyle = game.p[i] > 0 ? '#1a1626' : '#fff'; bg.font = `900 ${Math.round(SX * 0.026)}px ${FONT}`; bg.save(); bg.translate(U(x), V(z)); bg.rotate(ang); bg.fillText(String(n), 0, 1); bg.restore(); }
    bg.strokeStyle = T.acc; bg.lineWidth = 3; bg.strokeRect(U(-PX0) - 2, V(-ZH) - 2, U(PX0) - U(-PX0) + 4, V(ZH) - V(-ZH) + 4);
    bTex.needsUpdate = true;
  }

  // ---------- foxes ----------
  let rigs = {}; try { rigs = await loadCastRigs(); } catch (e) {}
  const CK = castKit({ THREE, M, toon, makeFox: kit.makeFox }, rigs), foxes = {};
  const FOXDEF = {
    player: () => kit.makeFox({ ...CAST.player, gear: 'none' }),
    pip: () => kit.makeFox({ key: 'pip', torso: ['#ffd23a', '#fff7d6', '#b45309'], crest: '8', look: { ...PLAYER_FEMALE, bodyScale: (PLAYER_FEMALE.bodyScale || 1) * 0.86 }, outfit: 'vest', eyes: ['#22c55e', '#22c55e'], mood: 'excited' }),
    hope: () => kit.makeFox({ ...CAST.hope }), noble: () => CK.make('noble'),   // Hope sits, so her cane rests against the table (prop below)
  };
  NET_COLS.forEach(([n, col], i) => FOXDEF['net' + i] = () => kit.makeFox({ key: 'net' + i, torso: [col, '#f3f2f2', '#201e1d'], crest: '8', look: i % 2 ? PLAYER_FEMALE : PLAYER_MALE, outfit: 'vest', eyes: ['#38bdf8', '#38bdf8'], mood: 'happy' }));
  function fox(id) { if (!foxes[id]) { const f = FOXDEF[id](); f.visible = false; f.userData.id = id; f.userData.lookAt = BOARD_LOOK; foxes[id] = f; } return foxes[id]; }
  const cane = new THREE.Group(); { M(new THREE.CylinderGeometry(0.022, 0.022, 1.25, 8), toon('#f8fafc'), 0, 0.62, 0, cane, 0.01, 0.022); M(new THREE.CylinderGeometry(0.0225, 0.0225, 0.2, 8), toon('#dc2626'), 0, 0.12, 0, cane, 0.01, 0.0225); M(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8), toon('#1f2937'), 0, 1.2, 0, cane, 0.01, 0.03); cane.rotation.z = -0.32; scene.add(cane); cane.visible = false; }
  let seated = { w: null, b: null }, standing = [];   // fox ids
  function placeFoxes() {
    for (const f of Object.values(foxes)) f.visible = false;
    cane.visible = false;
    for (const c of ['w', 'b']) { const id = seated[c]; if (!id) continue; const f = fox(id), z = c === 'w' ? SEAT_Z : -SEAT_Z, chair = !!f.userData.chair; f.visible = !(phase === 'play' && c === povColor);   /* your own fox would sit between you and the board */ f.position.set(0, chair ? 0 : -0.14, chair ? z * 1.12 : z); f.rotation.y = c === 'w' ? Math.PI : 0; f.userData.sit = !chair; f.userData.seat = c;
      if (id === 'hope') { cane.visible = true; cane.position.set(0.78, 0, z * 0.62); } }
    standing.forEach((id, i) => { const f = fox(id); f.visible = true; f.userData.sit = false; f.userData.seat = null; f.position.set(-1.55, 0, [0, -0.85, 0.85][i] || 0); f.rotation.y = Math.atan2(-f.position.x, -f.position.z); });
  }
  const oppOf = () => OPPONENTS[level] || OPPONENTS[1];
  const cpuFoxId = () => ['pip', 'hope', 'noble'][level] || 'hope';
  function foxOn(c) { const id = seated[c]; return id ? fox(id) : null; }
  function mood(c, m, secs = 2.4) { const f = foxOn(c); if (!f) return; f.userData.mood = m; f.userData.moodT = secs; if (m === 'excited') f.userData.hop = 1; }
  function talk(c, text, who) { const f = foxOn(c); if (f) f.userData.say = { text, t: 0 }; say = { who: who || '', text, t: Math.max(2.6, text.length * 0.07), col: c }; emit(); }
  function oppLine(k) { const O = oppOf(); const L = O.lines[k]; if (L) talk(cpuColor(), pick(L), O.name); }
  // ---------- camera ----------
  const fitCam = new THREE.PerspectiveCamera(42, 1, 0.05, 60), _p = V3(); let camGoal = { pos: V3(4, 2, 0), look: V3(0, BOARD_Y, 0) }, camLook = V3(0, BOARD_Y, 0), orbitT = 0, camSnap = true;
  function fitShot(pts, el, yaw) {
    const W = CW(), H = CH(); fitCam.aspect = W / H; fitCam.fov = W / H < 0.75 ? 46 : 40; fitCam.updateProjectionMatrix(); const m = 0.04;
    const yT = 1 - 2 * safe.top / H - m, yB = -1 + 2 * safe.bottom / H + m, xR = 1 - 2 * safe.right / W - m, xL = -1 + 2 * safe.left / W + m, sx = (xL + xR) / 2, sy = (yT + yB) / 2;
    const dir = V3(Math.sin(yaw) * Math.cos(el), Math.sin(el), -Math.cos(yaw) * Math.cos(el)), tgt = V3(); pts.forEach(p => tgt.add(p)); tgt.multiplyScalar(1 / pts.length);
    const bounds = d => { fitCam.position.copy(tgt).addScaledVector(dir, d); fitCam.lookAt(tgt); fitCam.updateMatrixWorld(); let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for (const p of pts) { _p.copy(p).project(fitCam); if (_p.z > 1) return null; x0 = Math.min(x0, _p.x); x1 = Math.max(x1, _p.x); y0 = Math.min(y0, _p.y); y1 = Math.max(y1, _p.y); } return { x0, x1, y0, y1 }; };
    const fits = d => { const b = bounds(d); return b && b.x0 >= xL && b.x1 <= xR && b.y0 >= yB && b.y1 <= yT; };
    let d = 3; for (let it = 0; it < 4; it++) { let lo = 0.3, hi = 30; for (let k = 0; k < 20; k++) { const md = (lo + hi) / 2; if (fits(md)) hi = md; else lo = md; } d = hi; const b = bounds(d); if (!b) break;
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, th = Math.tan(fitCam.fov * Math.PI / 360) * d, right = V3().setFromMatrixColumn(fitCam.matrixWorld, 0), up = V3().setFromMatrixColumn(fitCam.matrixWorld, 1);
      tgt.addScaledVector(right, (cx - sx) * th * fitCam.aspect).addScaledVector(up, (cy - sy) * th); }
    return { pos: tgt.clone().addScaledVector(dir, d), look: tgt };
  }
  const VIEWS = ['play', 'top', 'table'];
  function aimCamera() {
    const pt = port(), side = prefs.view !== 'table' && pt, yaw = side ? Math.PI / 2 : (povColor === 'w' ? Math.PI : 0), ex = BWID / 2, ez = BDEP / 2, pts = [];
    for (const [x, z] of [[-ex, -ez], [ex, -ez], [-ex, ez], [ex, ez]]) pts.push(V3(x, BOARD_Y, z));
    let el;
    if (phase === 'menu') { return; }
    if (prefs.view === 'top') el = 1.52; else if (prefs.view === 'table') { el = 0.62; const s = povColor === 'w' ? -1 : 1; pts.push(V3(-0.5, 2.3, s * SEAT_Z), V3(0.5, 2.3, s * SEAT_Z)); } else { el = pt ? 1.22 : 1.0; if (!side) pts.push(V3(-ex, BOARD_Y + 0.12, -ez * (povColor === 'w' ? 1 : -1)), V3(ex, BOARD_Y + 0.12, -ez * (povColor === 'w' ? 1 : -1))); }
    camGoal = fitShot(pts, el, yaw); placeFoxes(); drawBoard();
  }


  // ---------- who moves ----------
  const cpuColor = () => mode === 'demo' ? game.turn : (myColor === 'w' ? 'b' : 'w');
  const isCpuTurn = () => phase === 'play' && !over && ((mode === 'cpu' && game.turn === cpuColor()) || mode === 'demo');
  function humanCanMove() {
    if (phase !== 'play' || over || rolling || opening || committing) return false;
    if (mode === 'cpu') return game.turn === myColor && !cpuBusy;
    if (mode === 'local') return true;
    if (mode === 'net') return !!NET.room && NET.seatOf(NET.me) === game.turn && NET.state && NET.state.live;
    return false;
  }
  const canRoll = () => humanCanMove() && !game.dice;
  function clearSel() { sel = null; targets = []; }
  const sameStep = (a, b) => a.from === b.from && a.to === b.to;
  function nextSteps() { const k = prefix.length, m = new Map(); for (const pl of turnPlays) if (pl.length > k && prefix.every((s, i) => sameStep(s, pl[i]))) { const s = pl[k], key = s.from + '>' + s.to; if (!m.has(key)) m.set(key, s); } return [...m.values()]; }
  function diceLeft() { if (!game.dice) return []; const all = game.dice[0] === game.dice[1] ? [game.dice[0], game.dice[0], game.dice[0], game.dice[0]] : game.dice.slice(); for (const s of prefix) { const k = all.indexOf(s.die); if (k >= 0) all.splice(k, 1); } return all; }
  function markDice() { if (!game.dice) return; const left = diceLeft(), d = game.dice; if (d[0] === d[1]) { dieOpacity(0, left.length >= 3 ? 1 : 0.32); dieOpacity(1, left.length >= 1 ? 1 : 0.32); } else { dieOpacity(0, left.includes(d[0]) ? 1 : 0.32); dieOpacity(1, left.includes(d[1]) ? 1 : 0.32); } }
  function setDice(d) { game.dice = d ? d.slice() : null; prefix = []; turnPlays = d ? game.plays() : []; clearSel(); markDice(); }
  const sideX = c => (c === 'w' ? 1 : -1) * 0.33;
  // roll for whoever is on turn (vals given online by the host; otherwise rolled here)
  function doRoll(vals) {
    if (rolling || over) return; rolling = true; hint = null; const c = game.turn; vals = vals || [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
    rollAnim(vals, [c, c], sideX(c)); sfx('rattle'); live = COLOR_WORD[c] + ' rolls…'; emit();
    const tok = cpuTok; setTimeout(() => { if (tok !== cpuTok && mode !== 'net') { rolling = false; return; } rolling = false; setDice(vals); if (vals[0] === vals[1]) { sfx('doubles'); flash = { txt: 'DOUBLES', col: '#ffd23a', t: 1.1 }; } afterRoll(); }, 1250);
  }
  function afterRoll() {
    const c = game.turn, d = game.dice; live = COLOR_WORD[c] + ' rolls ' + d[0] + ' and ' + d[1] + (d[0] === d[1] ? ': doubles, four moves' : '');
    if (mode === 'cpu' && d[0] === d[1] && c === cpuColor() && Math.random() < 0.5) oppLine('doubles');
    if (!turnPlays.length) { live += '. No legal move.'; flash = { txt: 'NO MOVE', col: '#ff9a8a', t: 1.3 }; setTimeout(() => sfx('nomove'), 300); if (mode === 'demo') demoTip('nomove'); speak(live); drawBoard(); emit(); if (mode !== 'net') { const tok = cpuTok; setTimeout(() => { if (tok === cpuTok && phase === 'play' && !over) commitTurn(); }, 1600); } return; }
    speak(live); drawBoard(); emit();
    if (isCpuTurn()) { cpuChoose(); return; }
    // only one way to play this roll? play it for the player (still shown step by step)
    if (humanCanMove()) { const u = game.uniquePlays(); if (u.length === 1 && u[0].length) { const pl = u[0], tok = cpuTok, ply = game.history.length; committing = true; flash = { txt: 'ONLY ONE WAY TO PLAY', col: '#7dd3fc', t: 1.3 }; live += '. Only one way to play it.'; speak(live); emit();
      let k = 0; const step = () => { if (tok !== cpuTok || game.history.length !== ply || over) { committing = false; return; } if (k >= pl.length) { setTimeout(() => { committing = false; if (tok === cpuTok && game.history.length === ply) commitTurn(); }, 350); return; } applyStep(pl[k++]); drawBoard(); emit(); setTimeout(step, 480); };
      setTimeout(step, 700); } }
  }
  function applyStep(s) { const c = game.turn; game.apply(s, c); prefix.push(s); animStep(s, c); hint = null; markDice(); }
  function stepTo(to) {
    const s = targets.find(t => t.to === to); if (!s) return false; applyStep(s); clearSel();
    live = where(game.turn, s.from) + ' to ' + where(game.turn, s.to) + (s.hit ? ', hit' : ''); speak(live);
    if (!nextSteps().length) { committing = true; setTimeout(() => { committing = false; commitTurn(); }, 420); }
    drawBoard(); emit(); return true;
  }
  function undoStep() { const s = prefix.pop(); if (!s) return false; game.unapply(s, game.turn); flushAnims(); syncPieces(); clearSel(); markDice(); drawBoard(); emit(); return true; }
  // the turn is complete (or there was no move): lock it into the game
  function commitTurn() {
    if (!game.dice) return; const steps = prefix.slice(), c = game.turn; steps.slice().reverse().forEach(s => game.unapply(s, c)); prefix = [];
    const code = game.code(game.dice, steps), ply = game.history.length, h = game.playTurn(code); if (!h) { syncPieces(); setDice(game.dice); emit(); return; }
    turnPlays = []; clearSel(); dice3.forEach(g => g.visible = false); started = 1;
    if (mode === 'net') NET.request({ k: 'move', code, ply });
    afterTurn(h);
  }
  // another device's turn arrives: show it step by step
  function playTurnAnimated(code) { const pre = game.toJSON(); const h = game.playTurn(code); if (!h) { syncPieces(); return null; } const vis = new Backgammon({ state: pre });
    if (h.dice) { rollAnim(h.dice, [h.color, h.color], sideX(h.color)); dice3.forEach((g, k) => { const a = anims.find(x => x.die && x.o === g); if (a) a.t = a.dur; }); }
    h.steps.forEach((s, k) => animStep(s, h.color, k * 0.42)); vis.history = []; return h; }
  function afterTurn(h, fromNet = false) {
    const st = game.status(); live = describe(h); speak(live); drawBoard(); audio.mood(st.over ? 'over' : (game.bar.w || game.bar.b) ? 'tense' : 'play');
    if (mode === 'cpu') { if (h.steps.some(s => s.hit)) { if (h.color === myColor) { mood(cpuColor(), 'sad'); mood(myColor, 'happy'); if (Math.random() < 0.55) oppLine('lost'); } else { mood(cpuColor(), 'happy'); if (Math.random() < 0.55) oppLine('take'); } } }
    if (mode === 'local' && prefs.autoFlip && !st.over) { povColor = game.turn; setTimeout(() => { aimCamera(); }, 700); }
    if (mode === 'demo') demoAfter(h, st);
    if (st.over) { const dly = 500 + h.steps.length * 200; if (mode === 'demo') { const tk = demoTok; setTimeout(() => { if (mode === 'demo' && tk === demoTok) demoEnd(st); }, dly); } else if (mode !== 'net') setTimeout(() => finish(st.result, st.reason, { points: st.points, kind: st.kind }), dly); }
    else if (mode === 'cpu' && game.turn === cpuColor()) cpuTurn();
    else if (mode === 'demo') { const tok = demoTok; setTimeout(() => { if (mode === 'demo' && phase === 'play' && tok === demoTok) cpuTurn(); }, demo && demo.tip ? 3400 : 1500); }
    else if (prefs.autoRoll && humanCanMove() && mode !== 'net') setTimeout(() => { if (canRoll()) doRoll(); }, 700);
    if (mode === 'cpu' || mode === 'local') storeResume();
    emit();
  }

  // ---------- CPU (Worker, main-thread fallback) ----------
  let worker = null, wTok = 0, wCb = new Map(); try { worker = new Worker(new URL('./backgammon-rules.js', import.meta.url), { type: 'module' }); worker.onmessage = e => { const cb = wCb.get(e.data.id); wCb.delete(e.data.id); cb && cb(e.data.m); }; worker.onerror = () => { worker = null; }; } catch (e) { worker = null; }
  function ask(lvl, cb) { const id = ++wTok, state = game.toJSON(); const local = () => { const r = think(new Backgammon({ state }), lvl); cb(r ? r.map(s => [s.from, s.to]) : []); };
    if (worker) { wCb.set(id, cb); worker.postMessage({ id, state, level: lvl }); setTimeout(() => { if (wCb.has(id)) { wCb.delete(id); local(); } }, 7000); } else setTimeout(local, 30); }
  function cpuTurn() { cpuBusy = true; const tok = ++cpuTok, f = foxOn(cpuColor()); if (f) f.userData.mood = 'curious'; emit(); setTimeout(() => { if (tok !== cpuTok || phase !== 'play' || over) return; doRoll(); }, mode === 'demo' ? 500 : 700); }
  function cpuChoose() {
    const tok = cpuTok, t0 = performance.now();
    ask(level, m => { const wait = Math.max(0, 500 + rr(0, 400) - (performance.now() - t0)); setTimeout(() => { if (tok !== cpuTok || phase !== 'play' || over) return;
      const want = (m || []).map(([from, to]) => ({ from, to })); let k = 0;
      const stepNext = () => { if (tok !== cpuTok || phase !== 'play' || over) return; if (k >= want.length) { cpuBusy = false; const ff = foxOn(cpuColor()); if (ff) ff.userData.mood = ff.userData.base; setTimeout(() => { if (tok === cpuTok) commitTurn(); }, 300); return; }
        const s = nextSteps().find(x => sameStep(x, want[k])) || nextSteps()[0]; k++; if (!s) { k = want.length; stepNext(); return; } applyStep(s); drawBoard(); emit(); setTimeout(stepNext, 520); };
      stepNext(); }, wait); });
  }


  // ---------- end of game ----------
  function finish(result, reason, extra = {}) {
    if (over) return; const winner = result === '1-0' ? 'w' : result === '0-1' ? 'b' : null, pts = extra.points || 1, kind = extra.kind || 'single'; over = { result, reason, winner, ...extra }; clearSel(); cpuTok++; cpuBusy = false; dice3.forEach(g => g.visible = false);
    const tag = kind === 'gammon' ? ' · GAMMON' : kind === 'backgammon' ? ' · BACKGAMMON' : '';
    let title = winner ? (COLOR_WORD[winner] + ' wins') : 'Game over', sub = reason.charAt(0).toUpperCase() + reason.slice(1) + (pts > 1 ? ' · worth ' + pts + ' points' : ''), gold = 0, xp = 0, rec = null;
    if (mode === 'cpu') {
      const O = oppOf(), you = winner === myColor ? 'w' : 'l';
      title = (you === 'w' ? 'You win' : O.name + ' wins') + tag;
      if (!practice) { gold = you === 'w' ? O.gold * pts : 0; xp = you === 'w' ? O.xp * pts : game.history.length >= 20 ? 3 : 0; try { if (gold) save.addGold(gold); if (xp) save.addXp(xp); const k = 'backgammonClub.' + O.id + '.' + you; save.setStat(k, save.stat(k) + 1); if (you === 'w') save.setFlag('backgammonClub.beat.' + O.id); if (you === 'w' && pts > 1) save.setStat('backgammonClub.gammons', save.stat('backgammonClub.gammons') + 1); save.setStat('backgammonClub.games', save.stat('backgammonClub.games') + 1); } catch (e) {} }
      if (you === 'w') { mood(myColor, 'excited', 4); mood(cpuColor(), 'sad', 4); oppLine(pts > 1 ? 'gammon' : 'lose'); sfx(pts > 1 ? 'gammon' : 'win'); } else { mood(cpuColor(), 'excited', 4); mood(myColor, 'sad', 4); oppLine('win'); sfx('lose'); }
      rec = { you };
    } else { if (winner) { mood(winner, 'excited', 4); mood(winner === 'w' ? 'b' : 'w', 'sad', 4); } sfx(pts > 1 ? 'gammon' : 'win'); title += tag;
      if (mode === 'net' && NET.seatOf(NET.me)) { const mine = NET.seatOf(NET.me), you = winner === mine ? 'w' : 'l'; title = (you === 'w' ? 'You win' : 'You lose') + tag; xp = you === 'w' ? 10 * pts : 3; try { save.addXp(xp); const k = 'backgammonClub.online.' + you; save.setStat(k, save.stat(k) + 1); } catch (e) {} }
    }
    over.title = title; over.sub = sub + (practice && mode === 'cpu' ? ' · practice game (undo or hint used) · no gold' : ''); over.gold = gold; over.xp = xp; over.rec = rec;
    if (winner) { let k = 0; for (const o of offS[winner]) { o.userData.pop = 1 + k * 0.05; k++; } }
    audio.mood('over'); if (winner) flash = { txt: kind === 'single' ? title.toUpperCase().replace(/ · .*/, '') : kind.toUpperCase(), col: '#ffd23a', t: 1.8 };
    if (mode === 'cpu') { const O = oppOf(); let w = 0, l = 0; try { w = save.stat('backgammonClub.' + O.id + '.w'); l = save.stat('backgammonClub.' + O.id + '.l'); } catch (e) {} over.record = 'vs ' + O.name + ': ' + w + 'W ' + l + 'L'; }
    toParent({ action: 'result', mode, result, reason, points: pts, gold, xp, opponent: mode === 'cpu' ? oppOf().id : null });
    live = title + '. ' + sub + '.'; speak(live); clearResume(); drawBoard(); emit();
  }

  // ---------- resume ----------
  function storeResume() { if (mode !== 'cpu' && mode !== 'local') return; if (over || !game.history.length) return clearResume(); try { localStorage.setItem(RESUME_KEY, JSON.stringify({ mode, level, myColor, practice, first, moves: game.history.map(h => h.code), dice: game.dice })); } catch (e) {} }
  function clearResume() { try { localStorage.removeItem(RESUME_KEY); } catch (e) {} }
  function loadResume() { try { return JSON.parse(localStorage.getItem(RESUME_KEY) || 'null'); } catch (e) { return null; } }
  function replay(f, moves) { game = new Backgammon({ turn: f }); for (const u of moves) { if (!game.playTurn(u)) break; } }

  // ---------- DEMO: two foxes play while captions teach the rules ----------
  let demo = null, demoTok = 0, demoSeen = new Set();
  const NAMEOF = { w: 'HOPE', b: 'NOBLE' };
  const TIPS = {
    first: 'The opening roll: each side rolls one die. The higher number starts, and plays both numbers.',
    move: 'Each die moves one checker that many points toward home. Both dice can move the same checker.',
    doubles: 'Doubles! The number is played four times.',
    point: 'Two or more checkers make a point. The other side can never land there.',
    hit: 'A hit! A lone checker (a blot) was knocked to the bar in the middle.',
    bar: 'A checker on the bar must come back in first, into the other side\'s home board, before anything else moves.',
    nomove: 'No legal move with this roll, so the turn passes.',
    bearoff: 'All fifteen checkers are home, so now they bear off: a 6 takes a checker off the 6-point, and so on.',
    race: 'No more contact: it is a pure race now. The lower pip count is ahead.',
  };
  function demoTip(k) { if (!demo || demoSeen.has(k)) return; demoSeen.add(k); demo = { ...demo, cap: TIPS[k], tip: true }; speak(TIPS[k]); emit(); }
  function demoAfter(h, st) {
    if (!demo) return; let tip = null; const want = k => { if (demoSeen.has(k)) return false; demoSeen.add(k); return true; }, c = h.color;
    const madePoint = h.steps.some(s => s.to !== OFF && Math.abs(game.p[s.to]) === 2 && (c === 'w' ? game.p[s.to] > 0 : game.p[s.to] < 0));
    if (game.history.length === 1 && want('first')) tip = TIPS.first;
    else if (game.history.length === 2 && want('move')) tip = TIPS.move;
    else if (h.steps.some(s => s.hit) && want('hit')) tip = TIPS.hit;
    else if (h.steps.some(s => s.from === BAR) && want('bar')) tip = TIPS.bar;
    else if (h.dice[0] === h.dice[1] && h.steps.length && want('doubles')) tip = TIPS.doubles;
    else if (h.steps.some(s => s.to === OFF) && want('bearoff')) tip = TIPS.bearoff;
    else if (madePoint && want('point')) tip = TIPS.point;
    else if (!game.contact() && want('race')) tip = TIPS.race;
    demo = { key: NAMEOF[c] + ' · ' + h.text, cap: tip || describe(h) + '.', n: game.history.length, tip: !!tip };
    if (tip) speak(tip);
    if (game.history.length >= 400 && !st.over) { demo.cap = 'A long game. Setting up a fresh demo.'; demoTok++; setTimeout(() => { if (mode === 'demo' && phase === 'play') begin('demo'); }, 3500); }
  }
  function demoEnd(st) {
    const tok = ++demoTok, winner = st.winner; cpuTok++; cpuBusy = false;
    demo = { key: NAMEOF[winner] + ' WINS' + (st.points > 1 ? ' · ' + st.kind.toUpperCase() : ''), cap: (st.points > 1 ? (st.kind === 'gammon' ? 'A gammon: the loser had not borne off a single checker, so it counts double. ' : 'A backgammon: counts triple. ') : 'All fifteen checkers borne off. ') + 'A new demo starts in a moment, or tap TAKE OVER / EXIT DEMO.', n: game.history.length };
    mood(winner, 'excited', 4); mood(winner === 'w' ? 'b' : 'w', 'sad', 4); flash = { txt: NAMEOF[winner] + ' WINS', col: '#ffd23a', t: 1.8 }; sfx(st.points > 1 ? 'gammon' : 'win');
    audio.mood('over'); speak(demo.cap); emit();
    setTimeout(() => { if (mode === 'demo' && tok === demoTok && phase === 'play') begin('demo'); }, 9000);
  }
  function takeOver() {
    if (mode !== 'demo' || phase !== 'play') return; if (game.status().over) { begin('cpu', { level: prefs.level, color: prefs.color }); return; }
    cpuTok++; cpuBusy = false; demoTok++; demo = null; flushAnims(); if (prefix.length) { prefix.slice().reverse().forEach(s => game.unapply(s, game.turn)); prefix = []; syncPieces(); }
    mode = 'cpu'; level = prefs.level; myColor = game.turn; practice = true; rolling = false; committing = false;
    seated = myColor === 'w' ? { w: 'player', b: cpuFoxId() } : { w: cpuFoxId(), b: 'player' }; povColor = myColor; placeFoxes(); aimCamera(); if (game.dice) setDice(game.dice); drawBoard(); audio.mood('play');
    live = 'You play ' + COLOR_WORD[myColor] + ' from here against ' + oppOf().name + '. A practice game: no gold.' + (game.dice ? '' : ' Tap ROLL.'); speak(live); flash = { txt: 'YOUR MOVE', col: '#22c55e', t: 1.2 }; storeResume(); emit();
  }

  // ---------- starting games ----------
  // opening roll: one die each; the higher starts with both numbers
  function showOpening(o, then) { opening = o; const hi = Math.max(o.w, o.b), lo = Math.min(o.w, o.b);
    rollAnim([o.w, o.b], ['w', 'b'], 0); sfx('rattle'); live = 'Opening roll: White ' + o.w + ', Red ' + o.b + '. ' + COLOR_WORD[o.first] + ' starts with ' + hi + ' and ' + lo + '.'; flash = { txt: 'OPENING ROLL', col: '#ffd23a', t: 1.4 }; emit();
    const tok = cpuTok; setTimeout(() => { if (tok !== cpuTok && mode !== 'net') return; opening = null; speak(live); setDice(game.dice); then && then(); }, 1700); }
  function begin(m, o = {}) {
    NET.leave(true); mode = m; over = null; promoAsk = null; hint = null; practice = !!o.practice; clearSel(); cpuTok++; cpuBusy = false; say = null; started = 0; prefix = []; turnPlays = []; rolling = false; opening = null; committing = false; dice3.forEach(g => g.visible = false);
    if (m === 'demo') { level = 1; myColor = null; seated = { w: 'hope', b: 'noble' }; povColor = 'w'; clocks = null; demoTok++; demoSeen = new Set(); demo = { key: 'DEMO', cap: 'Hope plays White, Noble plays Red. Watch the dice, the moves and the hits. Tap the board or TAKE OVER to play from here.', n: 0 }; }
    else if (m === 'cpu') { level = o.level ?? prefs.level; myColor = o.color || prefs.color; if (myColor === 'random') myColor = Math.random() < 0.5 ? 'w' : 'b'; seated = myColor === 'w' ? { w: 'player', b: cpuFoxId() } : { w: cpuFoxId(), b: 'player' }; povColor = myColor; clocks = null; }
    else { myColor = 'w'; seated = { w: 'player', b: 'net1' }; povColor = 'w'; const tc = o.tc || prefs.tc; clocks = tc && tc !== 'none' ? { w: +tc * 60000, b: +tc * 60000, inc: 0 } : null; }
    standing = []; game = new Backgammon();
    phase = 'play'; topple = null;
    if (o.moves) { first = o.first || 'w'; replay(first, o.moves); syncPieces(); if (o.dice) setDice(o.dice); }
    else { const op = game.opening(); first = op.first; syncPieces(); }
    if (m === 'local' && prefs.autoFlip) povColor = game.turn;
    placeFoxes(); drawBoard(); aimCamera(); camSnap = false; audio.sfx('start'); audio.mood('play');
    if (m !== 'demo') demo = null;
    const go = () => { if (game.dice) { afterRoll(); } else if (isCpuTurn()) cpuTurn(); else if (prefs.autoRoll && canRoll()) doRoll(); };
    if (!o.moves) { const ow = game.dice, op = { w: game.turn === 'w' ? ow[0] : ow[1], b: game.turn === 'b' ? ow[0] : ow[1], first: game.turn }; const tok = cpuTok; setTimeout(() => { if (tok === cpuTok) showOpening(op, () => { if (m === 'cpu' && game.turn !== myColor) oppLine('hello'); go(); }); }, m === 'demo' ? 2600 : 600); if (m === 'cpu') setTimeout(() => oppLine('hello'), 400); }
    else setTimeout(go, 500);
    live = m === 'demo' ? demo.cap : m === 'cpu' ? 'New game against ' + oppOf().name + '. You play ' + COLOR_WORD[myColor] + '.' : 'Pass and play.'; speak(live); storeResume(); emit();
  }
  function toMenu() { cpuTok++; cpuBusy = false; demo = null; demoTok++; NET.leave(); phase = 'menu'; topple = null; audio.mood('menu'); over = null; promoAsk = null; clearSel(); hint = null; say = null; mode = 'cpu'; seated = { w: null, b: ['pip', 'hope', 'noble'][prefs.level] || 'hope' }; standing = []; prefix = []; turnPlays = []; rolling = false; opening = null; dice3.forEach(g => g.visible = false); game = new Backgammon(); syncPieces(); placeFoxes(); drawBoard(); emit(); }

  // ================= ONLINE (room of up to 5 · host-authoritative · engine/duel-net.js, else a same-device test channel) =================
  const NET = (() => {
    const N = { room: null, me: null, tr: null, members: {}, state: null, msg: '', status: '', copied: false, tok: 0, timer: 0, lastSeen: {}, reacts: [] };
    const now = () => performance.now();
    function list() { if (!N.room) return []; const all = Object.entries(N.members).map(([id, m]) => ({ id, ...m })); all.sort((a, b) => a.j - b.j || (a.id < b.id ? -1 : 1)); return all.slice(0, GAME.maxRoom); }
    N.list = list; N.isHost = () => { const L = list(); return !!L.length && L[0].id === N.me; };
    N.seatOf = id => !N.state ? null : N.state.seats.w === id ? 'w' : N.state.seats.b === id ? 'b' : null;
    N.slotOf = id => { const i = list().findIndex(m => m.id === id); return i < 0 ? 0 : i; };
    N.nameOf = id => id === N.me ? 'YOU' : (NET_COLS[N.slotOf(id)] || NET_COLS[0])[0];
    const send = (t, d, to) => { if (N.tr) try { N.tr.send(t, d, to); } catch (e) {} };
    function fresh() { return { seq: 0, seats: { w: null, b: null }, moves: [], first: 'w', opening: null, dice: null, live: false, result: null, reason: '', points: 1, kind: 'single', queue: [], tc: prefs.tc || 'none', clk: null, stamp: 0 }; }
    async function connect(code) {
      code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); if (code.length < 4) { N.msg = 'Type the 4-letter room code from your friend.'; emit(); return; }
      N.leave(true); const tok = ++N.tok; N.room = code; N.members = {}; N.lastSeen = {}; N.state = fresh(); N.status = 'connecting'; N.msg = ''; N.j = Date.now(); phase = 'room'; mode = 'net'; emit();
      const handlers = { game: GAME.key, code, onJoin: id => hello(id), onLeave: id => gone(id), onMsg: (t, d, id) => recv(t, d, id), onStatus: s => { N.status = s; emit(); } };
      let tr = null; const forceLocal = /[?&]net=local/.test(location.search);
      if (!forceLocal) { try { const mod = await import(new URL('engine/duel-net.js', document.baseURI).href); tr = await mod.connectDuel(handlers); } catch (e) { tr = null; } }
      if (!tr) tr = localChannel(handlers);
      if (tok !== N.tok) { try { tr.leave(); } catch (e) {} return; }
      N.tr = tr; N.me = tr.id; N.members[N.me] = { j: N.j }; N.settleT = setTimeout(() => N.settled = true, 2500); hello(); clearInterval(N.timer); N.timer = setInterval(tick, 1000);
      try { const u = new URL(location.href); u.searchParams.set('room', code); history.replaceState(null, '', u.href); } catch (e) {}
      sync(); emit();
    }
    function localChannel({ game, code, onMsg, onStatus }) {   // same-device test channel (two tabs), status 'local'
      const id = Math.random().toString(36).slice(2, 10); let bc = null; try { bc = new BroadcastChannel('8g.' + game + '.' + code); bc.onmessage = e => { const { f, to, t, d } = e.data || {}; if (f === id || (to && to !== id)) return; onMsg(t, d, f); }; } catch (e) {}
      setTimeout(() => onStatus(bc ? 'local' : 'off'), 0); return { id, send(t, d, to) { bc && bc.postMessage({ f: id, to: to || null, t, d }); }, leave() { bc && bc.close(); } };
    }
    function hello(to) { if (!N.tr) return; send('hi', { v: 1, j: N.j }, to); if (N.isHost() && N.state) send('st', N.state, to); }
    function recv(t, d, id) {
      if (!N.room || !d) return; const known = !!N.lastSeen[id]; N.lastSeen[id] = now();
      if (t === 'hi') { N.members[id] = { j: +d.j || Date.now() };
        if (!N.settled && N.members[id].j >= N.j) { N.j = N.members[id].j + 1; N.members[N.me].j = N.j; send('hi', { v: 1, j: N.j }); }   /* a joiner always sorts after the people already here (phone clocks differ) */ if (!known) setTimeout(() => hello(id), 0); if (N.isHost()) { trim(); send('st', N.state, id); } emit(); return; }
      if (!N.members[id]) N.members[id] = { j: Date.now() };
      if (t === 'st') { if (!N.isHostId(id)) return; if (!N.state || d.seq >= N.state.seq) { N.state = d; N.rx = now(); sync(); } return; }
      if (t === 'rq') { if (N.isHost()) handle(d, id); return; }
      if (t === 'rx') { react(id, d.w); return; }
      if (t === 'bye') gone(id);
    }
    N.isHostId = id => { const L = list(); return !!L.length && L[0].id === id; };
    function gone(id) { if (!N.members[id] || id === N.me) return; delete N.members[id]; delete N.lastSeen[id]; if (N.isHost()) { const s = N.state, c = s.seats.w === id ? 'w' : s.seats.b === id ? 'b' : null; s.queue = s.queue.filter(q => q !== id); if (c) { s.seats[c] = null; if (s.live) { s.live = false; s.result = c === 'w' ? '0-1' : '1-0'; s.reason = COLOR_WORD[c] + ' left the room'; } } bump(); } emit(); }
    function tick() { if (!N.tr) return; send('hi', { v: 1, j: N.j }); const t = now(); for (const id of Object.keys(N.lastSeen)) if (t - N.lastSeen[id] > 20000) gone(id);
      const s = N.state; if (N.isHost() && s && s.live && s.clk) { const left = s.clk[s.turnC] - (Date.now() - s.stamp); if (left <= 0) { s.clk[s.turnC] = 0; s.live = false; s.result = s.turnC === 'w' ? '0-1' : '1-0'; s.reason = COLOR_WORD[s.turnC] + ' ran out of time'; bump(); } } emit(); }
    function trim() { const ids = list().map(m => m.id), s = N.state; for (const c of ['w', 'b']) if (s.seats[c] && !ids.includes(s.seats[c]) && !N.members[s.seats[c]]) s.seats[c] = null; s.queue = s.queue.filter(q => ids.includes(q)); }
    function bump() { const s = N.state; s.seq++; send('st', s); sync(); }
    // host: apply a request from `id` (also used for the host's own actions)
    function replayState(s) { const c = new Backgammon({ turn: s.first }); for (const u of s.moves) c.playTurn(u); return c; }
    function handle(d, id) {
      const s = N.state; if (!s) return; const seat = s.seats.w === id ? 'w' : s.seats.b === id ? 'b' : null;
      if (d.k === 'sit' && (d.c === 'w' || d.c === 'b') && !s.live && !s.seats[d.c] && !seat) { s.seats[d.c] = id; s.queue = s.queue.filter(q => q !== id); }
      else if (d.k === 'stand' && seat && !s.live) { s.seats[seat] = null; }
      else if (d.k === 'queue' && !seat && !s.queue.includes(id)) s.queue.push(id);
      else if (d.k === 'tc' && id === N.me && !s.live) s.tc = ['none', '10', '5', '3'].includes(d.v) ? d.v : 'none';
      else if (d.k === 'start' && !s.live && s.seats.w && s.seats.b && (seat || id === N.me)) {
        if (s.result) rotate(s); const g = new Backgammon(), op = g.opening(); s.first = op.first; s.opening = { w: op.w, b: op.b, first: op.first }; s.dice = g.dice.slice();
        s.moves = []; s.result = null; s.reason = ''; s.points = 1; s.kind = 'single'; s.live = true; s.turnC = op.first; s.clk = s.tc !== 'none' ? { w: +s.tc * 60000, b: +s.tc * 60000 } : null; s.stamp = Date.now(); s.game = (s.game || 0) + 1; bump(); passIfStuck(); return; }
      else if (d.k === 'roll' && s.live && seat && seat === s.turnC && !s.dice) { s.dice = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]; bump(); passIfStuck(); return; }
      else if (d.k === 'move' && s.live && seat && seat === s.turnC && s.dice && d.ply === s.moves.length) {
        const c = replayState(s); const dd = String(d.code).split(':')[0].split(',').map(Number); if (dd[0] !== s.dice[0] || dd[1] !== s.dice[1]) { send('st', s, id); return; }
        const h = c.playTurn(d.code); if (!h) { send('st', s, id); return; }
        if (s.clk) { s.clk[seat] = Math.max(0, s.clk[seat] - (Date.now() - s.stamp)); } s.stamp = Date.now(); s.turnC = c.turn; s.dice = null;
        s.moves.push(h.code); const st = c.status(); if (st.over) { s.live = false; s.result = st.result; s.reason = st.reason; s.points = st.points; s.kind = st.kind; } }
      else if (d.k === 'resign' && s.live && seat) { s.live = false; s.result = seat === 'w' ? '0-1' : '1-0'; s.reason = COLOR_WORD[seat] + ' resigned'; s.points = 1; s.kind = 'single'; }
      else return;
      bump();
    }
    function passIfStuck() { const s = N.state; if (!s || !s.live || !s.dice) return; const c = replayState(s); c.dice = s.dice.slice(); if (c.plays().length) return; const seq = s.seq, dice = s.dice.slice();
      setTimeout(() => { const t = N.state; if (!t || t.seq !== seq || !t.dice || !N.isHost()) return; t.moves.push(dice[0] + ',' + dice[1] + ':'); t.dice = null; t.turnC = t.turnC === 'w' ? 'b' : 'w'; t.stamp = Date.now(); bump(); }, 1900); }
    function rotate(s) {   // winner stays on: the loser goes to the back of the line, the next fox in line sits down; colours swap
      const winC = s.result === '1-0' ? 'w' : s.result === '0-1' ? 'b' : null, w = s.seats.w, b = s.seats.b;
      if (s.queue.length) { const loserC = winC ? (winC === 'w' ? 'b' : 'w') : 'w', stay = s.seats[loserC === 'w' ? 'b' : 'w'], out = s.seats[loserC], next = s.queue.shift(); if (out) s.queue.push(out); s.seats = { w: next, b: stay }; }
      else s.seats = { w: b, b: w };
    }
    N.request = d => { if (N.isHost()) handle(d, N.me); else send('rq', d); };
    N.hostFinish = () => {};  // the host's handle() already ends the game in its state; sync() shows it
    function react(id, w) { if (!REACTS.includes(w)) return; N.reacts.push({ who: N.nameOf(id), w, t: 2.4, col: (NET_COLS[N.slotOf(id)] || NET_COLS[0])[1] }); if (N.reacts.length > 3) N.reacts.shift(); const c = N.seatOf(id); if (c) { mood(c, w === 'OOF' ? 'surprised' : 'happy', 1.6); } else { const f = foxes['net' + N.slotOf(id)]; if (f) { f.userData.hop = 1; } } audio.sfx(w === 'WOW' ? 'ooh' : w === 'OOF' ? 'oof' : 'clap'); emit(); }
    N.react = w => { send('rx', { w }); react(N.me, w); };
    // make the local board/game follow the shared state
    function sync() {
      const s = N.state; if (!s) return; const L = list();
      const want = s.moves, have = game.history.map(h => h.code);
      const same = want.length >= have.length && have.every((u, i) => u === want[i]);
      if (!same || want.length > have.length + 1 || (want.length === 0 && have.length === 0 && game.turn !== s.first && !s.opening)) { prefix = []; replay(s.first, want); syncPieces(); }
      else if (want.length === have.length + 1) { if (prefix.length) { prefix.slice().reverse().forEach(x => game.unapply(x, game.turn)); prefix = []; syncPieces(); } mode = 'net'; game.dice = null; const h = playTurnAnimated(want[want.length - 1]); if (h) { dice3.forEach(g => g.visible = false); afterTurn(h, true); } }
      if (want.length === 0 && game.history.length === 0 && game.turn !== s.first) { game = new Backgammon({ turn: s.first }); syncPieces(); }
      first = s.first; mode = 'net';
      // dice: the host rolled (or the opening roll) — show it once
      if (s.dice && !game.dice && !rolling && !opening) { const key = s.game + ':' + s.moves.length;
        if (N.shownDice !== key) { N.shownDice = key; if (s.moves.length === 0 && s.opening) { game.dice = s.dice.slice(); showOpening(s.opening); } else doRoll(s.dice); } }
      else if (!s.dice && game.dice && !prefix.length) { game.dice = null; turnPlays = []; }
      clocks = s.clk ? { w: s.clk.w, b: s.clk.b, at: performance.now(), turnC: s.turnC } : null;
      const mine = N.seatOf(N.me); povColor = mine || 'w';
      seated = { w: s.seats.w ? 'net' + N.slotOf(s.seats.w) : null, b: s.seats.b ? 'net' + N.slotOf(s.seats.b) : null };
      standing = L.filter(m => m.id !== s.seats.w && m.id !== s.seats.b).slice(0, 3).map(m => 'net' + N.slotOf(m.id));
      if (s.live) { phase = 'play'; over = null; } else if (s.result && s.game) { if (!over || over.game !== s.game) { over = null; phase = 'play'; finish(s.result, s.reason, { game: s.game, points: s.points, kind: s.kind }); } }
      else if (phase === 'play' && !s.live && !s.result) phase = 'room';
      placeFoxes(); drawBoard(); aimCamera(); emit();
    }
    N.leave = (quiet) => { N.tok++; clearInterval(N.timer); if (N.tr) { send('bye', {}); try { N.tr.leave(); } catch (e) {} } N.tr = null; N.room = null; N.members = {}; N.state = null; N.reacts = []; try { const u = new URL(location.href); if (u.searchParams.has('room')) { u.searchParams.delete('room'); history.replaceState(null, '', u.href); } } catch (e) {} if (!quiet) emit(); };
    N.connect = code => { N.settled = false; return connect(code); }; N.create = () => { N.settled = true; const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)]; connect(c).then(() => { N.settled = true; }); };
    return N;
  })();

  // ---------- input: roll, tap a checker then a point (or drag); tap the same checker twice to play the bigger die ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = V3();
  function regionAtXZ(x, z) {
    if (Math.abs(x) <= PX0 + 0.005) { if (Math.abs(x) < BARW / 2) return BAR; if (Math.abs(z) > ZH + 0.02) return null; const row = z > 0 ? 0 : 12; let best = null, bd = 9; for (let i = row; i < row + 12; i++) { const d = Math.abs(pointX(i) - x); if (d < bd) { bd = d; best = i; } } return bd <= P * 0.6 ? best : null; }
    if (x > PX0 + 0.01 && x < PX0 + 0.04 + TRAYW) return OFF; return null; }
  function regionAt(e) { const bb = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - bb.left) / bb.width) * 2 - 1, -((e.clientY - bb.top) / bb.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const pl = new THREE.Plane(V3(0, 1, 0), -(BOARD_Y + CHH * 0.8)); if (!ray.ray.intersectPlane(pl, hit)) return null; return regionAtXZ(hit.x, hit.z); }
  let down = null, drag = null;
  function select(i) { sel = i; targets = nextSteps().filter(s => s.from === i); sfx('sel'); drawBoard(); }
  function topOf(i) { return i === BAR ? barS[game.turn][barS[game.turn].length - 1] : i === OFF ? null : stacks[i][stacks[i].length - 1]; }
  function tap(i) {
    if (mode === 'demo' && phase === 'play') { takeOver(); return; }
    if (canRoll()) { roll(); return; }
    if (!humanCanMove() || !game.dice || i == null) { if (i != null && phase === 'play' && !over && prefs.speak) speak(whatIs(i)); return; }
    if (sel != null && targets.some(t => t.to === i)) { stepTo(i); return; }
    const next = nextSteps();
    if (next.some(s => s.from === i)) {
      if (sel === i) { const best = targets.slice().sort((a, b) => b.die - a.die)[0]; if (best) stepTo(best.to); return; }
      select(i); if (prefs.speak) speak(whatIs(i) + '. ' + targets.length + (targets.length === 1 ? ' move' : ' moves') + '.'); emit(); return; }
    clearSel(); drawBoard();
    const mine = i !== BAR && i !== OFF && game.p[i] && (game.p[i] > 0) === (game.turn === 'w');
    if (game.bar[game.turn] && mine) { live = 'Bring your checker in from the bar first.'; sfx('bad'); flash = { txt: 'BAR FIRST', col: '#ff9a8a', t: 1 }; }
    else if (mine) { live = 'That checker can\'t move with ' + diceLeft().join(' and ') + '.'; sfx('bad'); }
    else live = whatIs(i);
    speak(live); emit();
  }
  function roll() { if (!canRoll()) return; if (mode === 'net') { NET.request({ k: 'roll' }); live = 'Rolling…'; emit(); return; } doRoll(); }
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => { ac(); if (e.button > 0) return; down = { x: e.clientX, y: e.clientY, r: regionAt(e), id: e.pointerId }; });
  el.addEventListener('pointermove', e => { if (!down || e.pointerId !== down.id) return; const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!drag && Math.hypot(dx, dy) > 10 && humanCanMove() && game.dice && down.r != null && nextSteps().some(s => s.from === down.r)) { flushAnims(); const o = topOf(down.r); if (o) { if (sel !== down.r) select(down.r); drag = { o, from: down.r, home: o.position.clone() }; try { el.setPointerCapture(e.pointerId); } catch (er) {} } }
    if (drag) { const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); const pl = new THREE.Plane(V3(0, 1, 0), -(BOARD_Y + 0.1)); if (ray.ray.intersectPlane(pl, hit)) drag.o.position.set(clamp(hit.x, -BWID / 2, BWID / 2), BOARD_Y + 0.1, clamp(hit.z, -BDEP / 2, BDEP / 2)); } });
  const up = e => { if (!down || e.pointerId !== down.id) return; const d = down; down = null;
    if (drag) { const g = drag; drag = null; const to = regionAtXZ(g.o.position.x, g.o.position.z); g.o.position.copy(g.home); if (to != null && targets.some(t => t.to === to)) stepTo(to); return; }
    if (e.type === 'pointercancel') return; tap(d.r); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  // keyboard: arrows walk the points, Enter picks, R rolls, U undoes a step
  const onKey = e => { if (phase !== 'play' || /INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) return; const k = e.key;
    if (k === 'r' || k === 'R') { e.preventDefault(); if (canRoll()) roll(); return; } if (k === 'u' || k === 'U') { e.preventDefault(); undoStep(); return; }
    if (!/^Arrow|^Enter$|^ $|^Escape$/.test(k)) return; const order = [...Array(24).keys()].map(n => povColor === 'w' ? n : 23 - n).concat([BAR, OFF]);
    if (cursor < 0 || !order.includes(cursor)) cursor = order[0]; let ix = order.indexOf(cursor);
    if (k === 'ArrowLeft' || k === 'ArrowDown') ix = (ix + order.length - 1) % order.length; else if (k === 'ArrowRight' || k === 'ArrowUp') ix = (ix + 1) % order.length; else if (k === 'Escape') { clearSel(); drawBoard(); emit(); return; } else { e.preventDefault(); tap(cursor); return; }
    e.preventDefault(); cursor = order[ix]; live = whatIs(cursor); speak(live); drawBoard(); emit(); };
  addEventListener('keydown', onKey);


  // ---------- HUD state for the page ----------
  let lastEmit = 0;
  function clockMs(c) { if (!clocks) return null; if (mode === 'net') { let v = clocks[c]; if (NET.state && NET.state.live && clocks.turnC === c) v -= performance.now() - clocks.at; return Math.max(0, v); } return Math.max(0, clocks[c]); }
  const fmt = ms => ms == null ? '' : (ms >= 60000 ? Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0') : Math.floor(ms / 1000) % 60 + '.' + Math.floor(ms / 100) % 10);
  function side(c) {
    const net = mode === 'net' && NET.state, id = net ? NET.state.seats[c] : null;
    let name, sub, col = c === 'w' ? '#f4ead6' : '#c42d3c';
    if (mode === 'demo') { name = NAMEOF[c]; sub = 'DEMO · ' + COLOR_WORD[c].toUpperCase(); }
    else if (mode === 'cpu') { if (c === myColor) { name = 'YOU'; sub = COLOR_WORD[c].toUpperCase(); } else { const O = oppOf(); name = O.name; sub = O.tag + ' · ' + COLOR_WORD[c].toUpperCase(); } }
    else if (net) { name = id ? NET.nameOf(id) : 'EMPTY SEAT'; sub = COLOR_WORD[c].toUpperCase(); if (id) col = (NET_COLS[NET.slotOf(id)] || NET_COLS[0])[1]; }
    else { name = COLOR_WORD[c].toUpperCase(); sub = 'PASS & PLAY'; }
    const pips = game.pips(c), lead = game.pips(c === 'w' ? 'b' : 'w') - pips;
    const extra = (prefs.pips ? 'PIPS ' + pips : '') + (game.off[c] ? (prefs.pips ? ' · ' : '') + 'OFF ' + game.off[c] : '') + (game.bar[c] ? ' · BAR ' + game.bar[c] : '');
    return { c, name, sub: sub + (extra ? ' · ' + extra : ''), col, caps: game.off[c] ? '●︎ ' + game.off[c] + '/15' : '', adv: prefs.pips && lead > 0 ? '+' + lead : '', clock: fmt(clockMs(c)), clockOn: !!clocks, low: clocks ? clockMs(c) < 20000 : false, active: phase === 'play' && !over && game.turn === c, thinking: (mode === 'cpu' || mode === 'demo') && cpuBusy && c === cpuColor() };
  }
  function statusTxt() {
    if (over) return String(over.title || 'GAME OVER').toUpperCase();
    if (opening) return 'OPENING ROLL';
    if (rolling) return (mode === 'demo' ? 'DEMO · ' : '') + COLOR_WORD[game.turn].toUpperCase() + ' ROLLS…';
    const left = diceLeft(), mv = game.dice ? (turnPlays.length ? 'MOVE ' + left.join(' · ') : 'NO MOVE') : '';
    if (mode === 'demo') return 'DEMO · ' + (demo && /WINS/.test(demo.key) ? demo.key : NAMEOF[game.turn] + (cpuBusy ? ' IS PLAYING' : ' TO PLAY'));
    if (mode === 'cpu') return game.turn === myColor ? (game.dice ? mv : 'YOUR ROLL') : oppOf().name + (game.dice ? ' IS MOVING' : ' IS ROLLING');
    if (mode === 'local') return COLOR_WORD[game.turn].toUpperCase() + ' · ' + (game.dice ? mv : 'ROLL');
    if (mode === 'net') { const s = NET.state; if (!s || !s.live) return 'WAITING'; const mine = NET.seatOf(NET.me); return mine === game.turn ? (game.dice ? mv : 'YOUR ROLL') : mine ? 'THEIR TURN' : COLOR_WORD[game.turn].toUpperCase() + ' TO PLAY · WATCHING'; }
    return '';
  }
  function emit() {
    lastEmit = performance.now(); const top = povColor === 'w' ? 'b' : 'w', H = game.history, pairs = [];
    for (let i = 0; i < H.length; i += 2) pairs.push({ n: i / 2 + 1, w: (H[i].color === 'w' ? 'W ' : 'R ') + H[i].text, b: H[i + 1] ? (H[i + 1].color === 'w' ? 'W ' : 'R ') + H[i + 1].text : '' });
    const R = loadResume(), N = NET.state, L = NET.list(), mine = NET.seatOf(NET.me);
    const rec = OPPONENTS.map(O => { let w = 0, l = 0; try { w = save.stat('backgammonClub.' + O.id + '.w'); l = save.stat('backgammonClub.' + O.id + '.l'); } catch (e) {} return { level: O.level, name: O.name, tag: O.tag, who: O.who, gold: O.gold, rec: w + 'W ' + l + 'L', beat: w > 0 }; });
    const d = game.dice, left = diceLeft();
    onState({
      demo: demo ? { key: demo.key, cap: demo.cap, n: demo.n } : null,
      phase, mode, level, myColor, turn: game.turn, pov: povColor, view: prefs.view, prefs: { ...prefs },
      top: side(top), bottom: side(povColor), status: statusTxt(), canRoll: canRoll(), rolling, stepping: prefix.length > 0,
      dice: d ? { a: d[0], b: d[1], doubles: d[0] === d[1], left: left.length, leftTxt: left.join(' · ') } : null, pips: { w: game.pips('w'), b: game.pips('b') },
      moves: pairs, ply: H.length, last: H.length ? H[H.length - 1].text : '', live,
      say: say ? { who: say.who, text: say.text } : null, promo: null,
      flash: flash ? { txt: flash.txt, col: flash.col } : null,
      over: over ? { record: over.record || '', title: over.title, sub: over.sub, gold: over.gold, xp: over.xp, winner: over.winner, result: over.result } : null,
      canUndo: phase === 'play' && !over && (prefix.length > 0 || ((mode === 'cpu' || mode === 'local') && H.length > 0 && !cpuBusy && !rolling)), canHint: mode === 'cpu' && phase === 'play' && !over && game.turn === myColor && !!game.dice && !cpuBusy && turnPlays.length > 0, hintBusy, practice,
      thinking: cpuBusy, opponents: rec, resume: R && R.moves && R.moves.length ? { mode: R.mode, label: R.mode === 'cpu' ? 'VS ' + ((OPPONENTS[R.level] || OPPONENTS[1]).name) + ' · TURN ' + (R.moves.length + 1) : 'PASS & PLAY · TURN ' + (R.moves.length + 1) } : null,
      gold: (() => { try { return save.data.gold; } catch (e) { return 0; } })(),
      net: NET.room ? { code: NET.room, status: NET.status, host: NET.isHost(), me: NET.me, msg: NET.msg, copied: NET.copied, mine, live: !!(N && N.live), result: N ? N.result : null, tc: N ? N.tc : 'none', canStart: !!(N && !N.live && N.seats.w && N.seats.b && (mine || NET.isHost())),
        seats: ['w', 'b'].map(c => ({ c, id: N ? N.seats[c] : null, name: N && N.seats[c] ? NET.nameOf(N.seats[c]) : 'OPEN', col: N && N.seats[c] ? (NET_COLS[NET.slotOf(N.seats[c])] || NET_COLS[0])[1] : '#3a3836', mine: !!(N && N.seats[c] === NET.me), open: !!(N && !N.seats[c]) })),
        people: L.map((m, i) => ({ id: m.id, name: NET.nameOf(m.id), col: NET_COLS[i][1], seat: N ? (N.seats.w === m.id ? 'WHITE' : N.seats.b === m.id ? 'RED' : N.queue.includes(m.id) ? 'NEXT · ' + (N.queue.indexOf(m.id) + 1) : 'WATCHING') : '', host: i === 0, me: m.id === NET.me })),
        count: L.length, max: GAME.maxRoom, inQueue: !!(N && N.queue.includes(NET.me)), reacts: NET.reacts.map(r => ({ who: r.who, w: r.w, col: r.col })) } : null,
    });
  }

  // ---------- loop ----------
  const clock = new THREE.Clock(); let raf = 0, alive = true, frame = 0;
  function loop() {
    if (!alive) return; raf = requestAnimationFrame(loop); const rawDt = Math.min(0.25, clock.getDelta()), dt = Math.min(0.05, rawDt); frame++;
    // piece animations (checkers + dice)
    for (const a of anims) { a.t += rawDt; if (a.t < 0) continue; const k = clamp(a.t / a.dur, 0, 1), e = smooth(k);
      if (a.die) { a.o.visible = true; const bounce = k < 0.6 ? Math.sin(k / 0.6 * Math.PI) * 0.22 : Math.abs(Math.sin((k - 0.6) / 0.4 * Math.PI * 2)) * 0.03 * (1 - k); a.o.position.lerpVectors(a.a, a.b, Math.min(1, k * 1.25)); a.o.position.y = a.b.y + bounce * (1 - Math.min(1, k * 1.25) * 0.3);
        const spin = new THREE.Quaternion().setFromAxisAngle(a.axis, (1 - k) * 14); a.o.quaternion.copy(a.q0).multiply(spin).slerp(a.q1, smooth(clamp((k - 0.45) / 0.55, 0, 1)));
        if (k >= 0.6 && !a.land) { a.land = true; sfx('dice', { pan: clamp(a.b.x, -0.6, 0.6) }); } if (k >= 1 && !a.fin) { a.fin = true; a.o.quaternion.copy(a.q1); a.o.position.copy(a.b); } continue; }
      a.o.position.lerpVectors(a.a, a.b, e); a.o.position.y = a.a.y + (a.b.y - a.a.y) * e + Math.sin(k * Math.PI) * a.hop; if (a.edge) a.o.userData.body.rotation.x = e * Math.PI / 2; if (a.spin) a.o.userData.body.rotation.z += a.spin * rawDt * (1 - k);
      if (k >= 1 && !a.fin) { a.fin = true; a.done && a.done(); } }
    if (anims.length && anims.every(a => a.fin)) { anims = anims.filter(a => a.die && !a.fin); emit(); }
    for (const c of ['w', 'b']) { const cp = cups[c], u = cp.userData; if (u.t < 0) continue; u.t += rawDt; const k = u.t;
      if (k < 0.32) { cp.position.copy(u.home).add(V3(Math.sin(k * 60) * 0.012, 0.05 + Math.sin(k * 40) * 0.01, 0)); cp.rotation.set(Math.sin(k * 50) * 0.15, 0, 0); }
      else if (k < 0.55) { const e = smooth((k - 0.32) / 0.23); cp.position.copy(u.home).add(V3(-u.sx * 0.03 * e, 0.06, -u.sx * 0.02 * e)); cp.rotation.set(u.sx * -1.6 * e, 0, 0); }
      else if (k < 1.0) { const e = smooth((k - 0.55) / 0.45); cp.position.copy(u.home).add(V3(-u.sx * 0.03 * (1 - e), 0.06 * (1 - e), -u.sx * 0.02 * (1 - e))); cp.rotation.set(u.sx * -1.6 * (1 - e), 0, 0); }
      else { cp.position.copy(u.home); cp.rotation.set(0, 0, 0); u.t = -1; } }
    // polish: the selected checker floats, borne-off checkers pop at the end, shadows stay on the board
    const t = clock.elapsedTime, selTop = sel != null && sel !== OFF ? topOf(sel) : null;
    for (const L of Object.values(pool)) for (const o of L) { if (!o.visible) continue; const u = o.userData, lift = o === selTop && !drag ? 0.03 + Math.sin(t * 5) * 0.01 : 0;
      u.body.position.y = damp(u.body.position.y, lift, 14, dt); if (u.pop > 0) { u.pop = Math.max(0, u.pop - dt * 2.5); u.body.scale.setScalar(1 + Math.sin(Math.min(1, u.pop) * Math.PI) * 0.3); }
      const base = o.position.y < TABLE_Y + 0.02 ? TABLE_Y : BOARD_Y, air = o.position.y - base - (u.edge ? CR : 0); u.sh.visible = !u.edge; u.sh.position.y = 0.002 - Math.max(0, air); u.sh.scale.setScalar(clamp(1 - (air + u.body.position.y) * 2.5, 0.4, 1)); }
    for (let i = puffAt.length - 1; i >= 0; i--) { puffAt[i][1] -= rawDt; if (puffAt[i][1] <= 0) { puff(puffAt[i][0].clone().setY(BOARD_Y + 0.04), 0xf6e7c8, 4); puffAt.splice(i, 1); } }
    if (false && topple) { topple.t = Math.min(1, topple.t + rawDt * 1.4); const e = topple.t < 0.7 ? smooth(topple.t / 0.7) : 1 + Math.sin((topple.t - 0.7) / 0.3 * Math.PI) * 0.06; topple.o.userData.body.rotation.z = topple.dir * e * Math.PI / 2 * 0.98; topple.o.userData.body.position.x = topple.dir * -e * 0.02; if (topple.t >= 1 && !topple.thud) { topple.thud = true; audio.sfx('move', { t: 'k' }); } }
    if (flash) { flash.t -= rawDt; if (flash.t <= 0) { flash = null; emit(); } }
    dust.step(t);
    // thought bubble over a thinking fox
    { const thinking = (mode === 'cpu' || mode === 'demo') && cpuBusy && phase === 'play', f = thinking ? foxOn(cpuColor()) : null; bubble.visible = !!(f && f.visible); if (bubble.visible) { bubble.position.set(f.position.x + 0.55, 2.85, f.position.z); const k = Math.floor(t * 3) % 3; if (k !== bubble.userData.k) { bubble.userData.k = k; drawBubble(k); } } }
    // clock ticks in the last ten seconds
    if (clocks && phase === 'play' && !over) { const c = game.turn, ms = clockMs(c); if (ms != null && ms < 10000 && ms > 0) { const sec = Math.ceil(ms / 1000); if (sec !== lastTick) { lastTick = sec; audio.sfx('tick', { hi: sec <= 3 }); } } }
    // foxes
    const menuish = phase === 'menu' || (phase === 'room' && !(NET.state && NET.state.live));
    for (const f of Object.values(foxes)) { if (!f.visible) continue; const u = f.userData; if (menuish) { u.lookAt = u.lookAt === BOARD_LOOK ? camera.position.clone() : (u.lookAt || camera.position.clone()); u.lookAt.copy(camera.position); } else if (u.lookAt !== BOARD_LOOK) u.lookAt = BOARD_LOOK; if (u.moodT > 0) { u.moodT -= dt; if (u.moodT <= 0) u.mood = u.base; } kit.animFox(f, dt, 0);
      if (u.sit) { const P = u.P; P.legs.forEach(l => l.rotation.x = -1.25); P.arms.forEach((a, i) => { a.rotation.x = -1.05 + (u.talking && i ? Math.sin(u.phase * 2.2) * 0.2 : 0); a.rotation.z = i ? 0.25 : -0.25; }); P.body.position.y = u.hopY * 0.5; } }
    // sparks
    for (const k of sparks) { if (k.life <= 0) continue; k.life -= dt * 1.6; k.s.position.addScaledVector(k.v, dt); k.v.y -= dt * 1.5; k.s.material.opacity = Math.max(0, k.life); }
    // talk + reactions timers
    if (say) { say.t -= rawDt; if (say.t <= 0) { say = null; emit(); } }
    if (NET.reacts.length) { NET.reacts.forEach(r => r.t -= dt); const n = NET.reacts.length; NET.reacts = NET.reacts.filter(r => r.t > 0); if (n !== NET.reacts.length) emit(); }
    // local clocks
    if (clocks && mode === 'local' && phase === 'play' && !over && started && !anims.length) { clocks[game.turn] -= dt * 1000; if (clocks[game.turn] <= 0) { clocks[game.turn] = 0; const loser = game.turn; finish(loser === 'w' ? '0-1' : '1-0', COLOR_WORD[loser] + ' ran out of time'); } }
    if (clocks && performance.now() - lastEmit > 200) emit();
    // camera
    if (phase === 'menu' || phase === 'room' && !(NET.state && NET.state.live)) { orbitT += dt * 0.25; if (frame % 3 === 0 || camSnap) {   // a slow sway around the table, framed into the part of the screen the menu leaves free
        const W = CW(), H = CH(), yaw = Math.PI * 0.86 + Math.sin(orbitT * 0.35) * 0.18, visH = Math.max(0.2, (H - safe.top - safe.bottom) / H), visW = Math.max(0.3, (W - safe.left - safe.right) / W);
        const dist = 3.2, el = 0.22, th = Math.tan(camera.fov * Math.PI / 360), asp = W / H;
        const ny = 1 - (safe.top + H - safe.bottom) / H, nx = (safe.left + W - safe.right) / W - 1, look = V3(0, 1.55, -0.9), dir = V3(Math.sin(yaw) * Math.cos(el), Math.sin(el), -Math.cos(yaw) * Math.cos(el)), right = V3(Math.cos(yaw), 0, Math.sin(yaw));
        look.y -= ny * dist * th * 0.8; look.addScaledVector(right, nx * dist * th * asp);
        camGoal = { pos: V3(0, 1.5, -0.9).addScaledVector(dir, dist), look }; } }   /* pitch, not pan: the table lifts into the free strip */
    { const menuCam = phase === 'menu' || (phase === 'room' && !(NET.state && NET.state.live)), port = CH() > CW(), fv = menuCam ? (port ? 78 : 52) : (port ? 46 : 40); if (Math.abs(camera.fov - fv) > 0.05) { camera.fov = damp(camera.fov, fv, 4, dt); camera.updateProjectionMatrix(); } }
    const k = camSnap ? 1 : 1 - Math.exp(-4 * dt); camSnap = false; camera.position.lerp(camGoal.pos, k); camLook.lerp(camGoal.look, k); camera.lookAt(camLook);
    room.shade.visible = room.bulb.visible = camera.position.y < room.H - 0.25;   // TOP view looks down through the ceiling
    if (touch && !anims.length && !drag && sel == null && (frame & 1)) return;   // ~30 fps when nothing moves on phones
    if (document.hidden) return;
    renderer.render(scene, camera);
  }
  function resize() { const W = CW(), H = CH(); renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix(); aimCamera(); }
  const ro = new ResizeObserver(resize); ro.observe(container); addEventListener('resize', resize);

  // ---------- boot ----------
  seated = { w: null, b: ['pip', 'hope', 'noble'][prefs.level] || 'hope' }; syncPieces(); placeFoxes(); drawBoard(); resize(); loop(); emit();
  setTimeout(() => { if (phase === 'menu') { const O = OPPONENTS[prefs.level] || OPPONENTS[1]; talk('b', 'Fancy a game? Take the empty seat.', O.name); } }, 900);

  // ---------- talking to a world that opens this in a panel (?embed=1) ----------
  function toParent(msg) { try { if (parent && parent !== window) parent.postMessage({ type: '8gates:minigame', game: GAME.key, ...msg }, '*'); } catch (e) {} }
  const onMsg = e => { const d = e.data; if (!d || d.type !== '8gates:minigame' || (d.game && d.game !== GAME.key)) return;
    if (d.action === 'pause') { audio.suspend(true); } else if (d.action === 'resume') { audio.suspend(false); } else if (d.action === 'mute') { audio.setSound(false); audio.setMusic(false); } else if (d.action === 'unmute') { audio.setSound(prefs.sound); audio.setMusic(prefs.music); } else if (d.action === 'music') { audio.setMusic(!!d.on && prefs.music); } };
  addEventListener('message', onMsg);
  const onVis = () => { audio.suspend(document.hidden); }; document.addEventListener('visibilitychange', onVis);
  setTimeout(() => toParent({ action: 'ready' }), 0);

  // ---------- API (the page calls these) ----------
  const api = {
    hud: () => ({ phase, mode }), GAME, OPPONENTS,
    setSafe(s) { const n = { top: Math.round(s.top || 0), bottom: Math.round(s.bottom || 0), left: Math.round(s.left || 0), right: Math.round(s.right || 0) }; if (Object.keys(n).some(k => Math.abs(n[k] - safe[k]) > 3)) { safe = n; aimCamera(); } },
    playCpu(lv = prefs.level, color = prefs.color) { prefs.level = lv; prefs.color = color; savePrefs(); begin('cpu', { level: lv, color }); },
    playLocal(tc = prefs.tc) { prefs.tc = tc; savePrefs(); begin('local', { tc }); },
    resume() { const R = loadResume(); if (!R) return; if (R.mode === 'cpu') begin('cpu', { level: R.level, color: R.myColor, moves: R.moves, practice: R.practice, first: R.first, dice: R.dice }); else begin('local', { moves: R.moves, first: R.first, dice: R.dice }); },
    rematch() { if (mode === 'cpu') begin('cpu', { level, color: myColor === 'w' ? 'b' : 'w' }); else if (mode === 'local') begin('local', {}); else if (mode === 'net') NET.request({ k: 'start' }); },
    menu: toMenu,
    demo() { begin('demo'); }, takeOver,
    previewOpponent(lv) { if (phase !== 'menu') return; const id = ['pip', 'hope', 'noble'][lv] || 'hope'; if (seated.b === id) return; seated = { w: null, b: id }; placeFoxes(); const O = OPPONENTS[lv]; if (O) talk('b', pick(O.lines.hello), O.name); },
    promote() {}, cancelPromo() {}, roll, undoStep,
    undo() { if (over || phase !== 'play' || rolling || opening || committing) return; if (prefix.length) { undoStep(); return; } flushAnims(); if (mode === 'cpu') { cpuTok++; cpuBusy = false; let idx = -1; game.history.forEach((h, i) => { if (h.color === myColor) idx = i; }); if (idx < 0) return; while (game.history.length > idx) game.undo(); practice = true; } else if (mode === 'local') { if (!game.history.length) return; game.undo(); if (prefs.autoFlip) povColor = game.turn; } else return; syncPieces(); setDice(game.dice); if (game.dice) { const c = game.turn; rollAnim(game.dice, [c, c], sideX(c)); dice3.forEach(g => { const a = anims.find(x => x.die && x.o === g); if (a) a.t = a.dur; }); } aimCamera(); hint = null; storeResume(); live = 'Turn taken back.'; speak(live); emit(); },
    hint() { if (hintBusy || mode !== 'cpu' || game.turn !== myColor || over || !game.dice || prefix.length) return; hintBusy = true; practice = true; emit(); ask('hint', m => { hintBusy = false; if (m && m.length && game.turn === myColor && !prefix.length) { hint = m.map(([from, to]) => ({ from, to })); live = 'Hint: ' + hint.map(s => where(game.turn, s.from) + ' to ' + where(game.turn, s.to)).join(', '); speak(live); drawBoard(); } emit(); }); },
    resign() { if (phase !== 'play' || over || mode === 'demo') return; if (mode === 'net') { NET.request({ k: 'resign' }); return; } const loser = mode === 'cpu' ? myColor : game.turn; finish(loser === 'w' ? '0-1' : '1-0', COLOR_WORD[loser] + ' resigned', { points: 1, kind: 'single' }); },
    cycleView() { prefs.view = VIEWS[(VIEWS.indexOf(prefs.view) + 1) % VIEWS.length]; savePrefs(); aimCamera(); emit(); },
    flip() { povColor = povColor === 'w' ? 'b' : 'w'; if (mode === 'local') { prefs.autoFlip = false; savePrefs(); } placeFoxes(); aimCamera(); emit(); },
    setPref(k, v) { prefs[k] = v; savePrefs(); if (k === 'sound') audio.setSound(v); if (k === 'music') { audio.unlock(); audio.setMusic(v); } if (k === 'theme') drawBoard(); if (k === 'speak' && v) speak('Speaking moves on.'); if (k === 'autoFlip' && v && mode === 'local') { povColor = game.turn; aimCamera(); } if (k === 'autoRoll' && v && canRoll() && mode !== 'net') doRoll(); emit(); },
    // online
    netCreate: () => NET.create(), netJoin: code => NET.connect(code), netLeave: () => { NET.leave(); toMenu(); },
    netSit: c => NET.request({ k: 'sit', c }), netStand: () => NET.request({ k: 'stand' }), netQueue: () => NET.request({ k: 'queue' }), netStart: () => NET.request({ k: 'start' }), netClock: v => { prefs.tc = v; savePrefs(); NET.request({ k: 'tc', v }); }, netReact: w => NET.react(w),
    netShareURL() { if (!NET.room) return ''; try { const u = new URL(location.href); u.searchParams.delete('embed'); u.searchParams.delete('phone'); u.searchParams.set('room', NET.room); return u.href; } catch (e) { return ''; } },
    netCopied(v) { NET.copied = v; emit(); }, netOpenRoom() { if (NET.room && !(NET.state && NET.state.live)) { phase = 'room'; emit(); } },
    // demo/testing
    debug: { load(state) { game = new Backgammon({ state }); prefix = []; syncPieces(); if (game.dice) setDice(game.dice); drawBoard(); emit(); if (game.dice && isCpuTurn()) cpuChoose(); }, get game() { return game; }, tap, stepTo, NET, get phase() { return phase; }, get prefix() { return prefix; }, regionAtXZ, screenOf(i) { const p = i === BAR ? V3(0, BOARD_Y, 0.2) : i === OFF ? V3(TRAYX, BOARD_Y, 0.2) : slotPos(i, 0), v = p.clone().project(camera), r = el.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; } },
    destroy() { alive = false; audio.setMusic(false); removeEventListener('message', onMsg); document.removeEventListener('visibilitychange', onVis); document.removeEventListener('pointerdown', unlockAll, true); document.removeEventListener('keydown', unlockAll, true); document.removeEventListener('click', uiClick, true); cancelAnimationFrame(raf); NET.leave(true); ro.disconnect(); removeEventListener('resize', resize); removeEventListener('keydown', onKey); try { worker && worker.terminate(); } catch (e) {} renderer.dispose(); renderer.domElement.remove(); },
  };
  const rm = /[?&]room=([A-Za-z0-9]{4})/.exec(location.search); if (rm) setTimeout(() => NET.connect(rm[1]), 300);
  else if (/[?&]demo=1/.test(location.search)) setTimeout(() => begin('demo'), 600);
  return api;
}
