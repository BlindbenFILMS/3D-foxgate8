// 8 GATES — GO CLUB [goClub]. A tatami room (any building, any world): a floor goban, two stone bowls, foxes on cushions.
// Modes: VS FOX (Pip · ROOKIE, Hope · CLUB, Noble · MASTER), PASS & PLAY, ONLINE (room of up to 5: 2 play, 3 watch and take the
// next game, winner stays on), WATCH THE DEMO. Board 9×9, 13×13 or 19×19. Tap an intersection (13/19: tap again to confirm),
// PASS, and after two passes mark the dead stones and count. Rules + CPU: ./go-rules.js (CPU in a Worker).
// Built from the Checkers Club (minigame #2) code, copied so the games share no files.
// MERGE: createGoClub({ container, onState }) stands alone. buildParlor(ctx) builds just the room + goban into any scene/origin.
// Save keys: everything under 'goClub.*' (stats in engine/save.js; resume + prefs in localStorage).
import * as THREE from '../../vendor/three/three.module.js';
import { foxKit, PLAYER_MALE, PLAYER_FEMALE } from '../../fox-kit.js';
import { CAST, castKit, loadCastRigs } from '../../engine/cast.js';
import { crestTex, canvasTex, FONT } from '../../engine/textures.js';
import { save } from '../../engine/save.js';
import { Go, think, coord, hoshi, COLOR_WORD, KOMI, COLS } from './go-rules.js';
import { createGoAudio } from './go-audio.js';

export const GAME = { key: 'goClub', name: 'GO CLUB', room: 'goClub', maxRoom: 5 };
const RESUME_KEY = 'goClub.resume', PREFS_KEY = 'goClub.prefs';
// Opponents + rewards + lines: DRAFT for Ben (no go in the 2D game files).
export const OPPONENTS = [
  { level: 0, id: 'rookie', tag: 'ROOKIE', name: 'PIP', who: 'Club kid · loves capturing', gold: 6, xp: 12,
    lines: { hello: ['Go! The stones go on the lines, not the squares. I learned that today.', 'Black goes first. Is that you?'], take: ['Got them! Into the lid!', 'Captured!'], lost: ['Hey! Those were mine!', 'My poor stones.'], atari: ['Atari! That means you are almost caught.'], win: ['I WON? I counted twice!'], lose: ['Good game! Your walls were big.'], pass: ['I pass! Is that allowed? It is allowed.'] } },
  { level: 1, id: 'club', tag: 'CLUB', name: 'HOPE', who: 'Feels the shape of every group', gold: 16, xp: 28,
    lines: { hello: ['Call out your points if you like. I keep the board in my head.', 'Take your time. Go is a long conversation.'], take: ['Those stones had no breath left.', 'Thank you. Into my lid.'], lost: ['Nicely read.', 'I heard that cut coming.'], atari: ['Atari. Mind that group.'], win: ['Good game. Again?'], lose: ['Well played. You earned every point.'], pass: ['I pass. Shall we count?'] } },
  { level: 2, id: 'master', tag: 'MASTER', name: 'NOBLE', who: 'Club champion', gold: 40, xp: 60,
    lines: { hello: ['Sit. Show me your opening.', 'Corners, then sides, then centre. Do not forget.'], take: ['Taken.', 'You left that group thin.'], lost: ['Hm. Sharp.', 'Fine. I will take it back elsewhere.'], atari: ['Atari.'], win: ['Again. You are close.'], lose: ['...Well played. Very well played.'], pass: ['I pass. Count it.'], resign: ['I resign. Well played.'] } }];
const NET_COLS = [['RED', '#ec3013'], ['BLUE', '#38bdf8'], ['GOLD', '#ffd23a'], ['GREEN', '#22c55e'], ['PINK', '#f472b6']];
export const REACTS = ['NICE', 'WOW', 'OOF', 'GG'];
export const SIZES = [9, 13, 19];

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
const GW = 0.84, GMARG = 0.075, GFULL = GW + 2 * GMARG, TABLE_Y = 0.42, BOARD_Y = TABLE_Y + 0.0005, SEAT_Z = 1.25, SEAT_Y = 0.12;
const BOARD_LOOK = new THREE.Vector3(0, BOARD_Y, 0);


// ---------------- the room (exported for worlds): tatami, shoji, a tokonoma with a scroll, a floor goban ----------------
// ctx: { toon, M, scene?, origin? } → { group, lamp, shade, bulb, W, D, H }
export function buildParlor({ toon, M, scene, origin }) {
  const G = new THREE.Group(); if (origin) G.position.copy(origin); (scene || M.scene).add(G);
  const W = 7.2, D = 7.2, H = 3.2;
  // tatami: mats of woven rush with dark cloth borders, laid in the usual pattern
  const tat = canvasTex(512, 512, (g) => { g.fillStyle = '#b7b06a'; g.fillRect(0, 0, 512, 512); for (let y = 0; y < 512; y += 4) { g.fillStyle = y % 8 ? 'rgba(90,80,30,0.12)' : 'rgba(255,250,200,0.08)'; g.fillRect(0, y, 512, 2); }
    g.fillStyle = '#2b2a22'; for (const [x, y, w, h] of [[0, 0, 512, 10], [0, 251, 512, 10], [0, 502, 512, 10], [0, 0, 10, 512], [251, 0, 10, 256], [502, 0, 10, 512], [126, 256, 10, 256], [377, 256, 10, 256]]) g.fillRect(x, y, w, h); }, [3, 3]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshToonMaterial({ map: tat, gradientMap: toon.grad })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; G.add(floor);
  // shoji: paper panels in a dark wood grid, glowing a little; a wood skirting below
  const shoji = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f3ead6'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,240,200,0.35)'; g.fillRect(0, 0, w, h * 0.8); g.fillStyle = '#3b2616';
    for (let x = 0; x <= w; x += 32) g.fillRect(x - 2, 0, 4, h * 0.82); for (let y = 0; y <= h * 0.82; y += 42) g.fillRect(0, y - 2, w, 4); g.fillRect(0, 0, 8, h); g.fillRect(w - 8, 0, 8, h); g.fillStyle = '#4a2f1b'; g.fillRect(0, h * 0.82, w, h * 0.18); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, h * 0.82, w, 4); }, [3, 1]);
  const wallMat = new THREE.MeshToonMaterial({ map: shoji, gradientMap: toon.grad, emissive: '#3a2a10', emissiveIntensity: 0.25 });
  for (const [x, z, ry] of [[0, -D / 2, 0], [0, D / 2, Math.PI], [-W / 2, 0, Math.PI / 2], [W / 2, 0, -Math.PI / 2]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat); w.position.set(x, H / 2, z); w.rotation.y = ry; G.add(w); }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), toon('#3a2a1c')); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; G.add(ceil);
  const wood = toon('#5a3a22'), woodL = toon('#8a5a32'), dark = toon('#2a1a10');
  for (let k = -3; k <= 3; k++) M(new THREE.BoxGeometry(W, 0.06, 0.08), dark, 0, H - 0.04, k * 1.0, G, 0);   // ceiling beams
  // the tokonoma: a raised alcove on the back wall with a hanging scroll (an ink circle) and an ikebana vase
  const toko = new THREE.Group(); toko.position.set(-1.6, 0, -D / 2 + 0.45); G.add(toko);
  M(new THREE.BoxGeometry(1.8, 0.12, 0.9), woodL, 0, 0.06, 0, toko, 0.015); M(new THREE.BoxGeometry(0.1, 2.4, 0.1), wood, 0.95, 1.2, 0.4, toko, 0.012);
  const scroll = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.5), new THREE.MeshBasicMaterial({ map: canvasTex(128, 320, (g, w, h) => { g.fillStyle = '#5b6b5a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2ead8'; g.fillRect(12, 22, w - 24, h - 44); g.strokeStyle = '#141414'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.arc(w / 2, h * 0.42, 34, 0.5, Math.PI * 2 - 0.2); g.stroke(); g.fillStyle = '#c42d3c'; g.fillRect(w / 2 + 18, h * 0.7, 14, 14); g.fillStyle = '#2a1a10'; g.fillRect(4, 0, w - 8, 10); g.fillRect(4, h - 10, w - 8, 10); }) }));
  scroll.position.set(0, 1.45, -0.43); toko.add(scroll);
  M(new THREE.CylinderGeometry(0.08, 0.11, 0.3, 14), toon('#1f3b4d'), 0.5, 0.27, 0, toko, 0.012, 0.1); for (let i = 0; i < 4; i++) { const st = M(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 5), toon('#3f6b2a'), 0.5 + rr(-0.06, 0.06), 0.68, rr(-0.06, 0.06), toko, 0); st.rotation.z = rr(-0.4, 0.4); M(new THREE.SphereGeometry(0.045, 8, 6), toon(pick(['#f472b6', '#fbcfe8', '#ec3013'])), st.position.x - Math.sin(st.rotation.z) * 0.3, 0.98, st.position.z, toko, 0.006, 0.045); }
  // andon floor lanterns (warm light), a bonsai, a low tea table with cups, spare cushions
  const lampPos = [[2.6, -2.6], [-2.8, 2.5]]; let lamp = null;
  for (const [x, z] of lampPos) { const an = new THREE.Group(); an.position.set(x, 0, z); G.add(an); M(new THREE.BoxGeometry(0.34, 0.06, 0.34), dark, 0, 0.03, 0, an, 0.01);
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.6, 0.28), new THREE.MeshBasicMaterial({ color: 0xffe9c0 })); paper.position.y = 0.4; an.add(paper); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) M(new THREE.BoxGeometry(0.03, 0.66, 0.03), dark, dx * 0.14, 0.4, dz * 0.14, an, 0); M(new THREE.BoxGeometry(0.32, 0.03, 0.32), dark, 0, 0.72, 0, an, 0);
    const l = new THREE.PointLight(0xffd59a, 0.9, 4, 1.4); l.position.set(0, 0.45, 0); an.add(l); }
  const shade = M(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 24), toon('#efe2c8'), 0, H - 0.05, 0, G, 0.02, 0.5);   // a flat paper ceiling lamp
  const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.02, 24), new THREE.MeshBasicMaterial({ color: 0xfff1d0 })); bulb.position.set(0, H - 0.1, 0); G.add(bulb);
  lamp = new THREE.PointLight(0xffe7c0, 2.4, 7, 1.2); lamp.position.set(0, H - 0.5, 0); G.add(lamp);
  const bon = new THREE.Group(); bon.position.set(2.7, 0, -1.0); G.add(bon); M(new THREE.BoxGeometry(0.4, 0.4, 0.4), dark, 0, 0.2, 0, bon, 0.01); M(new THREE.BoxGeometry(0.34, 0.1, 0.22), toon('#7a3b22'), 0, 0.45, 0, bon, 0.01);
  const trunk = M(new THREE.CylinderGeometry(0.02, 0.035, 0.26, 6), toon('#5a3a22'), 0.02, 0.62, 0, bon, 0.008); trunk.rotation.z = 0.35; for (const [x, y, r] of [[-0.06, 0.78, 0.09], [0.08, 0.74, 0.07], [0.0, 0.84, 0.08]]) M(new THREE.SphereGeometry(r, 9, 7), toon('#2f5a2a'), x, y, 0, bon, 0.01, r);
  const tea = new THREE.Group(); tea.position.set(2.3, 0, 2.3); G.add(tea); M(new THREE.BoxGeometry(0.7, 0.05, 0.5), woodL, 0, 0.3, 0, tea, 0.015); for (const [x, z] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) M(new THREE.BoxGeometry(0.05, 0.28, 0.05), wood, x, 0.14, z, tea, 0);
  M(new THREE.CylinderGeometry(0.07, 0.06, 0.12, 12), toon('#4a6a5a'), -0.12, 0.39, 0, tea, 0.008, 0.07); for (const x of [0.1, 0.22]) M(new THREE.CylinderGeometry(0.035, 0.03, 0.05, 10), toon('#e8e0cf'), x, 0.35, 0.05, tea, 0.006, 0.035);
  for (const [x, z] of [[1.7, 2.6], [-2.2, -0.8]]) M(new THREE.BoxGeometry(0.62, 0.09, 0.62), toon('#6b2f3a'), x, 0.045, z, G, 0.015);
  // the goban: a thick kaya block on four carved feet, and the players' cushions
  M(new THREE.BoxGeometry(GFULL, TABLE_Y - 0.16, GFULL), toon('#d39d52'), 0, 0.16 + (TABLE_Y - 0.16) / 2, 0, G, 0.008);
  for (const y of [0.2, TABLE_Y - 0.035]) M(new THREE.BoxGeometry(GFULL + 0.004, 0.006, GFULL + 0.004), toon('#b07a38'), 0, y, 0, G, 0);   // two darker grain bands round the block
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) M(new THREE.CylinderGeometry(0.045, 0.06, 0.16, 10), toon('#c48f45'), x * GFULL * 0.36, 0.08, z * GFULL * 0.36, G, 0.012, 0.06);
  for (const z of [SEAT_Z, -SEAT_Z]) M(new THREE.BoxGeometry(0.66, SEAT_Y, 0.66), toon('#2f4a6b'), 0, SEAT_Y / 2, z, G, 0.015);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.42), new THREE.MeshBasicMaterial({ map: canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#3b2616'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e6b45a'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#f6e7c8'; g.font = `900 66px ${FONT}`; g.textBaseline = 'middle'; g.fillText('GO CLUB', 34, h / 2 + 4); g.fillStyle = '#ec3013'; g.fillRect(w - 86, 30, 54, 68); g.fillStyle = '#fff'; g.font = `900 52px ${FONT}`; g.fillText('8', w - 74, h / 2 + 4); }) }));
  sign.position.set(1.4, 2.5, -D / 2 + 0.02); G.add(sign);
  return { group: G, lamp, shade, bulb, W, D, H };
}

// ---------------- the stones (biconvex, slate and shell) and the bowls ----------------
function stoneGeo(r) { const h = r * 0.52, pts = []; for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * r, h * 0.5 - Math.cos(a) * h * 0.5)); } for (let k = 1; k <= 10; k++) { const a = Math.PI / 2 + k / 10 * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * r, h * 0.5 - Math.cos(a) * h * 0.5)); } const g = new THREE.LatheGeometry(pts, 24); g.translate(0, 0, 0); g.computeVertexNormals(); g.computeBoundingBox(); g.userData.out = inflate(g, r * 0.06); g.userData.h = h; return g; }

// ================================================================================================
export async function createGoClub({ container, onState = () => {}, opts = {} } = {}) {
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

  // ---------- board: one canvas texture holds the kaya, the grid, the star points, labels, territory and every mark ----------
  const BPX = 1024, bCan = document.createElement('canvas'); bCan.width = bCan.height = BPX; const bg = bCan.getContext('2d'), bTex = new THREE.CanvasTexture(bCan); bTex.colorSpace = THREE.SRGBColorSpace; bTex.anisotropy = 8;
  const boardTop = new THREE.Mesh(new THREE.PlaneGeometry(GFULL, GFULL), new THREE.MeshToonMaterial({ map: bTex, gradientMap: grad })); boardTop.rotation.x = -Math.PI / 2; boardTop.rotation.z = Math.PI; boardTop.position.y = BOARD_Y + 0.001; boardTop.receiveShadow = !touch; scene.add(boardTop);
  const THEMES = { wood: { kaya: '#e3b56a', line: '#24170a', star: '#24170a', lab: 'rgba(36,23,10,0.75)' }, contrast: { kaya: '#ffffff', line: '#000000', star: '#000000', lab: '#000000' } };
  let N = 9, sp = GW / 8;   // grid size and spacing (set per game)
  const ptPos = (i, y = BOARD_Y) => new THREE.Vector3(GW / 2 - (i % N) * sp, y, GW / 2 - Math.floor(i / N) * sp);   /* the canvas is turned 180° on the board so Black (camera at -z) reads it upright */
  const U = x => (x + GFULL / 2) / GFULL * BPX;

  // ---------- state ----------
  let prefs = { sound: true, music: true, size: 9, confirm: 'auto', coords: true, terr: false, speak: false, theme: 'wood', autoFlip: false, view: 'play', color: 'b', level: 1, tc: 'none' };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')); } catch (e) {}
  if (!SIZES.includes(prefs.size)) prefs.size = 9;
  const savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {} };
  let game = new Go({ N: prefs.size }), phase = 'menu', mode = 'cpu', level = prefs.level, myColor = 'b', practice = false, over = null, ghost = -1, hint = null, promoAsk = null, done = { b: false, w: false };
  let cpuBusy = false, cpuTok = 0, hintBusy = false, anims = [], say = null, toast = null, live = '', povColor = 'b', clocks = null, safe = { top: 0, bottom: 0, left: 0, right: 0 };
  let started = 0, cursor = -1, flash = null, topple = null, lastTick = -1, scoreView = null, sel = -1;

  // ---------- stones + bowls ----------
  const pGrad = (() => { const d = new Uint8Array([140, 140, 140, 255, 205, 205, 205, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
  const SMAT = { b: new THREE.MeshToonMaterial({ color: '#26242b', gradientMap: pGrad, emissive: '#0c0b10' }), w: new THREE.MeshToonMaterial({ color: '#f7f3e8', gradientMap: pGrad }) };
  const SOUT = { b: new THREE.MeshBasicMaterial({ color: 0x8a8296, side: THREE.BackSide }), w: outlineMat };
  const shadowTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 4, 32, 32, 31); r.addColorStop(0, 'rgba(20,10,0,0.5)'); r.addColorStop(0.6, 'rgba(20,10,0,0.22)'); r.addColorStop(1, 'rgba(20,10,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
  let SG = null, pool = { b: [], w: [] }, onBoard = new Map(), lids = { b: [], w: [] }, shadowGeo = null;
  function rebuildGeo() { for (const L of Object.values(pool)) L.forEach(o => { scene.remove(o); }); pool = { b: [], w: [] }; onBoard = new Map(); lids = { b: [], w: [] }; SG = stoneGeo(sp * 0.48); shadowGeo = new THREE.PlaneGeometry(sp * 1.25, sp * 1.25).rotateX(-Math.PI / 2); ghostMesh.geometry = SG; ghostMesh.scale.setScalar(1); lastMark.scale.setScalar(sp / 0.13); }
  const glossTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 1, 32, 32, 31); r.addColorStop(0, 'rgba(255,255,255,0.95)'); r.addColorStop(0.35, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const GLOSS = { b: new THREE.MeshBasicMaterial({ map: glossTex, transparent: true, opacity: 0.42, depthWrite: false }), w: new THREE.MeshBasicMaterial({ map: glossTex, transparent: true, opacity: 0.7, depthWrite: false }) };
  const jit = i => { const h = Math.sin(i * 127.1 + N * 311.7) * 43758.5453, a = (h - Math.floor(h)) * 6.283, d = sp * 0.035 * ((h * 7) % 1 + 1) / 2; return V3(Math.cos(a) * d, 0, Math.sin(a) * d); };   // real stones never sit dead centre
  const stonePos = i => ptPos(i).add(jit(i));
  function makeStone(c) { const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const m = new THREE.Mesh(SG, SMAT[c]); m.castShadow = !touch; const o = new THREE.Mesh(SG.userData.out, SOUT[c]); body.add(m, o); const gl = new THREE.Mesh(new THREE.CircleGeometry(sp * (c === 'b' ? 0.2 : 0.15), 16).rotateX(-Math.PI / 2), GLOSS[c]); gl.scale.set(1.25, 1, 0.8); gl.position.set(-sp * 0.11, SG.userData.h * 0.93, sp * 0.06); gl.renderOrder = 2; body.add(gl);
    if (c === 'w') { const shell = new THREE.Mesh(new THREE.TorusGeometry(sp * 0.3, sp * 0.008, 4, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe2dccb })); shell.position.y = SG.userData.h * 0.9; body.add(shell); }   // the faint growth lines of a clamshell stone
    const sh = new THREE.Mesh(shadowGeo, shadowMat); sh.position.y = 0.002; sh.renderOrder = 1; g.add(sh); g.userData = { c, body, sh }; scene.add(g); return g; }
  function take(c) { const L = pool[c], p = L.find(o => !o.visible) || (L.push(makeStone(c)), L[L.length - 1]); p.visible = true; p.userData.body.rotation.set(0, 0, 0); p.userData.body.position.set(0, 0, 0); p.userData.body.scale.setScalar(1); p.userData.pop = 0; p.userData.ghostDead = false; p.userData.sh.visible = true; return p; }
  // bowls (go-ke) by each player's right hand; the upturned lid beside it holds the prisoners
  const bowls = {}; for (const c of ['b', 'w']) { const g = new THREE.Group(), sx = c === 'b' ? -1 : 1; g.position.set(sx * 0.62, 0, (c === 'b' ? -1 : 1) * (SEAT_Z - 0.45)); scene.add(g);
    M(new THREE.LatheGeometry([[0, 0], [0.1, 0], [0.15, 0.04], [0.17, 0.11], [0.16, 0.17], [0.13, 0.2], [0, 0.2]].map(([x, y]) => new THREE.Vector2(x, y)), 24), toon('#7a4a24'), 0, 0, 0, g, 0.012, 0.17);
    const lid = new THREE.Group(); lid.position.set(-sx * 0.0, 0, (c === 'b' ? -1 : 1) * -0.38); g.add(lid); M(new THREE.LatheGeometry([[0, 0.05], [0.14, 0.05], [0.16, 0.0], [0.17, 0.02], [0.155, 0.065], [0, 0.065]].map(([x, y]) => new THREE.Vector2(x, y)), 24), toon('#8a5a2c'), 0, 0, 0, lid, 0.01, 0.17);
    for (let k = 0; k < 9; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), c === 'b' ? SMAT.b : SMAT.w); s.scale.y = 0.5; s.position.set(rr(-0.09, 0.09), 0.2, rr(-0.09, 0.09)); g.add(s); }
    g.userData = { lid, sx }; bowls[c] = g; }
  const lidPos = (owner, k) => { const L = bowls[owner].userData.lid, p = new THREE.Vector3(); L.getWorldPosition(p); const a = k * 2.399, rad = 0.025 + Math.min(0.11, Math.sqrt(k) * 0.03); return p.add(new THREE.Vector3(Math.cos(a) * rad, 0.06 + Math.floor(k / 14) * 0.012, Math.sin(a) * rad)); };
  const bowlMouth = c => bowls[c].position.clone().add(new THREE.Vector3(0, 0.25, 0));
  const ghostMat = { b: new THREE.MeshBasicMaterial({ color: 0x26242b, transparent: true, opacity: 0.72, depthWrite: false }), w: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }) };
  const ghostMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), ghostMat.b); ghostMesh.visible = false; ghostMesh.renderOrder = 20; scene.add(ghostMesh);
  const lastMark = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 20).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xec3013 })); lastMark.visible = false; lastMark.renderOrder = 21; scene.add(lastMark);
  function syncPieces() {
    anims = []; for (const L of Object.values(pool)) L.forEach(p => p.visible = false); onBoard.clear(); lids = { b: [], w: [] };
    const B = game.board; B.forEach((c, i) => { if (!c) return; const o = take(c); o.position.copy(stonePos(i)); onBoard.set(i, o); });
    const caps = game.caps; for (const owner of ['b', 'w']) for (let k = 0; k < Math.min(caps[owner], 60); k++) { const o = take(owner === 'b' ? 'w' : 'b'); o.position.copy(lidPos(owner, k)); o.userData.sh.visible = false; lids[owner].push(o); }
    markDead(); placeLast();
  }
  // groups in atari for the side to move get a pulsing red ring round each stone (save them or lose them)
  const atariMat = new THREE.MeshBasicMaterial({ color: 0xec3013, transparent: true, opacity: 0.9, depthWrite: false }); let atariRings = [];
  function atariMarks() { const want = []; if (phase === 'play' && !over && game.phase === 'play') { const c = game.turn, show = mode === 'demo' || mode === 'local' || (mode === 'cpu' && c === myColor) || (mode === 'net' && NET.seatOf(NET.me) === c);
      if (show) { const seen = new Set(), fb = game.fb; for (let i = 0; i < N * N; i++) { if (game.at(i) !== c || seen.has(i)) continue; const g = game.groupOf(i); g.forEach(x => seen.add(x)); if (fb.libsOf(fb.head[fb.i2p(i)], 2) === 1) want.push(...g); } } }
    while (atariRings.length < want.length) { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 6, 28).rotateX(Math.PI / 2), atariMat); m.renderOrder = 19; scene.add(m); atariRings.push(m); }
    atariRings.forEach((m, k) => { m.visible = k < want.length; if (k < want.length) { const o = onBoard.get(want[k]); m.position.copy(o ? o.position : ptPos(want[k])); m.position.y = BOARD_Y + SG.userData.h * 0.45; m.scale.setScalar(sp * 0.6); } }); }
  function placeLast() { const i = game.lastMove(); const o = i >= 0 ? onBoard.get(i) : null; lastMark.visible = !!o && game.phase === 'play'; if (o) { lastMark.position.copy(o.position); lastMark.position.y += SG.userData.h + 0.002; lastMark.material.color.set(game.at(i) === 'b' ? 0xf2e2b0 : 0xec3013); } }
  function markDead() { for (const [i, o] of onBoard) { const d = game.phase === 'scoring' && game.dead.has(i); o.userData.ghostDead = d; o.userData.body.scale.setScalar(d ? 0.86 : 1); o.userData.body.children[0].material = d ? ghostMat[o.userData.c] : SMAT[o.userData.c]; } }
  function flushAnims() { for (const a of anims) { if (a.fin) continue; a.o.position.copy(a.b); a.fin = true; a.done && a.done(); } anims = []; }
  // a played move: the stone flies from the bowl, lands with a click, captured stones hop into the lid
  function animMove(h, instant = false) {
    flushAnims(); if (h.i < 0) { sfx('pass'); placeLast(); return; }
    const o = take(h.color), dst = stonePos(h.i), pan = clamp(dst.x / 0.5, -0.7, 0.7); onBoard.set(h.i, o);
    if (instant) { o.position.copy(dst); sfx('stone', { pan }); } else { o.position.copy(bowlMouth(h.color)); anims.push({ o, a: o.position.clone(), b: dst, t: 0, dur: 0.34, hop: 0.12, done: () => { sfx('stone', { pan }); placeLast(); } }); }
    const owner = h.color; h.caps.forEach((ci, k) => { const v = onBoard.get(ci); onBoard.delete(ci); if (!v) return; lids[owner].push(v); const dstL = lidPos(owner, lids[owner].length - 1); v.userData.sh.visible = false; anims.push({ o: v, a: v.position.clone(), b: dstL, t: -0.3 - k * 0.05, dur: 0.45, hop: 0.18, spin: rr(-8, 8), done: () => { v.userData.spin = 0; } }); puffAt.push([v.position.clone(), 0.3 + k * 0.05]); });
    if (h.caps.length) setTimeout(() => sfx('capture', { n: h.caps.length }), 360);
    if (instant) placeLast();
  }
  const puffAt = [];


  // ---------- puffs + sound + speech ----------
  const sparks = []; for (let i = 0; i < 18; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(0.1); scene.add(s); sparks.push({ s, life: 0, v: V3() }); } let spI = 0;
  function puff(p, col = 0xffffff, n = 3) { for (let i = 0; i < n; i++) { const k = sparks[spI = (spI + 1) % sparks.length]; k.s.position.copy(p); k.s.material.color.setHex(col); k.life = 1; k.v.set(rr(-0.4, 0.4), rr(0.4, 0.9), rr(-0.4, 0.4)); } }
  const urlMusic = !/[?&]music=0/.test(location.search), urlSfx = !/[?&]sfx=0/.test(location.search);
  const audio = createGoAudio({ sound: prefs.sound && urlSfx, music: prefs.music && urlMusic });
  const ac = () => audio.unlock();
  const unlockAll = () => audio.unlock(); document.addEventListener('pointerdown', unlockAll, true); document.addEventListener('keydown', unlockAll, true);
  const uiClick = e => { if (e.target && e.target.closest && e.target.closest('button')) audio.sfx('ui'); }; document.addEventListener('click', uiClick, true);
  const buzz = ms => { try { if (mode !== 'demo' && navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(ms); } catch (e) {} };
  function sfx(k, o) { audio.sfx(k, o); if (k === 'stone') buzz(8); else if (k === 'capture') buzz([12, 30, 12]); }
  const cname = i => coord(N, i);
  function whatIs(i) { if (i < 0) return ''; const c = game.at(i); return cname(i) + (c ? ', ' + COLOR_WORD[c].toLowerCase() + ' stone' + (game.phase === 'scoring' && game.dead.has(i) ? ', marked dead' : '') : ', empty'); }
  function describe(h) { if (!h) return ''; const who = COLOR_WORD[h.color]; if (h.i < 0) return who + ' passes'; return who + ' plays ' + cname(h.i) + (h.caps.length ? ', captures ' + h.caps.length : ''); }
  function speak(text) { if (!prefs.speak || !text || !window.speechSynthesis) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 1.05; u.onstart = () => audio.duck(true); u.onend = u.onerror = () => audio.duck(false); speechSynthesis.speak(u); } catch (e) {} }
  // groups in atari (one liberty) for the HUD and the tips
  function ataris() { const out = { b: 0, w: 0 }, seen = new Set(); for (let i = 0; i < N * N; i++) { const c = game.at(i); if (!c || seen.has(i)) continue; const g = game.groupOf(i); g.forEach(x => seen.add(x)); const fb = game.fb, h = fb.head[fb.i2p(i)]; if (fb.libsOf(h, 2) === 1) out[c] += g.length; } return out; }

  // ---------- board drawing ----------
  const port = () => CH() > CW();
  function drawBoard() {
    const T = THEMES[prefs.theme] || THEMES.wood, flip = povColor === 'w', P = i => [U(-GW / 2 + (i % N) * sp), U(-GW / 2 + Math.floor(i / N) * sp)];
    bg.fillStyle = T.kaya; bg.fillRect(0, 0, BPX, BPX);
    if (prefs.theme === 'wood') { if (!drawBoard.grain) { const gc = document.createElement('canvas'); gc.width = gc.height = BPX; const gg = gc.getContext('2d'); for (let k = 0; k < 90; k++) { gg.strokeStyle = `rgba(150,90,30,${rr(0.05, 0.14)})`; gg.lineWidth = rr(1, 4); gg.beginPath(); const y = rr(0, BPX); gg.moveTo(0, y); for (let x = 0; x <= BPX; x += 64) gg.lineTo(x, y + Math.sin(x * 0.01 + k) * 6 + rr(-2, 2)); gg.stroke(); } drawBoard.grain = gc; } bg.drawImage(drawBoard.grain, 0, 0); }
    const px = sp / GFULL * BPX, lw = Math.max(2, Math.round(px * 0.045));
    bg.strokeStyle = T.line; bg.lineWidth = lw; bg.lineCap = 'square';
    for (let k = 0; k < N; k++) { const a = U(-GW / 2 + k * sp), lo = U(-GW / 2), hi = U(GW / 2); bg.beginPath(); bg.moveTo(a, lo); bg.lineTo(a, hi); bg.stroke(); bg.beginPath(); bg.moveTo(lo, a); bg.lineTo(hi, a); bg.stroke(); }
    bg.lineWidth = lw * 1.8; bg.strokeRect(U(-GW / 2), U(-GW / 2), U(GW / 2) - U(-GW / 2), U(GW / 2) - U(-GW / 2));
    bg.fillStyle = T.star; for (const h of hoshi(N)) { const [x, y] = P(h); bg.beginPath(); bg.arc(x, y, Math.max(5, px * 0.11), 0, 7); bg.fill(); }
    // coordinates in the margin, readable from the viewer's side
    if (prefs.coords) { bg.fillStyle = T.lab; bg.font = `800 ${Math.round(Math.min(34, px * 0.36))}px ${FONT}`; bg.textAlign = 'center'; bg.textBaseline = 'middle'; const m = U(-GW / 2) * 0.5, M2 = BPX - m, ang = flip ? Math.PI : 0;
      const txt = (s, x, y) => { bg.save(); bg.translate(x, y); bg.rotate(ang); bg.fillText(s, 0, 0); bg.restore(); };
      for (let k = 0; k < N; k++) { const a = U(-GW / 2 + k * sp); txt(COLS[k], a, flip ? m : M2); txt(String(N - k), flip ? M2 : m, a); } }
    // ko point, hint, the cursor
    if (game.ko >= 0 && game.phase === 'play') { const [x, y] = P(game.ko); bg.strokeStyle = '#c42d3c'; bg.lineWidth = lw * 1.6; bg.strokeRect(x - px * 0.28, y - px * 0.28, px * 0.56, px * 0.56); }
    if (hint != null && hint >= 0) { const [x, y] = P(hint); bg.strokeStyle = '#1d6fd6'; bg.lineWidth = lw * 2.2; bg.beginPath(); bg.arc(x, y, px * 0.42, 0, 7); bg.stroke(); }
    if (ghost >= 0 && game.phase === 'play') { const [x, y] = P(ghost); bg.strokeStyle = 'rgba(236,48,19,0.55)'; bg.lineWidth = lw * 1.4; bg.beginPath(); bg.moveTo(x, U(-GW / 2)); bg.lineTo(x, U(GW / 2)); bg.moveTo(U(-GW / 2), y); bg.lineTo(U(GW / 2), y); bg.stroke(); bg.strokeStyle = '#ec3013'; bg.lineWidth = lw * 2; bg.strokeRect(x - px * 0.62, y - px * 0.62, px * 1.24, px * 1.24); }
    if (cursor >= 0) { const [x, y] = P(cursor); bg.strokeStyle = '#1d6fd6'; bg.lineWidth = lw * 1.6; bg.strokeRect(x - px * 0.46, y - px * 0.46, px * 0.92, px * 0.92); }
    // counting: territory squares, crosses on dead stones
    if (game.phase === 'scoring' || (over && scoreView)) { const sc = scoreView || game.score(); for (const [c, L] of [['b', sc.terr.b], ['w', sc.terr.w]]) for (const i of L) { const [x, y] = P(i); bg.fillStyle = c === 'b' ? '#1b1a20' : '#ffffff'; bg.strokeStyle = c === 'b' ? '#ffffff' : '#1b1a20'; bg.lineWidth = 2; const s = px * 0.34; bg.fillRect(x - s / 2, y - s / 2, s, s); bg.strokeRect(x - s / 2, y - s / 2, s, s); } }
    if (prefs.terr && terrOwn && terrOwn.key === game.history.length + ':' + N && game.phase === 'play' && !over) { for (let i = 0; i < N * N; i++) { const v = terrOwn.own[i]; if (game.at(i) || Math.abs(v) < 0.55) continue; const [x, y] = P(i), s = px * (0.3 + Math.min(0.3, (Math.abs(v) - 0.55) * 0.7)); bg.fillStyle = v > 0 ? 'rgba(20,18,26,0.42)' : 'rgba(255,255,255,0.62)'; bg.fillRect(x - s / 2, y - s / 2, s, s); } }
    bTex.needsUpdate = true; atariMarks(); wantTerr();
  }
  // territory estimate (TERRITORY toggle): random playouts in the worker after every move
  let terrOwn = null, terrAsk = '';
  function wantTerr() { if (!prefs.terr || phase !== 'play' || over || game.phase !== 'play') return; const key = game.history.length + ':' + N; if (terrAsk === key) return; terrAsk = key;
    if (mode === 'cpu' && !practice) { practice = true; live = 'Territory view on: this is now a practice game, no gold.'; speak(live); }
    setTimeout(() => ask(null, r => { if (!r || !r.own || terrAsk !== key) return; terrOwn = { key, own: r.own }; drawBoard(); }, 'own'), 60); }

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
    for (const c of ['w', 'b']) { const id = seated[c]; if (!id) continue; const f = fox(id), z = c === 'w' ? SEAT_Z : -SEAT_Z, chair = !!f.userData.chair; f.visible = !(phase === 'play' && c === povColor);   /* your own fox would sit between you and the board */ f.position.set(0, chair ? -0.22 : SEAT_Y - 0.72, chair ? z * 1.08 : z); f.rotation.y = c === 'w' ? Math.PI : 0; f.userData.sit = !chair; f.userData.seat = c;
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
    const yaw = povColor === 'b' ? 0 : Math.PI, e = GFULL / 2, pts = [];
    for (const [x, z] of [[-e, -e], [e, -e], [-e, e], [e, e]]) pts.push(V3(x, BOARD_Y, z));
    let el;
    if (phase === 'menu') { return; }
    if (prefs.view === 'top') el = 1.52; else if (prefs.view === 'table') { el = 0.5; const s = povColor === 'b' ? 1 : -1; pts.push(V3(-0.5, 1.75, s * SEAT_Z), V3(0.5, 1.75, s * SEAT_Z)); } else { el = port() ? (N >= 19 ? 1.36 : N >= 13 ? 1.3 : 1.2) : (N >= 19 ? 1.2 : 1.0); pts.push(V3(-e, BOARD_Y + 0.08, e * (povColor === 'b' ? 1 : -1)), V3(e, BOARD_Y + 0.08, e * (povColor === 'b' ? 1 : -1))); }
    camGoal = fitShot(pts, el, yaw); placeFoxes(); drawBoard();
  }


  // ---------- who moves ----------
  const cpuColor = () => mode === 'demo' ? game.turn : (myColor === 'w' ? 'b' : 'w');
  const isCpuTurn = () => phase === 'play' && !over && game.phase === 'play' && ((mode === 'cpu' && game.turn === cpuColor()) || mode === 'demo');
  function humanCanMove() {
    if (phase !== 'play' || over || game.phase !== 'play') return false;
    if (mode === 'cpu') return game.turn === myColor && !cpuBusy;
    if (mode === 'local') return true;
    if (mode === 'net') return !!NET.room && NET.seatOf(NET.me) === game.turn && NET.state && NET.state.live;
    return false;
  }
  const confirmOn = () => prefs.confirm === 'on' || (prefs.confirm === 'auto' && N > 9);
  function setGhost(i) { ghost = i; if (i >= 0) { ghostMesh.geometry = SG; ghostMesh.material = ghostMat[game.turn]; ghostMesh.position.copy(ptPos(i)); ghostMesh.visible = true; } else ghostMesh.visible = false; drawBoard(); }
  // play for whoever's turn it is
  function playMove(i, fromNet = false) {
    const h = game.play(i); if (!h) { sfx('bad'); return null; }
    setGhost(-1); hint = null; started = 1; animMove(h); live = describe(h); speak(live);
    afterMove(h, fromNet); return h;
  }
  function tryPlay(i) {
    if (!humanCanMove()) return false;
    if (i >= 0 && !game.isLegal(i)) { const why = game.whyIllegal(i); sfx(why === 'ko' ? 'ko' : 'bad'); flash = { txt: why === 'ko' ? 'KO · PLAY ELSEWHERE FIRST' : why === 'suicide' ? 'NO LIBERTIES THERE' : 'TAKEN', col: '#ff9a8a', t: 1.3 };
      live = why === 'ko' ? 'Ko: you cannot retake right away. Play somewhere else first.' : why === 'suicide' ? 'That stone would have no liberties.' : 'That point is taken.'; speak(live); emit(); return false; }
    if (mode === 'net') { const ply = game.history.length; if (!NET.isHost()) playMove(i, true); NET.request({ k: 'move', mv: coord(N, i), ply }); return true; }
    playMove(i); return true;
  }
  function afterMove(h, fromNet) {
    drawBoard(); const at = ataris(), tense = at.b + at.w > 0;
    audio.mood(game.phase === 'scoring' ? 'over' : tense ? 'tense' : 'play');
    if (mode === 'cpu') { if (h.caps.length) { if (h.color === myColor) { mood(cpuColor(), 'sad'); mood(myColor, 'happy'); if (Math.random() < 0.55) oppLine('lost'); } else { mood(cpuColor(), 'happy'); if (Math.random() < 0.55) oppLine('take'); } }
      else if (h.color === cpuColor() && at[myColor] && Math.random() < 0.35) oppLine('atari'); else if (h.color === cpuColor() && h.i < 0) oppLine('pass'); }
    if (h.i >= 0 && at[h.color === 'b' ? 'w' : 'b'] && !h.caps.length) { setTimeout(() => sfx('atari'), 380); }
    if (h.i < 0 && game.phase === 'play') flash = { txt: COLOR_WORD[h.color].toUpperCase() + ' PASSES', col: '#7dd3fc', t: 1.3 };
    if (mode === 'local' && prefs.autoFlip && game.phase === 'play') { povColor = game.turn; setTimeout(aimCamera, 600); }
    if (mode === 'demo') demoAfter(h);
    if (game.phase === 'scoring') enterScoring();
    else if (mode === 'cpu' && game.turn === cpuColor()) cpuGo();
    else if (mode === 'demo') { const tok = demoTok; setTimeout(() => { if (mode === 'demo' && phase === 'play' && tok === demoTok) cpuGo(); }, demo && demo.tip ? 3400 : 900); }
    if (mode === 'cpu' || mode === 'local') storeResume();
    emit();
  }
  // ---------- counting ----------
  function enterScoring() {
    done = { b: false, w: false }; markDead(); placeLast(); flash = { txt: 'BOTH PASSED · COUNT', col: '#ffd23a', t: 1.6 }; sfx('score'); audio.mood('over');
    live = 'Both players passed. Stones marked dead are faded. Tap a group to change it, then tap DONE.'; speak(live);
    if (mode === 'cpu') { done[cpuColor()] = true; if (Math.random() < 0.5) setTimeout(() => oppLine('pass'), 600); }
    if (mode === 'demo') { done = { b: true, w: true }; const tk = demoTok; setTimeout(() => { if (mode === 'demo' && tk === demoTok) finishCount(); }, 3800); }
    drawBoard(); emit();
  }
  function toggleDead(i) { if (game.phase !== 'scoring' || !game.at(i)) return false; if (mode === 'net') { NET.request({ k: 'mark', i }); return true; } game.toggleDead(i); done = { b: false, w: false }; if (mode === 'cpu') done[cpuColor()] = true; sfx('mark'); markDead(); drawBoard(); live = whatIs(i); speak(live); emit(); return true; }
  function pressDone(c) { if (game.phase !== 'scoring') return; if (mode === 'net') { NET.request({ k: 'done' }); return; } if (mode === 'local') { done = { b: true, w: true }; } else done[c] = true; if (done.b && done.w) finishCount(); else emit(); }
  function finishCount() { const sc = game.score(); scoreView = sc; finish(sc.result, (sc.winner === 'b' ? 'Black' : 'White') + ' by ' + sc.margin + ' points', { score: sc }); }
  function resumePlay() { if (game.phase !== 'scoring') return; if (mode === 'net') { NET.request({ k: 'resume' }); return; } game.resume(); done = { b: false, w: false }; markDead(); placeLast(); drawBoard(); audio.mood('play'); live = 'Play resumes. ' + COLOR_WORD[game.turn] + ' to move.'; speak(live); if (isCpuTurn()) cpuGo(); emit(); }

  // ---------- CPU (Worker, main-thread fallback) ----------
  let worker = null, wTok = 0, wCb = new Map(); try { worker = new Worker(new URL('./go-rules.js', import.meta.url), { type: 'module' }); worker.onmessage = e => { const cb = wCb.get(e.data.id); wCb.delete(e.data.id); cb && cb(e.data.m); }; worker.onerror = () => { worker = null; }; } catch (e) { worker = null; }
  // opening book: the first stone or two go on a star point (or tengen), away from what is already there
  function bookMove() { const H = game.history; if (H.length > 1 || H.some(h => h.i < 0)) return -1; const busy = H.map(h => h.i), far = i => busy.every(j => Math.abs(i % N - j % N) + Math.abs(Math.floor(i / N) - Math.floor(j / N)) >= (N > 9 ? 6 : 3));
    const L = hoshi(N).filter(i => !game.at(i) && far(i) && game.isLegal(i)); return L.length ? L[Math.floor(Math.random() * L.length)] : -1; }
  function ask(lvl, cb, kind = 'move') { if (kind === 'move') { const b = bookMove(); if (b >= 0) { setTimeout(() => cb({ i: b, resign: false, winrate: 0.5 }), 200); return; } } const id = ++wTok, state = game.toJSON(); const local = () => { const g = new Go({ state }); cb(kind === 'dead' ? { dead: [...g.estimateDead()] } : kind === 'own' ? { own: Array.from(g.ownership(N <= 9 ? 300 : N <= 13 ? 180 : 110)) } : think(g, lvl)); };
    if (worker) { wCb.set(id, cb); worker.postMessage({ id, state, level: lvl, kind }); setTimeout(() => { if (wCb.has(id)) { wCb.delete(id); local(); } }, 9000); } else setTimeout(local, 30); }
  function cpuGo() {
    cpuBusy = true; const tok = ++cpuTok, t0 = performance.now(), f = foxOn(cpuColor()); if (f) f.userData.mood = 'curious'; emit();
    ask(mode === 'demo' ? 1 : level, m => { const wait = Math.max(0, 450 + rr(0, 400) - (performance.now() - t0)); setTimeout(() => { if (tok !== cpuTok || phase !== 'play' || over || game.phase !== 'play') return; cpuBusy = false; const ff = foxOn(cpuColor()); if (ff) ff.userData.mood = ff.userData.base;
      if (m && m.resign) { const O = oppOf(); talk(cpuColor(), pick(O.lines.resign || ['I resign.']), O.name); finish(cpuColor() === 'w' ? '0-1' : '1-0', COLOR_WORD[cpuColor()] + ' resigned'); return; }
      playMove(m && m.i != null ? m.i : -1); }, wait); });
  }


  // ---------- end of game ----------
  function finish(result, reason, extra = {}) {
    if (over) return; const winner = result === '1-0' ? 'w' : result === '0-1' ? 'b' : null; over = { result, reason, winner, ...extra }; cursor = -1; setGhost(-1); cpuTok++; cpuBusy = false; lastMark.visible = false;
    let title = winner ? (COLOR_WORD[winner] + ' wins') : 'Game over', sub = reason, gold = 0, xp = 0, rec = null;
    const sc = extra.score; if (sc) sub = 'Black ' + sc.b + ' · White ' + sc.w + ' (komi ' + sc.komi + ')';
    if (mode === 'cpu') {
      const O = oppOf(), you = winner === myColor ? 'w' : 'l';
      title = you === 'w' ? 'You win' : O.name + ' wins'; if (sc) title += ' by ' + sc.margin;
      if (!practice) { gold = you === 'w' ? O.gold : 0; xp = you === 'w' ? O.xp : game.history.length >= 30 ? 4 : 0; try { if (gold) save.addGold(gold); if (xp) save.addXp(xp); const k = 'goClub.' + O.id + '.' + you; save.setStat(k, save.stat(k) + 1); if (you === 'w') save.setFlag('goClub.beat.' + O.id); if (you === 'w') save.setFlag('goClub.beat.' + O.id + '.' + N); save.setStat('goClub.games', save.stat('goClub.games') + 1); } catch (e) {} }
      if (you === 'w') { mood(myColor, 'excited', 4); mood(cpuColor(), 'sad', 4); oppLine('lose'); sfx('win'); } else { mood(cpuColor(), 'excited', 4); mood(myColor, 'sad', 4); oppLine('win'); sfx('lose'); }
      rec = { you };
    } else { if (winner) { mood(winner, 'excited', 4); mood(winner === 'w' ? 'b' : 'w', 'sad', 4); } sfx('win'); if (sc) title += ' by ' + sc.margin;
      if (mode === 'net' && NET.seatOf(NET.me)) { const mine = NET.seatOf(NET.me), you = winner === mine ? 'w' : 'l'; title = (you === 'w' ? 'You win' : 'You lose') + (sc ? ' by ' + sc.margin : ''); xp = you === 'w' ? 12 : 3; try { save.addXp(xp); const k = 'goClub.online.' + you; save.setStat(k, save.stat(k) + 1); } catch (e) {} }
    }
    over.title = title; over.sub = sub + (practice && mode === 'cpu' ? ' · practice game (undo, hint or territory used) · no gold' : ''); over.gold = gold; over.xp = xp; over.rec = rec;
    if (winner) { let k = 0; for (const [i, o] of onBoard) if (o.userData.c === winner && !(game.dead.has(i) && game.phase === 'scoring')) { o.userData.pop = 1 + k * 0.01; k++; } }
    audio.mood('over'); if (winner) flash = { txt: (COLOR_WORD[winner] + ' wins').toUpperCase(), col: '#ffd23a', t: 1.8 };
    if (mode === 'cpu') { const O = oppOf(); let w = 0, l = 0; try { w = save.stat('goClub.' + O.id + '.w'); l = save.stat('goClub.' + O.id + '.l'); } catch (e) {} over.record = 'vs ' + O.name + ': ' + w + 'W ' + l + 'L'; }
    toParent({ action: 'result', mode, result, reason, size: N, score: sc ? { b: sc.b, w: sc.w } : null, gold, xp, opponent: mode === 'cpu' ? oppOf().id : null });
    live = title + '. ' + sub + '.'; speak(live); clearResume(); drawBoard(); emit();
    if (mode === 'demo') demoEnd();
  }

  // ---------- resume ----------
  function storeResume() { if (mode !== 'cpu' && mode !== 'local') return; if (over || !game.history.length) return clearResume(); try { localStorage.setItem(RESUME_KEY, JSON.stringify({ mode, level, myColor, practice, N, moves: game.history.map(h => h.text) })); } catch (e) {} }
  function clearResume() { try { localStorage.removeItem(RESUME_KEY); } catch (e) {} }
  function loadResume() { try { return JSON.parse(localStorage.getItem(RESUME_KEY) || 'null'); } catch (e) { return null; } }
  function setSize(n) { if (n !== N || !SG) { N = n; sp = GW / (N - 1); rebuildGeo(); drawBoard.grain = drawBoard.grain; } }

  // ---------- DEMO: two foxes play while captions teach the rules ----------
  let demo = null, demoTok = 0, demoSeen = new Set();
  const NAMEOF = { b: 'NOBLE', w: 'HOPE' };
  const TIPS = {
    first: 'Black always plays first. Stones go on the crossing points, not in the squares, and they never move once placed.',
    corner: 'Openings start in the corners: two edges help you make territory with fewer stones.',
    atari: 'Atari! That group has only one liberty (one empty point next to it) left. One more stone and it is captured.',
    capture: 'A capture: a group with no liberties left comes off the board. Each captured stone is a point, kept in the lid.',
    ko: 'Ko: a single stone was just taken. The other side may not take it straight back, they must play elsewhere first.',
    pass: 'A pass: when there is nothing useful left to play, you pass. Two passes in a row end the game.',
    count: 'The count: each side scores the empty points they surround, plus their prisoners. White gets 6.5 extra (komi) for going second.',
  };
  function demoTip(k) { if (!demo || demoSeen.has(k)) return; demoSeen.add(k); demo = { ...demo, cap: TIPS[k], tip: true }; speak(TIPS[k]); emit(); }
  function demoAfter(h) {
    if (!demo) return; let tip = null; const want = k => { if (demoSeen.has(k)) return false; demoSeen.add(k); return true; }, at = ataris();
    if (game.history.length === 1 && want('first')) tip = TIPS.first;
    else if (game.history.length === 3 && want('corner')) tip = TIPS.corner;
    else if (h.caps.length && want('capture')) tip = TIPS.capture;
    else if (game.ko >= 0 && want('ko')) tip = TIPS.ko;
    else if (at.b + at.w > 0 && want('atari')) tip = TIPS.atari;
    else if (h.i < 0 && want('pass')) tip = TIPS.pass;
    if (game.phase === 'scoring' && want('count')) tip = TIPS.count;
    demo = { key: NAMEOF[h.color] + ' · ' + h.text, cap: tip || describe(h) + '.', n: game.history.length, tip: !!tip };
    if (tip) speak(tip);
    if (game.history.length >= N * N * 2.5 && game.phase === 'play') { demo.cap = 'A long game. Setting up a fresh demo.'; demoTok++; setTimeout(() => { if (mode === 'demo' && phase === 'play') begin('demo'); }, 3500); }
  }
  function demoEnd() {
    const tok = ++demoTok, w = over ? over.winner : null; demo = { key: (w ? NAMEOF[w] + ' WINS' : 'GAME OVER') + (over && over.score ? ' BY ' + over.score.margin : ''), cap: (over && over.score ? 'Black ' + over.score.b + ', White ' + over.score.w + ' with komi. ' : '') + 'A new demo starts in a moment, or tap TAKE OVER / EXIT DEMO.', n: game.history.length };
    speak(demo.cap); emit(); setTimeout(() => { if (mode === 'demo' && tok === demoTok) { over = null; begin('demo'); } }, 9000);
  }
  function takeOver() {
    if (mode !== 'demo' || phase !== 'play') return; if (over || game.phase !== 'play') { begin('cpu', { level: prefs.level, color: prefs.color }); return; }
    flushAnims(); cpuTok++; cpuBusy = false; demoTok++; demo = null; mode = 'cpu'; level = prefs.level; myColor = game.turn; practice = true;
    seated = myColor === 'w' ? { w: 'player', b: cpuFoxId() } : { w: cpuFoxId(), b: 'player' }; povColor = myColor; placeFoxes(); aimCamera(); drawBoard(); audio.mood('play');
    live = 'You play ' + COLOR_WORD[myColor] + ' from here against ' + oppOf().name + '. A practice game: no gold.'; speak(live); flash = { txt: 'YOUR MOVE', col: '#22c55e', t: 1.2 }; storeResume(); emit();
  }

  // ---------- starting games ----------
  function begin(m, o = {}) {
    NET.leave(true); mode = m; over = null; scoreView = null; promoAsk = null; hint = null; practice = !!o.practice; setGhost(-1); cpuTok++; cpuBusy = false; say = null; started = 0; done = { b: false, w: false };
    const size = m === 'demo' ? 9 : (o.N || prefs.size); setSize(size);
    if (m === 'demo') { level = 1; myColor = null; seated = { w: 'hope', b: 'noble' }; povColor = 'b'; clocks = null; demoTok++; demoSeen = new Set(); demo = { key: 'DEMO', cap: 'Noble plays Black, Hope plays White, on the small 9×9 board. Watch the stones and the captures. Tap the board or TAKE OVER to play from here.', n: 0 }; }
    else if (m === 'cpu') { level = o.level ?? prefs.level; myColor = o.color || prefs.color; if (myColor === 'random') myColor = Math.random() < 0.5 ? 'w' : 'b'; seated = myColor === 'w' ? { w: 'player', b: cpuFoxId() } : { w: cpuFoxId(), b: 'player' }; povColor = myColor; clocks = null; }
    else { myColor = 'b'; seated = { w: 'net1', b: 'player' }; povColor = 'b'; const tc = o.tc || prefs.tc; clocks = tc && tc !== 'none' ? { w: +tc * 60000, b: +tc * 60000, inc: 0 } : null; }
    standing = []; game = new Go({ N: size, moves: o.moves }); if (m === 'local' && prefs.autoFlip) povColor = game.turn;
    phase = 'play'; topple = null; syncPieces(); placeFoxes(); drawBoard(); aimCamera(); camSnap = false; audio.sfx('start'); audio.mood('play');
    if (m === 'cpu') { if (!o.moves) setTimeout(() => oppLine('hello'), 500); if (game.turn === cpuColor() && game.phase === 'play') setTimeout(cpuGo, 900); if (game.phase === 'scoring') enterScoring(); }
    if (m === 'demo') { const tok = demoTok; setTimeout(() => { if (mode === 'demo' && tok === demoTok && phase === 'play') cpuGo(); }, 3200); } else demo = null;
    live = m === 'demo' ? demo.cap : m === 'cpu' ? 'New ' + size + ' by ' + size + ' game against ' + oppOf().name + '. You play ' + COLOR_WORD[myColor] + '.' + (myColor === 'b' ? ' Black plays first.' : '') : 'Pass and play, ' + size + ' by ' + size + '. Black plays first.'; speak(live); storeResume(); emit();
  }
  function toMenu() { cpuTok++; cpuBusy = false; demo = null; demoTok++; NET.leave(); phase = 'menu'; topple = null; audio.mood('menu'); over = null; scoreView = null; promoAsk = null; setGhost(-1); hint = null; say = null; mode = 'cpu'; seated = { w: null, b: ['pip', 'hope', 'noble'][prefs.level] || 'hope' }; standing = []; setSize(prefs.size); game = new Go({ N }); syncPieces(); placeFoxes(); drawBoard(); emit(); }

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
    function fresh() { return { seq: 0, seats: { w: null, b: null }, N: prefs.size, moves: [], phase: 'play', dead: [], done: { b: false, w: false }, live: false, result: null, reason: '', score: null, queue: [], tc: prefs.tc || 'none', clk: null, stamp: 0 }; }
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
    function replayState(s) { const c = new Go({ N: s.N, moves: s.moves }); if (s.phase === 'scoring') { c.phase = 'scoring'; c.dead = new Set(s.dead); } return c; }
    function handle(d, id) {
      const s = N.state; if (!s) return; const seat = s.seats.w === id ? 'w' : s.seats.b === id ? 'b' : null;
      if (d.k === 'sit' && (d.c === 'w' || d.c === 'b') && !s.live && !s.seats[d.c] && !seat) { s.seats[d.c] = id; s.queue = s.queue.filter(q => q !== id); }
      else if (d.k === 'stand' && seat && !s.live) { s.seats[seat] = null; }
      else if (d.k === 'queue' && !seat && !s.queue.includes(id)) s.queue.push(id);
      else if (d.k === 'tc' && id === N.me && !s.live) s.tc = ['none', '10', '5', '3'].includes(d.v) ? d.v : 'none';
      else if (d.k === 'size' && id === N.me && !s.live && [9, 13, 19].includes(+d.v)) s.N = +d.v;
      else if (d.k === 'start' && !s.live && s.seats.w && s.seats.b && (seat || id === N.me)) {
        if (s.result) rotate(s); s.moves = []; s.phase = 'play'; s.dead = []; s.done = { b: false, w: false }; s.result = null; s.reason = ''; s.score = null; s.live = true; s.turnC = 'b'; s.clk = s.tc !== 'none' ? { w: +s.tc * 60000, b: +s.tc * 60000 } : null; s.stamp = Date.now(); s.game = (s.game || 0) + 1; }
      else if (d.k === 'move' && s.live && seat && s.phase === 'play' && d.ply === s.moves.length) {
        const c = replayState(s); if (c.turn !== seat) return; const h = c.play(d.mv); if (!h) { send('st', s, id); return; }
        if (s.clk) { s.clk[seat] = Math.max(0, s.clk[seat] - (Date.now() - s.stamp)); } s.stamp = Date.now(); s.turnC = c.turn;
        s.moves.push(h.text); if (c.phase === 'scoring') { s.phase = 'scoring'; s.dead = [...c.dead]; s.done = { b: false, w: false }; } }
      else if (d.k === 'mark' && s.live && seat && s.phase === 'scoring') { const c = replayState(s); c.toggleDead(d.i); s.dead = [...c.dead]; s.done = { b: false, w: false }; }
      else if (d.k === 'done' && s.live && seat && s.phase === 'scoring') { s.done[seat] = true; if (s.done.b && s.done.w) { const c = replayState(s), sc = c.score(); s.live = false; s.result = sc.result; s.reason = (sc.winner === 'b' ? 'Black' : 'White') + ' by ' + sc.margin + ' points'; s.score = { b: sc.b, w: sc.w, margin: sc.margin, komi: sc.komi }; } }
      else if (d.k === 'resume' && s.live && seat && s.phase === 'scoring') { s.phase = 'play'; s.dead = []; s.done = { b: false, w: false }; s.moves.push('resume'); }
      else if (d.k === 'resign' && s.live && seat) { s.live = false; s.result = seat === 'w' ? '0-1' : '1-0'; s.reason = COLOR_WORD[seat] + ' resigned'; }
      else return;
      bump();
    }
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
      const s = N.state; if (!s) return; const L = list(); mode = 'net';
      if (s.N !== game.N) { setSize(s.N); game = new Go({ N: s.N }); syncPieces(); }
      const want = s.moves.filter(m => m !== 'resume'), have = game.history.map(h => h.text);
      const same = want.length >= have.length && have.every((u, i) => u === want[i]);
      if (same && want.length === have.length + 1 && game.phase === 'play') { playMove(want[want.length - 1], true); }
      else if (!same || want.length !== have.length) { game = new Go({ N: s.N, moves: want }); syncPieces(); }
      if (s.phase === 'scoring') { if (game.phase !== 'scoring') { game.phase = 'scoring'; } game.dead = new Set(s.dead); done = { ...s.done }; markDead(); }
      else if (game.phase === 'scoring') { game.resume(); markDead(); }
      clocks = s.clk ? { w: s.clk.w, b: s.clk.b, at: performance.now(), turnC: s.turnC } : null;
      const mine = N.seatOf(N.me); povColor = mine || 'b';
      seated = { w: s.seats.w ? 'net' + N.slotOf(s.seats.w) : null, b: s.seats.b ? 'net' + N.slotOf(s.seats.b) : null };
      standing = L.filter(m => m.id !== s.seats.w && m.id !== s.seats.b).slice(0, 3).map(m => 'net' + N.slotOf(m.id));
      if (s.live) { phase = 'play'; over = null; } else if (s.result && s.game) { if (!over || over.game !== s.game) { over = null; phase = 'play'; scoreView = s.score ? game.score() : null; finish(s.result, s.reason, { game: s.game, score: scoreView }); } }
      else if (phase === 'play' && !s.live && !s.result) phase = 'room';
      placeFoxes(); drawBoard(); aimCamera(); emit();
    }
    N.leave = (quiet) => { N.tok++; clearInterval(N.timer); if (N.tr) { send('bye', {}); try { N.tr.leave(); } catch (e) {} } N.tr = null; N.room = null; N.members = {}; N.state = null; N.reacts = []; try { const u = new URL(location.href); if (u.searchParams.has('room')) { u.searchParams.delete('room'); history.replaceState(null, '', u.href); } } catch (e) {} if (!quiet) emit(); };
    N.connect = code => { N.settled = false; return connect(code); }; N.create = () => { N.settled = true; const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)]; connect(c).then(() => { N.settled = true; }); };
    return N;
  })();

  // ---------- input: tap an intersection (13/19: the first tap shows a ghost stone, tap it again to place) ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = V3();
  function pointAtXZ(x, z) { const c = Math.round((GW / 2 - x) / sp), r = Math.round((GW / 2 - z) / sp); if (c < 0 || r < 0 || c >= N || r >= N) return -1; const px = GW / 2 - c * sp, pz = GW / 2 - r * sp; if (Math.hypot(x - px, z - pz) > sp * 0.62) return -1; return r * N + c; }
  function pointAt(e) { const bb = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - bb.left) / bb.width) * 2 - 1, -((e.clientY - bb.top) / bb.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const pl = new THREE.Plane(V3(0, 1, 0), -(BOARD_Y + 0.01)); if (!ray.ray.intersectPlane(pl, hit)) return -1; return pointAtXZ(hit.x, hit.z); }
  let down = null, drag = null;
  function tap(i) {
    if (mode === 'demo' && phase === 'play') { takeOver(); return; }
    if (phase !== 'play' || over) return;
    if (game.phase === 'scoring') { if (i >= 0 && game.at(i) && (mode !== 'net' || NET.seatOf(NET.me))) toggleDead(i); return; }
    if (i < 0) { setGhost(-1); emit(); return; }
    if (!humanCanMove()) { if (prefs.speak) speak(whatIs(i)); return; }
    if (confirmOn() && ghost !== i) { if (game.at(i)) { sfx('bad'); live = whatIs(i); speak(live); emit(); return; } setGhost(i); sfx('bowl'); live = cname(i) + '. Tap again to place.'; speak(live); emit(); return; }
    tryPlay(i);
  }
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => { ac(); if (e.button > 0) return; if (cursor >= 0) { cursor = -1; drawBoard(); } down = { x: e.clientX, y: e.clientY, i: pointAt(e), id: e.pointerId, moved: false }; });
  el.addEventListener('pointermove', e => { if (!down || e.pointerId !== down.id) return; if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) down.moved = true;
    if (down.moved && confirmOn() && humanCanMove()) { const i = pointAt(e); if (i >= 0 && i !== ghost && !game.at(i)) { setGhost(i); emit(); } } });   // slide a finger to steer the ghost stone
  const up = e => { if (!down || e.pointerId !== down.id) return; const d = down; down = null; if (e.type === 'pointercancel') return; if (d.moved && confirmOn()) return; tap(d.i); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  // keyboard: arrows move a cursor, Enter places, P passes
  const onKey = e => { if (phase !== 'play' || /INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) return; const k = e.key;
    if (k === 'p' || k === 'P') { e.preventDefault(); if (humanCanMove()) tryPlay(-1); return; }
    if (!/^Arrow|^Enter$|^ $|^Escape$/.test(k)) return; if (cursor < 0) cursor = Math.floor(N * N / 2); const fl = povColor === 'w' ? -1 : 1; let c = cursor % N, r = Math.floor(cursor / N);
    if (k === 'ArrowLeft') c -= fl; else if (k === 'ArrowRight') c += fl; else if (k === 'ArrowUp') r -= fl; else if (k === 'ArrowDown') r += fl; else if (k === 'Escape') { setGhost(-1); drawBoard(); emit(); return; } else { e.preventDefault(); if (game.phase === 'scoring') toggleDead(cursor); else tryPlay(cursor); return; }
    e.preventDefault(); cursor = clamp(r, 0, N - 1) * N + clamp(c, 0, N - 1); live = whatIs(cursor); speak(live); drawBoard(); emit(); };
  addEventListener('keydown', onKey);


  // ---------- HUD state for the page ----------
  let lastEmit = 0;
  function clockMs(c) { if (!clocks) return null; if (mode === 'net') { let v = clocks[c]; if (NET.state && NET.state.live && clocks.turnC === c) v -= performance.now() - clocks.at; return Math.max(0, v); } return Math.max(0, clocks[c]); }
  const fmt = ms => ms == null ? '' : (ms >= 60000 ? Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0') : Math.floor(ms / 1000) % 60 + '.' + Math.floor(ms / 100) % 10);
  function side(c) {
    const net = mode === 'net' && NET.state, id = net ? NET.state.seats[c] : null;
    let name, sub, col = c === 'w' ? '#f7f3e8' : '#26242b';
    if (mode === 'demo') { name = NAMEOF[c]; sub = 'DEMO · ' + COLOR_WORD[c].toUpperCase(); }
    else if (mode === 'cpu') { if (c === myColor) { name = 'YOU'; sub = COLOR_WORD[c].toUpperCase(); } else { const O = oppOf(); name = O.name; sub = O.tag + ' · ' + COLOR_WORD[c].toUpperCase(); } }
    else if (net) { name = id ? NET.nameOf(id) : 'EMPTY SEAT'; sub = COLOR_WORD[c].toUpperCase(); if (id) col = (NET_COLS[NET.slotOf(id)] || NET_COLS[0])[1]; }
    else { name = COLOR_WORD[c].toUpperCase(); sub = 'PASS & PLAY'; }
    const caps = game.caps[c], extra = 'CAPTURES ' + caps + (c === 'w' ? ' · KOMI ' + game.komi : '');
    return { c, name, sub: sub + ' · ' + extra, col, caps: caps ? '●︎ ' + caps : '', adv: '', clock: fmt(clockMs(c)), clockOn: !!clocks, low: clocks ? clockMs(c) < 20000 : false, active: phase === 'play' && !over && game.phase === 'play' && game.turn === c, thinking: (mode === 'cpu' || mode === 'demo') && cpuBusy && c === cpuColor() };
  }
  function statusTxt() {
    if (over) return String(over.title || 'GAME OVER').toUpperCase();
    if (game.phase === 'scoring') { const sc = game.score(); return mode === 'demo' ? 'DEMO · COUNT · B ' + sc.b + ' · W ' + sc.w : 'COUNTING · TAP DEAD GROUPS'; }
    const at = ataris(), mine = mode === 'cpu' ? myColor : mode === 'net' ? NET.seatOf(NET.me) : game.turn, atari = mine && at[mine] ? ' · ATARI!' : '';
    const g = ghost >= 0 ? ' · ' + cname(ghost) + ' · TAP AGAIN' : '';
    if (mode === 'demo') return 'DEMO · ' + (demo && /WINS|OVER/.test(demo.key) ? demo.key : NAMEOF[game.turn] + (cpuBusy ? ' IS THINKING' : ' TO PLAY'));
    if (mode === 'cpu') return (game.turn === myColor ? 'YOUR MOVE' + g + atari : oppOf().name + ' IS THINKING');
    if (mode === 'local') return COLOR_WORD[game.turn].toUpperCase() + ' TO PLAY' + g + atari;
    if (mode === 'net') { const s = NET.state; if (!s || !s.live) return 'WAITING'; return mine === game.turn ? 'YOUR MOVE' + g + atari : mine ? 'THEIR MOVE' : COLOR_WORD[game.turn].toUpperCase() + ' TO PLAY · WATCHING'; }
    return '';
  }
  function emit() {
    lastEmit = performance.now(); const top = povColor === 'w' ? 'b' : 'w', H = game.history, pairs = [];
    for (let i = 0; i < H.length; i += 2) pairs.push({ n: i / 2 + 1, w: H[i].text, b: H[i + 1] ? H[i + 1].text : '' });
    const R = loadResume(), Ns = NET.state, L = NET.list(), mine = NET.seatOf(NET.me);
    const rec = OPPONENTS.map(O => { let w = 0, l = 0; try { w = save.stat('goClub.' + O.id + '.w'); l = save.stat('goClub.' + O.id + '.l'); } catch (e) {} return { level: O.level, name: O.name, tag: O.tag, who: O.who, gold: O.gold, rec: w + 'W ' + l + 'L', beat: w > 0 }; });
    const scoring = game.phase === 'scoring' && !over, sc = scoring ? game.score() : null, myDone = mode === 'net' ? !!(mine && done[mine]) : mode === 'cpu' ? done[myColor] : false;
    onState({
      demo: demo ? { key: demo.key, cap: demo.cap, n: demo.n } : null,
      phase, mode, level, myColor, turn: game.turn, pov: povColor, view: prefs.view, prefs: { ...prefs }, size: N,
      top: side(top), bottom: side(povColor), status: statusTxt(), canPass: humanCanMove(), ghost: ghost >= 0 ? cname(ghost) : null,
      scoring: scoring ? { b: sc.b, w: sc.w, myDone, canAct: mode !== 'net' || !!mine, waiting: mode === 'net' && myDone } : null,
      moves: pairs, ply: H.length, last: H.length ? H[H.length - 1].text : '', live,
      say: say ? { who: say.who, text: say.text } : null, promo: null,
      flash: flash ? { txt: flash.txt, col: flash.col } : null,
      over: over ? { record: over.record || '', title: over.title, sub: over.sub, gold: over.gold, xp: over.xp, winner: over.winner, result: over.result } : null,
      canUndo: phase === 'play' && !over && game.phase === 'play' && (mode === 'cpu' || mode === 'local') && H.length > 0 && !cpuBusy, canHint: mode === 'cpu' && phase === 'play' && !over && game.phase === 'play' && game.turn === myColor && !cpuBusy, hintBusy, practice,
      thinking: cpuBusy, opponents: rec, resume: R && R.moves && R.moves.length ? { mode: R.mode, label: (R.mode === 'cpu' ? 'VS ' + ((OPPONENTS[R.level] || OPPONENTS[1]).name) : 'PASS & PLAY') + ' · ' + R.N + '×' + R.N + ' · MOVE ' + (R.moves.length + 1) } : null,
      gold: (() => { try { return save.data.gold; } catch (e) { return 0; } })(),
      net: NET.room ? { code: NET.room, status: NET.status, host: NET.isHost(), me: NET.me, msg: NET.msg, copied: NET.copied, mine, live: !!(Ns && Ns.live), result: Ns ? Ns.result : null, tc: Ns ? Ns.tc : 'none', size: Ns ? Ns.N : 9, canStart: !!(Ns && !Ns.live && Ns.seats.w && Ns.seats.b && (mine || NET.isHost())),
        seats: ['b', 'w'].map(c => ({ c, id: Ns ? Ns.seats[c] : null, name: Ns && Ns.seats[c] ? NET.nameOf(Ns.seats[c]) : 'OPEN', col: Ns && Ns.seats[c] ? (NET_COLS[NET.slotOf(Ns.seats[c])] || NET_COLS[0])[1] : '#3a3836', mine: !!(Ns && Ns.seats[c] === NET.me), open: !!(Ns && !Ns.seats[c]) })),
        people: L.map((m, i) => ({ id: m.id, name: NET.nameOf(m.id), col: NET_COLS[i][1], seat: Ns ? (Ns.seats.w === m.id ? 'WHITE' : Ns.seats.b === m.id ? 'BLACK' : Ns.queue.includes(m.id) ? 'NEXT · ' + (Ns.queue.indexOf(m.id) + 1) : 'WATCHING') : '', host: i === 0, me: m.id === NET.me })),
        count: L.length, max: GAME.maxRoom, inQueue: !!(Ns && Ns.queue.includes(NET.me)), reacts: NET.reacts.map(r => ({ who: r.who, w: r.w, col: r.col })) } : null,
    });
  }

  // ---------- loop ----------
  const clock = new THREE.Clock(); let raf = 0, alive = true, frame = 0;
  function loop() {
    if (!alive) return; raf = requestAnimationFrame(loop); const rawDt = Math.min(0.25, clock.getDelta()), dt = Math.min(0.05, rawDt); frame++;
    // stone animations
    for (const a of anims) { a.t += rawDt; if (a.t < 0) continue; const k = clamp(a.t / a.dur, 0, 1), e = smooth(k); a.o.position.lerpVectors(a.a, a.b, e); a.o.position.y = a.a.y + (a.b.y - a.a.y) * e + Math.sin(k * Math.PI) * a.hop; if (a.spin) a.o.userData.body.rotation.z += a.spin * rawDt * (1 - k); if (k >= 1 && !a.fin) { a.fin = true; a.done && a.done(); } }
    if (anims.length && anims.every(a => a.fin)) { anims = []; emit(); }
    const t = clock.elapsedTime;
    for (const L of Object.values(pool)) for (const o of L) { if (!o.visible) continue; const u = o.userData; if (u.pop > 0) { u.pop = Math.max(0, u.pop - dt * 2.5); u.body.scale.setScalar(1 + Math.sin(Math.min(1, u.pop) * Math.PI) * 0.25); }
      if (u.sh.visible) { const air = o.position.y - BOARD_Y; u.sh.position.y = 0.002 - Math.max(0, air); u.sh.scale.setScalar(clamp(1 - air * 2.5, 0.4, 1)); } }
    if (ghostMesh.visible) ghostMesh.material.opacity = 0.45 + Math.sin(t * 5) * 0.15;
    lastMark.rotation.y += dt * 1.5;
    for (let i = puffAt.length - 1; i >= 0; i--) { puffAt[i][1] -= rawDt; if (puffAt[i][1] <= 0) { puff(puffAt[i][0].clone().setY(BOARD_Y + 0.04), 0xf6e7c8, 3); puffAt.splice(i, 1); } }
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
      if (u.sit) { const P = u.P; P.legs.forEach((l, li) => { l.rotation.x = -1.45; l.rotation.z = li ? -0.55 : 0.55; }); P.arms.forEach((a, i) => { a.rotation.x = -0.7 + (u.talking && i ? Math.sin(u.phase * 2.2) * 0.2 : 0); a.rotation.z = i ? 0.25 : -0.25; }); P.body.position.y = u.hopY * 0.5; } }
    if (atariRings.length) atariMat.opacity = 0.55 + Math.sin(performance.now() / 180) * 0.35;
    // sparks
    for (const k of sparks) { if (k.life <= 0) continue; k.life -= dt * 1.6; k.s.position.addScaledVector(k.v, dt); k.v.y -= dt * 1.5; k.s.material.opacity = Math.max(0, k.life); }
    // talk + reactions timers
    if (say) { say.t -= dt; if (say.t <= 0) { say = null; emit(); } }
    if (NET.reacts.length) { NET.reacts.forEach(r => r.t -= dt); const n = NET.reacts.length; NET.reacts = NET.reacts.filter(r => r.t > 0); if (n !== NET.reacts.length) emit(); }
    // local clocks
    if (clocks && mode === 'local' && phase === 'play' && !over && started && !anims.length) { clocks[game.turn] -= dt * 1000; if (clocks[game.turn] <= 0) { clocks[game.turn] = 0; const loser = game.turn; finish(loser === 'w' ? '0-1' : '1-0', COLOR_WORD[loser] + ' ran out of time'); } }
    if (clocks && performance.now() - lastEmit > 200) emit();
    // camera
    if (phase === 'menu' || phase === 'room' && !(NET.state && NET.state.live)) { orbitT += dt * 0.25; if (frame % 3 === 0 || camSnap) {   // a slow sway around the table, framed into the part of the screen the menu leaves free
        const both = !!(seated.w && seated.b), W = CW(), H = CH(), yaw = (both ? Math.PI * 0.6 : Math.PI * 0.86) + Math.sin(orbitT * 0.35) * 0.18, visH = Math.max(0.2, (H - safe.top - safe.bottom) / H), visW = Math.max(0.3, (W - safe.left - safe.right) / W);
        const dist = both ? 3.7 : 3.2, el = both ? 0.3 : 0.22, th = Math.tan(camera.fov * Math.PI / 360), asp = W / H;
        const ny = 1 - (safe.top + H - safe.bottom) / H, nx = (safe.left + W - safe.right) / W - 1, base = both ? V3(0, 0.95, 0) : V3(0, 1.55, -0.9), look = base.clone(), dir = V3(Math.sin(yaw) * Math.cos(el), Math.sin(el), -Math.cos(yaw) * Math.cos(el)), right = V3(Math.cos(yaw), 0, Math.sin(yaw));
        look.y -= ny * dist * th * 0.8; look.addScaledVector(right, nx * dist * th * asp);
        camGoal = { pos: base.clone().addScaledVector(dir, dist), look }; } }   /* pitch, not pan: the table lifts into the free strip */
    { const menuCam = phase === 'menu' || (phase === 'room' && !(NET.state && NET.state.live)), port = CH() > CW(), fv = menuCam ? (port ? 78 : 52) : (port ? 46 : 40); if (Math.abs(camera.fov - fv) > 0.05) { camera.fov = damp(camera.fov, fv, 4, dt); camera.updateProjectionMatrix(); } }
    const k = camSnap ? 1 : 1 - Math.exp(-4 * dt); camSnap = false; camera.position.lerp(camGoal.pos, k); camLook.lerp(camGoal.look, k); camera.lookAt(camLook);
    room.shade.visible = room.bulb.visible = camera.position.y < room.H - 0.25;   // TOP view looks down through the ceiling
    if (touch && !anims.length && !ghostMesh.visible && (frame & 1)) return;   // ~30 fps when nothing moves on phones
    if (document.hidden) return;
    renderer.render(scene, camera);
  }
  function resize() { const W = CW(), H = CH(); renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix(); aimCamera(); }
  const ro = new ResizeObserver(resize); ro.observe(container); addEventListener('resize', resize);

  // ---------- boot ----------
  seated = { w: null, b: ['pip', 'hope', 'noble'][prefs.level] || 'hope' }; setSize(prefs.size); game = new Go({ N }); syncPieces(); placeFoxes(); drawBoard(); resize(); loop(); emit();
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
    playCpu(lv = prefs.level, color = prefs.color, size = prefs.size) { prefs.level = lv; prefs.color = color; prefs.size = size; savePrefs(); begin('cpu', { level: lv, color, N: size }); },
    playLocal(tc = prefs.tc, size = prefs.size) { prefs.tc = tc; prefs.size = size; savePrefs(); begin('local', { tc, N: size }); },
    resume() { const R = loadResume(); if (!R) return; if (R.mode === 'cpu') begin('cpu', { level: R.level, color: R.myColor, moves: R.moves, practice: R.practice, N: R.N }); else begin('local', { moves: R.moves, N: R.N }); },
    rematch() { if (mode === 'cpu') begin('cpu', { level, color: myColor === 'w' ? 'b' : 'w', N }); else if (mode === 'local') begin('local', { N }); else if (mode === 'net') NET.request({ k: 'start' }); },
    menu: toMenu,
    demo() { begin('demo'); }, takeOver,
    previewOpponent(lv) { if (phase !== 'menu') return; const id = ['pip', 'hope', 'noble'][lv] || 'hope'; if (seated.b === id) return; seated = { w: null, b: id }; placeFoxes(); const O = OPPONENTS[lv]; if (O) talk('b', pick(O.lines.hello), O.name); },
    promote() {}, cancelPromo() {}, pass() { if (humanCanMove()) tryPlay(-1); }, place() { if (ghost >= 0) tryPlay(ghost); }, done() { pressDone(mode === 'cpu' ? myColor : mode === 'net' ? NET.seatOf(NET.me) : game.turn); }, resumePlay, setSize(n) { if (![9, 13, 19].includes(+n)) return; prefs.size = +n; savePrefs(); if (phase === 'menu') { setSize(+n); game = new Go({ N }); syncPieces(); drawBoard(); } emit(); }, netSize: v => NET.request({ k: 'size', v }),
    undo() { if (over || phase !== 'play' || game.phase !== 'play') return; flushAnims(); if (mode === 'cpu') { cpuTok++; cpuBusy = false; if (!game.history.length) return; game.undo(); while (game.history.length && game.turn !== myColor) game.undo(); practice = true; if (game.turn !== myColor) setTimeout(cpuGo, 300); } else if (mode === 'local') { if (!game.history.length) return; game.undo(); if (prefs.autoFlip) povColor = game.turn; aimCamera(); } else return; setGhost(-1); hint = null; syncPieces(); drawBoard(); storeResume(); live = 'Move taken back.'; speak(live); emit(); },
    hint() { if (hintBusy || mode !== 'cpu' || game.turn !== myColor || over || game.phase !== 'play') return; hintBusy = true; practice = true; emit(); ask('hint', m => { hintBusy = false; if (m && game.turn === myColor) { hint = m.i; live = m.i < 0 ? 'Hint: pass.' : 'Hint: ' + cname(m.i); speak(live); drawBoard(); if (m.i >= 0 && confirmOn()) setGhost(m.i); } emit(); }); },
    resign() { if (phase !== 'play' || over || mode === 'demo') return; if (mode === 'net') { NET.request({ k: 'resign' }); return; } const loser = mode === 'cpu' ? myColor : game.turn; finish(loser === 'w' ? '0-1' : '1-0', COLOR_WORD[loser] + ' resigned'); },
    cycleView() { prefs.view = VIEWS[(VIEWS.indexOf(prefs.view) + 1) % VIEWS.length]; savePrefs(); aimCamera(); emit(); },
    flip() { povColor = povColor === 'w' ? 'b' : 'w'; if (mode === 'local') { prefs.autoFlip = false; savePrefs(); } placeFoxes(); aimCamera(); emit(); },
    setPref(k, v) { prefs[k] = v; savePrefs(); if (k === 'sound') audio.setSound(v); if (k === 'music') { audio.unlock(); audio.setMusic(v); } if (k === 'theme' || k === 'coords' || k === 'terr') { terrAsk = ''; drawBoard(); } if (k === 'confirm' && !confirmOn()) setGhost(-1); if (k === 'speak' && v) speak('Speaking moves on.'); if (k === 'autoFlip' && v && mode === 'local') { povColor = game.turn; aimCamera(); } emit(); },
    // online
    netCreate: () => NET.create(), netJoin: code => NET.connect(code), netLeave: () => { NET.leave(); toMenu(); },
    netSit: c => NET.request({ k: 'sit', c }), netStand: () => NET.request({ k: 'stand' }), netQueue: () => NET.request({ k: 'queue' }), netStart: () => NET.request({ k: 'start' }), netClock: v => { prefs.tc = v; savePrefs(); NET.request({ k: 'tc', v }); }, netReact: w => NET.react(w),
    netShareURL() { if (!NET.room) return ''; try { const u = new URL(location.href); u.searchParams.delete('embed'); u.searchParams.delete('phone'); u.searchParams.set('room', NET.room); return u.href; } catch (e) { return ''; } },
    netCopied(v) { NET.copied = v; emit(); }, netOpenRoom() { if (NET.room && !(NET.state && NET.state.live)) { phase = 'room'; emit(); } },
    // demo/testing
    debug: { load(moves, n = N) { setSize(n); game = new Go({ N: n, moves }); syncPieces(); drawBoard(); emit(); if (game.phase === 'scoring') enterScoring(); else if (isCpuTurn()) cpuGo(); }, get game() { return game; }, cam: () => [camera.position.toArray().map(v => +v.toFixed(2)), camera.fov, Object.values(foxes).filter(f => f.visible).map(f => f.userData.id + '@' + f.position.toArray().map(v => +v.toFixed(2)))], tap, tryPlay, NET, get phase() { return phase; }, get ghost() { return ghost; }, screenOf(i) { const v = ptPos(i).project(camera), r = el.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; } },
    destroy() { alive = false; audio.setMusic(false); removeEventListener('message', onMsg); document.removeEventListener('visibilitychange', onVis); document.removeEventListener('pointerdown', unlockAll, true); document.removeEventListener('keydown', unlockAll, true); document.removeEventListener('click', uiClick, true); cancelAnimationFrame(raf); NET.leave(true); ro.disconnect(); removeEventListener('resize', resize); removeEventListener('keydown', onKey); try { worker && worker.terminate(); } catch (e) {} renderer.dispose(); renderer.domElement.remove(); },
  };
  const rm = /[?&]room=([A-Za-z0-9]{4})/.exec(location.search); if (rm) setTimeout(() => NET.connect(rm[1]), 300);
  else if (/[?&]demo=1/.test(location.search)) setTimeout(() => begin('demo'), 600);
  return api;
}
