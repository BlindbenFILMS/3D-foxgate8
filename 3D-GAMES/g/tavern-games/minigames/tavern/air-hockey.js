// 8 GATES — TAVERN AIR HOCKEY. The same walk-in tavern as Tavern Pool (any world), with an air-hockey table where the pool
// table stands. A new regular per world runs it (names + lines are PLACEHOLDERS, ph: true, until Ben writes them).
//   WALK — the shared Game HUD drives Ben round the room; TALK to the table's regular → "Let's play." → name the stake.
//   PLAY — first to 7. Your mallet follows your thumb: slide anywhere (THUMB PAD or the table itself, it moves by how far
//          you slide, so your finger never hides the mallet); a mouse puts the mallet under the pointer. Hit the puck while
//          your mallet is moving to SMASH it; bank it off the rail for a BANK GOAL. VIEW = straight down / behind your mallet.
//   buildHockeyHall(ctx, { world })   → the room + table as set dressing (Meru-style ctx), for a walk-in tavern
//   createAirHockey({ container, onState, world, startIn, onExit }) → stand-alone room + game, Game HUD engine contract.
// Save: gold / xp through engine/save.js; stats <world>.hockey.wins / .losses / .stake / .best (fastest smash, km/h);
// flags <world>HockeyWon, <world>HockeyTable (3 staked wins).
import * as THREE from '../../vendor/three/three.module.js';
import { rr, clamp, damp, pick } from '../../village-game.js';
import { canvasTex } from '../../engine/textures.js';
import { CAST } from '../../engine/cast.js';
import { save } from '../../engine/save.js';
import { createStage } from '../../engine/restaurant-kit.js';
import { tavernAudio } from './tavern-audio.js';
import { TAVERNS, buildPoolHall } from './pool-hall.js';

// table units: across 0..1, along 0..2 (Ben's goal at v = 2, nearest the camera; theirs at v = 0)
export const HOCKEY = { S: 1.15, Y: 0.82, PR: 0.036, MR: 0.056, GW: 0.42, VMAX: 7.2, MV: 8.5, DRAG: 0.2, WALL: 0.86, E: 0.9, TO: 7, BET_MAX: 100 };

// the table's regular in each world — PLACEHOLDER names and lines (ph: true)
const L = (p, n) => [['p', p], ['n', n]];
export const HOCKEY_OPP = {
  luxor: { name: 'SKIP', role: 'Tavern', fur: '#f97316', furDark: '#c2410c', torso: ['#5cc6c0', '#1f6a62', '#0f3a36'], mood: 'excited', ph: true, neon: '#5cc6c0',
    hi: ['You want the puck table? Dabb will not touch it. Says it is a fight with a fan underneath.', 'He is right. I love it.'], again: ['Back for more? The fan is on. The fan is always on.'],
    topics: { fast: ['How are you so fast?', 'I am not fast. I am early. I go where the puck is going to be.'], dabb: ['Do you and Dabb get on?', 'He has his table, I have mine. He thinks mine is noise. I think his is a nap.'] },
    win: ['How. HOW. Again. Right now.', 'You banked that. Nobody banks on me.'], loss: ['Too slow! Puck was gone before you saw it.', 'Seven. I always get to seven.'], level: ['Fine. I will tell you the secret. I do not watch the puck. I watch your mallet.', 'You stopped hitting it every time it came near you. That is the whole secret, and now you have it.'] },
  meru: { name: 'PIX', role: 'Tavern', fur: '#e8a060', furDark: '#a8642a', torso: ['#3a6ea5', '#fbf8ec', '#22446e'], mood: 'excited', ph: true, neon: '#f2c94c' },
  gaya: { name: 'DART', role: 'Tavern', fur: '#e8792e', furDark: '#a8501a', torso: ['#a78bfa', '#5b3a9a', '#2a1a4a'], mood: 'happy', ph: true, neon: '#a78bfa' },
  kufa: { name: 'RAFI', role: 'Tavern', fur: '#d9a066', furDark: '#9a6a3a', torso: ['#c42d3c', '#fbf8ec', '#5a1a1a'], mood: 'excited', ph: true, neon: '#2f9a8f' },
  nebo: { name: 'FLINT', role: 'Tavern', fur: '#c9a06a', furDark: '#8a6a3a', torso: ['#e6b45a', '#5a7a3a', '#2a3a1a'], mood: 'happy', ph: true, neon: '#e6b45a' },
  zion: { name: 'JET', role: 'Tavern', fur: '#3a3836', furDark: '#1a1918', torso: ['#ec3013', '#201e1d', '#7a1a0a'], mood: 'determined', ph: true, neon: '#ec3013' },
};
const oppFor = k => { const o = HOCKEY_OPP[k] || HOCKEY_OPP.luxor, cap = o.name.charAt(0) + o.name.slice(1).toLowerCase();
  return { hi: ['Table is free. First to seven. You are red, I am blue.'], again: ['Again? Fan is on.'], topics: { fast: ['How are you so fast?', 'Practice. And the fan is on my side.'] }, win: ['Nice hands. Again?'], loss: ['Seven! My table.'], level: ['You have got the hang of it now. Watch my mallet, not the puck.'], ...o, cap, title: cap + "'s Table" }; };
const RULE = [['AIR', 64, 100], ['HOCKEY', 44, 160], ['FIRST', 30, 232], ['TO SEVEN', 30, 272]];

// ---------------- the table ----------------
export function buildHockeyTable(ctx, { world = 'luxor', T0, parent }) {
  const TV = TAVERNS[world] || TAVERNS.luxor, OP = oppFor(world);
  const { THREE: T3, M, toon } = ctx, CT = ctx.canvasTex || canvasTex, { S, Y, GW } = HOCKEY, V = (x = 0, y = 0, z = 0) => new T3.Vector3(x, y, z);
  const RW = 0.1, OW = S + 2 * RW, OL = 2 * S + 2 * RW, neon = OP.neon || TV.trim;
  const tbl = new T3.Group(); tbl.position.copy(T0); parent.add(tbl);
  const topT = CT(256, 512, c => { c.fillStyle = '#eef3f6'; c.fillRect(0, 0, 256, 512); const g = c.createRadialGradient(128, 256, 40, 128, 256, 320); g.addColorStop(0, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(120,150,170,0.25)'); c.fillStyle = g; c.fillRect(0, 0, 256, 512);
    c.fillStyle = 'rgba(40,60,80,0.18)'; for (let y = 8; y < 512; y += 12) for (let x = (y / 12 % 2) * 6 + 6; x < 256; x += 12) c.fillRect(x, y, 2, 2);
    c.globalAlpha = 0.12; c.fillStyle = neon; c.font = '900 150px Archivo, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('8', 128, 258); c.globalAlpha = 1;
    c.fillStyle = '#e0442a'; c.fillRect(0, 253, 256, 6); c.strokeStyle = '#e0442a'; c.lineWidth = 4; c.beginPath(); c.arc(128, 256, 42, 0, 7); c.stroke();
    c.fillStyle = '#2f6fd8'; c.fillRect(0, 168, 256, 4); c.fillRect(0, 340, 256, 4);
    c.strokeStyle = '#e0442a'; c.lineWidth = 3; for (const [y, a0, a1] of [[0, 0, Math.PI], [512, Math.PI, Math.PI * 2]]) { c.beginPath(); c.arc(128, y, 56, a0, a1); c.stroke(); }
    c.fillStyle = 'rgba(224,68,42,0.5)'; for (const y of [86, 426]) for (const x of [64, 192]) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); } });
  const top = new T3.Mesh(new T3.PlaneGeometry(S, 2 * S), new T3.MeshToonMaterial({ map: topT, gradientMap: ctx.grad })); top.rotation.x = -Math.PI / 2; top.position.y = Y; top.receiveShadow = true; tbl.add(top);
  const body = toon('#26231f'), rail = toon('#1a1816'), skirtT = CT(256, 64, c => { c.fillStyle = TV.wall; c.fillRect(0, 0, 256, 64); c.fillStyle = neon; c.fillRect(0, 26, 256, 8); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, 56, 256, 8); c.fillStyle = '#f6f3ee'; c.font = '900 20px Archivo, Arial'; c.textAlign = 'center'; c.fillText('AIR HOCKEY', 128, 22); });
  M(new T3.BoxGeometry(OW, 0.2, OL), body, 0, Y - 0.11, 0, tbl, 0.02);
  { const sk = new T3.MeshToonMaterial({ map: skirtT, gradientMap: ctx.grad }); for (const sx of [-1, 1]) { const m = new T3.Mesh(new T3.PlaneGeometry(OL - 0.1, 0.2), sk); m.position.set(sx * (OW / 2 + 0.002), Y - 0.11, 0); m.rotation.y = sx * Math.PI / 2; tbl.add(m); } }
  M(new T3.BoxGeometry(OW * 0.7, 0.36, OL * 0.8), toon(TV.wallLow), 0, Y - 0.39, 0, tbl, 0.02);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { M(new T3.BoxGeometry(0.12, Y - 0.2, 0.12), body, sx * (OW / 2 - 0.12), (Y - 0.2) / 2, sz * (OL / 2 - 0.14), tbl, 0.015); M(new T3.BoxGeometry(0.2, 0.05, 0.2), rail, sx * (OW / 2 - 0.12), 0.025, sz * (OL / 2 - 0.14), tbl, 0.01); }
  // rails: long sides whole, ends split round the goal slot; a neon strip on the inside top edge
  const neonM = new T3.MeshBasicMaterial({ color: neon }), RH = 0.065;
  for (const sx of [-1, 1]) { M(new T3.BoxGeometry(RW, RH, OL), rail, sx * (S / 2 + RW / 2), Y + RH / 2, 0, tbl, 0.012); const n = new T3.Mesh(new T3.BoxGeometry(0.012, 0.012, 2 * S), neonM); n.position.set(sx * (S / 2 + 0.008), Y + RH + 0.002, 0); tbl.add(n); }
  const endW = (S - GW * S) / 2;
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) { M(new T3.BoxGeometry(endW + RW, RH, RW), rail, sx * (S / 2 + RW - (endW + RW) / 2), Y + RH / 2, sz * (S + RW / 2), tbl, 0.012); const n = new T3.Mesh(new T3.BoxGeometry(endW, 0.012, 0.012), neonM); n.position.set(sx * (S / 2 - endW / 2), Y + RH + 0.002, sz * (S + 0.008)); tbl.add(n); }
  for (const sz of [-1, 1]) { const slot = new T3.Mesh(new T3.BoxGeometry(GW * S, 0.05, RW + 0.02), new T3.MeshBasicMaterial({ color: 0x050505 })); slot.position.set(0, Y + 0.0, sz * (S + RW / 2)); tbl.add(slot); M(new T3.BoxGeometry(GW * S + 0.04, 0.012, RW + 0.04), rail, 0, Y + RH - 0.006, sz * (S + RW / 2), tbl, 0.006); }
  // the score box on the far end, with a goal light on top
  const boardCv = document.createElement('canvas'); boardCv.width = 512; boardCv.height = 160; const boardT = new T3.CanvasTexture(boardCv); boardT.colorSpace = T3.SRGBColorSpace;
  const BZ = -OL / 2 - 0.05; M(new T3.BoxGeometry(0.98, 0.34, 0.1), body, 0, Y + 0.33, BZ, tbl, 0.015); for (const sx of [-1, 1]) M(new T3.BoxGeometry(0.05, 0.3, 0.05), rail, sx * 0.4, Y + 0.1, BZ, tbl, 0.008);
  { const f = new T3.Mesh(new T3.PlaneGeometry(0.9, 0.28), new T3.MeshBasicMaterial({ map: boardT })); f.position.set(0, Y + 0.33, BZ + 0.052); tbl.add(f); }
  const goalLight = new T3.Mesh(new T3.SphereGeometry(0.05, 12, 8), new T3.MeshBasicMaterial({ color: 0x5a1a12 })); goalLight.position.set(0, Y + 0.54, BZ); tbl.add(goalLight);
  M(new T3.CylinderGeometry(0.06, 0.07, 0.03, 12), rail, 0, Y + 0.505, BZ, tbl, 0.006);
  return { tbl, OW, OL, RW, neon, boardCv, boardT, goalLight, top };
}

// the whole room as set dressing for a walk-in tavern (Path C in MERGE_GUIDE.md)
export function buildHockeyHall(ctx, { world = 'luxor' } = {}) {
  const H = buildPoolHall(ctx, { world, table: false, rule: RULE }); const T = buildHockeyTable(ctx, { world, T0: H.T0, parent: H.root });
  const e = 0.06, x0 = H.T0.x - T.OW / 2 - e + (ctx.origin ? ctx.origin.x : 0), z0 = H.T0.z - T.OL / 2 - e - 0.12 + (ctx.origin ? ctx.origin.z : 0); H.colliders.push({ x0, z0, x1: x0 + T.OW + 2 * e, z1: z0 + T.OL + 2 * e + 0.12 });
  return { ...H, hockey: T };
}

// ---------------- the stand-alone room + the game ----------------
export async function createAirHockey({ container, onState = () => {}, world = 'luxor', startIn = 'intro', onExit = null }) {
  const TV = TAVERNS[world] || TAVERNS.luxor, WK = TV.key, OP = oppFor(WK), SK = { wins: WK + '.hockey.wins', losses: WK + '.hockey.losses', stake: WK + '.hockey.stake', best: WK + '.hockey.best' }, FL = { won: WK + 'HockeyWon', table: WK + 'HockeyTable', told: WK + 'HockeyTold' };
  const ST = createStage(container, { bg: TV.bg, keep: true }), { CW, CHh, renderer, scene, camera, V3, toon, M, kit, audio, puff, smokeS, sun, glowTex, touch, addOutline, grad } = ST;
  camera.far = 90; camera.updateProjectionMatrix();
  scene.children.filter(o => o.isHemisphereLight).forEach(h => { h.color.set(0xffe2c8); h.groundColor.set(0x5a2a1a); h.intensity = 1.05; });
  sun.position.set(-4, 10, 7); sun.intensity = 1.0; sun.color.set(0xffe0c0); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, far: 40 }); sun.shadow.camera.updateProjectionMatrix();
  const HALL = buildHockeyHall({ THREE, M, toon, canvasTex, scene, grad, addOutline }, { world: WK }), HT = HALL.hockey;
  const { T0, spots } = HALL, { S: SC, Y, PR, MR, GW } = HOCKEY, { OW, OL } = HT;
  { const pl = new THREE.PointLight(0xfff0d0, touch ? 8 : 11, 6, 1.6); pl.position.set(T0.x, 2.5, T0.z); scene.add(pl); }
  // two small pendants over the table (the pool table's long lamp is too big for this one); hidden whenever the camera looks down
  const pend = new THREE.Group(); scene.add(pend); for (const dz of [-0.6, 0.6]) { const sh = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 14, 1, true), toon(TV.shade)); sh.position.set(T0.x, 2.9, T0.z + dz); pend.add(sh); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff2cc })); bulb.position.set(T0.x, 2.82, T0.z + dz); pend.add(bulb); const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.3, 4), toon('#201e1d')); cord.position.set(T0.x, 3.65, T0.z + dz); pend.add(cord); }
  const glow = (p, s, col = TV.glow, op = 0.55) => { const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); g.position.copy(p); g.scale.setScalar(s); scene.add(g); return g; };
  spots.sconces.forEach(p => glow(p, 1.3)); for (let i = 0; i < 3; i++) glow(V3(T0.x, 2.72, T0.z - 0.9 + i * 0.9), 1.5, 0xfff2cc, 0.35);
  const neonGlow = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2 * SC), new THREE.MeshBasicMaterial({ map: glowTex, color: HT.neon, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); m.rotation.x = -Math.PI / 2; m.position.set(T0.x + s * (SC / 2 + 0.01), Y + 0.072, T0.z); m.renderOrder = 2; scene.add(m); return m; });
  const TA = tavernAudio(audio, { world: WK, bpmMul: 1.14 }); const ainit = () => { try { TA.ensure(); } catch (e) {} };
  const W2T = (x, z) => ({ u: (x - T0.x) / SC + 0.5, v: (z - T0.z) / SC + 1 }), T2W = (u, v, y = Y) => V3(T0.x + (u - 0.5) * SC, y, T0.z + (v - 1) * SC);

  // ---------- cast ----------
  const strip = f => { const P = f.userData.P; if (P.sword) P.sword.visible = false; if (P.gun) P.gun.visible = false; return f; };
  const npcFox = (c, outfit = 'vest', mood = 'neutral') => strip(kit.makeFox({ ...CAST.player, look: { ...CAST.player.look, fur: c.fur, furDark: c.furDark || c.fur }, torso: c.torso, outfit: c.outfit || outfit, crest: '', gear: 'none', mood: c.mood || mood }));
  const ben = strip(kit.makeFox({ ...CAST.player, gear: 'none' }));
  const opp = npcFox(OP, 'vest', OP.mood), keeper = npcFox(TV.keeper, 'vest', 'warm');
  const regList = [...TV.regulars, ...(WK === 'luxor' ? [{ name: 'DABB', role: 'Tavern', fur: TV.shark.fur, furDark: TV.shark.furDark, torso: TV.shark.torso, mood: 'smug', lean: true, ph: true, lines: [['p', 'Not playing pool tonight?'], ['n', 'Somebody is on the puck table, so nobody can hear themselves think. I am thinking anyway. Loudly.']] }] : [])];
  const regs = regList.map((r, i) => { const f = npcFox(r, 'coat', r.mood || 'neutral'); let st; if (r.lean) { f.position.set(-6.2, 0, -1.6); f.rotation.y = Math.PI / 2; return { f, r, seat: false, yaw: Math.PI / 2 }; } st = r.seat ? spots.stools[4] : spots.stools[i === 0 ? 0 : 2]; f.position.set(st.x - (r.seat ? 0 : 0.55), r.seat ? 0.62 : 0, st.z); f.rotation.y = Math.PI / 2; return { f, r, seat: !!r.seat, yaw: Math.PI / 2 }; });
  keeper.position.copy(spots.keeper); keeper.rotation.y = -Math.PI / 2;
  const homeOpp = V3(T0.x - OW / 2 - 0.75, 0, T0.z - OL / 2 + 0.55), youEnd = () => T0.z + OL / 2 + 0.5, oppEnd = () => T0.z - OL / 2 - 0.78;

  // ---------- puck + mallets ----------
  const pr = PR * SC, mr = MR * SC;
  const puckG = new THREE.Group(); { const b = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, 0.012, 24), toon('#ffd23a')); b.position.y = 0.006; addOutline(b, 0.004, pr); puckG.add(b); const t = new THREE.Mesh(new THREE.CylinderGeometry(pr * 0.7, pr * 0.7, 0.002, 20), toon('#e6a020')); t.position.y = 0.013; puckG.add(t); } scene.add(puckG);
  const mkMallet = col => { const g = new THREE.Group(), m = toon(col); const base = new THREE.Mesh(new THREE.CylinderGeometry(mr, mr * 1.02, 0.024, 26), m); base.position.y = 0.012; addOutline(base, 0.004, mr); g.add(base); const rim = new THREE.Mesh(new THREE.TorusGeometry(mr * 0.72, 0.006, 6, 24).rotateX(Math.PI / 2), toon('#f6f3ee')); rim.position.y = 0.025; g.add(rim);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.06, 12), m); h.position.y = 0.054; g.add(h); const k = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), m); k.position.y = 0.092; addOutline(k, 0.004, 0.03); g.add(k); scene.add(g); return g; };
  const youM = mkMallet('#e0442a'), oppM = mkMallet('#2f6fd8');
  const shTex = canvasTex(64, 64, c => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(0.6, 'rgba(0,0,0,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  const blob = (w, d, op = 1, y = 0.011) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, opacity: op, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 1; scene.add(m); return m; };
  { const tb = blob(OW * 1.6, OL * 1.3, 0.8); tb.position.set(T0.x, 0.011, T0.z); }
  const puckSh = blob(pr * 3, pr * 3, 0.6, Y + 0.002), youSh = blob(mr * 3.2, mr * 3.2, 0.6, Y + 0.002), oppSh = blob(mr * 3.2, mr * 3.2, 0.6, Y + 0.002);
  // puck trail: glows at the last few positions, brighter the faster it goes
  const trail = Array.from({ length: 10 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd23a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(pr * 3); scene.add(s); return s; }); const trailP = [];
  const ovl = (geo, col, op = 1) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthTest: false, depthWrite: false })); m.renderOrder = 40; m.visible = false; scene.add(m); return m; };
  const flashes = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 1, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); m.renderOrder = 41; scene.add(m); return { m, t: 0 }; }); let flashI = 0;
  const impact = (u, v, col, size = 1) => { const f = flashes[flashI++ % flashes.length], w = T2W(u, v, Y + 0.006); f.m.position.copy(w); f.m.material.color.set(col); f.t = 0.28; f.s = size; };
  const youRing = ovl(new THREE.RingGeometry(mr * 1.25, mr * 1.5, 30).rotateX(-Math.PI / 2), 0xffd23a, 0.85);
  const motes = (() => { const n = touch ? 20 : 34, g = new THREE.BufferGeometry(), a = new Float32Array(n * 3), base = []; for (let i = 0; i < n; i++) base.push([T0.x + rr(-1, 1), rr(1.2, 2.6), T0.z + rr(-1.4, 1.4), rr(0, 6)]); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color: 0xffe6b0, size: 0.06, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(p); return { a, base, g }; })();
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

  // ---------- state ----------
  const S0 = () => ({ mode: 'intro', ph: 'idle', t: 0, score: { you: 0, him: 0 }, stake: 0, view: 'top', zoom: 1, flash: null, flashT: 0, call: '', callT: 0, toast: null, toastT: 0, done: null, demo: false, dlg: null, near: null, serveT: 0, server: 'you', last: null, walls: 0, best: 0, hits: 0, shake: 0, goalT: 0, rally: 0, maxRally: 0 });
  let HIDDEN = false; let S = S0(), PAUSE = false; const stick = { x: 0, y: 0 }, keys = new Set();
  const PK = { x: 0.5, y: 1.5, vx: 0, vy: 0 }, YM = { x: 0.5, y: 1.8, tx: 0.5, ty: 1.8, vx: 0, vy: 0 }, OM = { x: 0.5, y: 0.2, tx: 0.5, ty: 0.2, vx: 0, vy: 0 };
  const PL = { x: spots.enter.x, z: spots.enter.z, yaw: Math.PI, mv: 0, hop: 0 }, OX = { x: homeOpp.x, z: homeOpp.z, yaw: Math.PI / 2, mv: 0 };
  const flash = (txt, col = '#ffd23a', t = 1.4) => { S.flash = { txt, col }; S.flashT = t; }, call = (txt, t = 2.6) => { S.call = txt; S.callT = t; }, toast = (txt, t = 3) => { S.toast = txt; S.toastT = t; };
  const ON = OP.name, ONc = OP.cap;
  const kmh = v => Math.round(v * SC * 3.6);

  // ---------- physics (table units, seconds) ----------
  const yLim = side => side === 'you' ? [1 + MR * 0.15, 2 - MR] : [MR, 1 - MR * 0.15];
  function moveMallet(m, side, h) { const [y0, y1] = yLim(side), tx = clamp(m.tx, MR, 1 - MR), ty = clamp(m.ty, y0, y1), dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy), mx = (side === 'you' ? HOCKEY.MV : HOCKEY.MV * (S.oppSpd || 0.6)) * h;
    const ox = m.x, oy = m.y; if (d <= mx) { m.x = tx; m.y = ty; } else { m.x += dx / d * mx; m.y += dy / d * mx; } m.vx = damp(m.vx, (m.x - ox) / h, 30, h); m.vy = damp(m.vy, (m.y - oy) / h, 30, h); }
  function hitMallet(m, who) { const dx = PK.x - m.x, dy = PK.y - m.y, d = Math.hypot(dx, dy), rad = PR + MR; if (d >= rad || d < 1e-6) return;
    const nx = dx / d, ny = dy / d; PK.x = m.x + nx * rad; PK.y = m.y + ny * rad; const rel = (PK.vx - m.vx) * nx + (PK.vy - m.vy) * ny;
    if (rel < 0) { PK.vx -= (1 + HOCKEY.E) * rel * nx; PK.vy -= (1 + HOCKEY.E) * rel * ny; const sp = Math.hypot(PK.vx, PK.vy); if (sp > HOCKEY.VMAX) { PK.vx *= HOCKEY.VMAX / sp; PK.vy *= HOCKEY.VMAX / sp; }
      const hard = Math.min(1, -rel / 6); TA.clack(0.15 + hard); impact(PK.x - nx * PR, PK.y - ny * PR, who === 'you' ? 0xffb09a : 0x9ac4ff, 0.6 + hard); if (S.last !== who) { S.rally++; S.maxRally = Math.max(S.maxRally, S.rally); if (S.mode === 'play' && S.rally >= 10 && S.rally % 10 === 0) { flash('RALLY ' + S.rally + '!', '#ffd23a', 1); TA.cheer(0.3); } } S.last = who; S.walls = 0; S.hits++;
      const fsp = Math.hypot(PK.vx, PK.vy); if (who === 'you') { buzz(Math.round(6 + hard * 22)); if (fsp > 4.6) { const k = kmh(fsp), rec = save.stat(SK.best, 0); if (S.mode === 'play' && !S.demo && rec && k > rec && !S.recFlashed) { S.recFlashed = true; flash('NEW RECORD · ' + k + ' km/h', '#22c55e', 1.4); TA.cheer(0.6); } else flash('SMASH · ' + k + ' km/h', '#ffd23a', 0.9); S.shake = 0.012 + hard * 0.02; S.best = Math.max(S.best, k); } }
      else if (fsp > 5 && S.mode === 'play') S.shake = 0.008; } }
  function sub(h) { moveMallet(YM, 'you', h); moveMallet(OM, 'him', h); if (S.ph !== 'live') return;
    const sp = Math.hypot(PK.vx, PK.vy); if (sp > 0) { const k = Math.max(0, 1 - HOCKEY.DRAG * h); PK.vx *= k; PK.vy *= k; }
    PK.x += PK.vx * h; PK.y += PK.vy * h; hitMallet(YM, 'you'); hitMallet(OM, 'him');
    const W = HOCKEY.WALL, gl = 0.5 - GW / 2, gr = 0.5 + GW / 2, inMouth = PK.x > gl + PR * 0.4 && PK.x < gr - PR * 0.4;
    if (PK.x < PR) { PK.x = PR; if (PK.vx < 0) { TA.bang(-PK.vx / 5); PK.vx = -PK.vx * W; S.walls++; } } if (PK.x > 1 - PR) { PK.x = 1 - PR; if (PK.vx > 0) { TA.bang(PK.vx / 5); PK.vx = -PK.vx * W; S.walls++; } }
    for (const [end, dir] of [[0, -1], [2, 1]]) { const past = dir < 0 ? PK.y < end + PR : PK.y > end - PR; if (!past) continue;
      if (inMouth || ((dir < 0 ? PK.y < end : PK.y > end) && PK.x > gl && PK.x < gr)) { // in the slot: the posts keep it honest
        if (PK.x < gl + PR) { PK.x = gl + PR; PK.vx = Math.abs(PK.vx) * W; } if (PK.x > gr - PR) { PK.x = gr - PR; PK.vx = -Math.abs(PK.vx) * W; }
        if (dir < 0 ? PK.y < end - PR * 1.4 : PK.y > end + PR * 1.4) { goal(dir < 0 ? 'you' : 'him'); return; } continue; }
      PK.y = end - dir * PR; if (PK.vy * dir > 0) { const sp0 = Math.abs(PK.vy), nearPost = Math.abs(PK.x - 0.5) < GW / 2 + PR * 1.3; if (nearPost && sp0 > 1.5) { TA.post(); impact(PK.x, end, 0xffffff, 1.2); if (S.mode === 'play') { flash(dir < 0 ? 'OFF THE POST!' : 'SAVED BY THE POST', dir < 0 ? '#ffd23a' : '#22c55e', 1); TA.ooh(); } } else TA.bang(sp0 / 5); PK.vy = -PK.vy * W; S.walls++; } }
    // a puck pinned against the rail pushes the mallet back, never the other way round
    for (const m of [YM, OM]) { const dx = PK.x - m.x, dy = PK.y - m.y, d = Math.hypot(dx, dy), rad = PR + MR; if (d < rad && d > 1e-6) { m.x = PK.x - dx / d * rad; m.y = PK.y - dy / d * rad; } } }
  let acc = 0; function physics(dt) { acc += dt; const h = 1 / 360; let n = 0; while (acc >= h && n < 30) { sub(h); acc -= h; n++; } if (n >= 30) acc = 0; }
  function serveTo(side, t = 1.1) { S.ph = 'serve'; S.server = side; S.serveT = t; PK.vx = PK.vy = 0; PK.x = 0.5 + rr(-0.06, 0.06); PK.y = side === 'you' ? 1.42 : 0.58; S.last = null; S.walls = 0; S.rally = 0; }
  function goal(scorer) { const mine = scorer === 'you', bank = S.walls > 0 && S.last === scorer; S.score[scorer]++; S.ph = 'goal'; S.goalT = 1.5; PK.vx = PK.vy = 0; TA.goal(mine); buzz(mine ? [30, 50, 60] : 120);
    S.glowCol = mine ? 0xff3a2a : 0x3a7aff; S.glow = 1.5; { const w = T2W(0.5, mine ? -0.02 : 2.02, Y + 0.05); puff(w.x, w.y, w.z, mine ? 0xff8a6a : 0x8fc4ff, 4); }
    const own = S.last && S.last !== scorer; flash(mine ? (own ? 'OWN GOAL BY ' + ON : bank ? 'BANK GOAL!' : 'GOAL!') : (own ? 'OWN GOAL' : ON + ' SCORES'), mine ? '#22c55e' : '#ff9a8a', 1.4);
    react(mine ? 'goal' : 'his'); drawBoard();
    if (S.score[scorer] >= HOCKEY.TO) { endMatch(mine ? 'win' : 'loss'); return; }
    const a = S.score.you, b = S.score.him; call(a === b ? a + ' ALL' : (a > b ? 'BEN ' : ON + ' ') + Math.max(a, b) + '–' + Math.min(a, b) + (Math.max(a, b) === HOCKEY.TO - 1 ? ' · MATCH POINT' : ''), 2.4); S.nextServe = mine ? 'him' : 'you'; }
  function endMatch(res) { S.ph = 'over'; S.overT = S.t + 2.4; S.res = res; buzz(res === 'win' ? [40, 60, 40, 60, 120] : 220); call(res === 'win' ? 'SEVEN! THE TABLE IS YOURS' : ON + ' GETS TO SEVEN', 3); flash(res === 'win' ? 'MATCH!' : 'MATCH TO ' + ON, res === 'win' ? '#22c55e' : '#ff9a8a', 2.2); if (res === 'win') { TA.cheer(1); react('win'); } else { TA.groan(); react('loss'); } }
  function finishMatch() { const res = S.res, st = S.stake, demo = S.demo; let gold = 0, unlocked = null; const prevBest = save.stat(SK.best, 0);
    if (!demo) { try { if (res === 'win') { if (st > 0) { save.addGold(st); gold = st; TA.coins(Math.min(12, 3 + Math.round(st / 10))); save.setFlag(FL.won); save.setStat(SK.stake, Math.min(HOCKEY.BET_MAX, Math.max(20, st * 2))); } save.addXp(st > 0 ? 40 : 12); save.setStat(SK.wins, save.stat(SK.wins, 0) + 1); if (st > 0 && save.stat(SK.wins, 0) >= 3 && !save.flag(FL.table)) { save.setFlag(FL.table); unlocked = true; } }
      else { const lose = Math.min(st, save.data.gold); if (lose > 0) save.addGold(-lose); gold = -lose; save.setStat(SK.losses, save.stat(SK.losses, 0) + 1); } if (S.best) save.best(SK.best, S.best); } catch (e) {} }
    S.done = { res, stake: st, gold, demo, unlocked, wins: save.stat(SK.wins, 0), losses: save.stat(SK.losses, 0), score: { ...S.score }, best: S.best, rally: S.maxRally, newRec: !demo && S.best > prevBest && S.best > 0, line: pick(res === 'win' ? OP.win : OP.loss) };
    S.mode = demo ? 'intro' : 'done'; TA.air(false); if (demo) { S.demo = false; S.done = null; toIntro(); } }

  // ---------- the regular at the far end (and the demo's autopilot for you) ----------
  // Mirrored so one brain plays either side: in its own frame it defends v = 0 and attacks toward v = 2.
  function predictX(px, py, vx, vy, yLine) { if (Math.abs(vy) < 1e-3 || (yLine - py) / vy < 0) return null; let t = (yLine - py) / vy, x = px + vx * t; const lo = PR, hi = 1 - PR, w = hi - lo; let k = ((x - lo) % (2 * w) + 2 * w) % (2 * w); x = k > w ? hi - (k - w) : lo + k; return { x, t }; }
  function brain(B, m, side, dt) { const mir = side === 'you', fy = y => mir ? 2 - y : y, P = { x: PK.x, y: fy(PK.y), vx: PK.vx, vy: mir ? -PK.vy : PK.vy }, me = { x: m.x, y: fy(m.y) };
    B.re -= dt; if (B.re > 0 && B.tgt) { m.tx = B.tgt.x; m.ty = fy(B.tgt.y); return; } B.re = B.react * rr(0.8, 1.25); const sk = B.skill;
    let tx, ty; const live = S.ph === 'live', mineHalf = P.y < 1, spd = Math.hypot(P.vx, P.vy);
    if (!live) { tx = 0.5; ty = 0.16; if (S.ph === 'serve' && S.server === side) { tx = P.x; ty = P.y - (PR + MR) - 0.05; } }
    else if (mineHalf && P.vy > -1.6 && spd < 3.2 + sk * 1.6) {
      // go and hit it: line up behind the puck on the line to a target (straight at the slot, or banked off a rail)
      if (!B.aim || B.aimT < S.t) { const bank = Math.random() < 0.25 + sk * 0.2, gx = 0.5 + rr(-0.12, 0.12); B.aim = bank ? { x: Math.random() < 0.5 ? -gx : 2 - gx, y: 2 } : { x: gx, y: 2 }; B.aimT = S.t + 1.2; }
      const lead = 0.06 + 0.05 * sk, ax = P.x + P.vx * lead, ay = P.y + P.vy * lead, dx = B.aim.x - ax, dy = B.aim.y - ay, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, rad = PR + MR;
      const bx = ax - ux * (rad + 0.07), by = ay - uy * (rad + 0.07), dme = Math.hypot(me.x - bx, me.y - by);
      if (dme < 0.06 + sk * 0.03 || B.strike > 0) { B.strike = (B.strike > 0 ? B.strike : 0.28) - dt; tx = ax + ux * (0.2 + sk * 0.1) + rr(-1, 1) * B.err; ty = ay + uy * (0.2 + sk * 0.1); }
      else if (me.y > ay - 0.01) { tx = P.x + (me.x < P.x ? -1 : 1) * (rad + 0.06); ty = P.y - rad - 0.05; } // get round behind it first
      else { tx = bx; ty = by; } }
    else if (P.vy < -0.3) { // coming at my goal: get in front of it
      const pr2 = predictX(P.x, P.y, P.vx, P.vy, 0.14); const gx = pr2 ? pr2.x : P.x; tx = clamp(0.5 + (gx - 0.5) * 0.9, 0.5 - GW * 0.65, 0.5 + GW * 0.65) + rr(-1, 1) * B.err; ty = 0.13 + (pr2 && pr2.t > 0.5 ? 0.06 : 0); B.strike = 0; }
    else { tx = 0.5 + (P.x - 0.5) * 0.35; ty = 0.2 + sk * 0.06; B.strike = 0; }
    B.tgt = { x: tx, y: ty }; m.tx = tx; m.ty = fy(ty); }
  const botOpp = { re: 0, react: 0.16, skill: 0.4, err: 0.03 }, botYou = { re: 0, react: 0.12, skill: 0.7, err: 0.03 };
  function setLevel() { const lvl = !!save.flag(FL.table), w = save.stat(SK.wins, 0), st = S.stake || 0; const k = S.demo ? 0.35 : clamp(0.28 + w * 0.06 + st / 400 + (lvl ? 0.12 : 0), 0.25, 0.85);
    Object.assign(botOpp, { react: 0.24 - k * 0.12, skill: k, err: 0.085 - k * 0.055 }); S.oppSpd = 0.48 + k * 0.32; }

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
    const cands = [{ id: 'opp', p: opp.position, r: 1.9, label: 'Talk to ' + ONc }, { id: 'table', p: null, label: 'Play air hockey' }, { id: 'keeper', p: spots.barFront, r: 1.7, label: 'Talk to ' + capName(TV.keeper.name) }, ...regs.map((g, i) => ({ id: 'reg' + i, p: g.f.position, r: 1.6, label: 'Talk to ' + capName(g.r.name) })), { id: 'door', p: spots.door, r: 1.5, label: 'Leave the tavern' }];
    let near = null, nd = 1e9; for (const c of cands) { let d; if (c.id === 'table') { const dx = Math.max(0, Math.abs(PL.x - T0.x) - OW / 2), dz = Math.max(0, Math.abs(PL.z - T0.z) - OL / 2); d = Math.hypot(dx, dz); if (d < 0.75 && d < nd) { nd = d; near = c; } continue; } d = Math.hypot(PL.x - c.p.x, PL.z - c.p.z); if (d < c.r && d < nd) { nd = d; near = c; } }
    S.near = near; }
  // ---------- talk ----------
  const N = t => ({ who: 'n', text: t }), Pp = t => ({ who: 'p', text: t });
  function openDlg(name, role, lines, choices, onChoose, fox) { S.dlg = { name, role, lines, i: 0, chars: 0, choices, onChoose, fox }; if (fox) fox.userData.talking = true; }
  function closeDlg() { if (S.dlg && S.dlg.fox) S.dlg.fox.userData.talking = false; S.dlg = null; }
  function oppTalk() { const won = save.flag(FL.won), lvl = save.flag(FL.table), told = save.flag(FL.told); let lines;
    if (lvl && !told) { lines = OP.level.map(N); save.setFlag(FL.told); } else lines = (won ? OP.again : OP.hi).map(N);
    const asked = S.asked || (S.asked = {}), ch = () => [{ text: "Let's play.", k: 'play' }, ...Object.entries(OP.topics).map(([k, v]) => ({ text: v[0], k })), { text: 'Another time.', k: 'bye', bye: true }].map(c => ({ ...c, asked: !!asked[c.k] }));
    const onChoose = c => { if (c.k === 'play') { closeDlg(); api.openStake(); return; } if (c.k === 'bye') { openDlg(ON, OP.role, [N('Fan stays on. Come back.')], null, null, opp); return; } asked[c.k] = true; openDlg(ON, OP.role, OP.topics[c.k].slice(1).map(N), ch(), onChoose, opp); };
    openDlg(ON, OP.role, lines, ch(), onChoose, opp); }
  function keeperTalk() { const K = TV.keeper, ch = () => [...K.stock.map(([id, label, price]) => ({ text: label + ' · ' + price + 'g', id, label, price })), { text: 'Bye.', bye: true }];
    const onChoose = c => { if (c.bye) { closeDlg(); return; } if (save.spend(c.price)) { save.give(c.id, 1); toast('+1 ' + c.label + ' · −' + c.price + 'g'); TA.coins(4); } else toast('Not enough gold for ' + c.label + '.'); openDlg(K.name, K.role, [N('Anything else?')], ch(), onChoose, keeper); };
    openDlg(K.name, K.role, [N(K.greeting)], ch(), onChoose, keeper); }
  function talk() { if (S.mode !== 'walk') return; const d = S.dlg; if (d) { const ln = d.lines[d.i]; if (d.chars < ln.text.length) { d.chars = ln.text.length; return; } if (d.i < d.lines.length - 1) { d.i++; d.chars = 0; return; } if (!d.choices) closeDlg(); return; }
    const n = S.near; if (!n) return; ainit(); if (n.id === 'opp' || n.id === 'table') oppTalk(); else if (n.id === 'keeper') keeperTalk(); else if (n.id === 'door') { TA.door(); if (api.onExit) api.onExit(); else toast(TV.door + ' The world map takes it from here.'); } else { const g = regs[+n.id.slice(3)]; openDlg(g.r.name, g.r.role, g.r.lines.map(([w, t]) => w === 'p' ? Pp(t) : N(t)), null, null, g.f); } }

  // ---------- camera ----------
  const CAM = { pos: V3(T0.x + 6, 5, T0.z + 7), look: V3(T0.x, Y, T0.z) }; camera.position.copy(CAM.pos);
  const SAFE = { t: 0, b: 0, l: 0, r: 0 }, fitCam = new THREE.PerspectiveCamera(50, 1, 0.05, 90), fitCache = new Map(), _p = V3();
  function fitView(key, pts, yaw, el, fov) { const W = CW(), H = CHh(), ck = key + '|' + W + 'x' + H + '|' + SAFE.t + '|' + SAFE.b + '|' + SAFE.l + '|' + SAFE.r + '|' + S.zoom.toFixed(2); if (fitCache.has(ck)) return fitCache.get(ck);
    fitCam.aspect = W / H; fitCam.fov = fov; fitCam.updateProjectionMatrix(); const yT = 1 - 2 * SAFE.t / H - 0.03, yB = -1 + 2 * SAFE.b / H + 0.03, xL = -1 + 2 * SAFE.l / W + 0.03, xR = 1 - 2 * SAFE.r / W - 0.03, sx = (xL + xR) / 2, sy = (yT + yB) / 2;
    const dir = V3(Math.sin(yaw) * Math.cos(el), Math.sin(el), Math.cos(yaw) * Math.cos(el)), tgt = V3(); pts.forEach(p => tgt.add(p)); tgt.multiplyScalar(1 / pts.length);
    const bounds = d => { fitCam.position.copy(tgt).addScaledVector(dir, d); fitCam.lookAt(tgt); fitCam.updateMatrixWorld(); let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for (const p of pts) { _p.copy(p).project(fitCam); if (_p.z > 1) return null; x0 = Math.min(x0, _p.x); x1 = Math.max(x1, _p.x); y0 = Math.min(y0, _p.y); y1 = Math.max(y1, _p.y); } return { x0, x1, y0, y1 }; };
    const fits = d => { const b = bounds(d); return b && b.x1 - b.x0 <= xR - xL && b.y1 - b.y0 <= yT - yB; }; let d = 4;
    for (let it = 0; it < 4; it++) { let lo = 0.5, hi = 40; for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; } d = hi; const b = bounds(d); if (!b) break; const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, th = Math.tan(fov * Math.PI / 360) * d, right = V3().setFromMatrixColumn(fitCam.matrixWorld, 0), up = V3().setFromMatrixColumn(fitCam.matrixWorld, 1); tgt.addScaledVector(right, (cx - sx) * th * fitCam.aspect).addScaledVector(up, (cy - sy) * th); }
    d /= S.zoom; const out = { pos: tgt.clone().addScaledVector(dir, d), look: tgt.clone() }; if (fitCache.size > 80) fitCache.clear(); fitCache.set(ck, out); return out; }
  const tablePts = (far = 0.04) => { const e = 0.03; return [[-OW / 2 - e, -OL / 2 - far], [OW / 2 + e, -OL / 2 - far], [-OW / 2 - e, OL / 2 + e], [OW / 2 + e, OL / 2 + e]].map(([x, z]) => V3(T0.x + x, Y + 0.07, T0.z + z)); };
  function camShot() { const W = CW(), H = CHh(), port = W < H;
    if (S.mode === 'play' || S.mode === 'stake' || S.mode === 'done') { if (S.view === 'low' && S.mode === 'play') { const fov = port ? 58 : 46; camera.fov = fov; return fitView('low', tablePts(0.3), 0, port ? 0.78 : 0.62, fov); }
      const fov = port ? 44 : 38; camera.fov = fov; return fitView('top', tablePts(0.3), port ? 0 : Math.PI / 2, port ? 1.22 : 1.3, fov); }
    if (S.mode === 'intro') { const a = S.t * 0.12, r = port ? 7.5 : 6.4; camera.fov = port ? 62 : 48; const look = V3(T0.x + (port ? 0 : -1.0), Y - (port ? 0.9 : 0.2), T0.z); return { pos: V3(T0.x + Math.sin(a) * r, port ? 6.2 : 4.0, T0.z + Math.cos(a) * r), look }; }
    camera.fov = port ? 60 : 50; const off = port ? V3(0, 9.6, 7.4) : V3(0, 9.4, 6.2); return { pos: V3(PL.x + off.x, off.y, PL.z + off.z), look: V3(PL.x, 0.8, PL.z - (port ? 0.6 : 1.1)) }; }

  // ---------- your mallet: thumb pad / table (slides by how far you move), mouse (under the pointer), keys ----------
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -Y), ndc = new THREE.Vector2(), hitP = V3(), ptrs = new Map(); let pinch = null;
  const tableAt = (cx, cy) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); if (!ray.ray.intersectPlane(plane, hitP)) return null; return W2T(hitP.x, hitP.z); };
  const canMove = () => S.mode === 'play' && !S.demo && !PAUSE && (S.ph === 'live' || S.ph === 'serve' || S.ph === 'goal');
  const GAIN = 1.45; let padP = null;
  function padDown(x, y, id = 'pad', mouse = false) { if (!canMove()) return false; ainit(); const t = tableAt(x, y); if (mouse && t) { YM.tx = t.u; YM.ty = t.v; } padP = { id, x, y, t, mouse }; S.touching = true; return true; }
  function padMove(x, y, id = 'pad') { if (!padP || padP.id !== id || !canMove()) return; const t = tableAt(x, y); if (!t) return; if (padP.mouse) { YM.tx = t.u; YM.ty = t.v; } else if (padP.t) { const [y0, y1] = yLim('you'); YM.tx = clamp(YM.tx + (t.u - padP.t.u) * GAIN, MR, 1 - MR); YM.ty = clamp(YM.ty + (t.v - padP.t.v) * GAIN, y0, y1); } padP.t = t; padP.x = x; padP.y = y; }
  function padUp(id = 'pad') { if (padP && padP.id === id) { padP = null; S.touching = false; } }
  const el = renderer.domElement;
  const onDown = e => { if (S.mode !== 'play') return; e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (er) {} ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: S.zoom }; padUp(e.pointerId); return; } padDown(e.clientX, e.clientY, e.pointerId, e.pointerType === 'mouse'); };
  const onMove = e => { if (!ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse' && canMove() && !padP) { const t = tableAt(e.clientX, e.clientY); if (t) { YM.tx = t.u; YM.ty = t.v; } } return; } ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pinch && ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; S.zoom = clamp(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(30, pinch.d), 0.75, 1.6); return; } padMove(e.clientX, e.clientY, e.pointerId); };
  const onUp = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; padUp(e.pointerId); };
  el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);
  const onWheel = e => { if (S.mode !== 'play') return; e.preventDefault(); S.zoom = clamp(S.zoom * (e.deltaY > 0 ? 0.93 : 1.07), 0.75, 1.6); }; el.addEventListener('wheel', onWheel, { passive: false });
  function keyMove(dt) { let kx = 0, ky = 0; if (keys.has('KeyA') || keys.has('ArrowLeft')) kx -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) kx += 1; if (keys.has('KeyW') || keys.has('ArrowUp')) ky += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) ky -= 1; if (Math.abs(stick.x) > 0.12 || Math.abs(stick.y) > 0.12) { kx = stick.x; ky = stick.y; } if (!kx && !ky) return;
    camera.updateMatrixWorld(); const r = V3().setFromMatrixColumn(camera.matrixWorld, 0), f = V3(); camera.getWorldDirection(f); r.y = 0; f.y = 0; r.normalize(); f.normalize(); const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4.2 : 2.6) * dt, wx = (r.x * kx + f.x * ky) * sp, wz = (r.z * kx + f.z * ky) * sp, [y0, y1] = yLim('you');
    YM.tx = clamp(YM.x + wx / SC * 2.2, MR, 1 - MR); YM.ty = clamp(YM.y + wz / SC * 2.2, y0, y1); }

  // ---------- per-frame ----------
  const clock = new THREE.Clock(); let raf = 0, hudT = 0;
  const placeFox = (f, x, z, yaw, mv, dt) => { f.position.x = x; f.position.z = z; let d = ((yaw - f.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI; f.rotation.y += d * Math.min(1, dt * 10); kit.animFox(f, dt, mv); };
  const walkTo = (o, tx, tz, sp, dt) => { const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz); if (d < 0.03) { o.mv = 0; return true; } const k = Math.min(1, sp * dt / d); o.x += dx * k; o.z += dz * k; o.mv = Math.min(d / dt, sp); o.yaw = Math.atan2(dx, dz); return false; };
  function posePlayer(f, mx) { const P = f.userData.P; P.arms[0].rotation.set(-1.1 - mx * 0.2, 0, 0.2); P.arms[1].rotation.set(-0.5, 0, -0.15); P.body.rotation.x = 0.36; P.legs[0].rotation.x = 0.3; P.legs[1].rotation.x = -0.25; }
  const ghostMats = new Map(); const ghostify = f => { if (ghostMats.has(f)) return ghostMats.get(f); const list = []; f.traverse(o => { if (!o.isMesh || !o.material) return; const one = m => { const c = m.clone(); c.transparent = true; list.push(c); return c; }; o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material); }); ghostMats.set(f, list); return list; };
  const fadeFox = (f, target, dt) => { const Lm = ghostify(f), cur = f.userData.fade ?? 1, v = cur + (target - cur) * Math.min(1, dt * 8); f.userData.fade = v; for (const m of Lm) { const base = m.userData.op0 ?? (m.userData.op0 = m.opacity); m.opacity = base * v; m.depthWrite = v > 0.95; } };
  let airState = null;
  function step(dt) { S.t += dt; S.flashT -= dt; if (S.flashT <= 0) S.flash = null; S.callT -= dt; if (S.callT <= 0) S.call = ''; S.toastT -= dt; if (S.toastT <= 0) S.toast = null;
    for (const p of smokeS) { if (p.life <= 0) { p.s.material.opacity = 0; continue; } p.life -= dt * 0.9; p.s.position.addScaledVector(p.v, dt); p.s.material.opacity = 0.4 * p.life; p.s.scale.setScalar(0.2 + (1 - p.life) * 0.4); }
    if (S.dlg) S.dlg.chars = Math.min(S.dlg.lines[S.dlg.i].text.length, S.dlg.chars + dt * 70);
    const play = S.mode === 'play';
    if (play) { if (!S.demo) keyMove(dt); else brain(botYou, YM, 'you', dt); brain(botOpp, OM, 'him', dt);
      if (S.ph === 'serve') { S.serveT -= dt; if (S.serveT <= 0) { S.ph = 'live'; TA.serve(); call(S.server === 'you' ? 'YOUR PUCK' : ON + "'S PUCK", 1.2); } }
      else if (S.ph === 'goal') { S.goalT -= dt; if (S.goalT <= 0) serveTo(S.nextServe || 'you', 0.5); }
      else if (S.ph === 'over' && S.t >= S.overT) finishMatch();
      physics(dt);
      // a puck that dies in someone's half goes back to them as a serve, so the match never stalls
      if (S.ph === 'live') { if (Math.hypot(PK.vx, PK.vy) < 0.04) { S.idleT = (S.idleT || 0) + dt; if (S.idleT > 4) { S.idleT = 0; serveTo(PK.y > 1 ? 'you' : 'him', 0.4); } } else S.idleT = 0; }
      if (S.demo && S.t > S.demoEnd && S.ph !== 'goal') { S.demo = false; toIntro(); return; } }
    else if (S.mode === 'walk') walkStep(dt);
    // the puck and the mallets on the table
    const showP = play || S.mode === 'done' || S.mode === 'stake' || S.mode === 'intro' || S.mode === 'walk'; puckG.visible = showP && S.ph !== 'goal'; { const w = T2W(PK.x, PK.y, Y); puckG.position.copy(w); puckSh.position.set(w.x + 0.01, Y + 0.002, w.z + 0.012); puckSh.visible = puckG.visible; puckG.rotation.y += Math.hypot(PK.vx, PK.vy) * dt * 0.6; }
    for (const [m, g, sh] of [[YM, youM, youSh], [OM, oppM, oppSh]]) { const w = T2W(m.x, m.y, Y); g.position.copy(w); sh.position.set(w.x + 0.012, Y + 0.002, w.z + 0.015); }
    if (!play) { const ease = (m, x, y) => { m.tx = x; m.ty = y; moveMallet(m, m === YM ? 'you' : 'him', dt); }; ease(YM, 0.5, 1.84); ease(OM, 0.5, 0.16); }
    youRing.visible = play && !S.demo && (S.ph === 'serve' || S.touching); if (youRing.visible) { const w = T2W(YM.x, YM.y, Y + 0.004); youRing.position.copy(w); youRing.scale.setScalar(1 + Math.sin(S.t * 7) * 0.08); }
    for (const f of flashes) { if (f.t > 0) { f.t -= dt; const k = 1 - Math.max(0, f.t) / 0.28; f.m.material.opacity = (1 - k) * 0.9; f.m.scale.setScalar((0.03 + k * 0.09) * (f.s || 1)); } else f.m.material.opacity = 0; }
    TA.glide(play && S.ph === 'live' ? Math.hypot(PK.vx, PK.vy) : 0);
    // trail
    { const sp = Math.hypot(PK.vx, PK.vy); trailP.unshift(T2W(PK.x, PK.y, Y + 0.01)); if (trailP.length > trail.length) trailP.pop(); trail.forEach((s, i) => { const p = trailP[i]; if (!p || !puckG.visible || S.ph !== 'live') { s.material.opacity = 0; return; } s.position.copy(p); const k = clamp((sp - 1.2) / 4, 0, 1); s.material.opacity = k * 0.5 * (1 - i / trail.length); s.material.color.set(sp > 4.6 ? 0xff6a2a : 0xffd23a); s.scale.setScalar(pr * (3.2 - i * 0.18)); }); }
    // the foxes: Ben at the near end, the regular at the far end, both following their mallets
    if (play || S.mode === 'done' || S.mode === 'stake') { const bx = T2W(YM.x, 2).x, ox = T2W(OM.x, 0).x;
      if (play) { PL.x = damp(PL.x, clamp(bx, T0.x - OW / 2 + 0.1, T0.x + OW / 2 - 0.1), 10, dt); PL.z = damp(PL.z, youEnd(), 8, dt); PL.yaw = Math.PI; PL.mv = 0; OX.x = damp(OX.x, clamp(ox, T0.x - OW / 2 + 0.1, T0.x + OW / 2 - 0.1), 9, dt); OX.z = damp(OX.z, oppEnd(), 8, dt); OX.yaw = 0; OX.mv = 0; }
      else { walkTo(PL, T0.x + OW / 2 + 0.7, T0.z + OL / 2 - 0.2, 3.5, dt); walkTo(OX, homeOpp.x, homeOpp.z, 3.5, dt); if (PL.mv === 0) PL.yaw = Math.atan2(T0.x - PL.x, T0.z - PL.z); if (OX.mv === 0) OX.yaw = Math.atan2(T0.x - OX.x, T0.z - OX.z); } }
    else { walkTo(OX, homeOpp.x, homeOpp.z, 3, dt); if (OX.mv === 0) OX.yaw = S.dlg && S.dlg.fox === opp ? Math.atan2(PL.x - OX.x, PL.z - OX.z) : Math.atan2(T0.x - OX.x, T0.z - OX.z); }
    PL.hop = Math.max(0, PL.hop - dt); placeFox(ben, PL.x, PL.z, PL.yaw, PL.mv, dt); ben.position.y = PL.hop > 0 ? Math.sin((1 - PL.hop / 0.5) * Math.PI) * 0.4 : 0; placeFox(opp, OX.x, OX.z, OX.yaw, OX.mv, dt);
    placeFox(keeper, keeper.position.x, keeper.position.z, S.dlg && S.dlg.fox === keeper ? Math.atan2(PL.x - keeper.position.x, PL.z - keeper.position.z) : -Math.PI / 2, 0, dt);
    regs.forEach(g => { placeFox(g.f, g.f.position.x, g.f.position.z, S.dlg && S.dlg.fox === g.f ? Math.atan2(PL.x - g.f.position.x, PL.z - g.f.position.z) : (play && g.r.lean ? Math.atan2(T0.x - g.f.position.x, T0.z - g.f.position.z) : g.yaw), 0, dt); if (g.seat) { const P = g.f.userData.P; P.legs[0].rotation.x = P.legs[1].rotation.x = -1.45; } });
    if (play) { posePlayer(ben, (YM.x - 0.5)); posePlayer(opp, (OM.x - 0.5)); }
    { const top = play && S.view === 'top', low = play && S.view === 'low'; fadeFox(ben, top ? 0.14 : low ? 0.1 : 1, dt); fadeFox(opp, top ? 0.38 : 1, dt); }
    ben.userData.lookAt = play ? T2W(PK.x, PK.y) : S.dlg && S.dlg.fox ? S.dlg.fox.position.clone().setY(1.6) : null; opp.userData.lookAt = play ? T2W(PK.x, PK.y) : null;
    // polish: goal light, neon pulse on hard hits, motes, moods
    S.glow = Math.max(0, (S.glow || 0) - dt); HT.goalLight.material.color.set(S.glow > 0 ? (Math.floor(S.t * 8) % 2 ? S.glowCol : 0x2a0e0a) : play ? 0x5a1a12 : 0x2a0e0a);
    { const sp = Math.hypot(PK.vx, PK.vy); neonGlow.forEach(g => { g.material.color.set(S.glow > 0 ? S.glowCol : HT.neon); g.material.opacity = damp(g.material.opacity, play ? 0.3 + clamp(sp / 7, 0, 1) * 0.45 + (S.glow > 0 ? 0.3 : 0) : 0.2, 6, dt); }); }
    { const t = S.t; motes.base.forEach(([x, y, z, ph], i) => { motes.a[i * 3] = x + Math.sin(t * 0.21 + ph) * 0.3; motes.a[i * 3 + 1] = y + Math.sin(t * 0.13 + ph * 2) * 0.25; motes.a[i * 3 + 2] = z + Math.cos(t * 0.17 + ph) * 0.3; }); motes.g.attributes.position.needsUpdate = true; }
    for (const f of [ben, opp, keeper, ...regs.map(g => g.f)]) { const u = f.userData; if (u.moodT > 0) { u.moodT -= dt; if (u.moodT <= 0 && u.moodBack != null) { u.mood = u.moodBack; u.moodBack = null; } } }
    { const want = play && S.ph !== 'over' && !audio.muted; if (want !== airState) { airState = want; TA.air(want); } }
    TA.duck(play ? 0.7 : S.dlg ? 0.6 : 0); TA.update(dt);
    HALL.lampG.visible = false; pend.visible = S.mode === 'walk';
    drawChalk(); drawBoard();
    blobLoop();
    const sh = camShot(); camera.updateProjectionMatrix(); const k = Math.min(1, dt * (S.mode === 'walk' ? 5 : 3.2)); CAM.pos.lerp(sh.pos, k); CAM.look.lerp(sh.look, k); camera.position.copy(CAM.pos); if (S.shake > 0.002) { camera.position.x += rr(-1, 1) * S.shake; camera.position.y += rr(-1, 1) * S.shake * 0.5; S.shake *= Math.pow(0.02, dt); } camera.lookAt(CAM.look); }
  let boardKey = ''; function drawBoard() { const k = S.score.you + '|' + S.score.him + '|' + S.mode + '|' + (S.glow > 0 ? 1 : 0); if (k === boardKey) return; boardKey = k; const c = HT.boardCv.getContext('2d');
    c.fillStyle = S.glow > 0 ? (S.glowCol === 0xff3a2a ? '#3a0c08' : '#08143a') : '#0a0908'; c.fillRect(0, 0, 512, 160); c.font = '900 30px Archivo, Arial'; c.textAlign = 'center'; c.fillStyle = '#ffd23a'; c.fillText('BEN', 110, 40); c.fillText(ON, 402, 40); c.fillStyle = HT.neon; c.font = '800 20px Archivo, Arial'; c.fillText('FIRST TO ' + HOCKEY.TO, 256, 40);
    const dig = (n, x, col) => { c.font = '900 96px "Courier New", monospace'; c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillText('8', x, 140); c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 16; c.fillText(String(n), x, 140); c.shadowBlur = 0; };
    dig(S.score.you, 110, '#ff4a3a'); dig(S.score.him, 402, '#4a8aff'); c.fillStyle = '#3a3836'; c.fillRect(250, 70, 12, 70); HT.boardT.needsUpdate = true; }
  let chalkKey = ''; function drawChalk() { const w = save.stat(SK.wins, 0), l = save.stat(SK.losses, 0), b = save.stat(SK.best, 0), k = w + '|' + l + '|' + b; if (k === chalkKey) return; chalkKey = k; const c = HALL.chalkCv.getContext('2d');
    c.fillStyle = '#1f2a24'; c.fillRect(0, 0, 512, 256); c.strokeStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 30; i++) { c.beginPath(); c.moveTo(Math.random() * 512, Math.random() * 256); c.lineTo(Math.random() * 512, Math.random() * 256); c.stroke(); }
    c.fillStyle = '#f6f3ee'; c.font = '900 34px Archivo, Arial'; c.fillText('AIR HOCKEY', 22, 50); c.font = '700 22px Archivo, Arial'; c.fillStyle = '#ffd23a'; c.fillText('FASTEST SMASH ' + (b ? b + ' km/h' : '—'), 22, 86);
    c.fillStyle = '#f6f3ee'; c.font = '800 26px Archivo, Arial'; c.fillText('BEN  ' + w + ' won', 22, 150); c.fillText(ON + '  ' + l + ' won', 22, 206); HALL.chalkT.needsUpdate = true; }
  function frame() { raf = requestAnimationFrame(frame); const dt = Math.min(0.05, clock.getDelta()); if (HIDDEN) return; if (!PAUSE) step(dt); renderer.render(scene, camera); hudT -= dt; if (hudT <= 0) { hudT = S.mode === 'play' ? 0.066 : 0.1; onState(hud()); } }
  function onRs() { renderer.setSize(CW(), CHh()); camera.aspect = CW() / CHh(); camera.updateProjectionMatrix(); } addEventListener('resize', onRs); const ro = new ResizeObserver(onRs); ro.observe(container);
  const onKD = e => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (S.mode === 'walk') { if (e.code === 'KeyE' && !e.repeat) { e.preventDefault(); talk(); return; } if (S.dlg && /Digit[1-9]/.test(e.code) && S.dlg.choices && S.dlg.chars >= S.dlg.lines[S.dlg.i].text.length && S.dlg.i === S.dlg.lines.length - 1) { api.choose(+e.code.slice(5) - 1); return; } if (e.code === 'Space' && !e.repeat) { e.preventDefault(); api.jump(); return; } if (e.code === 'Digit1' && !S.dlg) api.melee(); }
    if (S.mode === 'play' && !S.demo && e.code === 'KeyV' && !e.repeat) api.toggleView();
    if (/^(Arrow|Key[WASD]|Shift)/.test(e.code)) { keys.add(e.code); if (S.mode !== 'intro' && /^Arrow/.test(e.code)) e.preventDefault(); } };
  const onKU = e => keys.delete(e.code), onBlur = () => keys.clear(); addEventListener('keydown', onKD); addEventListener('keyup', onKU); addEventListener('blur', onBlur);

  function hud() { const play = S.mode === 'play', d = S.dlg, ln = d && d.lines[d.i], a = S.score.you, b = S.score.him;
    const quest = play ? 'BEN ' + a + ' · ' + ON + ' ' + b + ' · FIRST TO ' + HOCKEY.TO + (S.stake ? ' · STAKE ' + S.stake + 'g' : ' · FRIENDLY') : S.mode === 'walk' ? 'TALK TO ' + ON + ' · PLAY AIR HOCKEY' : OP.title.toUpperCase();
    const demoCap = !S.demo ? null : S.ph === 'serve' ? ['PAD', 'SLIDE YOUR THUMB ON THE PAD. YOUR MALLET MOVES AS FAR AS YOUR THUMB DOES'] : S.ph === 'goal' ? ['', 'IN THE SLOT! FIRST TO SEVEN WINS'] : PK.y > 1 ? ['HIT', 'MOVE THROUGH THE PUCK TO HIT IT. MOVING FAST = A SMASH'] : ['BACK', 'GET BACK IN FRONT OF YOUR SLOT WHILE IT IS AT HIS END'];
    const hand = S.demo && play ? { kind: 'pad', x: YM.x, y: (YM.y - 1) } : null;
    return { mode: S.mode, ph: S.ph, score: { you: a, him: b }, to: HOCKEY.TO, view: S.view, flash: S.flash, call: S.call, stake: S.stake, gold: save.data.gold, done: S.done, demo: demoCap, hand, touching: !!S.touching, serve: S.ph === 'serve' ? S.server : null, matchPoint: Math.max(a, b) === HOCKEY.TO - 1, best: S.best, quest, mal: { x: YM.x, y: YM.y }, puck: { x: PK.x, y: PK.y },
      prog: { wins: save.stat(SK.wins, 0), losses: save.stat(SK.losses, 0), best: save.stat(SK.best, 0), suggest: save.stat(SK.stake, 20), maxBet: Math.max(0, Math.min(HOCKEY.BET_MAX, Math.floor(save.data.gold || 0))), level: !!save.flag(FL.table), won: !!save.flag(FL.won) },
      musicOn: TA.musicOn, tv: { key: WK, world: TV.world, room: TV.room, place: TV.place, title: OP.title, hall: TV.hall, opp: ON, keeper: TV.keeper.name, ph: !!OP.ph, neon: HT.neon },
      std: { prompt: S.mode === 'walk' && !d && S.near ? S.near.label : null, toast: S.toast, dialog: d && S.mode === 'walk' ? { name: ln.who === 'p' ? 'BEN' : d.name, role: ln.who === 'p' ? 'You' : d.role, text: ln.text.slice(0, Math.floor(d.chars)), step: d.i + 1, total: d.lines.length, done: d.chars >= ln.text.length, you: ln.who === 'p', more: false, required: false, choices: d.choices && d.i === d.lines.length - 1 && d.chars >= ln.text.length ? d.choices.map(c => ({ text: c.text, asked: !!c.asked, bye: !!c.bye })) : null } : null, quest } };
  }
  // ---------- modes ----------
  function resetTable() { PK.x = 0.5; PK.y = 1.5; PK.vx = PK.vy = 0; Object.assign(YM, { x: 0.5, y: 1.84, tx: 0.5, ty: 1.84, vx: 0, vy: 0 }); Object.assign(OM, { x: 0.5, y: 0.16, tx: 0.5, ty: 0.16, vx: 0, vy: 0 }); }
  function toIntro() { S.mode = 'intro'; S.ph = 'idle'; S.done = null; S.demo = false; closeDlg(); resetTable(); PL.x = spots.enter.x; PL.z = spots.enter.z; PL.yaw = Math.PI; OX.x = homeOpp.x; OX.z = homeOpp.z; S.view = 'top'; S.zoom = 1; S.score = { you: 0, him: 0 }; }
  function begin(stake, demo = false) { ainit(); const mx = Math.max(0, Math.min(HOCKEY.BET_MAX, Math.floor(save.data.gold || 0))); S.stake = demo ? 0 : clamp(Math.round(stake || 0), 0, mx); S.mode = 'play'; S.done = null; S.res = null; S.demo = demo; S.score = { you: 0, him: 0 }; S.best = 0; S.recFlashed = false; S.hits = 0; S.rally = 0; S.maxRally = 0; S.zoom = 1; closeDlg(); stick.x = stick.y = 0; resetTable(); setLevel(); botOpp.aim = null; botYou.aim = null;
    serveTo('you', 1.4); call(demo ? 'DEMO · NOTHING IS SAVED' : 'YOUR PUCK' + (S.stake ? ' · ' + S.stake + 'g ON IT' : ' · A FRIENDLY'), 2.4); if (demo) S.demoEnd = S.t + 70; TA.beep(true); }
  const foxBlobs = [ben, opp, keeper, ...regs.map(g => g.f)].map(f => ({ f, b: blob(1.15, 1.15, 0.85) }));
  const blobLoop = () => { for (const f of foxBlobs) f.b.position.set(f.f.position.x, 0.012, f.f.position.z); };
  resetTable(); drawBoard(); frame();
  const api = {
    walk() { ainit(); if (S.mode === 'intro' || S.mode === 'done' || S.mode === 'stake') { if (S.mode === 'intro') { PL.x = spots.enter.x; PL.z = spots.enter.z; PL.yaw = Math.PI; } S.mode = 'walk'; S.done = null; S.demo = false; toast('Walk up to ' + ONc + ' and press TALK to play.', 3.2); } },
    openStake() { ainit(); closeDlg(); S.mode = 'stake'; S.done = null; },
    begin, toIntro, demoStart() { if (S.mode === 'play') return; begin(0, true); }, demoStop() { if (!S.demo) return; S.demo = false; toIntro(); },
    quit() { if (S.mode !== 'play' || S.demo) return; S.mode = 'walk'; S.ph = 'idle'; resetTable(); call(''); TA.air(false); airState = false; toast('Called it off. Your money stays in your pocket.', 3); },
    padDown, padMove, padUp, toggleView() { S.view = S.view === 'top' ? 'low' : 'top'; return S.view; }, setSafe(t, b, l, r) { if (Math.abs(SAFE.t - t) + Math.abs(SAFE.b - b) + Math.abs(SAFE.l - l) + Math.abs(SAFE.r - r) > 3) { SAFE.t = t; SAFE.b = b; SAFE.l = l; SAFE.r = r; } },
    // Game HUD engine contract
    start() {}, talk, choose(i) { const d = S.dlg; if (!d || !d.choices) return; const c = d.choices[i]; if (c && d.onChoose) d.onChoose(c); }, closeDialog: closeDlg, nextLine: talk, clearToast() { S.toast = null; },
    melee() { if (S.mode !== 'walk' || S.dlg) return; toast(WK === 'luxor' ? 'TIB: “Gloves on, weapons past the gate.”' : 'No brawling in the tavern.', 2.4); }, range() { api.melee(); }, jump() { if (S.mode === 'walk' && !S.dlg && PL.hop <= 0) { PL.hop = 0.5; TA.tap(); } }, meleeUp() {},
    useItem(id) { if (S.mode === 'play') { flash('SAVE IT FOR AFTER THE MATCH', '#ffffff', 1.2); return; } if (save.take(id, 1)) toast(id === 'erToGo' ? 'Warm all the way down. +40 HP' : id === 'energyPod' ? 'Energy topped up.' : 'A treat.', 2.4); },
    closeWheel() {}, skipTime() {}, setPaused(v) { PAUSE = !!v; }, setVisible(v) { HIDDEN = !v; if (v) clock.getDelta(); }, setHudPad() {}, setStick(x, y) { stick.x = x; stick.y = y; }, eyeLook() {}, eyeRelease() {}, togglePov() { return false; }, lookBy() {}, zoomBy(d) { S.zoom = clamp(S.zoom * (1 - d * 0.1), 0.75, 1.6); }, getCam() { return { dist: 10, pitch: 0.6 }; }, setCam() {}, setMinimap() {}, toggleSound() { audio.setMuted && audio.setMuted(!audio.muted); airState = null; }, cycleWeather() {},
    mapData() { return { p: [PL.x, PL.z, PL.yaw], b: [['AIR HOCKEY', T0.x, T0.z], ['BAR', 4.2, -1.6], ['DOOR', 0, HALL.D / 2]], f: [[opp.position.x, opp.position.z], [keeper.position.x, keeper.position.z], ...regs.map(g => [g.f.position.x, g.f.position.z])], e: [], q: [opp.position.x, opp.position.z, ON] }; },
    hud, onExit, hall: HALL, setMusic(on) { ainit(); TA.setMusic(on); }, toggleMusic() { ainit(); TA.setMusic(!TA.musicOn); return TA.musicOn; }, uiTap() { ainit(); TA.tap(); },
    // test hooks
    _state: () => S, _puck: () => ({ ...PK }), _mallets: () => ({ you: { ...YM }, him: { ...OM } }), _bots: () => ({ botYou, botOpp }), _sim(n, cb, dt = 1 / 30) { for (let i = 0; i < n; i++) { step(dt); if (cb && cb(S, i) === false) break; } renderer.render(scene, camera); onState(hud()); }, _place: (x, z) => { PL.x = x; PL.z = z; }, _puckSet(x, y, vx = 0, vy = 0) { Object.assign(PK, { x, y, vx, vy }); S.ph = 'live'; },
    destroy() { cancelAnimationFrame(raf); removeEventListener('resize', onRs); ro.disconnect(); removeEventListener('keydown', onKD); removeEventListener('keyup', onKU); removeEventListener('blur', onBlur); el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp); el.removeEventListener('wheel', onWheel); renderer.dispose(); renderer.domElement.remove(); try { TA.dispose(); audio.ctx && audio.ctx.close(); } catch (e) {} } };
  api.onExit = onExit;
  if (startIn === 'walk') api.walk();
  return api;
}
