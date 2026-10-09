// 8 GATES — TAVERN POOL. A walk-in tavern pool room you can drop into ANY world's tavern, plus the pool game itself.
// The 2D source is Luxor's tavern (luxorTownSquare): POOL TABLE, Dabb ("owns the pool table in the sense that nobody has ever
// managed to get on it while he is in the building"), Vesta behind the bar, Mell / Boge / Tib on the stools. Rules come from the
// 2D poolRack / poolResolve / poolAiShot: REDS are yours, BLUES are his, then the BLACK. Pot your colour and you keep the table.
// Black early, or a scratch on the black, and the frame is his. You name the stake (1–100g, or a friendly); he doubles down after
// every frame he loses. Fast balls rattle off the jaws (Dabb hits everything hard — that is his whole weakness).
//
// Two modes on one stage:
//   WALK  — the shared Game HUD drives Ben around the room (stick / WASD, TALK near someone, E). Talk to Dabb → "Rack them up."
//   PLAY  — the HUD steps aside (busy) and the page shows the pool controls:
//           drag on the table to aim · pull the CUE strip down and let go to shoot · SPIN disc · FINE AIM jog · VIEW toggle ·
//           ball in hand = drag the white · pinch to zoom.
//
//   buildPoolHall(ctx, { world })  → the interior at ctx.origin (Meru-style ctx: THREE, M, toon, canvasTex, scene, grad, addOutline)
//   createPoolHall({ container, onState, world }) → the stand-alone room + game, returns the Game HUD engine contract + pool API.
// Save: gold / xp / items through engine/save.js; stats <world>.pool.wins / .losses / .stake; flags <world>PoolWon, <world>PoolTable.
import * as THREE from '../../vendor/three/three.module.js';
import { rr, clamp, damp, pick } from '../../village-game.js';
import { canvasTex } from '../../engine/textures.js';
import { CAST } from '../../engine/cast.js';
import { save } from '../../engine/save.js';
import { createStage } from '../../engine/restaurant-kit.js';
import { tavernAudio } from './tavern-audio.js';

// ---------------- the taverns: one table, any world ----------------
// Luxor is canon (names + lines verbatim from the 2D world file). The other worlds use names from 8GATES_DESIGN_BRIEF_ALL.md
// with PLACEHOLDER pool lines (marked ph: true) until Ben writes their own.
const LUX_REG = [
  { name: 'MELL', role: 'Tavern', fur: '#e57a3c', furDark: '#b5542a', torso: ['#f6a97a', '#d9542a', '#6d1f0c'], lines: [['p', 'You ride?'], ['n', 'The track round the cone, when the ash is dry. The jump is fine. It is the landing that has opinions.']] },
  { name: 'BOGE', role: 'Tavern', fur: '#fbc98a', furDark: '#c99a5a', torso: ['#c76a68', '#8e2f2f', '#43120f'], lines: [['p', 'You work the pit?'], ['n', 'The door. Which is the pit, from where I stand. I have seen more of the queue than the sand.']] },
  { name: 'TIB', role: 'Tavern', fur: '#fb923c', furDark: '#c2410c', torso: ['#cfc6bd', '#8d8177', '#3a332c'], seat: true, lines: [['p', 'Anything worth ordering?'], ['n', 'The red stew. Everything else is the red stew with something else called it.']] }];
export const TAVERNS = {
  luxor: { key: 'luxor', world: 'Luxor', room: 'luxorTownSquare', place: 'Luxor · Tavern', title: "Dabb's Table", hall: 'THE TAVERN',
    wall: '#7a2c22', wallLow: '#3f1712', trim: '#d08a34', floor: '#6a3e26', floor2: '#55301d', felt: '#1d6b4c', rail: '#5a2614', shade: '#2f5a3a', glow: 0xffb27a, bg: '#1a0c08', art: 'volcano',
    shark: { name: 'DABB', role: 'Tavern', fur: '#fb923c', furDark: '#ea580c', torso: ['#f6a97a', '#d9542a', '#6d1f0c'], outfit: 'vest', mood: 'smug' },
    keeper: { name: 'VESTA', role: 'Barkeep', fur: '#fb923c', furDark: '#c2410c', torso: ['#c76a68', '#8e2f2f', '#43120f'], outfit: 'vest', greeting: 'Sit down. Whatever you have been walking through, sit down.', stock: [['erToGo', 'Bowl of Red Stew', 14], ['energyPod', 'Ash Cider', 12]] },
    regulars: LUX_REG, door: 'Out to Luxor Town Square.' },
  meru: { key: 'meru', world: 'Meru', room: 'meruTavern', place: 'Meru · Tavern', title: 'The Tavern Table', hall: 'MERU TAVERN',
    wall: '#b0602a', wallLow: '#5a2e14', trim: '#f2c94c', floor: '#7a4a2a', floor2: '#653b20', felt: '#2a6e9a', rail: '#4a2a14', shade: '#7a2a1a', glow: 0xffc27a, bg: '#140c06', art: 'crest',
    shark: { name: 'ZIGGY', role: 'Tavern', fur: '#c9682a', furDark: '#8a4213', torso: ['#3a6ea5', '#fbf8ec', '#22446e'], outfit: 'vest', mood: 'smug', ph: true },
    keeper: { name: 'BARKEEP', role: 'Tavern', fur: '#9a6f4a', furDark: '#6b4a2c', torso: ['#fbf8ec', '#c42d3c', '#5a1a1a'], outfit: 'vest', greeting: 'Pull up a stool.', stock: [['erToGo', 'ER to GO', 14], ['energyPod', 'Energy Fill Pod', 12]], ph: true },
    regulars: [{ name: 'DOC BRAUN', role: 'Tavern', fur: '#e6e4de', furDark: '#a8a6a0', torso: ['#5a646d', '#fbf8ec', '#2a2e33'], lines: [['n', 'Mind the table. The regulars take it very seriously.']], ph: true }], door: 'Out to the Town Square.' },
  gaya: { key: 'gaya', world: 'Gaya', room: 'gayaTavern', place: 'Gaya · Tavern', title: 'The Lantern Table', hall: 'GAYA TAVERN',
    wall: '#6a4a8a', wallLow: '#2e2040', trim: '#f2c94c', floor: '#6a4a2e', floor2: '#553a22', felt: '#7a2a5a', rail: '#3a2414', shade: '#3a2a5a', glow: 0xffd28a, bg: '#100a16', art: 'crest',
    shark: { name: 'VOLLEY', role: 'Tavern', fur: '#e8792e', furDark: '#a8501a', torso: ['#2f9a8f', '#fbf8ec', '#1f6a62'], outfit: 'vest', mood: 'happy', ph: true },
    keeper: { name: 'SORREL', role: 'Barkeep', fur: '#c9682a', furDark: '#8a4213', torso: ['#a78bfa', '#5b3a9a', '#2a1a4a'], outfit: 'vest', greeting: 'Sit. Rest your feet.', stock: [['erToGo', 'ER to GO', 14], ['energyPod', 'Energy Fill Pod', 12]], ph: true },
    regulars: [{ name: 'PIP', role: 'Tavern', fur: '#f0dcbe', furDark: '#c8b08a', torso: ['#f2c94c', '#201e1d', '#a8792e'], lines: [['n', 'Volley never loses at the ping-pong. The pool is another story.']], ph: true }], door: 'Out to the Town Square.' },
  kufa: { key: 'kufa', world: 'Kufa', room: 'kufaTavern', place: 'Kufa · Tavern', title: 'The Caravan Table', hall: 'KUFA TAVERN',
    wall: '#c08a4a', wallLow: '#6a4422', trim: '#2f9a8f', floor: '#8a6a4a', floor2: '#745638', felt: '#2a6a7a', rail: '#5a3a1a', shade: '#2f6a5a', glow: 0xffd09a, bg: '#140e08', art: 'crest',
    shark: { name: 'JIBRIL', role: 'Tavern', fur: '#d9a066', furDark: '#9a6a3a', torso: ['#fbf8ec', '#2f9a8f', '#1f5a52'], outfit: 'robe', mood: 'smug', ph: true },
    keeper: { name: 'NASRIN', role: 'Barkeep', fur: '#e8a060', furDark: '#a8642a', torso: ['#c42d3c', '#fbf8ec', '#5a1a1a'], outfit: 'vest', greeting: 'Mint tea is fresh.', stock: [['erToGo', 'Harira', 14], ['energyPod', 'Mint Tea', 12]], ph: true },
    regulars: [{ name: 'SURA', role: 'Tavern', fur: '#f0dcbe', furDark: '#c8b08a', torso: ['#3a6ea5', '#fbf8ec', '#22446e'], lines: [['n', 'Every caravan rumour arrives here first. The good ones arrive at that table.']], ph: true }], door: 'Out to the Town Square.' },
  nebo: { key: 'nebo', world: 'Nebo', room: 'neboTavern', place: 'Nebo · Tavern', title: 'The Green Table', hall: 'NEBO TAVERN',
    wall: '#3f6a4a', wallLow: '#1f3a28', trim: '#e6b45a', floor: '#6a4a2e', floor2: '#553a22', felt: '#8a3a2a', rail: '#3a2414', shade: '#2a4a2a', glow: 0xffd8a0, bg: '#0a120c', art: 'crest',
    shark: { name: 'BARLEY', role: 'Taverner', fur: '#c9a06a', furDark: '#8a6a3a', torso: ['#5a7a3a', '#fbf8ec', '#2a3a1a'], outfit: 'vest', mood: 'happy', ph: true },
    keeper: { name: 'JUNIPER', role: 'Barkeep', fur: '#e8792e', furDark: '#a8501a', torso: ['#2a4a2a', '#e6b45a', '#1a2a1a'], outfit: 'vest', greeting: 'Stew, cordial or honeycake?', stock: [['erToGo', 'Stew', 14], ['energyPod', 'Cordial', 12]], ph: true },
    regulars: [{ name: 'LINDEN', role: 'Hero', fur: '#9a6f4a', furDark: '#6b4a2c', torso: ['#3a5a2a', '#e6dcc0', '#1a2a12'], lines: [['n', 'I track things for a living. That cue ball I cannot track at all.']], ph: true }], door: 'Out to Nebo Town Square.' },
  zion: { key: 'zion', world: 'Zion', room: 'zionTavern', place: 'Zion · Tavern', title: 'The Crest Table', hall: 'ZION TAVERN',
    wall: '#8a2a2a', wallLow: '#3a1212', trim: '#f2c94c', floor: '#6a4a2e', floor2: '#553a22', felt: '#1f4a8a', rail: '#3a2414', shade: '#2a2a2a', glow: 0xffc88a, bg: '#120808', art: 'crest',
    shark: { name: 'ZORAN', role: 'Hero', fur: '#3a3836', furDark: '#1a1918', torso: ['#f2c94c', '#201e1d', '#a8792e'], outfit: 'vest', mood: 'determined', ph: true },
    keeper: { name: 'ODESSA', role: 'Barkeep', fur: '#e6e4de', furDark: '#a8a6a0', torso: ['#c42d3c', '#f2c94c', '#5a1a1a'], outfit: 'vest', greeting: 'Sit. The crest runner is for walking on.', stock: [['erToGo', 'ER to GO', 14], ['energyPod', 'Energy Fill Pod', 12]], ph: true },
    regulars: [], door: 'Out to Zion Town Square.' },
};

// ---------------- table geometry (table units: across 0..1, along 0..2, like the 2D build) ----------------
export const POOL = { S: 1.7, Y: 1.05, R: 0.032, PC: 0.064, PM: 0.058, RAIL: 0.2, VMAX: 4.7, MU: 1.0, K: 0.45, CUSH: 0.76, RATTLE: 1.55, BET_MAX: 100 };
const POCKETS = [[0, 0, 'c'], [1, 0, 'c'], [0, 1, 'm'], [1, 1, 'm'], [0, 2, 'c'], [1, 2, 'c']];
const COL = { red: '#e0442a', blue: '#2f6fd8', black: '#17161a', cue: '#f6f3ee' };

// ---------------- the interior ----------------
export function buildPoolHall(ctx, { world = 'luxor', table = true, rule = null } = {}) {   // table:false = the room without the pool table (other tavern games stand their own table at T0); rule = poster lines for non-Luxor worlds
  const TV = TAVERNS[world] || TAVERNS.luxor;
  const { THREE: T3, M, toon, scene, origin = { x: 0, z: 0 } } = ctx, CT = ctx.canvasTex || canvasTex;
  const root = new T3.Group(); root.position.set(origin.x, 0, origin.z); scene.add(root);
  const W = 14, D = 12, H = 4.4, V = (x = 0, y = 0, z = 0) => new T3.Vector3(x, y, z);
  const { S, Y, R } = POOL, T0 = V(-1.4, 0, -0.3), OW = S + 2 * POOL.RAIL * S / 1.7 * 0.9, OL = 2 * S + 2 * POOL.RAIL * S / 1.7 * 0.9;
  const colliders = [], box = (x0, z0, x1, z1) => colliders.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) });
  const tmat = (tex) => new T3.MeshToonMaterial({ map: tex, gradientMap: ctx.grad });
  // floor: wide planks
  const floorT = CT(256, 256, c => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? TV.floor : TV.floor2; c.fillRect(0, i * 32, 256, 32); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, i * 32, 256, 2); for (let k = 0; k < 2; k++) { const x = ((i * 97 + k * 131) % 256); c.fillRect(x, i * 32, 2, 32); } c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(0, i * 32 + 8, 256, 3); } });
  floorT.wrapS = floorT.wrapT = T3.RepeatWrapping; floorT.repeat.set(W / 4, D / 4);
  const fl = new T3.Mesh(new T3.PlaneGeometry(W, D + 2), tmat(floorT)); fl.rotation.x = -Math.PI / 2; fl.position.z = 1; fl.receiveShadow = true; root.add(fl);
  // walls: upper colour, wainscot panels, a trim rail
  const wallT = CT(256, 256, c => { c.fillStyle = TV.wall; c.fillRect(0, 0, 256, 256); c.fillStyle = 'rgba(0,0,0,0.08)'; for (let x = 0; x < 256; x += 16) c.fillRect(x, 0, 6, 150); c.fillStyle = TV.wallLow; c.fillRect(0, 150, 256, 106); c.fillStyle = 'rgba(255,255,255,0.07)'; for (let x = 8; x < 256; x += 64) c.fillRect(x, 166, 48, 74); c.fillStyle = TV.trim; c.fillRect(0, 144, 256, 8); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, 250, 256, 6); });
  wallT.wrapS = T3.RepeatWrapping; const wallM = tmat(wallT);
  const wall = (x, z, w, ry, h = H) => { const t = wallT.clone(); t.needsUpdate = true; t.repeat.set(w / 3.2, h / H); const m = new T3.Mesh(new T3.PlaneGeometry(w, h), tmat(t)); m.position.set(x, h / 2, z); m.rotation.y = ry; root.add(m); return m; };
  wall(0, -D / 2, W, 0); wall(-W / 2, 0, D, Math.PI / 2); wall(W / 2, 0, D, -Math.PI / 2);
  // the front: a low wainscot either side of the door (the camera looks over it, like a dollhouse)
  for (const s of [-1, 1]) { M(new T3.BoxGeometry(W / 2 - 1.3, 1.0, 0.18), toon(TV.wallLow), s * (W / 4 + 0.65), 0.5, D / 2, root, 0.02); M(new T3.BoxGeometry(W / 2 - 1.3, 0.08, 0.26), toon(TV.trim), s * (W / 4 + 0.65), 1.02, D / 2, root, 0.01); }
  for (const s of [-1, 1]) { M(new T3.BoxGeometry(0.26, 1.3, 0.3), toon(TV.trim), s * 1.3, 0.65, D / 2, root, 0.02); M(new T3.SphereGeometry(0.14, 10, 8), toon(TV.trim), s * 1.3, 1.38, D / 2, root, 0.01, 0.14); }
  { const mat = toon('#2a1a12'); const th = new T3.Mesh(new T3.BoxGeometry(2.4, 0.04, 0.6), mat); th.position.set(0, 0.02, D / 2 + 0.1); root.add(th); }
  box(-W / 2, -D / 2 - 1, W / 2, -D / 2 + 0.35); box(-W / 2 - 1, -D / 2, -W / 2 + 0.35, D / 2); box(W / 2 - 0.35, -D / 2, W / 2 + 1, D / 2); box(-W / 2, D / 2 - 0.2, -1.2, D / 2 + 1); box(1.2, D / 2 - 0.2, W / 2, D / 2 + 1);
  // ---- THE TABLE ----
  const wood = toon(TV.rail), woodD = toon('#2a140a'), brass = toon('#d9a441');
  if (table) {
  const tbl = new T3.Group(); tbl.position.copy(T0); root.add(tbl);
  const railW = (OW - S) / 2, felt = TV.felt;
  const feltT = CT(256, 512, c => { c.fillStyle = felt; c.fillRect(0, 0, 256, 512); { const lg = c.createRadialGradient(128, 256, 30, 128, 256, 300); lg.addColorStop(0, 'rgba(255,240,200,0.16)'); lg.addColorStop(0.6, 'rgba(255,240,200,0.04)'); lg.addColorStop(1, 'rgba(0,0,0,0.22)'); c.fillStyle = lg; c.fillRect(0, 0, 256, 512); } for (let i = 0; i < 2600; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'; c.fillRect(Math.random() * 256, Math.random() * 512, 2, 2); } c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 512 * 0.8); c.lineTo(256, 512 * 0.8); c.stroke(); c.beginPath(); c.arc(128, 512 * 0.8, 256 * 0.17, 0, Math.PI); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.4)'; for (const v of [0.28, 0.5, 0.75]) { c.beginPath(); c.arc(128, 512 * v, 3, 0, 7); c.fill(); } });
  const bed = new T3.Mesh(new T3.PlaneGeometry(S, 2 * S), tmat(feltT)); bed.rotation.x = -Math.PI / 2; bed.position.y = Y; bed.receiveShadow = true; tbl.add(bed);
  M(new T3.BoxGeometry(OW - 0.06, 0.34, OL - 0.06), woodD, 0, Y - 0.2, 0, tbl, 0.025);
  M(new T3.BoxGeometry(OW * 0.8, 0.42, OL * 0.84), wood, 0, Y - 0.55, 0, tbl, 0.02);
  for (const sx of [-1, 1]) for (const sz of [-1, 0, 1]) { const leg = M(new T3.BoxGeometry(0.24, Y - 0.32, 0.24), wood, sx * (OW / 2 - 0.25), (Y - 0.32) / 2, sz * (OL / 2 - 0.3), tbl, 0.02); leg.scale.x = sz ? 1 : 0.8; M(new T3.BoxGeometry(0.34, 0.1, 0.34), woodD, sx * (OW / 2 - 0.25), 0.05, sz * (OL / 2 - 0.3), tbl, 0.01); }
  // rails in segments between the pockets + felt cushions on their inner edge
  const cushM = toon(new T3.Color(felt).multiplyScalar(0.8).getStyle()), diamond = toon('#f6f0dc');
  const seg = (x0, z0, x1, z1, nx, nz) => { const len = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ry = Math.abs(nx) > 0 ? 0 : Math.PI / 2;
    M(ry ? new T3.BoxGeometry(len, 0.13, railW) : new T3.BoxGeometry(railW, 0.13, len), wood, cx + nx * railW / 2, Y + 0.03, cz + nz * railW / 2, tbl, 0.018);
    const c = new T3.Mesh(ry ? new T3.BoxGeometry(len - 0.04, 0.07, 0.05) : new T3.BoxGeometry(0.05, 0.07, len - 0.04), cushM); c.position.set(cx + nx * 0.025, Y + 0.035, cz + nz * 0.025); tbl.add(c);
    for (const k of [0.25, 0.5, 0.75]) { const d = new T3.Mesh(new T3.CircleGeometry(0.018, 8), diamond); d.rotation.x = -Math.PI / 2; d.position.set(x0 + (x1 - x0) * k + nx * railW * 0.55, Y + 0.098, z0 + (z1 - z0) * k + nz * railW * 0.55); tbl.add(d); } };
  const hx = S / 2, hz = S, pc = POOL.PC * S * 1.25, pm = POOL.PM * S * 1.1;
  seg(-hx, -hz + pc, -hx, -pm, -1, 0); seg(-hx, pm, -hx, hz - pc, -1, 0); seg(hx, -hz + pc, hx, -pm, 1, 0); seg(hx, pm, hx, hz - pc, 1, 0);
  seg(-hx + pc, -hz, hx - pc, -hz, 0, -1); seg(-hx + pc, hz, hx - pc, hz, 0, 1);
  // corner blocks + pocket cups
  const black = new T3.MeshBasicMaterial({ color: 0x050505 }), cup = toon('#2a2522');
  for (const [u, v, k] of POCKETS) { const x = (u - 0.5) * S, z = (v - 1) * S, rad = (k === 'c' ? POOL.PC : POOL.PM) * S * 1.08;
    const hole = new T3.Mesh(new T3.CircleGeometry(rad, 20), black); hole.rotation.x = -Math.PI / 2; hole.position.set(x, Y + 0.004, z); tbl.add(hole);
    const ox = Math.sign(u - 0.5) * railW * 0.35, oz = k === 'c' ? Math.sign(v - 1) * railW * 0.35 : 0;
    M(new T3.CylinderGeometry(rad * 1.25, rad * 1.1, 0.13, 16), cup, x + ox, Y + 0.03, z + oz, tbl, 0.015, rad * 1.25);
    const ring = new T3.Mesh(new T3.CircleGeometry(rad * 1.02, 20), black); ring.rotation.x = -Math.PI / 2; ring.position.set(x + ox * 0.6, Y + 0.098, z + oz * 0.6); tbl.add(ring);
    M(new T3.CylinderGeometry(rad * 0.75, rad * 0.5, 0.26, 12), cup, x + ox, Y - 0.17, z + oz, tbl, 0.01, rad * 0.75); }
  box(T0.x - OW / 2 - 0.05, T0.z - OL / 2 - 0.05, T0.x + OW / 2 + 0.05, T0.z + OL / 2 + 0.05);
  }
  // the long lamp over the table
  const lamps = [], lampG = new T3.Group(); root.add(lampG); { const shade = M(new T3.BoxGeometry(0.62, 0.26, 2.5), toon(TV.shade), T0.x, 2.95, T0.z, lampG, 0.025); M(new T3.BoxGeometry(0.66, 0.05, 2.56), brass, T0.x, 2.83, T0.z, lampG, 0.01);
    const under = new T3.Mesh(new T3.PlaneGeometry(0.5, 2.36), new T3.MeshBasicMaterial({ color: 0xfff2cc })); under.rotation.x = Math.PI / 2; under.position.set(T0.x, 2.815, T0.z); lampG.add(under);
    for (const s of [-1, 1]) M(new T3.CylinderGeometry(0.015, 0.015, 1.4, 4), toon('#201e1d'), T0.x, 3.8, T0.z + s * 0.9, lampG, 0);
    lamps.push(shade); }
  // ---- THE BAR (east side) ----
  const BX = 4.2; M(new T3.BoxGeometry(0.9, 1.15, 6.4), wood, BX, 0.575, -1.6, root, 0.025); M(new T3.BoxGeometry(1.1, 0.1, 6.6), toon(TV.trim), BX, 1.2, -1.6, root, 0.015);
  for (let z = -4.4; z <= 1.2; z += 0.8) M(new T3.BoxGeometry(0.04, 0.9, 0.06), woodD, BX - 0.46, 0.55, z, root, 0);
  M(new T3.BoxGeometry(0.06, 0.08, 6.3), brass, BX - 0.62, 0.18, -1.6, root, 0.006);
  for (const z of [-3.1, -2.6]) { M(new T3.CylinderGeometry(0.04, 0.05, 0.36, 8), brass, BX, 1.43, z, root, 0.008, 0.05); M(new T3.BoxGeometry(0.05, 0.16, 0.05), toon('#201e1d'), BX, 1.66, z, root, 0.006); }
  box(BX - 0.5, -4.85, BX + 0.5, 1.65);
  // back shelf with bottles
  M(new T3.BoxGeometry(0.5, 2.6, 6.0), woodD, 6.72, 1.3, -1.6, root, 0.02); const bcol = ['#6fbf3a', '#c42d3c', '#e6b45a', '#5cc6c0', '#8a5a32', '#f6f3ee', '#7a2a5a'];
  for (const y of [1.25, 1.95, 2.6]) { M(new T3.BoxGeometry(0.62, 0.06, 6.0), wood, 6.62, y - 0.18, -1.6, root, 0.008); for (let z = -4.3; z < 1.2; z += rr(0.22, 0.38)) { const h = rr(0.24, 0.4); M(new T3.CylinderGeometry(0.055, 0.065, h, 8), toon(pick(bcol)), 6.55, y - 0.15 + h / 2, z, root, 0.008, 0.065); } }
  box(6.3, -4.7, 7.2, 1.5);
  // stools along the bar
  const stools = []; for (const z of [-4.0, -2.8, -1.6, -0.4, 0.8]) { M(new T3.CylinderGeometry(0.28, 0.25, 0.1, 14), toon(TV.wallLow), BX - 1.05, 0.92, z, root, 0.012, 0.28); M(new T3.CylinderGeometry(0.05, 0.07, 0.88, 8), brass, BX - 1.05, 0.44, z, root, 0.008, 0.07); stools.push(V(BX - 1.05, 0.97, z)); }
  // booth in the north-west corner + barrels + cue rack
  { M(new T3.BoxGeometry(2.6, 0.55, 0.8), toon(TV.wallLow), -5.4, 0.28, -5.3, root, 0.02); M(new T3.BoxGeometry(2.6, 1.1, 0.2), toon(TV.wallLow), -5.4, 0.85, -5.65, root, 0.02); M(new T3.BoxGeometry(1.4, 0.08, 0.9), wood, -5.4, 0.95, -4.4, root, 0.015); M(new T3.CylinderGeometry(0.08, 0.1, 0.9, 8), wood, -5.4, 0.47, -4.4, root, 0.01); M(new T3.BoxGeometry(2.6, 0.55, 0.8), toon(TV.wallLow), -5.4, 0.28, -3.5, root, 0.02); box(-6.8, -5.9, -4.0, -3.05); }
  for (const [x, z] of [[-6.2, 4.6], [-5.4, 5.0], [-6.25, 3.75]]) { M(new T3.CylinderGeometry(0.45, 0.4, 1.0, 14), wood, x, 0.5, z, root, 0.02, 0.45); for (const y of [0.18, 0.82]) M(new T3.CylinderGeometry(0.47, 0.47, 0.06, 14), toon('#3a3836'), x, y, z, root, 0, 0.47); box(x - 0.45, z - 0.45, x + 0.45, z + 0.45); }
  { M(new T3.BoxGeometry(0.1, 1.9, 1.6), woodD, -6.92, 1.6, 0.6, root, 0.015); for (let i = 0; i < 5; i++) { const c = M(new T3.CylinderGeometry(0.016, 0.03, 1.75, 6), toon(i % 2 ? '#e6b45a' : '#c9a24a'), -6.82, 1.5, 0.05 + i * 0.27, root, 0.006, 0.03); c.rotation.x = 0.04; } M(new T3.BoxGeometry(0.2, 0.08, 1.6), wood, -6.82, 0.7, 0.6, root, 0.01); }
  // north wall: chalk board (redrawn by the game) + the world's picture + sconces
  const chalkCv = document.createElement('canvas'); chalkCv.width = 512; chalkCv.height = 256; const chalkT = new T3.CanvasTexture(chalkCv); chalkT.colorSpace = T3.SRGBColorSpace;
  { const b = new T3.Mesh(new T3.PlaneGeometry(2.6, 1.3), new T3.MeshBasicMaterial({ map: chalkT })); b.position.set(T0.x, 2.45, -D / 2 + 0.06); root.add(b); M(new T3.BoxGeometry(2.8, 1.5, 0.08), wood, T0.x, 2.45, -D / 2 + 0.02, root, 0.01); }
  const artT = CT(256, 192, c => { const g = c.createLinearGradient(0, 0, 0, 192); g.addColorStop(0, '#3a1a2a'); g.addColorStop(1, '#e8792e'); c.fillStyle = g; c.fillRect(0, 0, 256, 192);
    if (TV.art === 'volcano') { c.fillStyle = '#2a1410'; c.beginPath(); c.moveTo(0, 192); c.lineTo(90, 70); c.lineTo(160, 70); c.lineTo(256, 192); c.fill(); c.fillStyle = '#ffb02a'; c.beginPath(); c.moveTo(100, 70); c.lineTo(150, 70); c.lineTo(128, 30); c.fill(); c.fillStyle = '#ec3013'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(110 + i * 7, 60 - i * 6, 6 - i * 0.6, 0, 7); c.fill(); } c.strokeStyle = '#ff6a2a'; c.lineWidth = 6; c.beginPath(); c.moveTo(122, 72); c.lineTo(104, 120); c.lineTo(112, 190); c.stroke(); }
    else { c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.arc(128, 96, 62, 0, 7); c.fill(); c.fillStyle = '#ffd23a'; c.font = '900 92px Archivo, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('8', 128, 100); } });
  { const a = new T3.Mesh(new T3.PlaneGeometry(1.6, 1.2), new T3.MeshBasicMaterial({ map: artT })); a.position.set(3.4, 2.5, -D / 2 + 0.06); root.add(a); M(new T3.BoxGeometry(1.78, 1.38, 0.08), toon(TV.trim), 3.4, 2.5, -D / 2 + 0.02, root, 0.01); }
  // posters (Luxor's are lines from the 2D tavern: the gate rule and the pit; other worlds get the house rule)
  const poster = (lines, bg, fg, x, z, ry, w = 1.1, h = 1.5) => { const t = CT(256, 352, c => { c.fillStyle = bg; c.fillRect(0, 0, 256, 352); c.strokeStyle = fg; c.lineWidth = 8; c.strokeRect(12, 12, 232, 328); c.fillStyle = fg; c.textAlign = 'center'; lines.forEach(([txt, sz, y]) => { c.font = '900 ' + sz + 'px Archivo, Arial'; c.fillText(txt, 128, y); }); for (let i = 0; i < 400; i++) { c.fillStyle = 'rgba(0,0,0,0.05)'; c.fillRect(Math.random() * 256, Math.random() * 352, 2, 2); } });
    const m = new T3.Mesh(new T3.PlaneGeometry(w, h), tmat(t)); m.position.set(x, 2.35, z); m.rotation.y = ry; root.add(m); };
  if (TV.key === 'luxor') { poster([['GLOVES', 52, 90], ['ON', 52, 150], ['WEAPONS', 40, 220], ['PAST THE', 30, 262], ['GATE', 40, 304]], '#f1e3c4', '#7a2c22', -W / 2 + 0.03, -3.4, Math.PI / 2); poster([['IRON', 58, 92], ['BELT', 58, 152], ['FIGHT NIGHT', 26, 214], ['AT THE PIT', 26, 252], ['☆ ☆ ☆', 30, 304]], '#1d1a18', '#e6b45a', -W / 2 + 0.03, 3.0, Math.PI / 2); }
  else { poster(rule || [['EIGHT', 52, 100], ['BALL', 52, 160], ['WINNER', 30, 230], ['STAYS ON', 30, 270]], '#f1e3c4', TV.wall, -W / 2 + 0.03, -3.4, Math.PI / 2); }
  const sconces = []; for (const [x, z, ry] of [[-W / 2 + 0.08, -2.5, Math.PI / 2], [-W / 2 + 0.08, 2.8, Math.PI / 2], [-4.6, -D / 2 + 0.08, 0], [0.9, -D / 2 + 0.08, 0]]) { const s = M(new T3.BoxGeometry(0.22, 0.34, 0.22), brass, x, 2.7, z, root, 0.01); s.rotation.y = ry; sconces.push(V(x + (ry ? 0.2 : 0), 2.8, z + (ry ? 0 : 0.2))); }
  // tray at the foot of the table for potted balls
  if (table) M(new T3.BoxGeometry(OW * 0.86, 0.06, 0.16), woodD, T0.x, 0.62, T0.z + OL / 2 + 0.02, root, 0.008);
  const spots = { shark: V(T0.x - 1.45, 0, T0.z - OL / 2 - 0.25), keeper: V(5.3, 0, -1.5), door: V(0, 0, D / 2 - 0.6), enter: V(0, 0, D / 2 - 1.4), youWait: V(T0.x + OW / 2 + 0.85, 0, T0.z + OL / 2 + 0.2), himWait: V(T0.x - OW / 2 - 0.85, 0, T0.z - OL / 2 - 0.2), barFront: V(BX - 1.1, 0, -1.6), stools, sconces };
  return { root, lampG, TV, T0, S, Y, R, OW, OL, W, D, H, colliders, spots, lamps, chalkCv, chalkT, toWorld: (u, v, y = Y) => V(T0.x + (u - 0.5) * S + origin.x, y, T0.z + (v - 1) * S + origin.z) };
}

// ---------------- the stand-alone room + the game ----------------
export async function createPoolHall({ container, onState = () => {}, world = 'luxor', startIn = 'intro', onExit = null }) {
  const TV = TAVERNS[world] || TAVERNS.luxor, WK = TV.key, SK = { wins: WK + '.pool.wins', losses: WK + '.pool.losses', stake: WK + '.pool.stake', best: WK + '.pool.bestRun' }, FL = { won: WK + 'PoolWon', table: WK + 'PoolTable', told: WK + 'PoolLevelTold' };
  const ST = createStage(container, { bg: TV.bg, keep: true }), { CW, CHh, renderer, scene, camera, V3, toon, M, kit, audio, tone, puff, smokeS, sun, glowTex, touch, addOutline, grad } = ST;
  camera.far = 90; camera.updateProjectionMatrix();
  scene.children.filter(o => o.isHemisphereLight).forEach(h => { h.color.set(0xffe2c8); h.groundColor.set(0x5a2a1a); h.intensity = 1.05; });
  sun.position.set(-4, 10, 7); sun.intensity = 1.0; sun.color.set(0xffe0c0); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, far: 40 }); sun.shadow.camera.updateProjectionMatrix();
  const HALL = buildPoolHall({ THREE, M, toon, canvasTex, scene, grad, addOutline }, { world: WK });
  const { T0, S: SC, Y, R, OW, OL, spots } = HALL;
  { const pl = new THREE.PointLight(0xfff0d0, touch ? 9 : 12, 7, 1.6); pl.position.set(T0.x, 2.6, T0.z); scene.add(pl); }
  const glow = (p, s, col = TV.glow, op = 0.55) => { const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); g.position.copy(p); g.scale.setScalar(s); scene.add(g); return g; };
  spots.sconces.forEach(p => glow(p, 1.3)); for (let i = 0; i < 3; i++) glow(V3(T0.x, 2.72, T0.z - 0.9 + i * 0.9), 1.5, 0xfff2cc, 0.35);
  // the shared Ambience starts an outdoor wind loop; indoors it is just a whisper
  const TA = tavernAudio(audio, { world: WK }); const ainit = () => { try { TA.ensure(); } catch (e) {} };
  const W2T = (x, z) => ({ u: (x - T0.x) / SC + 0.5, v: (z - T0.z) / SC + 1 }), T2W = (u, v, y = Y) => V3(T0.x + (u - 0.5) * SC, y, T0.z + (v - 1) * SC);

  // ---------- cast ----------
  const strip = f => { const P = f.userData.P; if (P.sword) P.sword.visible = false; if (P.gun) P.gun.visible = false; return f; };
  const npcFox = (c, outfit = 'vest', mood = 'neutral') => strip(kit.makeFox({ ...CAST.player, look: { ...CAST.player.look, fur: c.fur, furDark: c.furDark || c.fur }, torso: c.torso, outfit: c.outfit || outfit, crest: '', gear: 'none', mood: c.mood || mood }));
  const ben = strip(kit.makeFox({ ...CAST.player, gear: 'none' }));
  const shark = npcFox(TV.shark, 'vest', TV.shark.mood || 'smug'), keeper = npcFox(TV.keeper, 'vest', 'warm');
  const regs = TV.regulars.map((r, i) => { const f = npcFox(r, 'coat', 'neutral'); const st = r.seat ? spots.stools[4] : spots.stools[i === 0 ? 0 : 2]; f.position.set(st.x - (r.seat ? 0 : 0.55), r.seat ? 0.62 : 0, st.z); f.rotation.y = Math.PI / 2; return { f, r, seat: !!r.seat }; });
  keeper.position.copy(spots.keeper); keeper.rotation.y = -Math.PI / 2;
  let foxBlobs = []; const _sh = V3();
  // cues: one for whoever is at the table, one Dabb holds while he waits
  const mkCue = () => { const g = new THREE.Group(), L = 1.75; const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, L, 8).rotateX(Math.PI / 2), toon('#e6c27a')); shaft.position.z = -L / 2; addOutline(shaft, 0.006, 0.02); g.add(shaft);
    const butt = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.034, 0.6, 8).rotateX(Math.PI / 2), toon('#3a1a0e')); butt.position.z = -L + 0.3; g.add(butt); const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.03, 8).rotateX(Math.PI / 2), toon('#3a7ad8')); tip.position.z = -0.015; g.add(tip);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.03, 8).rotateX(Math.PI / 2), toon('#f6f3ee')); ring.position.z = -L + 0.62; g.add(ring); scene.add(g); return g; };
  const cue = mkCue(), sharkCue = mkCue();
  // ---------- balls ----------
  const ballTex = (col, mark) => canvasTex(128, 64, c => { c.fillStyle = col; c.fillRect(0, 0, 128, 64); if (mark === 'eight') { for (const x of [32, 96]) { c.fillStyle = '#f6f3ee'; c.beginPath(); c.arc(x, 32, 15, 0, 7); c.fill(); c.fillStyle = '#17161a'; c.font = '900 22px Archivo, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('8', x, 33); } } else if (mark === 'cue') { c.fillStyle = '#ec3013'; for (const x of [32, 96]) { c.beginPath(); c.arc(x, 32, 5, 0, 7); c.fill(); } } else { c.fillStyle = 'rgba(255,255,255,0.85)'; for (const x of [32, 96]) { c.beginPath(); c.arc(x, 32, 7, 0, 7); c.fill(); } } });
  const ballMat = { red: new THREE.MeshToonMaterial({ map: ballTex(COL.red), gradientMap: grad }), blue: new THREE.MeshToonMaterial({ map: ballTex(COL.blue), gradientMap: grad }), black: new THREE.MeshToonMaterial({ map: ballTex(COL.black, 'eight'), gradientMap: grad }), cue: new THREE.MeshToonMaterial({ map: ballTex(COL.cue, 'cue'), gradientMap: grad }) };
  const BR = R * SC, ballGeo = new THREE.SphereGeometry(BR, 18, 12), shadowGeo = new THREE.CircleGeometry(BR * 1.15, 14), shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });
  const balls = []; const mkBall = kind => { const m = new THREE.Mesh(ballGeo, ballMat[kind]); addOutline(m, 0.006, BR); scene.add(m); const sh = new THREE.Mesh(shadowGeo, shadowMat); sh.rotation.x = -Math.PI / 2; scene.add(sh); return { kind, mine: kind === 'red', cue: kind === 'cue', black: kind === 'black', x: 0, y: 0, vx: 0, vy: 0, in: false, m, sh, drop: 0, pk: null, tray: -1 }; };
  balls.push(mkBall('cue')); for (let i = 0; i < 7; i++) balls.push(mkBall('red')); for (let i = 0; i < 7; i++) balls.push(mkBall('blue')); balls.push(mkBall('black'));
  const CB = balls[0];
  // ---------- aim guides ----------
  const ovl = (geo, col, op = 1) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthTest: false, depthWrite: false })); m.renderOrder = 40; m.visible = false; scene.add(m); return m; };
  const ribbon = (col, op, w) => { const m = ovl(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0), col, op); m.userData.w = w; return m; };
  const aimL = ribbon(0xffffff, 0.75, 0.012 * SC), objL = ribbon(0xffd23a, 0.85, 0.014 * SC), cueL = ribbon(0xffffff, 0.35, 0.008 * SC);
  const ghost = ovl(new THREE.RingGeometry(BR * 0.82, BR * 1.02, 24).rotateX(-Math.PI / 2), 0xffffff, 0.9);
  // POLISH: the pocket your shot is lined up for glows; a buzz on phones that have one
  const pocketRing = ovl(new THREE.RingGeometry(POOL.PC * SC * 1.15, POOL.PC * SC * 1.6, 28).rotateX(-Math.PI / 2), 0x22c55e, 0.85);
  // ---------- POLISH: contact shadows, ball shine, dust in the lamp light, a little haze ----------
  const blobTex = canvasTex(64, 64, c => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.6, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  const blob = (w, d, op = 1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: op, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.renderOrder = 1; scene.add(m); return m; };
  { const tb = blob(OW * 1.45, OL * 1.25, 0.8); tb.position.set(T0.x, 0.011, T0.z); }
  const shine = balls.map(() => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false, depthTest: true })); sp.scale.setScalar(BR * 1.1); scene.add(sp); return sp; });
  const motes = (() => { const n = touch ? 24 : 40, g = new THREE.BufferGeometry(), a = new Float32Array(n * 3), base = []; for (let i = 0; i < n; i++) { base.push([T0.x + rr(-1.2, 1.2), rr(1.3, 2.7), T0.z + rr(-1.9, 1.9), rr(0, 6)]); } g.setAttribute('position', new THREE.BufferAttribute(a, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color: 0xffe6b0, size: 0.06, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(p); return { p, a, base, g }; })();
  const haze = [0, 1, 2].map(i => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: TV.glow, transparent: true, opacity: 0.07, depthWrite: false })); sp.scale.set(7, 2.6, 1); sp.position.set(-3 + i * 3.4, 3.7, -2 + i * 1.5); scene.add(sp); return sp; });
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  // POLISH: the shooting fox turns see-through in the top-down view so he never hides the table
  const ghostMats = new Map(); const ghostify = f => { if (ghostMats.has(f)) return ghostMats.get(f); const list = []; f.traverse(o => { if (!o.isMesh || !o.material) return; const one = m => { const c = m.clone(); c.transparent = true; list.push(c); return c; }; o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material); }); ghostMats.set(f, list); return list; };
  const fadeFox = (f, target, dt) => { const L = ghostify(f), cur = f.userData.fade ?? 1, v = cur + (target - cur) * Math.min(1, dt * 8); f.userData.fade = v; for (const m of L) { const base = m.userData.op0 ?? (m.userData.op0 = m.opacity); m.opacity = base * v; m.depthWrite = v > 0.95; } };
  const handRing = ovl(new THREE.RingGeometry(BR * 1.6, BR * 2.1, 28).rotateX(-Math.PI / 2), 0xffd23a, 0.9);
  const putRib = (m, x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0); if (L < 1e-4) { m.visible = false; return; } m.visible = true; m.position.set(x0, Y + 0.006, z0); m.rotation.set(0, -Math.atan2(z1 - z0, x1 - x0), 0); m.scale.set(L, 1, m.userData.w / 1); m.scale.z = m.userData.w; };

  // ---------- state ----------
  const S0 = () => ({ mode: 'intro', ph: 'idle', t: 0, turn: 'you', inHand: false, aim: -Math.PI / 2, power: 0, pulling: false, spin: { x: 0, y: 0 }, view: 'table', zoom: 1, flash: null, flashT: 0, call: '', callT: 0, stake: 0, done: null, potted: [], firstHit: null, cushAfter: false, shotBy: 'you', brk: true, shots: 0, ai: null, demo: false, demoT: 0, overT: 0, strikeT: 0, dlg: null, toast: null, toastT: 0, near: null, run: 0 });
  let HIDDEN = false; let S = S0(), PAUSE = false, hudPad = false; const stick = { x: 0, y: 0 }, keys = new Set();
  const PL = { x: spots.enter.x, z: spots.enter.z, yaw: Math.PI, mv: 0, hop: 0 }, SH = { x: spots.shark.x, z: spots.shark.z, yaw: 0, mv: 0, tx: spots.shark.x, tz: spots.shark.z };
  const flash = (txt, col = '#ffd23a', t = 1.4) => { S.flash = { txt, col }; S.flashT = t; }, call = (txt, t = 2.6) => { S.call = txt; S.callT = t; }, toast = (txt, t = 3) => { S.toast = txt; S.toastT = t; };
  const sharkName = TV.shark.name, sharkCap = sharkName.charAt(0) + sharkName.slice(1).toLowerCase();
  const hiNote = (f, d = 0.08, v = 0.05, type = 'triangle') => tone(f, d, v, type);

  // ---------- physics (table units, seconds) ----------
  function rack() { const rowGap = 2 * R * 0.868, apex = 0.56; let n = 0, red = 0, blue = 0; CB.x = 0.5; CB.y = 1.6; CB.vx = CB.vy = 0;
    const order = balls.slice(1, 15), reds = order.filter(b => b.mine), blues = order.filter(b => !b.mine); const blackB = balls[15];
    for (let row = 0; row < 5; row++) for (let i = 0; i <= row; i++) { const x = 0.5 + (i - row / 2) * 2 * R * 1.002 + rr(-1, 1) * 1e-4, y = apex - row * rowGap; let b;
      if (n === 4) b = blackB; else { let mine = n % 2 === 0; if (mine && red >= 7) mine = false; if (!mine && blue >= 7) mine = true; b = mine ? reds[red++] : blues[blue++]; } b.x = x; b.y = y; b.vx = b.vy = 0; n++; }
    for (const b of balls) { b.in = false; b.drop = 0; b.pk = null; b.tray = -1; b.m.visible = true; b.m.quaternion.identity(); b.m.rotateX(rr(0, 6)); b.m.rotateY(rr(0, 6)); } }
  const left = mine => balls.filter(b => !b.in && !b.cue && !b.black && b.mine === mine).length;
  const moving = () => balls.some(b => !b.in && (b.vx || b.vy)) || balls.some(b => b.in && b.drop < 1);
  let trayN = 0, spinLeft = null;
  function sub(h) { const P = POOL;
    for (const b of balls) { if (b.in) continue; const sp = Math.hypot(b.vx, b.vy); if (sp > 0) { const ns = Math.max(0, sp - (P.MU + P.K * sp) * h); if (ns < 0.012) { b.vx = b.vy = 0; } else { b.vx *= ns / sp; b.vy *= ns / sp; } }
      b.x += b.vx * h; b.y += b.vy * h; let sunk = false;
      for (const [px, py, k] of POCKETS) { const PR = k === 'c' ? P.PC : P.PM, off = Math.hypot(b.x - px, b.y - py); if (off >= PR) continue; const s2 = Math.hypot(b.vx, b.vy);
        if (s2 > P.RATTLE && off > PR * 0.42) { const nx = (b.x - px) / (off || 1), ny = (b.y - py) / (off || 1), vn = b.vx * nx + b.vy * ny; b.vx = (b.vx - 2 * vn * nx) * 0.34; b.vy = (b.vy - 2 * vn * ny) * 0.34; b.x = px + nx * (PR + 1e-4); b.y = py + ny * (PR + 1e-4); TA.rattle(); if (!b.cue) S.rattled = true; break; }
        b.in = true; b.pk = [px, py]; b.drop = 0; b.vx = b.vy = 0; sunk = true; S.potted.push(b); { const w = T2W(px, py, Y + 0.05); puff(w.x, w.y, w.z, b.cue ? 0xffffff : b.black ? 0x444444 : b.mine ? 0xff8a6a : 0x8fc4ff, 3); } buzz(b.cue ? [30, 40, 30] : 28); TA.pot(b.black ? 'black' : ''); break; }
      if (sunk) continue;
      let hitC = false; if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx) * P.CUSH; hitC = 'x'; } if (b.x > 1 - R) { b.x = 1 - R; b.vx = -Math.abs(b.vx) * P.CUSH; hitC = 'x'; } if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy) * P.CUSH; hitC = 'y'; } if (b.y > 2 - R) { b.y = 2 - R; b.vy = -Math.abs(b.vy) * P.CUSH; hitC = 'y'; }
      if (hitC) { const s3 = Math.hypot(b.vx, b.vy); if (s3 > 0.08) TA.cushion(s3 * 0.3); if (S.firstHit) S.cushAfter = true;
        if (b.cue && spinLeft && spinLeft.n > 0 && Math.abs(spinLeft.x) > 0.05) { const k = spinLeft.x * 0.28 * s3; if (hitC === 'x') b.vy += k * Math.sign(b.vx || 1); else b.vx -= k * Math.sign(b.vy || 1); spinLeft.n--; } } }
    for (let i = 0; i < balls.length; i++) { const a = balls[i]; if (a.in) continue; for (let j = i + 1; j < balls.length; j++) { const b = balls[j]; if (b.in) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d >= 2 * R || d <= 0) continue; const nx = dx / d, ny = dy / d, ov = (2 * R - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (vn >= 0) continue; const cueBall = a.cue ? a : b.cue ? b : null, cvx = cueBall ? cueBall.vx : 0, cvy = cueBall ? cueBall.vy : 0, imp = vn * 0.98;
      a.vx += nx * imp; a.vy += ny * imp; b.vx -= nx * imp; b.vy -= ny * imp; const hard = Math.min(0.5, Math.abs(vn) * 0.12); if (hard > 0.02) TA.click(Math.abs(vn) * 0.33);
      if (cueBall && !S.firstHit) { S.firstHit = cueBall === a ? b : a; if (spinLeft && Math.abs(spinLeft.y) > 0.04) { const sp0 = Math.hypot(cvx, cvy) || 1; cueBall.vx += cvx / sp0 * spinLeft.y * 0.62 * sp0; cueBall.vy += cvy / sp0 * spinLeft.y * 0.62 * sp0; spinLeft.y = 0; } } } } }
  let acc = 0; function physics(dt) { acc += dt; const h = 1 / 480; let n = 0; while (acc >= h && n < 40) { sub(h); acc -= h; n++; } if (n >= 40) acc = 0; }
  // how far a ball rolls from a given speed, for the AI's pace
  const rollDist = v => { const P = POOL; let d = 0, s = v; const h = 1 / 120; while (s > 0.012) { s -= (P.MU + P.K * s) * h; d += Math.max(0, s) * h; } return d; };
  const DIST_TABLE = []; for (let i = 0; i <= 40; i++) DIST_TABLE.push(rollDist(POOL.VMAX * i / 40));
  const powerFor = dist => { for (let i = 1; i <= 40; i++) if (DIST_TABLE[i] >= dist) return i / 40; return 1; };

  // ---------- shots ----------
  function shoot(aim, power, spin = { x: 0, y: 0 }) { if (S.ph !== 'aim') return; const v = POOL.VMAX * clamp(power, 0.04, 1); CB.vx = Math.cos(aim) * v; CB.vy = Math.sin(aim) * v;
    buzz(Math.round(8 + power * 22)); S.ph = 'roll'; S.potted = []; S.firstHit = null; S.cushAfter = false; S.rattled = false; S.shotBy = S.turn; S.shots++; S.inHand = false; S.strikeT = 0.18; S.lastPow = power;
    spinLeft = { x: spin.x, y: spin.y, n: 2 }; S.power = 0; S.pulling = false; TA.strike(power); { const w = T2W(CB.x, CB.y, Y + BR); puff(w.x, w.y, w.z, 0xffffff, power > 0.6 ? 3 : 1); } S.shake = power > 0.72 ? 0.05 * power : 0; }
  function trace(aim) { const dx = Math.cos(aim), dy = Math.sin(aim); let hit = null, ht = Infinity;
    for (const b of balls) { if (b.in || b.cue) continue; const ex = b.x - CB.x, ey = b.y - CB.y, pr = ex * dx + ey * dy; if (pr <= 0) continue; const p2 = ex * ex + ey * ey - pr * pr, rr2 = 4 * R * R; if (p2 > rr2) continue; const t = pr - Math.sqrt(Math.max(0, rr2 - p2)); if (t >= 0 && t < ht) { ht = t; hit = b; } }
    let wt = Infinity; if (dx > 0) wt = Math.min(wt, (1 - R - CB.x) / dx); if (dx < 0) wt = Math.min(wt, (R - CB.x) / dx); if (dy > 0) wt = Math.min(wt, (2 - R - CB.y) / dy); if (dy < 0) wt = Math.min(wt, (R - CB.y) / dy);
    const t = Math.min(ht, wt), gx = CB.x + dx * t, gy = CB.y + dy * t, o = { t, gx, gy, hit: ht <= wt ? hit : null }; if (o.hit) { const ox = o.hit.x - gx, oy = o.hit.y - gy, l = Math.hypot(ox, oy) || 1; o.ox = ox / l; o.oy = oy / l; o.cut = o.ox * dx + o.oy * dy; } return o; }
  function clearPath(ax, ay, bx, by, ignore) { const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1; for (const o of balls) { if (o.in || ignore.includes(o)) continue; let t = ((o.x - ax) * vx + (o.y - ay) * vy) / L2; t = clamp(t, 0, 1); if (Math.hypot(o.x - ax - vx * t, o.y - ay - vy * t) < 2 * R * 0.94) return false; } return true; }
  // the 2D poolAiShot, with a pace that knows how far a ball rolls. mine = which colour the shooter wants. ham = how hard over the need.
  function plan(mine, { ham = 1, err = 0, place = false } = {}) { const need = left(mine), targets = balls.filter(b => !b.in && !b.cue && (need === 0 ? b.black : (!b.black && b.mine === mine)));
    const cands = []; const from = (cx, cy) => { let best = null; for (const b of targets) for (const [px, py] of POCKETS) { const pdx = px - b.x, pdy = py - b.y, pd = Math.hypot(pdx, pdy) || 1, gx = b.x - pdx / pd * 2 * R, gy = b.y - pdy / pd * 2 * R;
      if (gx < R || gx > 1 - R || gy < R || gy > 2 - R) continue; const cdx = gx - cx, cdy = gy - cy, cd = Math.hypot(cdx, cdy) || 1, cut = cdx / cd * pdx / pd + cdy / cd * pdy / pd; if (cut < 0.32) continue;
      if (!clearPath(b.x, b.y, px, py, [b])) continue; if (!clearPath(cx, cy, gx, gy, [CB, b])) continue; const sc = cut * 2.2 - pd * 0.5 - cd * 0.35; if (!best || sc > best.sc) best = { sc, aim: Math.atan2(cdy, cdx), cd, pd, cut, b }; } return best; };
    let best = null, at = null;
    if (place) { // ball in hand: try spots on a ring behind each target's line
      for (const b of targets) for (const [px, py] of POCKETS) { const pdx = px - b.x, pdy = py - b.y, pd = Math.hypot(pdx, pdy) || 1; for (const dd of [0.22, 0.32, 0.45]) { const cx = b.x - pdx / pd * (2 * R + dd), cy = b.y - pdy / pd * (2 * R + dd); if (cx < R * 1.5 || cx > 1 - R * 1.5 || cy < R * 1.5 || cy > 2 - R * 1.5) continue; if (balls.some(o => !o.in && !o.cue && Math.hypot(o.x - cx, o.y - cy) < 2.3 * R)) continue; const ox = CB.x, oy = CB.y; CB.x = cx; CB.y = cy; const c = from(cx, cy); CB.x = ox; CB.y = oy; if (c && (!best || c.sc > best.sc)) { best = c; at = { x: cx, y: cy }; } } } }
    else best = from(CB.x, CB.y);
    if (!best) { let near = null, nd = Infinity; for (const b of targets) { const d = Math.hypot(b.x - CB.x, b.y - CB.y); if (d < nd && clearPath(CB.x, CB.y, b.x, b.y, [CB, b])) { nd = d; near = b; } } if (!near) for (const b of targets) { const d = Math.hypot(b.x - CB.x, b.y - CB.y); if (d < nd) { nd = d; near = b; } }
      if (!near) return { aim: S.aim, power: 0.5, safety: true }; return { aim: Math.atan2(near.y - CB.y, near.x - CB.x), power: clamp(powerFor(nd + 0.5) * ham, 0.15, 1), safety: true, at }; }
    const need2 = best.cd * (1 / Math.max(0.35, best.cut)) + best.pd * 1.15 + 0.12; let power = clamp(powerFor(need2) * ham, 0.12, 1);
    return { aim: best.aim + (err ? (Math.random() * 2 - 1) * err : 0), power, target: best.b, at, cut: best.cut }; }

  // ---------- turn resolution (2D poolResolve + first-contact fouls) ----------
  function resolve() { const shooter = S.shotBy, mine = shooter === 'you', P = S.potted, scratch = P.some(b => b.cue), black = P.some(b => b.black), own = P.filter(b => !b.cue && !b.black && b.mine === mine).length, theirs = P.filter(b => !b.cue && !b.black && b.mine !== mine).length;
    const fh = S.firstHit, wrongFirst = !S.brk && fh && (fh.black ? (left(mine) + own > 0) : fh.mine !== mine), noHit = !fh, foul = scratch || noHit || wrongFirst, H = sharkName, other = mine ? 'him' : 'you';
    if (scratch) { CB.in = false; CB.drop = 1; CB.tray = -1; CB.vx = CB.vy = 0; const sp = freeSpot(0.5, 1.6); CB.x = sp.x; CB.y = sp.y; }
    S.brk = false;
    if (black) { const legal = left(mine) === 0 && !foul; const won = legal === mine; return endFrame(won ? 'win' : 'loss', legal ? (mine ? 'BLACK DOWN. FRAME!' : H + ' SINKS THE BLACK') : (mine ? (scratch ? 'SCRATCH ON THE BLACK' : 'BLACK TOO EARLY') : H + (scratch ? ' SCRATCHED ON THE BLACK' : ' POTTED THE BLACK EARLY'))); }
    if (foul) { S.turn = other; S.inHand = true; S.run = 0; const why = scratch ? 'SCRATCH' : noHit ? 'MISSED EVERYTHING' : fh && fh.black ? 'HIT THE BLACK FIRST' : 'HIT ' + (mine ? 'HIS' : 'YOUR') + ' BALL FIRST';
      call(mine ? why + ' · BALL IN HAND TO ' + H : H + ': ' + why + ' · BALL IN HAND', 3); flash(mine ? 'FOUL · ' + why : H + ' FOULED', mine ? '#ff9a8a' : '#22c55e', 1.6); return nextTurn(); }
    if (own > 0) { react(mine ? 'pot' : 'his'); S.run += own; call(mine ? (own > 1 ? own + ' DOWN · AGAIN' : 'POTTED · AGAIN') : H + ' POTS · AGAIN'); flash(mine ? (own > 1 ? own + ' DOWN!' : 'POTTED!') : H + ' POTS', mine ? '#22c55e' : '#ff9a8a', 1.2); if (mine) save.best(SK.best, S.run); if (mine && left(true) === 0) call('ALL REDS DOWN · NOW THE BLACK', 3); return nextTurn(); }
    S.turn = other; S.run = 0; call(theirs > 0 ? (mine ? 'THAT WAS HIS · ' + H + "'S TABLE" : H + ' POTTED YOURS · YOUR TABLE') : (mine ? (S.rattled ? 'RATTLED THE JAWS · ' + H + "'S TABLE" : 'MISSED · ' + H + "'S TABLE") : (S.rattled ? 'RATTLED IT · YOUR TABLE' : H + ' MISSED · YOUR TABLE')), 2.6); nextTurn(); }
  function freeSpot(x, y) { const clash = (px, py) => balls.some(b => !b.in && !b.cue && Math.hypot(b.x - px, b.y - py) < 2.2 * R); if (!clash(x, y)) return { x, y }; for (let r = 0.05; r < 0.9; r += 0.05) for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) { const px = clamp(x + Math.cos(a) * r, R, 1 - R), py = clamp(y + Math.sin(a) * r, R, 2 - R); if (!clash(px, py)) return { x: px, y: py }; } return { x, y }; }
  function nextTurn() { setTimeout(() => TA.chalk(), S.turn === 'him' ? 500 : 900); S.ph = 'aim'; S.power = 0; S.spin = { x: 0, y: 0 }; if (S.turn === 'him') { S.ai = { t: 0, p: null }; S.ph = 'ai'; } else { S.ai = null; const t = trace(S.aim); if (!t.hit) { const p = plan(true, { ham: 1 }); S.aim = p.aim; } if (S.demo) S.dbot = { t: 0, p: null }; } }
  function endFrame(res, txt) { buzz(res === 'win' ? [40, 60, 40, 60, 120] : 200); S.ph = 'over'; S.overT = S.t + 2.4; S.res = res; call(txt, 3); flash(res === 'win' ? 'FRAME!' : 'FRAME TO ' + sharkName, res === 'win' ? '#22c55e' : '#ff9a8a', 2.2); if (res === 'win') { TA.cheer(1); react('win'); } else { TA.groan(); react('loss'); } }
  function finishFrame() { const res = S.res, st = S.stake, demo = S.demo; let gold = 0, unlocked = null, before = save.data.gold;
    if (!demo) { try { if (res === 'win') { if (st > 0) { save.addGold(st); gold = st; TA.coins(Math.min(12, 3 + Math.round(st / 10))); save.setFlag(FL.won); save.setStat(SK.stake, Math.min(POOL.BET_MAX, Math.max(20, st * 2))); } save.addXp(st > 0 ? 40 : 12); save.setStat(SK.wins, save.stat(SK.wins, 0) + 1); if (st > 0 && save.stat(SK.wins, 0) >= 3 && !save.flag(FL.table)) { save.setFlag(FL.table); unlocked = 'THE LEVEL'; } }
      else { const lose = Math.min(st, save.data.gold); if (lose > 0) save.addGold(-lose); gold = -lose; save.setStat(SK.losses, save.stat(SK.losses, 0) + 1); } } catch (e) {} }
    S.done = { res, stake: st, gold, demo, unlocked, wins: save.stat(SK.wins, 0), losses: save.stat(SK.losses, 0), shots: S.shots, line: res === 'win' ? pick(winLines()) : pick(lossLines()) };
    S.mode = demo ? 'intro' : 'done'; if (demo) { S.demo = false; S.done = null; toIntro(); } }
  const winLines = () => WK === 'luxor' ? (save.flag(FL.table) ? ['So it turns out I am simply not very good at pool.', 'I would like to find out how not very good. Again.'] : ['Somebody beat Dabb. On his own table.', 'The floor runs south. That is the only explanation.', 'You hit them soft. Everybody hits them hard.']) : ['Well played. Rack them up again?', 'Nobody does that on my table. Again.'];
  const lossLines = () => WK === 'luxor' ? ['Nine years on this table. Did you think it would be easy?', 'Hit them softer. Not that I ever do.', 'Rack them up. I would like more of your money.'] : ['My table. Again?', 'Close. Not close enough.'];

  // ---------- the room reacts ----------
  function moodFor(f, mood, t = 2.4) { const u = f.userData; if (u.moodBack == null) u.moodBack = u.mood; u.mood = mood; u.moodT = t; }
  function react(kind) { const crowd = [...regs.map(g => g.f), keeper];
    if (kind === 'pot') { crowd.forEach((f, i) => { if (Math.random() < 0.5) setTimeout(() => { f.userData.hop = 1; }, i * 90); moodFor(f, 'happy', 1.6); }); TA.cheer(0.35); moodFor(shark, 'stern', 2); }
    else if (kind === 'his') { moodFor(shark, 'smug', 2.2); }
    else if (kind === 'win') { crowd.forEach((f, i) => { setTimeout(() => { f.userData.hop = 1; }, i * 110); setTimeout(() => { f.userData.hop = 1; }, 600 + i * 110); moodFor(f, 'excited', 3.5); }); moodFor(shark, 'sad', 4); moodFor(ben, 'excited', 4); ben.userData.hop = 1; }
    else if (kind === 'loss') { moodFor(shark, 'excited', 4); shark.userData.hop = 1; moodFor(ben, 'sad', 3); crowd.forEach(f => moodFor(f, 'surprised', 2)); } }
  // ---------- Dabb at the table ----------
  function aiStep(dt) { const A = S.ai; if (!A) return; A.t += dt;
    if (!A.p) { const lvl = !!save.flag(FL.table), ham = S.demo ? 1.35 : WK === 'luxor' ? (lvl ? 1.05 : 1.35) : 1.2, err = lvl && !S.demo ? 0.007 : 0.01; A.p = plan(false, { ham, err, place: S.inHand }); A.a0 = S.aim; if (S.inHand && A.p.at) { A.from = { x: CB.x, y: CB.y }; } }
    const p = A.p; if (A.from && A.t < 0.7) { const k = clamp(A.t / 0.6, 0, 1); CB.x = A.from.x + (p.at.x - A.from.x) * k; CB.y = A.from.y + (p.at.y - A.from.y) * k; }
    let da = ((p.aim - A.a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI; const k = clamp((A.t - 0.5) / 1.1, 0, 1), wob = Math.sin(A.t * 7) * 0.05 * (1 - k); S.aim = A.a0 + da * (k * k * (3 - 2 * k)) + wob;
    if (A.t > 1.7) S.power = clamp((A.t - 1.7) / 0.55, 0, 1) * p.power; if (A.t > 2.3) { S.ph = 'aim'; S.ai = null; shoot(p.aim, p.power, { x: 0, y: rr(-0.2, 0.3) }); } }
  // demo autopilot for YOUR side, with captions + a ghost finger
  function demoBot(dt) { const D = S.dbot; if (!D || S.ph !== 'aim' || S.turn !== 'you') return; D.t += dt;
    if (!D.p) { D.p = plan(true, { ham: 1.0, err: S.botErr != null ? S.botErr : 0.006, place: S.inHand }); D.a0 = S.aim; if (S.inHand && D.p.at) D.from = { x: CB.x, y: CB.y }; D.spin = D.p.cut > 0.9 ? { x: 0, y: -0.5 } : { x: 0, y: 0.2 }; }
    const p = D.p; if (D.from && D.t < 1.1) { const k = clamp((D.t - 0.2) / 0.8, 0, 1); CB.x = D.from.x + (p.at.x - D.from.x) * k; CB.y = D.from.y + (p.at.y - D.from.y) * k; D.hand = { kind: 'table', u: CB.x, v: CB.y }; return; }
    const t0 = D.from ? 1.2 : 0.2; if (D.t < t0 + 1.4) { const k = clamp((D.t - t0) / 1.2, 0, 1), da = ((p.aim - D.a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI; S.aim = D.a0 + da * (k * k * (3 - 2 * k)); D.hand = { kind: 'table', u: CB.x + Math.cos(S.aim) * 0.45, v: CB.y + Math.sin(S.aim) * 0.45 }; return; }
    if (D.t < t0 + 2.0) { S.spin = D.spin; D.hand = { kind: 'spin' }; return; }
    if (D.t < t0 + 3.0) { S.pulling = true; S.power = clamp((D.t - t0 - 2.0) / 0.9, 0, 1) * p.power; D.hand = { kind: 'pull', v: S.power }; return; }
    S.dbot = null; shoot(p.aim, p.power, S.spin); }

  // ---------- walking ----------
  const PR0 = 0.42, solids = HALL.colliders;
  function collide(o, r) { for (const c of solids) { const cx = clamp(o.x, c.x0, c.x1), cz = clamp(o.z, c.z0, c.z1), dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz); if (d < r) { if (d > 1e-5) { o.x = cx + dx / d * r; o.z = cz + dz / d * r; } else { o.z = c.z1 + r; } } }
    const npcs = [shark, keeper, ...regs.map(r => r.f)]; for (const f of npcs) { const dx = o.x - f.position.x, dz = o.z - f.position.z, d = Math.hypot(dx, dz), rr0 = r + 0.42; if (d < rr0 && d > 1e-4) { o.x = f.position.x + dx / d * rr0; o.z = f.position.z + dz / d * rr0; } }
    o.x = clamp(o.x, -HALL.W / 2 + 0.5, HALL.W / 2 - 0.5); o.z = clamp(o.z, -HALL.D / 2 + 0.5, Math.abs(o.x) < 1.0 ? HALL.D / 2 + 0.3 : HALL.D / 2 - 0.5); }
  function walkStep(dt) { let sx = stick.x, sy = stick.y; if (keys.has('KeyA') || keys.has('ArrowLeft')) sx = -1; if (keys.has('KeyD') || keys.has('ArrowRight')) sx = 1; if (keys.has('KeyW') || keys.has('ArrowUp')) sy = 1; if (keys.has('KeyS') || keys.has('ArrowDown')) sy = -1;
    const hy = Math.hypot(sx, sy), m = Math.min(1, hy); PL.mv = 0; if (!S.dlg && m > 0.12) { const sp = 4.2 * m, vx = sx / hy * sp, vz = -sy / hy * sp; PL.x += vx * dt; PL.z += vz * dt; PL.yaw = Math.atan2(vx, vz); PL.mv = sp; PL.stepD = (PL.stepD || 0) + sp * dt; if (PL.stepD > 1.05) { PL.stepD = 0; TA.step(); } }
    collide(PL, PR0);
    // who is near? (TALK / E)
    const cands = [{ id: 'shark', p: shark.position, r: 1.9, label: 'Talk to ' + sharkCap }, { id: 'table', p: V3(T0.x, 0, T0.z), r: 0, label: 'Rack them up' }, { id: 'keeper', p: spots.barFront, r: 1.7, label: 'Talk to ' + TV.keeper.name.charAt(0) + TV.keeper.name.slice(1).toLowerCase() }, ...regs.map((g, i) => ({ id: 'reg' + i, p: g.f.position, r: 1.6, label: 'Talk to ' + g.r.name.charAt(0) + g.r.name.slice(1).toLowerCase() })), { id: 'door', p: spots.door, r: 1.5, label: 'Leave the tavern' }];
    let near = null, nd = 1e9; for (const c of cands) { let d; if (c.id === 'table') { const dx = Math.max(0, Math.abs(PL.x - T0.x) - OW / 2), dz = Math.max(0, Math.abs(PL.z - T0.z) - OL / 2); d = Math.hypot(dx, dz); if (d < 0.75 && d < nd) { nd = d; near = c; } continue; } d = Math.hypot(PL.x - c.p.x, PL.z - c.p.z); if (d < c.r && d < nd) { nd = d; near = c; } }
    S.near = near; }
  // ---------- talk ----------
  const N = (t) => ({ who: 'n', text: t }), Pp = t => ({ who: 'p', text: t });
  function openDlg(name, role, lines, choices, onChoose, fox) { S.dlg = { name, role, lines, i: 0, chars: 0, choices, onChoose, fox }; if (fox) fox.userData.talking = true; }
  function sharkTalk() { const won = save.flag(FL.won), table = save.flag(FL.table), told = save.flag(FL.told); let lines;
    if (WK === 'luxor') { if (table && !told) { lines = [N('Right. Sit down. I want to say this once and then never again.'), N('Nine years I have told everybody who came near this table that the floor runs south. Vesta got a spirit level off the armory this morning.'), Pp('And?'), N('And the floor is level. The table is level. The table has always been level.'), N('So it turns out I am simply not very good at pool. Rack them up. I would like to find out how not very good.')]; save.setFlag(FL.told); }
      else if (won) lines = [N('You again.'), N('I have been thinking about the last one. You hit them soft. Everybody hits them hard — you have to hit them hard, the floor runs south.'), Pp('Does it.'), N('It has for nine years. Rack them up and I will show you.')];
      else lines = [Pp('Good table?'), N('Terrible table. The whole floor runs south, so every long shot drifts. I have played on it for nine years and I still lose.'), N('Nobody else wants it. That makes it mine.')]; }
    else lines = won ? [N('You again. Rack them up.')] : [N('Table is free if you are brave. Reds are yours, blues are mine, the black goes last.')];
    const asked = S.asked || (S.asked = {}); const ch = () => { const L = [{ text: 'Rack them up.', k: 'rack' }]; if (WK === 'luxor') { if (!table) L.push({ text: 'Why does the floor run south?', k: 'floor' }); else L.push({ text: 'About the floor.', k: 'floor2' }); if (won) L.push({ text: 'How do I not lose at this?', k: 'tips' }); } L.push({ text: 'Another time.', k: 'bye', bye: true }); return L.map(c => ({ ...c, asked: !!asked[c.k] })); };
    const REPLY = { floor: ['Because the whole town does. Luxor is built on the skirt of a volcano and the volcano is not finished.', 'Ask anybody who has laid a floor here. They will tell you a level is a piece of optimism.'], floor2: ['We are not discussing the floor.', 'The floor and I have come to an arrangement. It stays where it is and I stop mentioning it.'], tips: ['Stop trying to sink it and start deciding where the white finishes.', 'That is the whole of it and I have never once managed it. Every shot I take, I hit like I am angry with it.'], bye: WK === 'luxor' ? ['It will be here. So will I. That is rather the problem.'] : ['Any time.'] };
    const onChoose = c => { if (c.k === 'rack') { closeDlg(); api.openStake(); return; } asked[c.k] = true; const ln = REPLY[c.k].map(N); if (c.k === 'bye') { openDlg(sharkName, TV.shark.role, ln, null, null, shark); return; } openDlg(sharkName, TV.shark.role, ln, ch(), onChoose, shark); };
    openDlg(sharkName, TV.shark.role, lines, ch(), onChoose, shark); }
  function keeperTalk() { const K = TV.keeper, ch = () => [...K.stock.map(([id, label, price]) => ({ text: label + ' · ' + price + 'g', id, label, price })), { text: 'Who takes the bets on the pool?', k: 'bets' }, { text: 'Bye.', bye: true }];
    const onChoose = c => { if (c.bye) { closeDlg(); return; } if (c.k === 'bets') { openDlg(K.name, K.role, [N(WK === 'luxor' ? 'Bets? In my tavern? I take bets on the pit. The table is between you and ' + sharkCap + '.' : 'Between you and ' + sharkCap + '. I just pour.')], ch(), onChoose, keeper); return; }
      if (save.spend(c.price)) { save.give(c.id, 1); toast('+1 ' + c.label + ' · −' + c.price + 'g'); TA.coins(4); } else toast('Not enough gold for ' + c.label + '.'); openDlg(K.name, K.role, [N(save.data.gold >= 0 ? 'Anything else?' : '')], ch(), onChoose, keeper); };
    openDlg(K.name, K.role, [N(K.greeting)], ch(), onChoose, keeper); }
  function closeDlg() { if (S.dlg && S.dlg.fox) S.dlg.fox.userData.talking = false; S.dlg = null; }
  function talk() { if (S.mode !== 'walk') return; const d = S.dlg; if (d) { const ln = d.lines[d.i]; if (d.chars < ln.text.length) { d.chars = ln.text.length; return; } if (d.i < d.lines.length - 1) { d.i++; d.chars = 0; return; } if (!d.choices) closeDlg(); return; }
    const n = S.near; if (!n) return; ainit(); if (n.id === 'shark' || n.id === 'table') sharkTalk(); else if (n.id === 'keeper') keeperTalk(); else if (n.id === 'door') { TA.door(); if (api.onExit) api.onExit(); else toast(TV.door + ' The world map takes it from here.'); } else { const g = regs[+n.id.slice(3)]; openDlg(g.r.name, g.r.role, g.r.lines.map(([w, t]) => w === 'p' ? Pp(t) : N(t)), null, null, g.f); } }

  // ---------- camera ----------
  const CAM = { pos: V3(T0.x + 6, 5, T0.z + 7), look: V3(T0.x, Y, T0.z) }; camera.position.copy(CAM.pos);
  const SAFE = { t: 0, b: 0, l: 0, r: 0 }, fitCam = new THREE.PerspectiveCamera(50, 1, 0.05, 90), fitCache = new Map(), _p = V3();
  function fitView(key, pts, yaw, el, fov) { const W = CW(), H = CHh(), ck = key + '|' + W + 'x' + H + '|' + SAFE.t + '|' + SAFE.b + '|' + SAFE.l + '|' + SAFE.r + '|' + S.zoom.toFixed(2); if (fitCache.has(ck)) return fitCache.get(ck);
    fitCam.aspect = W / H; fitCam.fov = fov; fitCam.updateProjectionMatrix(); const yT = 1 - 2 * SAFE.t / H - 0.04, yB = -1 + 2 * SAFE.b / H + 0.04, xL = -1 + 2 * SAFE.l / W + 0.03, xR = 1 - 2 * SAFE.r / W - 0.03, sx = (xL + xR) / 2, sy = (yT + yB) / 2;
    const dir = V3(Math.sin(yaw) * Math.cos(el), Math.sin(el), Math.cos(yaw) * Math.cos(el)), tgt = V3(); pts.forEach(p => tgt.add(p)); tgt.multiplyScalar(1 / pts.length);
    const bounds = d => { fitCam.position.copy(tgt).addScaledVector(dir, d); fitCam.lookAt(tgt); fitCam.updateMatrixWorld(); let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for (const p of pts) { _p.copy(p).project(fitCam); if (_p.z > 1) return null; x0 = Math.min(x0, _p.x); x1 = Math.max(x1, _p.x); y0 = Math.min(y0, _p.y); y1 = Math.max(y1, _p.y); } return { x0, x1, y0, y1 }; };
    const fits = d => { const b = bounds(d); return b && b.x1 - b.x0 <= xR - xL && b.y1 - b.y0 <= yT - yB; }; let d = 4;
    for (let it = 0; it < 4; it++) { let lo = 0.5, hi = 40; for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; } d = hi; const b = bounds(d); if (!b) break; const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, th = Math.tan(fov * Math.PI / 360) * d, right = V3().setFromMatrixColumn(fitCam.matrixWorld, 0), up = V3().setFromMatrixColumn(fitCam.matrixWorld, 1); tgt.addScaledVector(right, (cx - sx) * th * fitCam.aspect).addScaledVector(up, (cy - sy) * th); }
    d /= S.zoom; const out = { pos: tgt.clone().addScaledVector(dir, d), look: tgt.clone() }; if (fitCache.size > 80) fitCache.clear(); fitCache.set(ck, out); return out; }
  const tablePts = () => { const e = 0.04; return [[-OW / 2 - e, -OL / 2 - e], [OW / 2 + e, -OL / 2 - e], [-OW / 2 - e, OL / 2 + e], [OW / 2 + e, OL / 2 + e]].map(([x, z]) => V3(T0.x + x, Y + 0.1, T0.z + z)); };
  function camShot() { const W = CW(), H = CHh(), port = W < H;
    if (S.mode === 'play' || S.mode === 'stake' || S.mode === 'done') { if (S.view === 'cue' && S.ph === 'aim' && S.turn === 'you' && S.mode === 'play') { const c = T2W(CB.x, CB.y), dx = Math.cos(S.aim), dz = Math.sin(S.aim), back = (port ? 2.3 : 1.9) / S.zoom; camera.fov = port ? 62 : 48; return { pos: V3(c.x - dx * back, Y + (port ? 1.25 : 0.85) / S.zoom, c.z - dz * back), look: V3(c.x + dx * 1.0, Y, c.z + dz * 1.0) }; }
      const fov = port ? 44 : 38; camera.fov = fov; return fitView('tbl', tablePts(), port ? 0 : Math.PI / 2, port ? 1.5 : 1.5, fov); }
    if (S.mode === 'intro') { const a = S.t * 0.12, r = port ? 8.5 : 7.2; camera.fov = port ? 62 : 48; const look = V3(T0.x + (port ? 0 : -1.2), Y - (port ? 1.0 : 0.2), T0.z); return { pos: V3(T0.x + Math.sin(a) * r, port ? 7.0 : 4.6, T0.z + Math.cos(a) * r), look }; }
    camera.fov = port ? 60 : 50; const off = port ? V3(0, 9.6, 7.4) : V3(0, 9.4, 6.2); return { pos: V3(PL.x + off.x, off.y, PL.z + off.z), look: V3(PL.x, 0.8, PL.z - (port ? 0.6 : 1.1)) }; }

  // ---------- pointer on the 3D stage: aim, ball in hand, pinch ----------
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -Y), ndc = new THREE.Vector2(), hitP = V3(), ptrs = new Map(); let drag = null, pinch = null;
  const tableAt = (cx, cy) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); if (!ray.ray.intersectPlane(plane, hitP)) return null; return W2T(hitP.x, hitP.z); };
  const canAim = () => S.mode === 'play' && S.ph === 'aim' && S.turn === 'you' && !S.demo && !PAUSE;
  function setCueAt(u, v) { u = clamp(u, R * 1.2, 1 - R * 1.2); v = clamp(v, R * 1.2, 2 - R * 1.2); if (balls.some(b => !b.in && !b.cue && Math.hypot(b.x - u, b.y - v) < 2.05 * R)) return false; CB.x = u; CB.y = v; return true; }
  const el = renderer.domElement;
  const onDown = e => { if (!canAim()) return; e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (er) {} ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); ainit();
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: S.zoom }; drag = null; return; }
    const t = tableAt(e.clientX, e.clientY); if (S.inHand && t && Math.hypot(t.u - CB.x, t.v - CB.y) < (e.pointerType === 'touch' ? 0.17 : 0.11)) { drag = { kind: 'ball' }; return; }
    drag = { kind: S.view === 'cue' ? 'rel' : 'abs', x: e.clientX, a: S.aim }; if (drag.kind === 'abs' && t) S.aim = Math.atan2(t.v - CB.y, t.u - CB.x); };
  const onMove = e => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (!canAim()) return;
    if (pinch && ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; S.zoom = clamp(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(30, pinch.d), 0.7, 1.8); return; }
    if (!drag) return; if (drag.kind === 'ball') { const t = tableAt(e.clientX, e.clientY); if (t) setCueAt(t.u, t.v); return; }
    if (drag.kind === 'rel') { S.aim = drag.a + (e.clientX - drag.x) * 0.0032; return; } const t = tableAt(e.clientX, e.clientY); if (t && Math.hypot(t.u - CB.x, t.v - CB.y) > 0.02) S.aim = Math.atan2(t.v - CB.y, t.u - CB.x); };
  const onUp = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) drag = null; };
  el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);
  const onWheel = e => { if (S.mode !== 'play') return; e.preventDefault(); S.zoom = clamp(S.zoom * (e.deltaY > 0 ? 0.92 : 1.08), 0.7, 1.8); }; el.addEventListener('wheel', onWheel, { passive: false });

  // ---------- per-frame ----------
  const clock = new THREE.Clock(); let raf = 0, hudT = 0;
  const placeFox = (f, x, z, yaw, mv, dt) => { f.position.x = x; f.position.z = z; let d = ((yaw - f.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI; f.rotation.y += d * Math.min(1, dt * 10); kit.animFox(f, dt, mv); };
  const standFor = (aim) => { const c = T2W(CB.x, CB.y), dx = Math.cos(aim), dz = Math.sin(aim); let x = c.x - dx * 1.45, z = c.z - dz * 1.45; for (let i = 0; i < 40; i++) { const inX = Math.abs(x - T0.x) < OW / 2 + 0.38, inZ = Math.abs(z - T0.z) < OL / 2 + 0.38; if (!(inX && inZ)) break; x -= dx * 0.08; z -= dz * 0.08; } return { x, z, yaw: Math.atan2(dx, dz) }; };
  const walkTo = (o, tx, tz, sp, dt) => { const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz); if (d < 0.03) { o.mv = 0; return true; } const k = Math.min(1, sp * dt / d); o.x += dx * k; o.z += dz * k; o.mv = Math.min(d / dt, sp); o.yaw = Math.atan2(dx, dz); return false; };
  function poseShooter(f, on) { const P = f.userData.P; if (!on) return; P.arms[0].rotation.set(-1.25, 0, 0.25); P.arms[1].rotation.set(-1.45, 0, -0.2); P.body.rotation.x = 0.32; P.legs[0].rotation.x = 0.25; P.legs[1].rotation.x = -0.2; }
  function step(dt) { S.t += dt; S.flashT -= dt; if (S.flashT <= 0) S.flash = null; S.callT -= dt; if (S.callT <= 0) S.call = ''; S.toastT -= dt; if (S.toastT <= 0) S.toast = null; S.strikeT = Math.max(0, S.strikeT - dt);
    for (const p of smokeS) { if (p.life <= 0) { p.s.material.opacity = 0; continue; } p.life -= dt * 0.9; p.s.position.addScaledVector(p.v, dt); p.s.material.opacity = 0.4 * p.life; p.s.scale.setScalar(0.2 + (1 - p.life) * 0.4); }
    if (S.dlg) { S.dlg.chars = Math.min(S.dlg.lines[S.dlg.i].text.length, S.dlg.chars + dt * 70); }
    const play = S.mode === 'play';
    if (play) { if (S.ph === 'roll') { physics(dt); if (!moving()) resolve(); } else if (S.ph === 'ai') aiStep(dt); else if (S.ph === 'aim' && S.turn === 'you') { if (S.demo) demoBot(dt); else { let k = 0; if (keys.has('KeyA') || keys.has('ArrowLeft')) k = -1; if (keys.has('KeyD') || keys.has('ArrowRight')) k = 1; if (k) S.aim += k * dt * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 0.1 : 0.8); if (Math.abs(stick.x) > 0.15) S.aim += stick.x * dt * 0.6; if (keys.has('KeyW') || keys.has('ArrowUp')) { S.pulling = true; S.power = clamp(S.power + dt * 0.7, 0, 1); } if (keys.has('KeyS') || keys.has('ArrowDown')) S.power = clamp(S.power - dt * 0.7, 0, 1); } }
      else if (S.ph === 'over' && S.t >= S.overT) finishFrame();
      if (S.demo && S.t > S.demoEnd && S.ph !== 'roll') { S.demo = false; toIntro(); return; } }
    else if (S.mode === 'walk') walkStep(dt);
    // balls: positions, rolling, drops, tray
    for (const b of balls) { if (b.in) { if (b.drop < 1) { b.drop = Math.min(1, b.drop + dt * 3); const k = b.drop; const px = b.x + (b.pk[0] - b.x) * k, py = b.y + (b.pk[1] - b.y) * k, w = T2W(px, py, Y + BR - k * BR * 3); b.m.position.copy(w); b.sh.visible = false; if (b.drop >= 1) { if (b.cue) { b.m.visible = false; } else { b.tray = trayN++; } } }
        if (b.tray >= 0) { const n = b.tray, slot = (n - 7.5) * BR * 2.1; b.m.position.set(T0.x + slot, 0.65 + BR, T0.z + OL / 2 + 0.02); b.m.visible = true; } b.sh.visible = false; continue; }
      const w = T2W(b.x, b.y, Y + BR); const dxw = w.x - b.m.position.x, dzw = w.z - b.m.position.z, dist = Math.hypot(dxw, dzw); if (dist > 1e-5 && dist < 0.5) { const ax = V3(dzw, 0, -dxw).normalize(); b.m.rotateOnWorldAxis(ax, dist / BR); } b.m.position.copy(w); b.m.visible = true; b.sh.visible = true; b.sh.position.set(w.x + 0.012, Y + 0.002, w.z + 0.016); }
    // guides
    const showAim = play && S.ph === 'aim' && (S.turn === 'you' || S.ph === 'ai'); const showAny = play && (S.ph === 'aim' || S.ph === 'ai');
    if (showAny && (S.turn === 'you' || S.ph === 'ai')) { const tr = trace(S.aim), c = T2W(CB.x, CB.y), g = T2W(tr.gx, tr.gy); putRib(aimL, c.x, c.z, g.x, g.z); aimL.material.opacity = S.turn === 'you' ? 0.8 : 0.35; ghost.visible = true; ghost.position.set(g.x, Y + BR * 0.2, g.z);
      if (tr.hit && S.turn === 'you') { const h = T2W(tr.hit.x, tr.hit.y), Lo = 0.18 + 0.5 * Math.max(0, tr.cut) * SC; putRib(objL, h.x, h.z, h.x + tr.ox * Lo, h.z + tr.oy * Lo); objL.material.color.set(tr.hit.black ? 0xffffff : tr.hit.mine ? 0xff8a6a : 0x8fc4ff); const tx = Math.cos(S.aim) - tr.ox * tr.cut, ty = Math.sin(S.aim) - tr.oy * tr.cut, tl = Math.hypot(tx, ty); if (tl > 0.05) putRib(cueL, g.x, g.z, g.x + tx / tl * 0.35 * SC * (1 - Math.abs(tr.cut)), g.z + ty / tl * 0.35 * SC * (1 - Math.abs(tr.cut))); else cueL.visible = false; } else { objL.visible = false; if (S.turn === 'you' && !tr.hit) { let rx = Math.cos(S.aim), ry = Math.sin(S.aim); if (tr.gx <= R + 1e-3 || tr.gx >= 1 - R - 1e-3) rx = -rx; else ry = -ry; putRib(cueL, g.x, g.z, g.x + rx * 0.45 * SC, g.z + ry * 0.45 * SC); } else cueL.visible = false; }
      // which pocket is this shot lined up for, and how hard does it want hitting?
      S.sug = null; pocketRing.visible = false; if (tr.hit && S.turn === 'you' && !S.demo) { let bestP = null, bd = 1e9; for (const [px, py, k] of POCKETS) { const dx = px - tr.hit.x, dy = py - tr.hit.y, d = Math.hypot(dx, dy) || 1, off = Math.abs((dx * tr.oy - dy * tr.ox)) , along = (dx * tr.ox + dy * tr.oy); if (along <= 0) continue; const tol = (k === 'c' ? POOL.PC : POOL.PM) * 0.75; if (off < tol && d < bd && clearPath(tr.hit.x, tr.hit.y, px, py, [tr.hit])) { bd = d; bestP = [px, py]; } }
        if (bestP && tr.cut > 0.25) { const need = tr.t / Math.max(0.35, tr.cut) + bd * 1.15 + 0.12; S.sug = clamp(powerFor(need), 0.12, 1); const w = T2W(bestP[0], bestP[1], Y + 0.012); pocketRing.visible = true; pocketRing.position.copy(w); pocketRing.scale.setScalar(1 + Math.sin(S.t * 6) * 0.08); pocketRing.material.color.set(tr.hit.black ? 0xffffff : tr.hit.mine ? 0x22c55e : 0xff6a5a); } } }
    else { aimL.visible = objL.visible = cueL.visible = ghost.visible = pocketRing.visible = false; S.sug = null; }
    handRing.visible = play && S.inHand && S.ph === 'aim' && S.turn === 'you'; if (handRing.visible) { const c = T2W(CB.x, CB.y); handRing.position.set(c.x, Y + 0.01, c.z); handRing.scale.setScalar(1 + Math.sin(S.t * 6) * 0.12); }
    // the shooter, the cue and whoever is waiting
    const shooterIsYou = S.turn === 'you', atTable = play && (S.ph === 'aim' || S.ph === 'ai' || S.ph === 'roll');
    let benPose = false, sharkPose = false;
    if (play || S.mode === 'done' || S.mode === 'stake') { const st = standFor(S.ph === 'roll' ? S.aimShot || S.aim : S.aim);
      if (atTable && shooterIsYou) { if (S.ph !== 'roll') { PL.x = damp(PL.x, st.x, 8, dt); PL.z = damp(PL.z, st.z, 8, dt); PL.yaw = st.yaw; PL.mv = 0; } benPose = S.ph !== 'roll' || S.strikeT > 0; walkTo(SH, spots.himWait.x, spots.himWait.z, 3.5, dt); if (SH.mv === 0) SH.yaw = Math.atan2(T0.x - SH.x, T0.z - SH.z); }
      else if (atTable) { if (S.ph !== 'roll') { const arrived = walkTo(SH, st.x, st.z, 4.5, dt); if (arrived) { SH.yaw = st.yaw; sharkPose = true; } } else sharkPose = S.strikeT > 0; walkTo(PL, spots.youWait.x, spots.youWait.z, 3.5, dt); if (PL.mv === 0) PL.yaw = Math.atan2(T0.x - PL.x, T0.z - PL.z); }
      else { walkTo(PL, spots.youWait.x, spots.youWait.z, 3.5, dt); walkTo(SH, spots.himWait.x, spots.himWait.z, 3.5, dt); if (PL.mv === 0) PL.yaw = Math.atan2(T0.x - PL.x, T0.z - PL.z); if (SH.mv === 0) SH.yaw = Math.atan2(T0.x - SH.x, T0.z - SH.z); } }
    else if (S.mode === 'walk' || S.mode === 'intro') { walkTo(SH, spots.shark.x, spots.shark.z, 3, dt); if (SH.mv === 0) SH.yaw = S.dlg && S.dlg.fox === shark ? Math.atan2(PL.x - SH.x, PL.z - SH.z) : Math.atan2(T0.x - SH.x, T0.z - SH.z); }
    if (S.ph === 'roll' && !S.aimShot) S.aimShot = S.aim; if (S.ph !== 'roll') S.aimShot = null;
    PL.hop = Math.max(0, PL.hop - dt); placeFox(ben, PL.x, PL.z, PL.yaw, PL.mv, dt); ben.position.y = 0; placeFox(shark, SH.x, SH.z, SH.yaw, SH.mv, dt); placeFox(keeper, keeper.position.x, keeper.position.z, S.dlg && S.dlg.fox === keeper ? Math.atan2(PL.x - keeper.position.x, PL.z - keeper.position.z) : -Math.PI / 2, 0, dt);
    regs.forEach(g => { placeFox(g.f, g.f.position.x, g.f.position.z, S.dlg && S.dlg.fox === g.f ? Math.atan2(PL.x - g.f.position.x, PL.z - g.f.position.z) : Math.PI / 2, 0, dt); if (g.seat) { const P = g.f.userData.P; P.legs[0].rotation.x = P.legs[1].rotation.x = -1.45; } });
    poseShooter(ben, benPose); poseShooter(shark, sharkPose);
    { const topDown = play && S.view === 'table' && (S.ph === 'aim' || S.ph === 'ai' || S.ph === 'roll'); fadeFox(ben, topDown && benPose ? 0.3 : 1, dt); fadeFox(shark, topDown && sharkPose ? 0.3 : 1, dt); }
    ben.userData.lookAt = S.dlg && S.dlg.fox ? S.dlg.fox.position.clone().setY(1.6) : null; shark.userData.lookAt = play && S.turn === 'you' ? T2W(CB.x, CB.y) : null;
    // the cue
    const cueOn = (benPose || sharkPose) && play; cue.visible = cueOn; sharkCue.visible = !sharkPose;
    if (cueOn) { const c = T2W(CB.x, CB.y), aim = S.ph === 'roll' ? (S.aimShot || S.aim) : S.aim, dx = Math.cos(aim), dz = Math.sin(aim), pull = S.strikeT > 0 ? -0.02 + S.strikeT * 0.3 : 0.03 + S.power * 0.38 + (S.pulling ? 0 : Math.sin(S.t * 3) * 0.01); const tip = V3(c.x - dx * (BR + pull), Y + BR * 1.1, c.z - dz * (BR + pull)); cue.position.copy(tip); cue.lookAt(tip.x + dx, tip.y - 0.13, tip.z + dz); }
    { const P = shark.userData.P, hand = V3(0.42, 1.0, 0.28); if (!sharkPose) { shark.updateWorldMatrix(true, false); const w = hand.applyMatrix4(shark.matrixWorld); sharkCue.position.set(w.x, 1.8, w.z); sharkCue.rotation.set(-Math.PI / 2 + 0.05, 0, 0); P.arms[1].rotation.x = -0.5; } }
    if (PL.hop > 0) ben.position.y = Math.sin((1 - PL.hop / 0.5) * Math.PI) * 0.5;
    // ---------- POLISH per frame ----------
    for (const f of foxBlobs) { f.b.position.set(f.f.position.x, 0.012, f.f.position.z); }
    camera.updateMatrixWorld(); for (let i = 0; i < balls.length; i++) { const b = balls[i], sp = shine[i]; sp.visible = b.m.visible && !(b.in && b.drop >= 1 && b.tray < 0); if (!sp.visible) continue; _sh.copy(camera.position).sub(b.m.position).normalize(); sp.position.copy(b.m.position).addScaledVector(_sh, BR * 0.75); sp.position.y += BR * 0.35; sp.position.x -= BR * 0.2; }
    { const t = S.t; motes.base.forEach(([x, y, z, ph], i) => { motes.a[i * 3] = x + Math.sin(t * 0.21 + ph) * 0.3; motes.a[i * 3 + 1] = y + Math.sin(t * 0.13 + ph * 2) * 0.25; motes.a[i * 3 + 2] = z + Math.cos(t * 0.17 + ph) * 0.3; }); motes.g.attributes.position.needsUpdate = true; haze.forEach((h, i) => { h.position.x = -3 + i * 3.4 + Math.sin(t * 0.05 + i) * 0.8; h.material.opacity = 0.05 + Math.sin(t * 0.3 + i * 2) * 0.02; }); }
    for (const f of [ben, shark, keeper, ...regs.map(g => g.f)]) { const u = f.userData; if (u.moodT > 0) { u.moodT -= dt; if (u.moodT <= 0 && u.moodBack != null) { u.mood = u.moodBack; u.moodBack = null; } } }
    if (S.ph === 'roll') { let sp = 0; for (const b of balls) if (!b.in) sp += Math.hypot(b.vx, b.vy); TA.roll(sp); } else TA.roll(0);
    TA.duck(S.mode === 'play' ? 1 : S.dlg ? 0.6 : 0); TA.update(dt);
    // the lamp hides while the camera looks down on the table
    HALL.lampG.visible = !(S.mode === 'play' || S.mode === 'stake' || S.mode === 'done') || (S.view === 'cue' && S.ph === 'aim' && S.turn === 'you');
    // chalk board
    drawChalk();
    // camera
    const sh = camShot(); camera.updateProjectionMatrix(); const k = Math.min(1, dt * (S.mode === 'walk' ? 5 : 3.2)); CAM.pos.lerp(sh.pos, k); CAM.look.lerp(sh.look, k); camera.position.copy(CAM.pos); if (S.shake > 0.002) { camera.position.x += rr(-1, 1) * S.shake; camera.position.y += rr(-1, 1) * S.shake * 0.5; S.shake *= Math.pow(0.02, dt); } camera.lookAt(CAM.look); }
  let chalkKey = ''; function drawChalk() { const w = save.stat(SK.wins, 0), l = save.stat(SK.losses, 0), k = w + '|' + l + '|' + (S.mode === 'play' ? left(true) + '-' + left(false) : ''); if (k === chalkKey) return; chalkKey = k; const c = HALL.chalkCv.getContext('2d');
    c.fillStyle = '#1f2a24'; c.fillRect(0, 0, 512, 256); c.strokeStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 30; i++) { c.beginPath(); c.moveTo(Math.random() * 512, Math.random() * 256); c.lineTo(Math.random() * 512, Math.random() * 256); c.stroke(); }
    c.fillStyle = '#f6f3ee'; c.font = '900 34px Archivo, Arial'; c.fillText(TV.title.toUpperCase(), 22, 50); c.font = '700 22px Archivo, Arial'; c.fillStyle = '#ffd23a'; c.fillText('WINNER STAYS ON', 22, 84);
    const tally = (n, x, y) => { c.strokeStyle = '#f6f3ee'; c.lineWidth = 4; for (let i = 0; i < Math.min(n, 20); i++) { const g = Math.floor(i / 5), j = i % 5, X = x + g * 46 + j * 8; c.beginPath(); if (j === 4) { c.moveTo(X - 34, y + 4); c.lineTo(X + 2, y - 30); } else { c.moveTo(X, y); c.lineTo(X, y - 34); } c.stroke(); } if (n > 20) { c.fillStyle = '#f6f3ee'; c.font = '800 22px Archivo'; c.fillText('+' + (n - 20), x + 190, y - 6); } };
    c.fillStyle = '#f6f3ee'; c.font = '800 26px Archivo, Arial'; c.fillText('BEN', 22, 150); tally(w, 120, 154); c.fillText(sharkName, 22, 212); tally(l + (WK === 'luxor' ? 9 : 3), 140, 216); HALL.chalkT.needsUpdate = true; }
  function frame() { raf = requestAnimationFrame(frame); const dt = Math.min(0.05, clock.getDelta()); if (HIDDEN) return; if (!PAUSE) step(dt); renderer.render(scene, camera); hudT -= dt; if (hudT <= 0) { hudT = 0.1; onState(hud()); } }
  function onRs() { renderer.setSize(CW(), CHh()); camera.aspect = CW() / CHh(); camera.updateProjectionMatrix(); } addEventListener('resize', onRs); const ro = new ResizeObserver(onRs); ro.observe(container);
  const onKD = e => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (S.mode === 'walk') { if (e.code === 'KeyE' && !e.repeat) { e.preventDefault(); talk(); return; } if (S.dlg && /Digit[1-9]/.test(e.code) && S.dlg.choices && S.dlg.chars >= S.dlg.lines[S.dlg.i].text.length && S.dlg.i === S.dlg.lines.length - 1) { api.choose(+e.code.slice(5) - 1); return; } if (e.code === 'Space' && !e.repeat) { e.preventDefault(); api.jump(); return; } if (e.code === 'Digit1' && !S.dlg) api.melee(); if (e.code === 'Digit2' && !S.dlg) api.range(); }
    if (S.mode === 'play' && !S.demo) { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); if (canAim()) shoot(S.aim, S.power > 0.03 ? S.power : 0.35, S.spin); return; } if (e.code === 'KeyV' && !e.repeat) api.toggleView(); }
    if (/^(Arrow|Key[WASD]|Shift)/.test(e.code)) { keys.add(e.code); if (S.mode !== 'intro' && /^Arrow/.test(e.code)) e.preventDefault(); } };
  const onKU = e => keys.delete(e.code), onBlur = () => keys.clear(); addEventListener('keydown', onKD); addEventListener('keyup', onKU); addEventListener('blur', onBlur);

  function hud() { const play = S.mode === 'play', d = S.dlg, ln = d && d.lines[d.i], yourTurn = S.turn === 'you', ys = left(true), hs = left(false);
    const quest = play ? (yourTurn ? 'YOUR SHOT' : sharkName + "'S SHOT") + ' · REDS ' + ys + ' LEFT · BLUES ' + hs + ' LEFT' + (S.stake ? ' · STAKE ' + S.stake + 'g' : ' · FRIENDLY') : S.mode === 'walk' ? ('TALK TO ' + sharkName + ' · RACK THEM UP') : TV.title.toUpperCase();
    const handScreen = (() => { const D = S.dbot; if (!S.demo || !D || !D.hand) return null; if (D.hand.kind !== 'table') return D.hand; const w = T2W(D.hand.u, D.hand.v).project(camera); return { kind: 'table', x: (w.x + 1) / 2, y: (1 - w.y) / 2 }; })();
    const demoCap = !S.demo ? null : S.ph === 'ai' ? ['', sharkName + "'S SHOT. HE HITS EVERY BALL HARD, SO THEY RATTLE"] : S.ph === 'roll' ? ['', S.shotBy === 'you' ? 'POT A RED AND YOU KEEP THE TABLE' : 'WATCH THE JAWS'] : S.ph === 'aim' && S.dbot && S.dbot.hand ? ({ table: S.inHand && S.dbot.from && S.dbot.t < 1.1 ? ['DRAG', 'BALL IN HAND: DRAG THE WHITE WHERE YOU WANT IT'] : ['DRAG', 'DRAG ON THE TABLE TO AIM. THE WHITE LINE IS THE SHOT, THE COLOURED LINE IS WHERE THAT BALL GOES'], spin: ['SPIN', 'TAP THE SPIN BALL: LOW = DRAW BACK, HIGH = FOLLOW'], pull: S.brk ? ['PULL', 'THE BREAK: PULL THE CUE RIGHT DOWN AND LET GO. HIT IT HARD'] : ['PULL', 'PULL THE CUE DOWN, LET GO TO SHOOT. GREEN = SOFT AND SURE'] })[S.dbot.hand.kind] : ['', 'REDS ARE YOURS, BLUES ARE HIS, THEN THE BLACK'];
    return { sug: S.sug, ownPocket: S.sug != null, mode: S.mode, ph: S.ph, turn: S.turn, yourTurn: play && yourTurn && S.ph === 'aim' && !S.demo, inHand: S.inHand, view: S.view, power: S.power, pulling: S.pulling, spin: { ...S.spin }, flash: S.flash, call: S.call, stake: S.stake, gold: save.data.gold, left: { you: ys, him: hs }, potted: { you: 7 - ys, him: 7 - hs }, onBlack: { you: ys === 0, him: hs === 0 }, quest, done: S.done, demo: demoCap, hand: handScreen,
      prog: { wins: save.stat(SK.wins, 0), losses: save.stat(SK.losses, 0), best: save.stat(SK.best, 0), suggest: save.stat(SK.stake, 20), maxBet: Math.max(0, Math.min(POOL.BET_MAX, Math.floor(save.data.gold || 0))), level: !!save.flag(FL.table), won: !!save.flag(FL.won) },
      musicOn: TA.musicOn, tv: { key: WK, world: TV.world, room: TV.room, place: TV.place, title: TV.title, hall: TV.hall, shark: sharkName, keeper: TV.keeper.name, ph: !!TV.shark.ph },
      std: { prompt: S.mode === 'walk' && !d && S.near ? S.near.label : null, toast: S.toast, dialog: d && S.mode === 'walk' ? { name: ln.who === 'p' ? 'BEN' : d.name, role: ln.who === 'p' ? 'You' : d.role, text: ln.text.slice(0, Math.floor(d.chars)), step: d.i + 1, total: d.lines.length, done: d.chars >= ln.text.length, you: ln.who === 'p', more: false, required: false, choices: d.choices && d.i === d.lines.length - 1 && d.chars >= ln.text.length ? d.choices.map(c => ({ text: c.text, asked: !!c.asked, bye: !!c.bye })) : null } : null, quest } };
  }
  // ---------- modes ----------
  function toIntro() { S.mode = 'intro'; S.ph = 'idle'; S.done = null; S.demo = false; S.dbot = null; S.ai = null; closeDlg(); rack(); PL.x = spots.enter.x; PL.z = spots.enter.z; PL.yaw = Math.PI; SH.x = spots.shark.x; SH.z = spots.shark.z; S.view = 'table'; S.zoom = 1; }
  function begin(stake, demo = false) { ainit(); const mx = Math.max(0, Math.min(POOL.BET_MAX, Math.floor(save.data.gold || 0))); S.stake = demo ? 0 : clamp(Math.round(stake || 0), 0, mx); S.mode = 'play'; S.done = null; S.res = null; S.demo = demo; S.brk = true; S.turn = 'you'; S.inHand = false; S.shots = 0; S.run = 0; S.zoom = 1; trayN = 0; rack(); S.aim = -Math.PI / 2 + rr(-0.01, 0.01); S.power = 0; S.spin = { x: 0, y: 0 }; S.ph = 'aim'; closeDlg(); stick.x = stick.y = 0;
    call(demo ? 'DEMO · NOTHING IS SAVED' : 'YOUR BREAK' + (S.stake ? ' · ' + S.stake + 'g ON IT' : ' · A FRIENDLY'), 2.6); if (demo) { S.demoEnd = S.t + 80; S.dbot = { t: 0, p: { aim: -Math.PI / 2 + rr(-0.012, 0.012), power: 0.86 }, a0: S.aim, spin: { x: 0, y: 0.1 } }; } }
  foxBlobs = [ben, shark, keeper, ...regs.map(g => g.f)].map(f => ({ f, b: blob(1.15, 1.15, 0.85) }));
  rack(); frame();
  const api = {
    // pool controls the page calls
    walk() { ainit(); if (S.mode === 'intro' || S.mode === 'done' || S.mode === 'stake') { if (S.mode === 'intro') { PL.x = spots.enter.x; PL.z = spots.enter.z; PL.yaw = Math.PI; } S.mode = 'walk'; S.done = null; S.demo = false; toast('Walk up to ' + sharkCap + ' and press TALK to play.', 3.2); } },
    openStake() { ainit(); closeDlg(); S.mode = 'stake'; S.done = null; },
    begin, toIntro, demoStart() { if (S.mode === 'play') return; begin(0, true); }, demoStop() { if (!S.demo) return; S.demo = false; toIntro(); },
    rackOff() { if (S.mode !== 'play' || S.demo) return; S.mode = 'walk'; S.ph = 'idle'; rack(); call(''); toast('Racked off. Your money stays in your pocket.', 3); },
    pullStart() { if (!canAim()) return false; ainit(); S.pulling = true; S.power = 0; return true; }, pull(v) { if (!S.pulling || !canAim()) return; S.power = clamp(v, 0, 1); },
    pullEnd() { if (!S.pulling) return; S.pulling = false; if (!canAim()) return; if (S.power < 0.03) { S.power = 0; flash('PULL FURTHER TO SHOOT', '#ffffff', 0.9); return; } shoot(S.aim, S.power, S.spin); },
    pullCancel() { S.pulling = false; S.power = 0; },
    setSpin(x, y) { const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } S.spin = { x, y }; }, nudge(da) { if (canAim()) S.aim += da; }, toggleView() { S.view = S.view === 'table' ? 'cue' : 'table'; return S.view; }, setSafe(t, b, l, r) { if (Math.abs(SAFE.t - t) + Math.abs(SAFE.b - b) + Math.abs(SAFE.l - l) + Math.abs(SAFE.r - r) > 3) { SAFE.t = t; SAFE.b = b; SAFE.l = l; SAFE.r = r; } },
    // Game HUD engine contract
    start() {}, talk, choose(i) { const d = S.dlg; if (!d || !d.choices) return; const c = d.choices[i]; if (c && d.onChoose) d.onChoose(c); }, closeDialog: closeDlg, nextLine: talk, clearToast() { S.toast = null; },
    melee() { if (S.mode !== 'walk' || S.dlg) return; toast(WK === 'luxor' ? 'TIB: “Gloves on, weapons past the gate.”' : 'No brawling in the tavern.', 2.4); }, range() { api.melee(); }, jump() { if (S.mode === 'walk' && !S.dlg && PL.hop <= 0) { PL.hop = 0.5; TA.tap(); } }, meleeUp() {},
    useItem(id) { if (S.mode === 'play') { flash('SAVE IT FOR AFTER THE FRAME', '#ffffff', 1.2); return; } if (save.take(id, 1)) toast(id === 'erToGo' ? 'Warm all the way down. +40 HP' : id === 'energyPod' ? 'Energy topped up.' : 'A treat.', 2.4); },
    closeWheel() {}, skipTime() {}, setPaused(v) { PAUSE = !!v; }, setVisible(v) { HIDDEN = !v; if (v) clock.getDelta(); }, setHudPad(on) { hudPad = !!on; }, setStick(x, y) { stick.x = x; stick.y = y; }, eyeLook() {}, eyeRelease() {}, togglePov() { return false; }, lookBy() {}, zoomBy(d) { S.zoom = clamp(S.zoom * (1 - d * 0.1), 0.7, 1.8); }, getCam() { return { dist: 10, pitch: 0.6 }; }, setCam() {}, setMinimap() {}, toggleSound() { audio.setMuted && audio.setMuted(!audio.muted); }, cycleWeather() {},
    mapData() { return { p: [PL.x, PL.z, PL.yaw], b: [['POOL TABLE', T0.x, T0.z], ['BAR', 4.2, -1.6], ['DOOR', 0, HALL.D / 2]], f: [[shark.position.x, shark.position.z], [keeper.position.x, keeper.position.z], ...regs.map(g => [g.f.position.x, g.f.position.z])], e: [], q: [shark.position.x, shark.position.z, sharkName] }; },
    hud, onExit, hall: HALL, setMusic(on) { ainit(); TA.setMusic(on); }, toggleMusic() { ainit(); TA.setMusic(!TA.musicOn); return TA.musicOn; }, uiTap() { ainit(); TA.tap(); },
    // test hooks (autopilot frames, like tennis _sim)
    _state: () => S, _balls: () => balls.map(b => ({ k: b.kind, x: b.x, y: b.y, in: b.in })), _plan: plan, _shoot: (a, p, s) => shoot(a, p, s), _sim(n, cb, dt = 1 / 30) { for (let i = 0; i < n; i++) { step(dt); if (cb && cb(S, i) === false) break; } renderer.render(scene, camera); onState(hud()); }, _place: (x, z) => { PL.x = x; PL.z = z; }, _layout(list) { balls.forEach(b => { b.in = true; b.drop = 1; b.m.visible = false; }); list.forEach(([i, x, y]) => { const b = balls[i]; b.in = false; b.drop = 0; b.tray = -1; b.x = x; b.y = y; b.vx = b.vy = 0; }); },
    destroy() { cancelAnimationFrame(raf); removeEventListener('resize', onRs); ro.disconnect(); removeEventListener('keydown', onKD); removeEventListener('keyup', onKU); removeEventListener('blur', onBlur); el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp); el.removeEventListener('wheel', onWheel); renderer.dispose(); renderer.domElement.remove(); try { TA.dispose(); audio.ctx && audio.ctx.close(); } catch (e) {} } };
  if (startIn === 'walk') api.walk();
  return api;
}
