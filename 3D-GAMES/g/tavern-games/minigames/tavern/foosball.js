// 8 GATES — TAVERN FOOSBALL. The same walk-in tavern as Tavern Pool (any world), with a foosball table where the pool table
// stands. A new regular per world runs it (names + lines are PLACEHOLDERS, ph: true, until Ben writes them).
//   WALK — the shared Game HUD drives Ben round the room; TALK to the table's regular → "Let's play." → name the stake.
//   PLAY — first to 5. Eight rods, the classic line-up (goalie 1 · defence 2 · midfield 5 · attack 3 a side). The little players
//          are foxes. Your thumb slides ALL your red rods together (THUMB PAD or the table; it moves by how far you slide);
//          KICK spins them: tap = a quick flick, hold = charge a hard shot (the ring fills), let go to shoot. In portrait a fast
//          flick UP on the pad kicks too. Where the ball meets the foot aims it; sliding as you kick angles it. A ball that dies
//          out of reach is dropped back in at the side, like the real thing. VIEW = from your end / straight down.
//   buildFoosHall(ctx, { world }) → the room + table as set dressing (Meru-style ctx), for a walk-in tavern
//   createFoosball({ container, onState, world, startIn, onExit }) → stand-alone room + game, Game HUD engine contract.
// Save: stats <world>.foos.wins / .losses / .stake / .best (fastest shot, km/h); flags <world>FoosWon, <world>FoosTable, <world>FoosTold.
import * as THREE from '../../vendor/three/three.module.js';
import { rr, clamp, damp, pick } from '../../village-game.js';
import { canvasTex } from '../../engine/textures.js';
import { CAST } from '../../engine/cast.js';
import { save } from '../../engine/save.js';
import { createStage } from '../../engine/restaurant-kit.js';
import { tavernAudio } from './tavern-audio.js';
import { TAVERNS, buildPoolHall } from './pool-hall.js';

// metres. x across the field (half width FW), z along it (half length FL; Ben's goal at +z), y up. FY = the playing surface.
export const FOOS = { FW: 0.34, FL: 0.6, FY: 0.86, GW: 0.2, BR: 0.017, FR: 0.017, TO: 5, BET_MAX: 100 };
// the classic line-up from Ben's goal to theirs: [side, men, spacing]
const LINEUP = [['you', 1], ['you', 2], ['him', 3], ['you', 5], ['him', 5], ['you', 3], ['him', 2], ['him', 1]];
const OFFS = { 1: [0], 2: [-0.12, 0.12], 3: [-0.2, 0, 0.2], 5: [-0.24, -0.12, 0, 0.12, 0.24] }, RANGE = { 1: 0.13, 2: 0.185, 3: 0.105, 5: 0.065 };

export const FOOS_OPP = {
  luxor: { name: 'TOR', role: 'Tavern', fur: '#e57a3c', furDark: '#b5542a', torso: ['#3a6ea5', '#fbf8ec', '#22446e'], mood: 'excited', ph: true,
    hi: ['Foosball. Eleven little foxes on sticks, and every one of them is better at football than I am.', 'Spinning the rods is not allowed. I mean it is, but Vesta looks at you.'], again: ['Back for another? My goalie has been stretching.'],
    topics: { tips: ['Any tips?', 'Do not kick everything. Stop the ball, settle it, then shoot. Hold KICK for the hard one.'], dabb: ['Does Dabb play?', 'He spins the rods. Every time. Vesta took his handles away.'] },
    win: ['Ha! Good shot. Clean through the gap.', 'All right, all right. My goalie was asleep.'], loss: ['Five! Wake up your back line.', 'You kick too early. Let it come.'], level: ['Here is the trick. Pin it, slide it, shoot. Pin, slide, shoot.', 'That is how the good ones score. Now you know.'] },
  meru: { name: 'BEE', role: 'Tavern', fur: '#e8a060', furDark: '#a8642a', torso: ['#f2c94c', '#201e1d', '#a8792e'], mood: 'happy', ph: true },
  gaya: { name: 'FINCH', role: 'Tavern', fur: '#c9682a', furDark: '#8a4213', torso: ['#a78bfa', '#5b3a9a', '#2a1a4a'], mood: 'happy', ph: true },
  kufa: { name: 'ZAID', role: 'Tavern', fur: '#d9a066', furDark: '#9a6a3a', torso: ['#2f9a8f', '#fbf8ec', '#1f5a52'], mood: 'excited', ph: true },
  nebo: { name: 'BRAMBLE', role: 'Tavern', fur: '#9a6f4a', furDark: '#6b4a2c', torso: ['#5a7a3a', '#e6dcc0', '#2a3a1a'], mood: 'happy', ph: true },
  zion: { name: 'KADE', role: 'Tavern', fur: '#3a3836', furDark: '#1a1918', torso: ['#c42d3c', '#f2c94c', '#5a1a1a'], mood: 'determined', ph: true },
};
const oppFor = k => { const o = FOOS_OPP[k] || FOOS_OPP.luxor, cap = o.name.charAt(0) + o.name.slice(1).toLowerCase();
  return { hi: ['Table is free. First to five. You are red.'], again: ['Again? Grab the handles.'], topics: { tips: ['Any tips?', 'Stop it, settle it, then shoot.'] }, win: ['Nice goal. Again?'], loss: ['Five! My table.'], level: ['Pin it, slide it, shoot. That is the whole game.'], ...o, cap, title: cap + "'s Table" }; };
const RULE = [['FOOS', 64, 100], ['BALL', 64, 164], ['FIRST', 30, 232], ['TO FIVE', 30, 272]];

// ---------------- the table ----------------
export function buildFoosTable(ctx, { world = 'luxor', T0, parent }) {
  const TV = TAVERNS[world] || TAVERNS.luxor, { THREE: T3, M, toon } = ctx, CT = ctx.canvasTex || canvasTex, { FW, FL, FY, GW } = FOOS;
  const tbl = new T3.Group(); tbl.position.copy(T0); parent.add(tbl);
  const fieldT = CT(256, 452, c => { for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#2f8a46' : '#2a7d3f'; c.fillRect(0, i * 452 / 12, 256, 452 / 12 + 1); } const g = c.createRadialGradient(128, 226, 30, 128, 226, 270); g.addColorStop(0, 'rgba(255,240,200,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0.25)'); c.fillStyle = g; c.fillRect(0, 0, 256, 452);
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3; c.strokeRect(6, 6, 244, 440); c.beginPath(); c.moveTo(6, 226); c.lineTo(250, 226); c.stroke(); c.beginPath(); c.arc(128, 226, 34, 0, 7); c.stroke(); for (const y of [6, 446]) { c.strokeRect(68, y === 6 ? 6 : 386, 120, 60); } c.fillStyle = '#fff'; c.beginPath(); c.arc(128, 226, 4, 0, 7); c.fill(); });
  const field = new T3.Mesh(new T3.PlaneGeometry(2 * FW, 2 * FL), new T3.MeshToonMaterial({ map: fieldT, gradientMap: ctx.grad })); field.rotation.x = -Math.PI / 2; field.position.y = FY; field.receiveShadow = true; tbl.add(field);
  const wood = toon(TV.rail), woodD = toon('#2a140a'), WH = 0.16, WT = 0.05;
  M(new T3.BoxGeometry(2 * FW + 2 * WT, 0.22, 2 * FL + 2 * WT), woodD, 0, FY - 0.12, 0, tbl, 0.02);
  for (const sx of [-1, 1]) M(new T3.BoxGeometry(WT, WH, 2 * FL + 2 * WT), wood, sx * (FW + WT / 2), FY + WH / 2 - 0.01, 0, tbl, 0.014);
  const endW = FW - GW / 2; for (const sz of [-1, 1]) { for (const sx of [-1, 1]) M(new T3.BoxGeometry(endW, WH, WT), wood, sx * (GW / 2 + endW / 2), FY + WH / 2 - 0.01, sz * (FL + WT / 2), tbl, 0.014); M(new T3.BoxGeometry(GW + 0.02, WH * 0.45, WT), wood, 0, FY + WH * 0.78, sz * (FL + WT / 2), tbl, 0.01);
    const mouth = new T3.Mesh(new T3.BoxGeometry(GW, WH * 0.55, WT * 1.4), new T3.MeshBasicMaterial({ color: 0x050505 })); mouth.position.set(0, FY + WH * 0.27, sz * (FL + WT * 0.7)); tbl.add(mouth); }
  // legs, a skirt with the world colour, the side serve hole
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) M(new T3.BoxGeometry(0.09, FY - 0.22, 0.09), woodD, sx * (FW - 0.02), (FY - 0.22) / 2, sz * (FL - 0.06), tbl, 0.012);
  const skT = CT(256, 64, c => { c.fillStyle = TV.wall; c.fillRect(0, 0, 256, 64); c.fillStyle = TV.trim; c.fillRect(0, 26, 256, 8); c.fillStyle = '#f6f3ee'; c.font = '900 20px Archivo, Arial'; c.textAlign = 'center'; c.fillText('FOOSBALL', 128, 22); }); const sk = new T3.MeshToonMaterial({ map: skT, gradientMap: ctx.grad });
  for (const sx of [-1, 1]) { const m = new T3.Mesh(new T3.PlaneGeometry(2 * FL, 0.2), sk); m.position.set(sx * (FW + WT + 0.002), FY - 0.12, 0); m.rotation.y = sx * Math.PI / 2; tbl.add(m); }
  M(new T3.CylinderGeometry(0.03, 0.03, 0.02, 12).rotateZ(Math.PI / 2), new T3.MeshBasicMaterial({ color: 0x0a0a0a }), FW + WT + 0.004, FY + 0.06, 0, tbl, 0);
  // score beads on a wire above each end
  const beads = { you: [], him: [] }; for (const [side, sz, col] of [['you', 1, '#e0442a'], ['him', -1, '#2f6fd8']]) { const wy = FY + WH + 0.03, wz = sz * (FL + WT * 0.5); M(new T3.CylinderGeometry(0.003, 0.003, 2 * FW, 6).rotateZ(Math.PI / 2), toon('#cfcac4'), 0, wy, wz, tbl, 0);
    for (let i = 0; i < FOOS.TO; i++) { const b = M(new T3.CylinderGeometry(0.016, 0.016, 0.02, 12).rotateZ(Math.PI / 2), toon(col), -FW + 0.03 + i * 0.026, wy, wz, tbl, 0.003); beads[side].push(b); } }
  return { tbl, beads, field };
}

export function buildFoosHall(ctx, { world = 'luxor' } = {}) {
  const H = buildPoolHall(ctx, { world, table: false, rule: RULE }); const T = buildFoosTable(ctx, { world, T0: H.T0, parent: H.root });
  const { FW, FL } = FOOS, ox = ctx.origin ? ctx.origin.x : 0, oz = ctx.origin ? ctx.origin.z : 0; H.colliders.push({ x0: H.T0.x - FW - 0.25 + ox, z0: H.T0.z - FL - 0.08 + oz, x1: H.T0.x + FW + 0.25 + ox, z1: H.T0.z + FL + 0.08 + oz });
  return { ...H, foos: T };
}

// ---------------- the stand-alone room + the game ----------------
export async function createFoosball({ container, onState = () => {}, world = 'luxor', startIn = 'intro', onExit = null }) {
  const TV = TAVERNS[world] || TAVERNS.luxor, WK = TV.key, OP = oppFor(WK), SK = { wins: WK + '.foos.wins', losses: WK + '.foos.losses', stake: WK + '.foos.stake', best: WK + '.foos.best' }, FL_ = { won: WK + 'FoosWon', table: WK + 'FoosTable', told: WK + 'FoosTold' };
  const ST = createStage(container, { bg: TV.bg, keep: true }), { CW, CHh, renderer, scene, camera, V3, toon, M, kit, audio, puff, smokeS, sun, glowTex, touch, addOutline, grad } = ST;
  camera.far = 90; camera.updateProjectionMatrix();
  scene.children.filter(o => o.isHemisphereLight).forEach(h => { h.color.set(0xffe2c8); h.groundColor.set(0x5a2a1a); h.intensity = 1.05; });
  sun.position.set(-4, 10, 7); sun.intensity = 1.0; sun.color.set(0xffe0c0); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, far: 40 }); sun.shadow.camera.updateProjectionMatrix();
  const HALL = buildFoosHall({ THREE, M, toon, canvasTex, scene, grad, addOutline }, { world: WK }), FT = HALL.foos;
  const { T0, spots } = HALL, { FW, FL, FY, GW, BR, FR } = FOOS;
  { const pl = new THREE.PointLight(0xfff0d0, touch ? 8 : 11, 6, 1.6); pl.position.set(T0.x, 2.4, T0.z); scene.add(pl); }
  const glow = (p, s, col = TV.glow, op = 0.55) => { const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); g.position.copy(p); g.scale.setScalar(s); scene.add(g); return g; };
  spots.sconces.forEach(p => glow(p, 1.3));
  const pend = new THREE.Group(); scene.add(pend); { const sh = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.22, 14, 1, true), toon(TV.shade)); sh.position.set(T0.x, 2.9, T0.z); pend.add(sh); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff2cc })); bulb.position.set(T0.x, 2.81, T0.z); pend.add(bulb); const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.3, 4), toon('#201e1d')); cord.position.set(T0.x, 3.65, T0.z); pend.add(cord); }
  const TA = tavernAudio(audio, { world: WK, bpmMul: 1.1 }); const ainit = () => { try { TA.ensure(); } catch (e) {} };
  const W = (x, y, z) => V3(T0.x + x, y, T0.z + z);

  // ---------- cast ----------
  const strip = f => { const P = f.userData.P; if (P.sword) P.sword.visible = false; if (P.gun) P.gun.visible = false; return f; };
  const npcFox = (c, outfit = 'vest', mood = 'neutral') => strip(kit.makeFox({ ...CAST.player, look: { ...CAST.player.look, fur: c.fur, furDark: c.furDark || c.fur }, torso: c.torso, outfit: c.outfit || outfit, crest: '', gear: 'none', mood: c.mood || mood }));
  const ben = strip(kit.makeFox({ ...CAST.player, gear: 'none' }));
  const opp = npcFox(OP, 'vest', OP.mood), keeper = npcFox(TV.keeper, 'vest', 'warm');
  const regList = [...TV.regulars.filter(r => r.name !== OP.name), ...(WK === 'luxor' ? [{ name: 'DABB', role: 'Tavern', fur: TV.shark.fur, furDark: TV.shark.furDark, torso: TV.shark.torso, mood: 'smug', lean: true, ph: true, lines: [['p', 'Fancy a game of foosball?'], ['n', 'Vesta took my handles away. Something about spinning. I maintain it is a legitimate technique.']] }] : [])];
  const regs = regList.map((r, i) => { const f = npcFox(r, 'coat', r.mood || 'neutral'); if (r.lean) { f.position.set(-6.2, 0, -1.6); f.rotation.y = Math.PI / 2; return { f, r, seat: false, yaw: Math.PI / 2 }; } const st = r.seat ? spots.stools[4] : spots.stools[i === 0 ? 0 : 2]; f.position.set(st.x - (r.seat ? 0 : 0.55), r.seat ? 0.62 : 0, st.z); f.rotation.y = Math.PI / 2; return { f, r, seat: !!r.seat, yaw: Math.PI / 2 }; });
  keeper.position.copy(spots.keeper); keeper.rotation.y = -Math.PI / 2;
  const homeOpp = V3(T0.x - FW - 0.9, 0, T0.z - FL + 0.3);

  // ---------- rods + the little fox players ----------
  const RY = FY + 0.075;   // rod height above the field
  const mkMan = (team, fur) => { const g = new THREE.Group(), body = toon(team), furM = toon(fur), dark = toon('#201e1d');
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.05, 0.018), body); torso.position.y = -0.012; g.add(torso); addOutline(torso, 0.002, 0.03);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), furM); head.position.y = 0.026; g.add(head); for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.014, 6), furM); ear.position.set(s * 0.008, 0.042, 0); g.add(ear); }
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.012, 6).rotateX(Math.PI / 2), toon('#f6f3ee')); snout.position.set(0, 0.024, (team === '#e0442a' ? -1 : 1) * 0.014); g.add(snout);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.045, 0.014), dark); legs.position.y = -0.058; g.add(legs); const foot = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.022), body); foot.position.y = -0.077; g.add(foot); return g; };
  const rodMat = toon('#cfcac4'), gripMat = toon('#201e1d');
  const rods = LINEUP.map(([side, n], i) => { const z = 0.525 - i * 0.15, g = new THREE.Group(); g.position.copy(W(0, RY, z)); scene.add(g);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 2 * FW + 0.5, 8).rotateZ(Math.PI / 2), rodMat); g.add(bar);
    for (const sx of [-1, 1]) { const bump = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.014, 10).rotateZ(Math.PI / 2), toon('#201e1d')); bump.position.x = sx * (FW - 0.012); bump.userData.bump = sx; g.add(bump); }
    const hx = side === 'you' ? FW + 0.28 : -FW - 0.28; const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.12, 10).rotateZ(Math.PI / 2), gripMat); grip.position.x = hx; g.add(grip);
    const men = OFFS[n].map(o => { const m = mkMan(side === 'you' ? '#e0442a' : '#2f6fd8', side === 'you' ? '#e8792e' : OP.fur); m.position.x = o; if (side === 'him') m.rotation.y = Math.PI; g.add(m); return { m, o }; });
    return { side, n, z, g, men, x: 0, tx: 0, vx: 0, ang: 0, kickT: 0, kickP: 0, kickHit: false, range: RANGE[n] }; });

  // ---------- ball ----------
  const rb = BR * 1.5;
  const ballT = canvasTex(64, 32, c => { c.fillStyle = '#f6f3ee'; c.fillRect(0, 0, 64, 32); c.fillStyle = '#201e1d'; for (const [x, y] of [[8, 8], [24, 20], [40, 8], [56, 20], [16, 26], [48, 26]]) { c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); } });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(rb, 14, 10), new THREE.MeshBasicMaterial({ map: ballT })); addOutline(ball, 0.003, rb); scene.add(ball);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff2c0, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.setScalar(rb * 6); scene.add(halo);
  const shTex = canvasTex(64, 64, c => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(0.6, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  const blob = (w, d, op = 1, y = 0.011) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, opacity: op, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 1; scene.add(m); return m; };
  { const tb = blob(2 * FW * 2.2, 2 * FL * 1.4, 0.75); tb.position.set(T0.x, 0.011, T0.z); }
  const ballSh = blob(rb * 3.4, rb * 3.4, 0.6, FY + 0.002);
  const trail = Array.from({ length: 8 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd23a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(rb * 3); scene.add(s); return s; }); const trailP = [];
  const flashes = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 1, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); m.renderOrder = 41; scene.add(m); return { m, t: 0, s: 1 }; }); let flashI = 0;
  const impact = (x, z, col, size = 1) => { const f = flashes[flashI++ % flashes.length]; f.m.position.copy(W(x, FY + 0.004, z)); f.m.material.color.set(col); f.t = 0.3; f.s = size; };
  // your rods' reach on the field: a faint red bar under each of your rods, brighter on the one nearest the ball
  const reachBars = rods.filter(r => r.side === 'you').map(r => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * FW, 0.05), new THREE.MeshBasicMaterial({ color: 0xff6a4a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); m.rotation.x = -Math.PI / 2; m.position.copy(W(0, FY + 0.003, r.z)); m.renderOrder = 2; scene.add(m); return { m, r }; });
  const goalGlow = [1, -1].map(sz => { const g = glow(W(0, FY + 0.05, sz * (FL + 0.02)), 0.5, 0xffffff, 0); g.scale.set(0.5, 0.25, 1); return g; });
  const motes = (() => { const n = touch ? 20 : 34, g = new THREE.BufferGeometry(), a = new Float32Array(n * 3), base = []; for (let i = 0; i < n; i++) base.push([T0.x + rr(-1, 1), rr(1.2, 2.6), T0.z + rr(-1.2, 1.2), rr(0, 6)]); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color: 0xffe6b0, size: 0.06, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(p); return { a, base, g }; })();
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

  // ---------- state ----------
  const S0 = () => ({ mode: 'intro', ph: 'idle', t: 0, score: { you: 0, him: 0 }, stake: 0, view: 'end', zoom: 1, flash: null, flashT: 0, call: '', callT: 0, toast: null, toastT: 0, done: null, demo: false, dlg: null, near: null, dropT: 0, goalT: 0, best: 0, shots: 0, idleT: 0, glow: 0, charge: 0, charging: false, last: null });
  let HIDDEN = false; let S = S0(), PAUSE = false; const stick = { x: 0, y: 0 }, keys = new Set();
  const B = { x: 0, z: 0, vx: 0, vz: 0, live: false, y: FY + BR };
  let you = 0, youT = 0;   // your rods' shared lateral position, −1..1 of each rod's own travel
  const PL = { x: spots.enter.x, z: spots.enter.z, yaw: Math.PI, mv: 0, hop: 0 }, OX = { x: homeOpp.x, z: homeOpp.z, yaw: Math.PI / 2, mv: 0 };
  const flash = (txt, col = '#ffd23a', t = 1.4) => { S.flash = { txt, col }; S.flashT = t; }, call = (txt, t = 2.6) => { S.call = txt; S.callT = t; }, toast = (txt, t = 3) => { S.toast = txt; S.toastT = t; };
  const ON = OP.name, ONc = OP.cap, kmh = v => Math.round(v * 3.6);
  const myRods = rods.filter(r => r.side === 'you'), hisRods = rods.filter(r => r.side === 'him');

  // ---------- physics ----------
  function kick(side, power) { const list = side === 'you' ? myRods : hisRods; let any = false; for (const r of list) { if (r.kickT > 0.1) continue; r.kickT = 0.28; r.kickP = clamp(power, 0.3, 1); r.kickHit = false; any = true; } if (any) TA.rod(power); if (side === 'you') buzz(8 + Math.round(power * 12)); }
  function sub(h) { // rods glide to their targets
    if (!(h > 0)) return;
    for (const r of rods) { const ox = r.x, sp = r.side === 'you' ? 2.6 : 2.6 * (S.oppSpd || 0.6); r.tx = clamp(r.tx, -r.range, r.range); const d = r.tx - r.x, mx = sp * h; r.x = Math.abs(d) <= mx ? r.tx : r.x + Math.sign(d) * mx; const vPrev = r.vx; r.vx = damp(r.vx, (r.x - ox) / h, 25, h); if (!Number.isFinite(r.vx)) r.vx = 0; if (Math.abs(r.x) >= r.range - 1e-4 && Math.abs(vPrev) > 1.2 && Math.sign(vPrev) === Math.sign(r.x) && S.mode === 'play') { TA.clack(0.25); r.vx = 0; } if (r.kickT > 0) r.kickT = Math.max(0, r.kickT - h); }
    if (!B.live || S.ph !== 'live') return;
    B.vx *= 1 - 0.32 * h; B.vz *= 1 - 0.32 * h; B.x += B.vx * h; B.z += B.vz * h;
    // the corners are sloped on a real table; here a gentle push keeps the ball from dying in them
    if (Math.abs(B.x) > FW - 0.045) B.vx -= Math.sign(B.x) * 0.25 * h; if (Math.abs(B.z) > FL - 0.04 && Math.abs(B.x) > GW / 2) B.vz -= Math.sign(B.z) * 0.25 * h;
    if (Math.abs(B.x) > FW - BR) { B.x = Math.sign(B.x) * (FW - BR); if (B.vx * Math.sign(B.x) > 0) { TA.bang(Math.abs(B.vx) / 3); B.vx = -B.vx * 0.7; } }
    for (const sz of [-1, 1]) { if (B.z * sz < FL - BR) continue; if (Math.abs(B.x) < GW / 2 - BR * 0.3) { if (B.z * sz > FL + 0.03) { goal(sz > 0 ? 'him' : 'you'); return; } continue; } B.z = sz * (FL - BR); if (B.vz * sz > 0) { TA.bang(Math.abs(B.vz) / 3); B.vz = -B.vz * 0.7; if (Math.abs(B.x) < GW / 2 + 0.03 && Math.abs(B.vz) > 1) { TA.post(); impact(B.x, sz * FL, 0xffffff, 1); if (S.mode === 'play') { flash(sz < 0 ? 'OFF THE POST!' : 'SAVED BY THE POST', sz < 0 ? '#ffd23a' : '#22c55e', 0.9); TA.ooh(); } } } }
    // the men: a ball under a kicking man is struck; any other man is a solid foot the ball bounces off
    for (const r of rods) { const dir = r.side === 'you' ? -1 : 1, dzr = B.z - r.z; if (Math.abs(dzr) > 0.07) continue;
      for (const man of r.men) { const fx = r.x + man.o, dx = B.x - fx;
        if (r.kickT > 0.14 && !r.kickHit && Math.abs(dx) < 0.03 && dzr * dir > -0.025 && dzr * dir < 0.06) { // the swing connects
          const p = r.kickP, sp = 1.4 + p * 3.6, lat = clamp(dx / 0.03, -1, 1) * 0.9 + r.vx * 0.5; B.vz = dir * sp; B.vx = lat * (0.5 + p * 0.6); B.z = r.z + dir * (FR + BR + 0.004); r.kickHit = true; S.last = r.side; S.shots++;
          TA.clack(0.3 + p * 0.7); impact(B.x, B.z, r.side === 'you' ? 0xffb09a : 0x9ac4ff, 0.6 + p); const v = Math.hypot(B.vx, B.vz);
          if (r.side === 'you') { buzz(10 + Math.round(p * 20)); if (p > 0.8) { const k = kmh(v), rec = save.stat(SK.best, 0); S.best = Math.max(S.best, k); if (!S.demo && rec && k > rec && !S.recFlashed) { S.recFlashed = true; flash('NEW RECORD · ' + k + ' km/h', '#22c55e', 1.3); TA.cheer(0.6); } else flash('SHOT · ' + k + ' km/h', '#ffd23a', 0.8); S.shake = 0.008; } }
          continue; }
        if (Math.abs(r.ang) > 0.9) continue;   // spun up out of the way
        const d = Math.hypot(dx, dzr), rad = FR + BR; if (d < rad && d > 1e-6) { const nx = dx / d, nz = dzr / d; B.x = fx + nx * rad; B.z = r.z + nz * rad; const rel = (B.vx - r.vx) * nx + B.vz * nz; if (rel < 0) { const towardOwn = r.side === 'you' ? B.vz > 1.8 : B.vz < -1.8; B.vx -= 1.6 * rel * nx; B.vz -= 1.6 * rel * nz; B.vx += r.vx * 0.3; if (-rel > 0.4) TA.clack(Math.min(1, -rel / 3) * 0.6); S.last = r.side; if (towardOwn && r.n <= 2 && S.mode === 'play' && S.t - (S.saveT || -9) > 1) { S.saveT = S.t; impact(B.x, B.z, 0x22c55e, 1); flash(r.side === 'you' ? 'SAVE!' : 'SAVED BY ' + ON, r.side === 'you' ? '#22c55e' : '#ff9a8a', 0.8); if (r.side === 'you') { TA.cheer(0.3); buzz(18); } } } } } } }
  let acc = 0; function physics(dt) { acc += dt; const h = 1 / 480; let n = 0; while (acc >= h && n < 40) { sub(h); acc -= h; n++; } if (n >= 40) acc = 0; }
  // the ball comes in through the hole in the side wall, rolling across the middle (or toward whoever just let one in)
  function drop(toward = null) { S.ph = 'drop'; S.dropT = 0.9; B.live = false; B.x = FW - BR; B.z = toward === 'you' ? 0.06 : toward === 'him' ? -0.06 : rr(-0.03, 0.03); B.vx = 0; B.vz = 0; S.idleT = 0; }
  function goal(scorer) { const mine = scorer === 'you'; S.score[scorer]++; S.ph = 'goal'; S.goalT = 1.6; B.live = false; S.party = { side: scorer, t: 1.4 }; TA.goal(mine); buzz(mine ? [30, 50, 60] : 120); S.glow = 1.5; S.glowCol = mine ? 0xff3a2a : 0x3a7aff; goalGlow[mine ? 1 : 0].material.opacity = 0.9;
    { const w = W(0, FY + 0.05, mine ? -FL : FL); puff(w.x, w.y, w.z, mine ? 0xff8a6a : 0x8fc4ff, 4); } const own = S.last && S.last !== scorer; flash(mine ? (own ? 'OWN GOAL BY ' + ON : 'GOAL!') : (own ? 'OWN GOAL' : ON + ' SCORES'), mine ? '#22c55e' : '#ff9a8a', 1.4);
    react(mine ? 'goal' : 'his'); setTimeout(() => TA.bead(), 500);
    if (S.score[scorer] >= FOOS.TO) { endMatch(mine ? 'win' : 'loss'); return; } const a = S.score.you, b = S.score.him; call(a === b ? a + ' ALL' : (a > b ? 'BEN ' : ON + ' ') + Math.max(a, b) + '–' + Math.min(a, b) + (Math.max(a, b) === FOOS.TO - 1 ? ' · MATCH POINT' : ''), 2.4); S.nextDrop = mine ? 'him' : 'you'; }
  function endMatch(res) { S.ph = 'over'; S.overT = S.t + 2.4; S.res = res; buzz(res === 'win' ? [40, 60, 40, 60, 120] : 220); call(res === 'win' ? 'FIVE! THE TABLE IS YOURS' : ON + ' GETS TO FIVE', 3); flash(res === 'win' ? 'MATCH!' : 'MATCH TO ' + ON, res === 'win' ? '#22c55e' : '#ff9a8a', 2.2); if (res === 'win') { TA.cheer(1); react('win'); } else { TA.groan(); react('loss'); } }
  function finishMatch() { const res = S.res, st = S.stake, demo = S.demo; let gold = 0, unlocked = null; const prevBest = save.stat(SK.best, 0);
    if (!demo) { try { if (res === 'win') { if (st > 0) { save.addGold(st); gold = st; TA.coins(Math.min(12, 3 + Math.round(st / 10))); save.setFlag(FL_.won); save.setStat(SK.stake, Math.min(FOOS.BET_MAX, Math.max(20, st * 2))); } save.addXp(st > 0 ? 40 : 12); save.setStat(SK.wins, save.stat(SK.wins, 0) + 1); if (st > 0 && save.stat(SK.wins, 0) >= 3 && !save.flag(FL_.table)) { save.setFlag(FL_.table); unlocked = true; } }
      else { const lose = Math.min(st, save.data.gold); if (lose > 0) save.addGold(-lose); gold = -lose; save.setStat(SK.losses, save.stat(SK.losses, 0) + 1); } if (S.best) save.best(SK.best, S.best); } catch (e) {} }
    S.done = { res, stake: st, gold, demo, unlocked, wins: save.stat(SK.wins, 0), losses: save.stat(SK.losses, 0), score: { ...S.score }, best: S.best, rally: S.shots, newRec: !demo && S.best > prevBest && S.best > 0, line: pick(res === 'win' ? OP.win : OP.loss) };
    S.mode = demo ? 'intro' : 'done'; if (demo) { S.demo = false; S.done = null; toIntro(); } }

  // ---------- the regular (and the demo's autopilot for you): line every rod up on the ball, kick when it is in front of a foot ----------
  function brain(Bt, side, dt) { const list = side === 'you' ? myRods : hisRods, dir = side === 'you' ? -1 : 1; Bt.re -= dt; Bt.cool = Math.max(0, (Bt.cool || 0) - dt);
    if (Bt.re <= 0) { Bt.re = Bt.react * rr(0.8, 1.25); const px = B.x + B.vx * 0.12; Bt.aim = Bt.aim ?? 0; if (Math.random() < 0.3) Bt.aim = rr(-1, 1) * 0.02;
      if (side === 'you') { // your rods move together: pick the offset that puts the nearest man of the rod closest to the ball onto it
        let best = null; for (const r of list) { const dz = Math.abs(B.z - r.z); if (!best || dz < best.dz) best = { r, dz }; } const r = best.r; let bx = 0, bd = 9; for (const m of r.men) { const want = px - m.o + Bt.aim; const d = Math.abs(want - clamp(want, -r.range, r.range)); if (d < bd) { bd = d; bx = want; } } youT = clamp(bx / r.range, -1, 1) + rr(-1, 1) * Bt.err; }
      else for (const r of list) { let bx = 0, bd = 9; for (const m of r.men) { const want = px - m.o + Bt.aim; const d = Math.abs(want - clamp(want, -r.range, r.range)); if (d < bd) { bd = d; bx = want; } } r.tx = bx + rr(-1, 1) * Bt.err * 0.08; } }
    // kick: the ball is just in front of one of this side's feet
    if (B.live && S.ph === 'live' && !Bt.cool) for (const r of list) { const dz = (B.z - r.z) * dir; if (dz > -0.01 && dz < 0.05) { for (const m of r.men) if (Math.abs(B.x - (r.x + m.o)) < 0.026) { if (Math.random() < 0.35 + Bt.skill * 0.5) { kick(side, rr(0.45, 0.75) + Bt.skill * 0.25); Bt.cool = 0.35; } else Bt.cool = 0.12; return; } } } }
  const botOpp = { re: 0, react: 0.12, skill: 0.4, err: 0.3 }, botYou = { re: 0, react: 0.07, skill: 0.75, err: 0.08 };
  function setLevel() { const lvl = !!save.flag(FL_.table), w = save.stat(SK.wins, 0), st = S.stake || 0, k = S.demo ? 0.35 : clamp(0.3 + w * 0.06 + st / 400 + (lvl ? 0.12 : 0), 0.25, 0.85);
    Object.assign(botOpp, { react: 0.2 - k * 0.1, skill: k, err: 0.45 - k * 0.32 }); S.oppSpd = 0.42 + k * 0.4; }

  // ---------- the room reacts ----------
  function moodFor(f, mood, t = 2.4) { const u = f.userData; if (u.moodBack == null) u.moodBack = u.mood; u.mood = mood; u.moodT = t; }
  function react(kind) { const crowd = [...regs.map(g => g.f), keeper];
    if (kind === 'goal') { crowd.forEach((f, i) => { if (Math.random() < 0.6) setTimeout(() => { f.userData.hop = 1; }, i * 90); moodFor(f, 'happy', 1.6); }); TA.cheer(0.5); moodFor(opp, 'stern', 2); moodFor(ben, 'excited', 1.6); PL.hop = 0.5; }
    else if (kind === 'his') { moodFor(opp, 'excited', 2.2); opp.userData.hop = 1; crowd.forEach(f => moodFor(f, 'surprised', 1.4)); }
    else if (kind === 'win') { crowd.forEach((f, i) => { setTimeout(() => { f.userData.hop = 1; }, i * 110); setTimeout(() => { f.userData.hop = 1; }, 600 + i * 110); moodFor(f, 'excited', 3.5); }); moodFor(opp, 'sad', 4); moodFor(ben, 'excited', 4); PL.hop = 0.5; }
    else if (kind === 'loss') { moodFor(opp, 'excited', 4); opp.userData.hop = 1; moodFor(ben, 'sad', 3); crowd.forEach(f => moodFor(f, 'surprised', 2)); } }

  // ---------- walking ----------
  const PR0 = 0.42, solids = HALL.colliders;
  function collide(o, r) { for (const c of solids) { const cx = clamp(o.x, c.x0, c.x1), cz = clamp(o.z, c.z0, c.z1), dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz); if (d < r) { if (d > 1e-5) { o.x = cx + dx / d * r; o.z = cz + dz / d * r; } else { o.z = c.z1 + r; } } }
    for (const f of [opp, keeper, ...regs.map(r => r.f)]) { const dx = o.x - f.position.x, dz = o.z - f.position.z, d = Math.hypot(dx, dz), rr0 = r + 0.42; if (d < rr0 && d > 1e-4) { o.x = f.position.x + dx / d * rr0; o.z = f.position.z + dz / d * rr0; } }
    o.x = clamp(o.x, -HALL.W / 2 + 0.5, HALL.W / 2 - 0.5); o.z = clamp(o.z, -HALL.D / 2 + 0.5, Math.abs(o.x) < 1.0 ? HALL.D / 2 + 0.3 : HALL.D / 2 - 0.5); }
  const capName = n => n.charAt(0) + n.slice(1).toLowerCase();
  function walkStep(dt) { let sx = stick.x, sy = stick.y; if (keys.has('KeyA') || keys.has('ArrowLeft')) sx = -1; if (keys.has('KeyD') || keys.has('ArrowRight')) sx = 1; if (keys.has('KeyW') || keys.has('ArrowUp')) sy = 1; if (keys.has('KeyS') || keys.has('ArrowDown')) sy = -1;
    const hy = Math.hypot(sx, sy), m = Math.min(1, hy); PL.mv = 0; if (!S.dlg && m > 0.12) { const sp = 4.2 * m, vx = sx / hy * sp, vz = -sy / hy * sp; PL.x += vx * dt; PL.z += vz * dt; PL.yaw = Math.atan2(vx, vz); PL.mv = sp; PL.stepD = (PL.stepD || 0) + sp * dt; if (PL.stepD > 1.05) { PL.stepD = 0; TA.step(); } }
    collide(PL, PR0);
    const cands = [{ id: 'opp', p: opp.position, r: 1.9, label: 'Talk to ' + ONc }, { id: 'table', p: null, label: 'Play foosball' }, { id: 'keeper', p: spots.barFront, r: 1.7, label: 'Talk to ' + capName(TV.keeper.name) }, ...regs.map((g, i) => ({ id: 'reg' + i, p: g.f.position, r: 1.6, label: 'Talk to ' + capName(g.r.name) })), { id: 'door', p: spots.door, r: 1.5, label: 'Leave the tavern' }];
    let near = null, nd = 1e9; for (const c of cands) { let d; if (c.id === 'table') { const dx = Math.max(0, Math.abs(PL.x - T0.x) - FW - 0.25), dz = Math.max(0, Math.abs(PL.z - T0.z) - FL); d = Math.hypot(dx, dz); if (d < 0.75 && d < nd) { nd = d; near = c; } continue; } d = Math.hypot(PL.x - c.p.x, PL.z - c.p.z); if (d < c.r && d < nd) { nd = d; near = c; } }
    S.near = near; }
  // ---------- talk ----------
  const N = t => ({ who: 'n', text: t }), Pp = t => ({ who: 'p', text: t });
  function openDlg(name, role, lines, choices, onChoose, fox) { S.dlg = { name, role, lines, i: 0, chars: 0, choices, onChoose, fox }; if (fox) fox.userData.talking = true; }
  function closeDlg() { if (S.dlg && S.dlg.fox) S.dlg.fox.userData.talking = false; S.dlg = null; }
  function oppTalk() { const won = save.flag(FL_.won), lvl = save.flag(FL_.table), told = save.flag(FL_.told); let lines;
    if (lvl && !told) { lines = OP.level.map(N); save.setFlag(FL_.told); } else lines = (won ? OP.again : OP.hi).map(N);
    const asked = S.asked || (S.asked = {}), ch = () => [{ text: "Let's play.", k: 'play' }, ...Object.entries(OP.topics).map(([k, v]) => ({ text: v[0], k })), { text: 'Another time.', k: 'bye', bye: true }].map(c => ({ ...c, asked: !!asked[c.k] }));
    const onChoose = c => { if (c.k === 'play') { closeDlg(); api.openStake(); return; } if (c.k === 'bye') { openDlg(ON, OP.role, [N('The little foxes will wait. Come back.')], null, null, opp); return; } asked[c.k] = true; openDlg(ON, OP.role, OP.topics[c.k].slice(1).map(N), ch(), onChoose, opp); };
    openDlg(ON, OP.role, lines, ch(), onChoose, opp); }
  function keeperTalk() { const K = TV.keeper, ch = () => [...K.stock.map(([id, label, price]) => ({ text: label + ' · ' + price + 'g', id, label, price })), { text: 'Bye.', bye: true }];
    const onChoose = c => { if (c.bye) { closeDlg(); return; } if (save.spend(c.price)) { save.give(c.id, 1); toast('+1 ' + c.label + ' · −' + c.price + 'g'); TA.coins(4); } else toast('Not enough gold for ' + c.label + '.'); openDlg(K.name, K.role, [N('Anything else?')], ch(), onChoose, keeper); };
    openDlg(K.name, K.role, [N(K.greeting)], ch(), onChoose, keeper); }
  function talk() { if (S.mode !== 'walk') return; const d = S.dlg; if (d) { const ln = d.lines[d.i]; if (d.chars < ln.text.length) { d.chars = ln.text.length; return; } if (d.i < d.lines.length - 1) { d.i++; d.chars = 0; return; } if (!d.choices) closeDlg(); return; }
    const n = S.near; if (!n) return; ainit(); if (n.id === 'opp' || n.id === 'table') oppTalk(); else if (n.id === 'keeper') keeperTalk(); else if (n.id === 'door') { TA.door(); if (api.onExit) api.onExit(); else toast(TV.door + ' The world map takes it from here.'); } else { const g = regs[+n.id.slice(3)]; openDlg(g.r.name, g.r.role, g.r.lines.map(([w, t]) => w === 'p' ? Pp(t) : N(t)), null, null, g.f); } }

  // ---------- camera ----------
  const CAM = { pos: V3(T0.x + 6, 5, T0.z + 7), look: V3(T0.x, FY, T0.z) }; camera.position.copy(CAM.pos);
  const SAFE = { t: 0, b: 0, l: 0, r: 0 }, fitCam = new THREE.PerspectiveCamera(50, 1, 0.05, 90), fitCache = new Map(), _p = V3();
  function fitView(key, pts, yaw, el, fov) { const Wd = CW(), H = CHh(), ck = key + '|' + Wd + 'x' + H + '|' + SAFE.t + '|' + SAFE.b + '|' + SAFE.l + '|' + SAFE.r + '|' + S.zoom.toFixed(2); if (fitCache.has(ck)) return fitCache.get(ck);
    fitCam.aspect = Wd / H; fitCam.fov = fov; fitCam.updateProjectionMatrix(); const yT = 1 - 2 * SAFE.t / H - 0.03, yB = -1 + 2 * SAFE.b / H + 0.03, xL = -1 + 2 * SAFE.l / Wd + 0.03, xR = 1 - 2 * SAFE.r / Wd - 0.03, sx = (xL + xR) / 2, sy = (yT + yB) / 2;
    const dir = V3(Math.sin(yaw) * Math.cos(el), Math.sin(el), Math.cos(yaw) * Math.cos(el)), tgt = V3(); pts.forEach(p => tgt.add(p)); tgt.multiplyScalar(1 / pts.length);
    const bounds = d => { fitCam.position.copy(tgt).addScaledVector(dir, d); fitCam.lookAt(tgt); fitCam.updateMatrixWorld(); let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for (const p of pts) { _p.copy(p).project(fitCam); if (_p.z > 1) return null; x0 = Math.min(x0, _p.x); x1 = Math.max(x1, _p.x); y0 = Math.min(y0, _p.y); y1 = Math.max(y1, _p.y); } return { x0, x1, y0, y1 }; };
    const fits = d => { const b = bounds(d); return b && b.x1 - b.x0 <= xR - xL && b.y1 - b.y0 <= yT - yB; }; let d = 4;
    for (let it = 0; it < 4; it++) { let lo = 0.5, hi = 40; for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; } d = hi; const b = bounds(d); if (!b) break; const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, th = Math.tan(fov * Math.PI / 360) * d, right = V3().setFromMatrixColumn(fitCam.matrixWorld, 0), up = V3().setFromMatrixColumn(fitCam.matrixWorld, 1); tgt.addScaledVector(right, (cx - sx) * th * fitCam.aspect).addScaledVector(up, (cy - sy) * th); }
    d /= S.zoom; const out = { pos: tgt.clone().addScaledVector(dir, d), look: tgt.clone() }; if (fitCache.size > 80) fitCache.clear(); fitCache.set(ck, out); return out; }
  const tablePts = () => [[-FW - 0.06, -FL - 0.06], [FW + 0.06, -FL - 0.06], [-FW - 0.06, FL + 0.06], [FW + 0.06, FL + 0.06]].map(([x, z]) => W(x, FY + 0.08, z));
  function camShot() { const Wd = CW(), H = CHh(), port = Wd < H;
    if (S.mode === 'play' || S.mode === 'stake' || S.mode === 'done') { const top = S.view === 'top', fov = port ? 46 : 38; camera.fov = fov; return fitView(top ? 'top' : 'end', tablePts(), 0, top ? 1.45 : (port ? 1.12 : 0.98), fov); }
    if (S.mode === 'intro') { const a = S.t * 0.12, r = port ? 7.5 : 6.4; camera.fov = port ? 62 : 48; const look = V3(T0.x + (port ? 0 : -1.0), FY - (port ? 0.9 : 0.2), T0.z); return { pos: V3(T0.x + Math.sin(a) * r, port ? 6.2 : 4.0, T0.z + Math.cos(a) * r), look }; }
    camera.fov = port ? 60 : 50; const off = port ? V3(0, 9.6, 7.4) : V3(0, 9.4, 6.2); return { pos: V3(PL.x + off.x, off.y, PL.z + off.z), look: V3(PL.x, 0.8, PL.z - (port ? 0.6 : 1.1)) }; }

  // ---------- your rods: thumb pad / table (scaled to the table on screen), mouse (under the pointer), keys; KICK button ----------
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FY), ndc = new THREE.Vector2(), hitP = V3(), ptrs = new Map(); let pinch = null;
  const fieldAt = (cx, cy) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); if (!ray.ray.intersectPlane(plane, hitP)) return null; return { x: hitP.x - T0.x, z: hitP.z - T0.z }; };
  const canMove = () => S.mode === 'play' && !S.demo && !PAUSE;
  const _a = V3(), _b = V3(), _r = V3(), _f = V3();
  function mPerPx() { const r = renderer.domElement.getBoundingClientRect(); _a.copy(W(-FW, FY, 0)).project(camera); _b.copy(W(FW, FY, 0)).project(camera); const px = Math.hypot((_b.x - _a.x) * r.width / 2, (_b.y - _a.y) * r.height / 2); return px > 4 ? 2 * FW / px : 0.003; }
  let padP = null;
  function padDown(x, y, id = 'pad', mouse = false) { if (!canMove()) return false; ainit(); if (mouse) { const t = fieldAt(x, y); if (t) mouseTo(t.x); } padP = { id, x, y, mouse, t: performance.now() }; S.touching = true; return true; }
  function mouseTo(fx) { // put the nearest of your men (on the rod nearest the ball) under the pointer
    let best = null; for (const r of myRods) { const dz = Math.abs(B.z - r.z); if (!best || dz < best.dz) best = { r, dz }; } const r = best.r; let bx = 0, bd = 9; for (const m of r.men) { const want = fx - m.o, d = Math.abs(want - clamp(want, -r.range, r.range)); if (d < bd) { bd = d; bx = want; } } youT = clamp(bx / r.range, -1, 1); }
  function padMove(x, y, id = 'pad') { if (!padP || padP.id !== id || !canMove()) return; if (padP.mouse) { const t = fieldAt(x, y); if (t) mouseTo(t.x); padP.x = x; padP.y = y; return; }
    const dx = x - padP.x, dy = y - padP.y, now = performance.now(), dtm = Math.max(1, now - padP.t); padP.x = x; padP.y = y; padP.t = now; camera.updateMatrixWorld(); _r.setFromMatrixColumn(camera.matrixWorld, 0); camera.getWorldDirection(_f); _r.y = 0; _f.y = 0; _r.normalize(); _f.normalize();
    const wx = (_r.x * dx - _f.x * dy) * mPerPx() * 1.6; youT = clamp(youT + wx / 0.3, -1, 1);   // ~0.3 m of thumb travel (on the table's scale) sweeps a rod end to end
    if (CW() < CHh() && dy / dtm < -1.1 && Math.abs(dy) > Math.abs(dx) * 1.4) kick('you', clamp(-dy / dtm / 3, 0.4, 0.9)); }   // portrait: flick up = kick
  function padUp(id = 'pad') { if (padP && padP.id === id) { padP = null; S.touching = false; } }
  function kickDown() { if (!canMove()) return; ainit(); S.charging = true; S.charge = 0; }
  function kickUp() { if (!S.charging) return; S.charging = false; if (!canMove()) return; kick('you', 0.35 + S.charge * 0.65); S.charge = 0; }
  const el = renderer.domElement;
  const onDown = e => { if (S.mode !== 'play') return; e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (er) {} ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: S.zoom }; padUp(e.pointerId); return; } padDown(e.clientX, e.clientY, e.pointerId, e.pointerType === 'mouse'); };
  const onMove = e => { if (!ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse' && canMove() && !padP) { const t = fieldAt(e.clientX, e.clientY); if (t) mouseTo(t.x); } return; } ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pinch && ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; S.zoom = clamp(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(30, pinch.d), 0.75, 1.6); return; } padMove(e.clientX, e.clientY, e.pointerId); };
  const onUp = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; padUp(e.pointerId); };
  el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);
  const onCtx = e => { if (S.mode === 'play') e.preventDefault(); }; el.addEventListener('contextmenu', onCtx);
  const onMDown = e => { if (S.mode === 'play' && e.pointerType === 'mouse' && e.button === 2) { kickDown(); } }, onMUp = e => { if (e.pointerType === 'mouse' && e.button === 2) kickUp(); }; el.addEventListener('pointerdown', onMDown); el.addEventListener('pointerup', onMUp);
  const onWheel = e => { if (S.mode !== 'play') return; e.preventDefault(); S.zoom = clamp(S.zoom * (e.deltaY > 0 ? 0.93 : 1.07), 0.75, 1.6); }; el.addEventListener('wheel', onWheel, { passive: false });
  function keyMove(dt) { let k = 0; if (keys.has('KeyA') || keys.has('ArrowLeft')) k -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) k += 1; if (k) youT = clamp(youT + k * dt * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 5 : 3), -1, 1); }

  // ---------- per-frame ----------
  const clock = new THREE.Clock(); let raf = 0, hudT = 0;
  const placeFox = (f, x, z, yaw, mv, dt) => { f.position.x = x; f.position.z = z; let d = ((yaw - f.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI; f.rotation.y += d * Math.min(1, dt * 10); kit.animFox(f, dt, mv); };
  const walkTo = (o, tx, tz, sp, dt) => { const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz); if (d < 0.03) { o.mv = 0; return true; } const k = Math.min(1, sp * dt / d); o.x += dx * k; o.z += dz * k; o.mv = Math.min(d / dt, sp); o.yaw = Math.atan2(dx, dz); return false; };
  function poseHandles(f, k) { const P = f.userData.P; P.arms[0].rotation.set(-1.2 + k * 0.3, 0, 0.25); P.arms[1].rotation.set(-1.2 - k * 0.3, 0, -0.25); P.body.rotation.x = 0.22; }
  const ghostMats = new Map(); const ghostify = f => { if (ghostMats.has(f)) return ghostMats.get(f); const list = []; f.traverse(o => { if (!o.isMesh || !o.material) return; const one = m => { const c = m.clone(); c.transparent = true; list.push(c); return c; }; o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material); }); ghostMats.set(f, list); return list; };
  const fadeFox = (f, target, dt) => { const Lm = ghostify(f), cur = f.userData.fade ?? 1, v = cur + (target - cur) * Math.min(1, dt * 8); f.userData.fade = v; for (const m of Lm) { const base = m.userData.op0 ?? (m.userData.op0 = m.opacity); m.opacity = base * v; m.depthWrite = v > 0.95; } };
  const foxBlobs = [ben, opp, keeper, ...regs.map(g => g.f)].map(f => ({ f, b: blob(1.15, 1.15, 0.85) }));
  function step(dt) { S.t += dt; S.flashT -= dt; if (S.flashT <= 0) S.flash = null; S.callT -= dt; if (S.callT <= 0) S.call = ''; S.toastT -= dt; if (S.toastT <= 0) S.toast = null;
    for (const p of smokeS) { if (p.life <= 0) { p.s.material.opacity = 0; continue; } p.life -= dt * 0.9; p.s.position.addScaledVector(p.v, dt); p.s.material.opacity = 0.4 * p.life; p.s.scale.setScalar(0.2 + (1 - p.life) * 0.4); }
    if (S.dlg) S.dlg.chars = Math.min(S.dlg.lines[S.dlg.i].text.length, S.dlg.chars + dt * 70);
    const play = S.mode === 'play';
    if (play) { if (!S.demo) { keyMove(dt); if (S.charging) { const was = S.charge; S.charge = Math.min(1, S.charge + dt / 0.45); if (was < 1 && S.charge >= 1) { TA.beep(false); buzz(15); } } } else brain(botYou, 'you', dt); brain(botOpp, 'him', dt);
      for (const r of myRods) r.tx = youT * r.range;
      if (S.ph === 'drop') { S.dropT -= dt; B.x = FW - BR - (0.9 - S.dropT) * 0.05; if (S.dropT <= 0) { S.ph = 'live'; B.live = true; B.vx = -rr(0.9, 1.3); B.vz = rr(-0.08, 0.08); TA.serve(); TA.tok('floor', 0.7); impact(B.x, B.z, 0xffffff, 0.6); } }
      else if (S.ph === 'goal') { S.goalT -= dt; if (S.goalT <= 0) drop(S.nextDrop); }
      else if (S.ph === 'over' && S.t >= S.overT) finishMatch();
      physics(dt);
      if (S.ph === 'live' && !S.demo && Math.hypot(B.vx, B.vz) < 0.25 && S.t - (S.hintT || -9) > 5) { for (const r of myRods) { const dz = (B.z - r.z) * -1; if (dz > -0.01 && dz < 0.05 && r.men.some(m => Math.abs(B.x - (r.x + m.o)) < 0.026)) { S.hintT = S.t; flash('BALL STOPPED · KICK!', '#ffd23a', 0.9); break; } } }
      if (S.ph === 'live') { if (Math.hypot(B.vx, B.vz) < 0.05) { S.idleT += dt; if (S.idleT > 2.6) { flash('DEAD BALL · BACK IN', '#ffffff', 0.9); drop(); } } else S.idleT = 0; }
      if (S.demo && S.t > S.demoEnd && S.ph !== 'goal') { S.demo = false; toIntro(); return; } }
    else if (S.mode === 'walk') walkStep(dt);
    if (!play) { youT = damp(youT, 0, 3, dt); for (const r of rods) { r.tx = r.side === 'you' ? youT * r.range : 0; } for (let i = 0; i < 6; i++) sub(dt / 6); }
    // rods: slide, spin with the kick (wind back, strike, follow through), men lean with the swing
    for (const r of rods) { const k = r.kickT > 0 ? 1 - r.kickT / 0.28 : 1, dir = r.side === 'you' ? 1 : -1; r.ang = r.kickT > 0 ? (k < 0.35 ? -k / 0.35 * 0.7 : (k < 0.6 ? -0.7 + (k - 0.35) / 0.25 * 2.1 : 1.4 * (1 - (k - 0.6) / 0.4))) * dir : damp(r.ang, 0, 12, dt);
      r.g.position.copy(W(r.x, RY, r.z)); r.g.rotation.x = -r.ang; const party = S.party && S.party.side === r.side && S.party.t > 0; r.men.forEach((m, j) => { m.m.position.y = party ? Math.abs(Math.sin(S.t * 13 + j * 1.3 + r.z * 9)) * 0.022 : 0; }); }
    if (S.party) S.party.t -= dt;
    // the ball
    const showBall = play && (B.live || S.ph === 'drop'); ball.visible = halo.visible = ballSh.visible = showBall; ball.position.copy(W(B.x, FY + rb, B.z)); halo.position.copy(ball.position); ballSh.position.copy(W(B.x + 0.004, FY + 0.002, B.z + 0.005)); if (B.live) { ball.rotation.x -= B.vz * dt / rb; ball.rotation.z += B.vx * dt / rb; }
    for (const f of flashes) { if (f.t > 0) { f.t -= dt; const k = 1 - Math.max(0, f.t) / 0.3; f.m.material.opacity = (1 - k) * 0.9; f.m.scale.setScalar((0.02 + k * 0.07) * f.s); } else f.m.material.opacity = 0; }
    { const sp = Math.hypot(B.vx, B.vz); trailP.unshift(ball.position.clone()); if (trailP.length > trail.length) trailP.pop(); trail.forEach((s, i) => { const p = trailP[i]; if (!p || !showBall || !B.live) { s.material.opacity = 0; return; } s.position.copy(p); const k = clamp((sp - 1.4) / 3, 0, 1); s.material.opacity = k * 0.5 * (1 - i / trail.length); s.material.color.set(sp > 4 ? 0xff6a2a : 0xffd23a); s.scale.setScalar(rb * (2.6 - i * 0.2)); }); }
    { let near = null, nd = 9; for (const rb2 of reachBars) { const d = Math.abs(B.z - rb2.r.z); if (d < nd) { nd = d; near = rb2; } } for (const rb2 of reachBars) rb2.m.material.opacity = play && !S.demo ? (rb2 === near ? 0.22 + (S.charging ? S.charge * 0.3 : 0) : 0.06) : 0; }
    goalGlow.forEach(g => { g.material.opacity = damp(g.material.opacity, 0, 2.5, dt); });
    // the score beads slide across as goals go in
    for (const side of ['you', 'him']) FT.beads[side].forEach((b, i) => { const on = i < S.score[side], tx = on ? FW - 0.03 - (S.score[side] - 1 - i) * 0.026 : -FW + 0.03 + i * 0.026; b.position.x = damp(b.position.x, tx, 7, dt); });
    // the foxes at the long sides, hands on the handles
    if (play || S.mode === 'done' || S.mode === 'stake') { if (play) { PL.x = damp(PL.x, T0.x + FW + 0.62, 8, dt); PL.z = damp(PL.z, T0.z + 0.15, 8, dt); PL.yaw = -Math.PI / 2; PL.mv = 0; OX.x = damp(OX.x, T0.x - FW - 0.62, 8, dt); OX.z = damp(OX.z, T0.z - 0.15, 8, dt); OX.yaw = Math.PI / 2; OX.mv = 0; }
      else { walkTo(PL, T0.x + FW + 0.9, T0.z + FL - 0.1, 3.5, dt); walkTo(OX, homeOpp.x, homeOpp.z, 3.5, dt); if (PL.mv === 0) PL.yaw = Math.atan2(T0.x - PL.x, T0.z - PL.z); if (OX.mv === 0) OX.yaw = Math.atan2(T0.x - OX.x, T0.z - OX.z); } }
    else { walkTo(OX, homeOpp.x, homeOpp.z, 3, dt); if (OX.mv === 0) OX.yaw = S.dlg && S.dlg.fox === opp ? Math.atan2(PL.x - OX.x, PL.z - OX.z) : Math.atan2(T0.x - OX.x, T0.z - OX.z); }
    PL.hop = Math.max(0, PL.hop - dt); placeFox(ben, PL.x, PL.z, PL.yaw, PL.mv, dt); ben.position.y = PL.hop > 0 ? Math.sin((1 - PL.hop / 0.5) * Math.PI) * 0.4 : 0; placeFox(opp, OX.x, OX.z, OX.yaw, OX.mv, dt);
    placeFox(keeper, keeper.position.x, keeper.position.z, S.dlg && S.dlg.fox === keeper ? Math.atan2(PL.x - keeper.position.x, PL.z - keeper.position.z) : -Math.PI / 2, 0, dt);
    regs.forEach(g => { placeFox(g.f, g.f.position.x, g.f.position.z, S.dlg && S.dlg.fox === g.f ? Math.atan2(PL.x - g.f.position.x, PL.z - g.f.position.z) : (play && g.r.lean ? Math.atan2(T0.x - g.f.position.x, T0.z - g.f.position.z) : g.yaw), 0, dt); if (g.seat) { const P = g.f.userData.P; P.legs[0].rotation.x = P.legs[1].rotation.x = -1.45; } });
    if (play) { poseHandles(ben, Math.max(...myRods.map(r => r.kickT)) / 0.28); poseHandles(opp, Math.max(...hisRods.map(r => r.kickT)) / 0.28); }
    fadeFox(ben, play ? 0 : 1, dt); fadeFox(opp, play ? 0 : 1, dt); ben.visible = !(play && (ben.userData.fade ?? 1) < 0.04); opp.visible = !(play && (opp.userData.fade ?? 1) < 0.04);   // the players stand at the long sides, right where the camera looks: out of the way during a match
    for (const g of [...regs.map(r => r.f), keeper, ben, opp]) { if (!(S.dlg && S.dlg.fox === g)) g.userData.lookAt = play && showBall ? ball.position.clone() : (g === ben && S.dlg && S.dlg.fox ? S.dlg.fox.position.clone().setY(1.6) : null); }
    for (const f of foxBlobs) f.b.position.set(f.f.position.x, 0.012, f.f.position.z);
    { const t = S.t; motes.base.forEach(([x, y, z, ph], i) => { motes.a[i * 3] = x + Math.sin(t * 0.21 + ph) * 0.3; motes.a[i * 3 + 1] = y + Math.sin(t * 0.13 + ph * 2) * 0.25; motes.a[i * 3 + 2] = z + Math.cos(t * 0.17 + ph) * 0.3; }); motes.g.attributes.position.needsUpdate = true; }
    for (const f of [ben, opp, keeper, ...regs.map(g => g.f)]) { const u = f.userData; if (u.moodT > 0) { u.moodT -= dt; if (u.moodT <= 0 && u.moodBack != null) { u.mood = u.moodBack; u.moodBack = null; } } }
    S.glow = Math.max(0, (S.glow || 0) - dt);
    if (play && S.ph === 'live') TA.roll(Math.hypot(B.vx, B.vz) * 1.6); else TA.roll(0);
    TA.duck(play ? 0.7 : S.dlg ? 0.6 : 0); TA.update(dt);
    HALL.lampG.visible = false; pend.visible = !play;
    drawChalk();
    const sh = camShot(); camera.updateProjectionMatrix(); const k = Math.min(1, dt * (S.mode === 'walk' ? 5 : 3.2)); CAM.pos.lerp(sh.pos, k); CAM.look.lerp(sh.look, k); camera.position.copy(CAM.pos); if (S.shake > 0.002) { camera.position.x += rr(-1, 1) * S.shake; camera.position.y += rr(-1, 1) * S.shake * 0.5; S.shake *= Math.pow(0.02, dt); } camera.lookAt(CAM.look); }
  let chalkKey = ''; function drawChalk() { const w = save.stat(SK.wins, 0), l = save.stat(SK.losses, 0), b = save.stat(SK.best, 0), k = w + '|' + l + '|' + b; if (k === chalkKey) return; chalkKey = k; const c = HALL.chalkCv.getContext('2d');
    c.fillStyle = '#1f2a24'; c.fillRect(0, 0, 512, 256); c.strokeStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 30; i++) { c.beginPath(); c.moveTo(Math.random() * 512, Math.random() * 256); c.lineTo(Math.random() * 512, Math.random() * 256); c.stroke(); }
    c.fillStyle = '#f6f3ee'; c.font = '900 34px Archivo, Arial'; c.fillText('FOOSBALL', 22, 50); c.font = '700 22px Archivo, Arial'; c.fillStyle = '#ffd23a'; c.fillText('HARDEST SHOT ' + (b ? b + ' km/h' : '—') + '   NO SPINNING', 22, 86);
    c.fillStyle = '#f6f3ee'; c.font = '800 26px Archivo, Arial'; c.fillText('BEN  ' + w + ' won', 22, 150); c.fillText(ON + '  ' + l + ' won', 22, 206); HALL.chalkT.needsUpdate = true; }
  function frame() { raf = requestAnimationFrame(frame); const dt = Math.min(0.05, clock.getDelta()); if (HIDDEN) return; if (!PAUSE) step(dt); renderer.render(scene, camera); hudT -= dt; if (hudT <= 0) { hudT = S.mode === 'play' ? 0.066 : 0.1; onState(hud()); } }
  function onRs() { renderer.setSize(CW(), CHh()); camera.aspect = CW() / CHh(); camera.updateProjectionMatrix(); } addEventListener('resize', onRs); const ro = new ResizeObserver(onRs); ro.observe(container);
  const onKD = e => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (S.mode === 'walk') { if (e.code === 'KeyE' && !e.repeat) { e.preventDefault(); talk(); return; } if (S.dlg && /Digit[1-9]/.test(e.code) && S.dlg.choices && S.dlg.chars >= S.dlg.lines[S.dlg.i].text.length && S.dlg.i === S.dlg.lines.length - 1) { api.choose(+e.code.slice(5) - 1); return; } if (e.code === 'Space' && !e.repeat) { e.preventDefault(); api.jump(); return; } if (e.code === 'Digit1' && !S.dlg) api.melee(); }
    if (S.mode === 'play' && !S.demo) { if (e.code === 'KeyV' && !e.repeat) api.toggleView(); if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) kickDown(); } }
    if (/^(Arrow|Key[WASD]|Shift)/.test(e.code)) { keys.add(e.code); if (S.mode !== 'intro' && /^Arrow/.test(e.code)) e.preventDefault(); } };
  const onKU = e => { keys.delete(e.code); if (e.code === 'Space' && S.mode === 'play') kickUp(); }, onBlur = () => keys.clear(); addEventListener('keydown', onKD); addEventListener('keyup', onKU); addEventListener('blur', onBlur);

  // the overlay's pad map: the whole field (net-free), ball in yellow, your rods' position as the red dot along the bottom
  function hud() { const play = S.mode === 'play', d = S.dlg, ln = d && d.lines[d.i], a = S.score.you, b = S.score.him;
    const quest = play ? 'BEN ' + a + ' · ' + ON + ' ' + b + ' · FIRST TO ' + FOOS.TO + (S.stake ? ' · STAKE ' + S.stake + 'g' : ' · FRIENDLY') : S.mode === 'walk' ? 'TALK TO ' + ON + ' · PLAY FOOSBALL' : OP.title.toUpperCase();
    const demoCap = !S.demo ? null : S.ph === 'drop' ? ['PAD', 'SLIDE YOUR THUMB TO MOVE ALL YOUR RED RODS TOGETHER'] : S.ph === 'goal' ? ['', 'IN! FIRST TO FIVE WINS'] : ['KICK', 'TAP KICK FOR A FLICK. HOLD IT TO CHARGE A HARD SHOT, LET GO TO SHOOT'];
    return { mode: S.mode, ph: S.ph, score: { you: a, him: b }, to: FOOS.TO, view: S.view, viewName: S.view === 'top' ? 'TOP' : 'END', flash: S.flash, call: S.call, stake: S.stake, gold: save.data.gold, done: S.done, demo: demoCap, hand: S.demo && play ? { kind: 'pad', x: (youT + 1) / 2, y: 0.8 } : null, touching: !!S.touching, serve: null, matchPoint: Math.max(a, b) === FOOS.TO - 1, best: S.best, quest, charge: S.charging ? S.charge : 0, charging: !!S.charging,
      mal: { x: (youT + 1) / 2, y: 1.95 }, puck: { x: clamp((B.x + FW) / (2 * FW), 0, 1), y: 1 + clamp((B.z + FL) / (2 * FL), 0, 1) },
      prog: { wins: save.stat(SK.wins, 0), losses: save.stat(SK.losses, 0), best: save.stat(SK.best, 0), suggest: save.stat(SK.stake, 20), maxBet: Math.max(0, Math.min(FOOS.BET_MAX, Math.floor(save.data.gold || 0))), level: !!save.flag(FL_.table), won: !!save.flag(FL_.won) },
      musicOn: TA.musicOn, tv: { key: WK, world: TV.world, room: TV.room, place: TV.place, title: OP.title, hall: TV.hall, opp: ON, keeper: TV.keeper.name, ph: !!OP.ph },
      std: { prompt: S.mode === 'walk' && !d && S.near ? S.near.label : null, toast: S.toast, dialog: d && S.mode === 'walk' ? { name: ln.who === 'p' ? 'BEN' : d.name, role: ln.who === 'p' ? 'You' : d.role, text: ln.text.slice(0, Math.floor(d.chars)), step: d.i + 1, total: d.lines.length, done: d.chars >= ln.text.length, you: ln.who === 'p', more: false, required: false, choices: d.choices && d.i === d.lines.length - 1 && d.chars >= ln.text.length ? d.choices.map(c => ({ text: c.text, asked: !!c.asked, bye: !!c.bye })) : null } : null, quest } };
  }
  // ---------- modes ----------
  function resetTable() { Object.assign(B, { x: 0, z: 0, vx: 0, vz: 0, live: false }); you = youT = 0; for (const r of rods) { r.x = r.tx = 0; r.kickT = 0; r.ang = 0; } }
  function toIntro() { S.mode = 'intro'; S.ph = 'idle'; S.done = null; S.demo = false; closeDlg(); resetTable(); PL.x = spots.enter.x; PL.z = spots.enter.z; PL.yaw = Math.PI; OX.x = homeOpp.x; OX.z = homeOpp.z; S.view = 'end'; S.zoom = 1; S.score = { you: 0, him: 0 }; }
  function begin(stake, demo = false) { ainit(); const mx = Math.max(0, Math.min(FOOS.BET_MAX, Math.floor(save.data.gold || 0))); S.stake = demo ? 0 : clamp(Math.round(stake || 0), 0, mx); S.mode = 'play'; S.done = null; S.res = null; S.demo = demo; S.score = { you: 0, him: 0 }; S.best = 0; S.recFlashed = false; S.shots = 0; S.zoom = 1; S.charge = 0; S.charging = false; closeDlg(); stick.x = stick.y = 0; resetTable(); setLevel();
    drop(); call(demo ? 'DEMO · NOTHING IS SAVED' : 'KICK OFF' + (S.stake ? ' · ' + S.stake + 'g ON IT' : ' · A FRIENDLY'), 2.4); if (demo) S.demoEnd = S.t + 70; TA.beep(true); }
  resetTable(); frame();
  const api = {
    walk() { ainit(); if (S.mode === 'intro' || S.mode === 'done' || S.mode === 'stake') { if (S.mode === 'intro') { PL.x = spots.enter.x; PL.z = spots.enter.z; PL.yaw = Math.PI; } S.mode = 'walk'; S.done = null; S.demo = false; toast('Walk up to ' + ONc + ' and press TALK to play.', 3.2); } },
    openStake() { ainit(); closeDlg(); S.mode = 'stake'; S.done = null; },
    begin, toIntro, demoStart() { if (S.mode === 'play') return; begin(0, true); }, demoStop() { if (!S.demo) return; S.demo = false; toIntro(); },
    quit() { if (S.mode !== 'play' || S.demo) return; S.mode = 'walk'; S.ph = 'idle'; resetTable(); call(''); toast('Called it off. Your money stays in your pocket.', 3); },
    padDown, padMove, padUp, kickDown, kickUp,
    toggleView() { S.view = S.view === 'end' ? 'top' : 'end'; return S.view; }, setSafe(t, b, l, r) { if (Math.abs(SAFE.t - t) + Math.abs(SAFE.b - b) + Math.abs(SAFE.l - l) + Math.abs(SAFE.r - r) > 3) { SAFE.t = t; SAFE.b = b; SAFE.l = l; SAFE.r = r; } },
    start() {}, talk, choose(i) { const d = S.dlg; if (!d || !d.choices) return; const c = d.choices[i]; if (c && d.onChoose) d.onChoose(c); }, closeDialog: closeDlg, nextLine: talk, clearToast() { S.toast = null; },
    melee() { if (S.mode !== 'walk' || S.dlg) return; toast(WK === 'luxor' ? 'TIB: “Gloves on, weapons past the gate.”' : 'No brawling in the tavern.', 2.4); }, range() { api.melee(); }, jump() { if (S.mode === 'walk' && !S.dlg && PL.hop <= 0) { PL.hop = 0.5; TA.tap(); } }, meleeUp() {},
    useItem(id) { if (S.mode === 'play') { flash('SAVE IT FOR AFTER THE MATCH', '#ffffff', 1.2); return; } if (save.take(id, 1)) toast(id === 'erToGo' ? 'Warm all the way down. +40 HP' : id === 'energyPod' ? 'Energy topped up.' : 'A treat.', 2.4); },
    closeWheel() {}, skipTime() {}, setPaused(v) { PAUSE = !!v; }, setVisible(v) { HIDDEN = !v; if (v) clock.getDelta(); }, setHudPad() {}, setStick(x, y) { stick.x = x; stick.y = y; }, eyeLook() {}, eyeRelease() {}, togglePov() { return false; }, lookBy() {}, zoomBy(d) { S.zoom = clamp(S.zoom * (1 - d * 0.1), 0.75, 1.6); }, getCam() { return { dist: 10, pitch: 0.6 }; }, setCam() {}, setMinimap() {}, toggleSound() { audio.setMuted && audio.setMuted(!audio.muted); }, cycleWeather() {},
    mapData() { return { p: [PL.x, PL.z, PL.yaw], b: [['FOOSBALL', T0.x, T0.z], ['BAR', 4.2, -1.6], ['DOOR', 0, HALL.D / 2]], f: [[opp.position.x, opp.position.z], [keeper.position.x, keeper.position.z], ...regs.map(g => [g.f.position.x, g.f.position.z])], e: [], q: [opp.position.x, opp.position.z, ON] }; },
    hud, onExit, hall: HALL, setMusic(on) { ainit(); TA.setMusic(on); }, toggleMusic() { ainit(); TA.setMusic(!TA.musicOn); return TA.musicOn; }, uiTap() { ainit(); TA.tap(); },
    _state: () => S, _ball: () => ({ ...B }), _rods: () => rods.map(r => ({ side: r.side, n: r.n, z: r.z, x: r.x })), _sim(n, cb, dt = 1 / 30) { for (let i = 0; i < n; i++) { step(dt); if (cb && cb(S, i) === false) break; } renderer.render(scene, camera); onState(hud()); }, _place: (x, z) => { PL.x = x; PL.z = z; },
    _ballSet(x, z, vx = 0, vz = 0) { Object.assign(B, { x, z, vx, vz, live: true }); S.ph = 'live'; }, _youT: () => youT,
    destroy() { cancelAnimationFrame(raf); removeEventListener('resize', onRs); ro.disconnect(); removeEventListener('keydown', onKD); removeEventListener('keyup', onKU); removeEventListener('blur', onBlur); el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp); el.removeEventListener('wheel', onWheel); el.removeEventListener('contextmenu', onCtx); el.removeEventListener('pointerdown', onMDown); el.removeEventListener('pointerup', onMUp); renderer.dispose(); renderer.domElement.remove(); try { TA.dispose(); audio.ctx && audio.ctx.close(); } catch (e) {} } };
  api.onExit = onExit;
  if (startIn === 'walk') api.walk();
  return api;
}
