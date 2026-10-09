// 8 GATES — TAVERN PING-PONG. The same walk-in tavern as Tavern Pool (any world), with a ping-pong table where the pool table
// stands. Gaya's opponent is VOLLEY (Gaya's tavern regular already says "Volley never loses at the ping-pong"); the other worlds
// get a new regular. Every opponent name + line is a PLACEHOLDER (ph: true) until Ben writes them.
//   WALK — the shared Game HUD drives Ben round the room; TALK to the table's regular → "Let's play." → name the stake.
//   PLAY — first to 11, win by 2, serve changes every 2 points (every point from 10–10). Your paddle follows your thumb
//          (slide anywhere: THUMB PAD or the table; it moves as far as your thumb does). The ball is hit when it reaches
//          your paddle: WHERE it meets the paddle aims it (edge = sharp angle, but risky), sliding UP through it = power
//          (fast = SMASH, a smash from below the net height can find the net), sliding sideways as you hit = sidespin curve.
//          Stand still = a safe block. Serve: swipe up. VIEW = behind you / from above.
//   buildPongHall(ctx, { world })  → the room + table as set dressing (Meru-style ctx), for a walk-in tavern
//   createPingPong({ container, onState, world, startIn, onExit }) → stand-alone room + game, Game HUD engine contract.
// Save: stats <world>.pong.wins / .losses / .stake / .best (fastest smash, km/h) / .rally (longest rally);
// flags <world>PongWon, <world>PongTable (3 staked wins), <world>PongTold.
import * as THREE from '../../vendor/three/three.module.js';
import { rr, clamp, damp, pick } from '../../village-game.js';
import { canvasTex } from '../../engine/textures.js';
import { CAST } from '../../engine/cast.js';
import { save } from '../../engine/save.js';
import { createStage } from '../../engine/restaurant-kit.js';
import { tavernAudio } from './tavern-audio.js';
import { TAVERNS, buildPoolHall } from './pool-hall.js';

// metres. x across (half width TW), z along (half length TL; Ben's end at +z), y up. Gravity a touch floaty for phones.
export const PONG = { TW: 0.7625, TL: 1.37, TY: 0.76, NET: 0.1525, BR: 0.022, G: 7.6, REST: 0.86, REACH: 0.24, TO: 11, BET_MAX: 100 };

export const PONG_OPP = {
  luxor: { name: 'NIB', role: 'Tavern', fur: '#fbbf6a', furDark: '#c98a3a', torso: ['#f2c94c', '#201e1d', '#a8792e'], mood: 'happy', ph: true, rubber: '#2f6fd8',
    hi: ['Ping-pong? It is the only game in here where nobody has to be angry.', 'Dabb tried it once. He hit the ball into the bar. Vesta kept it.'], again: ['Back again. I have been practising my backhand on the wall.'],
    topics: { spin: ['How do you make it curve?', 'Slide sideways as you hit it. The ball goes where your paddle was going.'], dabb: ['Does Dabb play?', 'He says the ball is too small to be worth hitting hard. Which is the problem.'] },
    win: ['Lovely. That edge ball was wicked.', 'All right, all right. Again?'], loss: ['Eleven! Keep your paddle up.', 'Short and low wins. You hit it long.'], level: ['Here is my secret. Do not swing at every ball. Block the fast ones. Hit the slow ones.', 'That is it. That is all of ping-pong.'] },
  meru: { name: 'DINK', role: 'Tavern', fur: '#e8a060', furDark: '#a8642a', torso: ['#3a6ea5', '#fbf8ec', '#22446e'], mood: 'excited', ph: true, rubber: '#2f6fd8' },
  gaya: { name: 'VOLLEY', role: 'Tavern', fur: '#e8792e', furDark: '#a8501a', torso: ['#2f9a8f', '#fbf8ec', '#1f6a62'], mood: 'happy', ph: true, rubber: '#2f9a8f',
    hi: ['Pip told you, did he? Fine. I never lose at the ping-pong. Pool is another story.'], again: ['Again? I do like an optimist.'] },
  kufa: { name: 'SAMI', role: 'Tavern', fur: '#d9a066', furDark: '#9a6a3a', torso: ['#fbf8ec', '#c42d3c', '#5a1a1a'], mood: 'happy', ph: true, rubber: '#c42d3c' },
  nebo: { name: 'HOLLY', role: 'Tavern', fur: '#c9a06a', furDark: '#8a6a3a', torso: ['#5a7a3a', '#e6dcc0', '#2a3a1a'], mood: 'happy', ph: true, rubber: '#5a7a3a' },
  zion: { name: 'RAZE', role: 'Tavern', fur: '#3a3836', furDark: '#1a1918', torso: ['#f2c94c', '#201e1d', '#a8792e'], mood: 'determined', ph: true, rubber: '#ec3013' },
};
const oppFor = k => { const o = PONG_OPP[k] || PONG_OPP.luxor, cap = o.name.charAt(0) + o.name.slice(1).toLowerCase();
  return { hi: ['Table is free. First to eleven. Want a game?'], again: ['Again? Paddles are on the table.'], topics: { spin: ['How do you make it curve?', 'Slide sideways as you hit it.'] }, win: ['Good game. Again?'], loss: ['Eleven! My table.'], level: ['Block the fast ones, hit the slow ones. That is the whole game.'], ...o, cap, title: cap + "'s Table" }; };
const RULE = [['PING', 64, 100], ['PONG', 64, 164], ['FIRST', 30, 232], ['TO ELEVEN', 30, 272]];

// ---------------- the table ----------------
export function buildPongTable(ctx, { world = 'luxor', T0, parent }) {
  const TV = TAVERNS[world] || TAVERNS.luxor, { THREE: T3, M, toon } = ctx, CT = ctx.canvasTex || canvasTex, { TW, TL, TY, NET } = PONG;
  const tbl = new T3.Group(); tbl.position.copy(T0); parent.add(tbl);
  const topT = CT(256, 460, c => { c.fillStyle = '#1f4e8c'; c.fillRect(0, 0, 256, 460); for (let i = 0; i < 1800; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)'; c.fillRect(Math.random() * 256, Math.random() * 460, 2, 2); }
    const g = c.createRadialGradient(128, 230, 30, 128, 230, 280); g.addColorStop(0, 'rgba(255,240,210,0.14)'); g.addColorStop(1, 'rgba(0,0,0,0.18)'); c.fillStyle = g; c.fillRect(0, 0, 256, 460);
    c.fillStyle = '#f6f3ee'; c.fillRect(0, 0, 256, 6); c.fillRect(0, 454, 256, 6); c.fillRect(0, 0, 6, 460); c.fillRect(250, 0, 6, 460); c.fillRect(126, 0, 4, 460); });
  const top = new T3.Mesh(new T3.BoxGeometry(2 * TW, 0.03, 2 * TL), [toon('#173a68'), toon('#173a68'), new T3.MeshToonMaterial({ map: topT, gradientMap: ctx.grad }), toon('#173a68'), toon('#f6f3ee'), toon('#f6f3ee')]); top.position.y = TY - 0.015; top.receiveShadow = true; tbl.add(top);
  const leg = toon('#2a2826'); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { M(new T3.BoxGeometry(0.07, TY - 0.06, 0.07), leg, sx * (TW - 0.18), (TY - 0.06) / 2, sz * (TL - 0.3), tbl, 0.01); M(new T3.CylinderGeometry(0.05, 0.05, 0.04, 10), toon('#111111'), sx * (TW - 0.18), 0.02, sz * (TL - 0.3), tbl, 0); }
  M(new T3.BoxGeometry(2 * TW - 0.4, 0.06, 0.06), leg, 0, TY - 0.09, 0, tbl, 0.006); for (const sz of [-1, 1]) M(new T3.BoxGeometry(2 * TW - 0.3, 0.05, 0.05), leg, 0, 0.25, sz * (TL - 0.3), tbl, 0.006);
  // the net: posts, a see-through mesh panel, a white tape
  const netT = CT(256, 32, c => { c.clearRect(0, 0, 256, 32); c.strokeStyle = 'rgba(20,20,22,0.85)'; c.lineWidth = 1; for (let x = 0; x <= 256; x += 6) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 32); c.stroke(); } for (let y = 0; y <= 32; y += 6) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); } });
  const net = new T3.Mesh(new T3.PlaneGeometry(2 * TW + 0.24, NET), new T3.MeshBasicMaterial({ map: netT, transparent: true, side: T3.DoubleSide, depthWrite: false })); net.position.set(0, TY + NET / 2, 0); tbl.add(net);
  M(new T3.BoxGeometry(2 * TW + 0.24, 0.018, 0.012), toon('#f6f3ee'), 0, TY + NET, 0, tbl, 0.003);
  for (const sx of [-1, 1]) { M(new T3.BoxGeometry(0.03, NET + 0.03, 0.03), toon('#3a3836'), sx * (TW + 0.13), TY + NET / 2, 0, tbl, 0.004); M(new T3.BoxGeometry(0.06, 0.03, 0.08), toon('#3a3836'), sx * (TW + 0.11), TY + 0.01, 0, tbl, 0.004); }
  // a little score flipper on the side of the table, redrawn by the game
  const boardCv = document.createElement('canvas'); boardCv.width = 256; boardCv.height = 128; const boardT = new T3.CanvasTexture(boardCv); boardT.colorSpace = T3.SRGBColorSpace;
  const BX = TW + 0.55; M(new T3.BoxGeometry(0.5, 0.26, 0.06), toon('#2a2826'), BX, TY + 0.13, 0, tbl, 0.01); { const f = new T3.Mesh(new T3.PlaneGeometry(0.46, 0.23), new T3.MeshBasicMaterial({ map: boardT })); f.position.set(BX, TY + 0.13, 0.032); tbl.add(f); const b = f.clone(); b.rotation.y = Math.PI; b.position.z = -0.032; tbl.add(b); }
  M(new T3.BoxGeometry(0.4, TY, 0.3), toon(TV.wallLow), BX, TY / 2, 0, tbl, 0.015);
  return { tbl, boardCv, boardT, net };
}

export function buildPongHall(ctx, { world = 'luxor' } = {}) {
  const H = buildPoolHall(ctx, { world, table: false, rule: RULE }); const T = buildPongTable(ctx, { world, T0: H.T0, parent: H.root });
  const { TW, TL } = PONG, ox = ctx.origin ? ctx.origin.x : 0, oz = ctx.origin ? ctx.origin.z : 0; H.colliders.push({ x0: H.T0.x - TW - 0.05 + ox, z0: H.T0.z - TL - 0.05 + oz, x1: H.T0.x + TW + 0.85 + ox, z1: H.T0.z + TL + 0.05 + oz });
  return { ...H, pong: T };
}

// ---------------- the stand-alone room + the game ----------------
export async function createPingPong({ container, onState = () => {}, world = 'luxor', startIn = 'intro', onExit = null }) {
  const TV = TAVERNS[world] || TAVERNS.luxor, WK = TV.key, OP = oppFor(WK), SK = { wins: WK + '.pong.wins', losses: WK + '.pong.losses', stake: WK + '.pong.stake', best: WK + '.pong.best', rally: WK + '.pong.rally' }, FL = { won: WK + 'PongWon', table: WK + 'PongTable', told: WK + 'PongTold' };
  const ST = createStage(container, { bg: TV.bg, keep: true }), { CW, CHh, renderer, scene, camera, V3, toon, M, kit, audio, puff, smokeS, sun, glowTex, touch, addOutline, grad } = ST;
  camera.far = 90; camera.updateProjectionMatrix();
  scene.children.filter(o => o.isHemisphereLight).forEach(h => { h.color.set(0xffe2c8); h.groundColor.set(0x5a2a1a); h.intensity = 1.05; });
  sun.position.set(-4, 10, 7); sun.intensity = 1.0; sun.color.set(0xffe0c0); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, far: 40 }); sun.shadow.camera.updateProjectionMatrix();
  // the pool room's table spot is a little tight for ping-pong run-off, so the table sits a touch forward of it
  const HALL = buildPongHall({ THREE, M, toon, canvasTex, scene, grad, addOutline }, { world: WK }), PT = HALL.pong;
  const { T0, spots } = HALL, { TW, TL, TY, NET, BR, G } = PONG;
  { const pl = new THREE.PointLight(0xfff0d0, touch ? 8 : 11, 7, 1.6); pl.position.set(T0.x, 2.6, T0.z); scene.add(pl); }
  const glow = (p, s, col = TV.glow, op = 0.55) => { const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); g.position.copy(p); g.scale.setScalar(s); scene.add(g); return g; };
  spots.sconces.forEach(p => glow(p, 1.3));
  const pend = new THREE.Group(); scene.add(pend); for (const dz of [-0.7, 0.7]) { const sh = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 14, 1, true), toon(TV.shade)); sh.position.set(T0.x, 2.95, T0.z + dz); pend.add(sh); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff2cc })); bulb.position.set(T0.x, 2.87, T0.z + dz); pend.add(bulb); const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.3, 4), toon('#201e1d')); cord.position.set(T0.x, 3.7, T0.z + dz); pend.add(cord); }
  const TA = tavernAudio(audio, { world: WK, bpmMul: 1.08 }); const ainit = () => { try { TA.ensure(); } catch (e) {} };
  const W = (x, y, z) => V3(T0.x + x, y, T0.z + z);   // table space → world

  // ---------- cast ----------
  const strip = f => { const P = f.userData.P; if (P.sword) P.sword.visible = false; if (P.gun) P.gun.visible = false; return f; };
  const npcFox = (c, outfit = 'vest', mood = 'neutral') => strip(kit.makeFox({ ...CAST.player, look: { ...CAST.player.look, fur: c.fur, furDark: c.furDark || c.fur }, torso: c.torso, outfit: c.outfit || outfit, crest: '', gear: 'none', mood: c.mood || mood }));
  const ben = strip(kit.makeFox({ ...CAST.player, gear: 'none' }));
  const opp = npcFox(OP, 'vest', OP.mood), keeper = npcFox(TV.keeper, 'vest', 'warm');
  const regList = [...TV.regulars.filter(r => r.name !== OP.name), ...(WK === 'luxor' ? [{ name: 'DABB', role: 'Tavern', fur: TV.shark.fur, furDark: TV.shark.furDark, torso: TV.shark.torso, mood: 'smug', lean: true, ph: true, lines: [['p', 'Not playing pool tonight?'], ['n', 'The ball is too small to be worth hitting hard. So I watch.']] }] : [])];
  const regs = regList.map((r, i) => { const f = npcFox(r, 'coat', r.mood || 'neutral'); if (r.lean) { f.position.set(-6.2, 0, -1.6); f.rotation.y = Math.PI / 2; return { f, r, seat: false, yaw: Math.PI / 2 }; } const st = r.seat ? spots.stools[4] : spots.stools[i === 0 ? 0 : 2]; f.position.set(st.x - (r.seat ? 0 : 0.55), r.seat ? 0.62 : 0, st.z); f.rotation.y = Math.PI / 2; return { f, r, seat: !!r.seat, yaw: Math.PI / 2 }; });
  keeper.position.copy(spots.keeper); keeper.rotation.y = -Math.PI / 2;
  const homeOpp = V3(T0.x - TW - 0.75, 0, T0.z - TL + 0.4);

  // ---------- ball + paddles ----------
  const rb = BR * 2.1;   // drawn larger than life so it reads on a phone
  const ballT = canvasTex(64, 32, c => { c.fillStyle = '#fff6e0'; c.fillRect(0, 0, 64, 32); c.fillStyle = 'rgba(200,150,90,0.55)'; c.fillRect(0, 15, 64, 2); c.fillStyle = '#e8792e'; c.beginPath(); c.arc(16, 9, 3, 0, 7); c.fill(); });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(rb, 16, 12), new THREE.MeshBasicMaterial({ map: ballT })); addOutline(ball, 0.004, rb); scene.add(ball);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffe08a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.setScalar(rb * 7); scene.add(halo);   // a soft glow so the ball never gets lost against the table
  const mkPaddle = rub => { const g = new THREE.Group(); const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 22).rotateX(Math.PI / 2), toon(rub)); addOutline(blade, 0.003, 0.075); g.add(blade); const back = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.074, 0.004, 22).rotateX(Math.PI / 2), toon('#201e1d')); back.position.z = -0.008; g.add(back);
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.1, 0.024), toon('#c99a5a')); h.position.y = -0.11; g.add(h); scene.add(g); return g; };
  const youP = mkPaddle('#e0442a'), oppP = mkPaddle(OP.rubber || '#2f6fd8');
  const shTex = canvasTex(64, 64, c => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(0.6, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  const blob = (w, d, op = 1, y = 0.011) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, opacity: op, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 1; scene.add(m); return m; };
  { const tb = blob(2 * TW * 1.6, 2 * TL * 1.3, 0.75); tb.position.set(T0.x, 0.011, T0.z); }
  const ballSh = blob(rb * 4, rb * 4, 0.7);   // THE depth cue: always straight under the ball, on the table or the floor
  const trail = Array.from({ length: 8 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd23a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(rb * 3); scene.add(s); return s; }); const trailP = [];
  const flashes = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 1, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); m.renderOrder = 41; scene.add(m); return { m, t: 0, s: 1 }; }); let flashI = 0;
  const impact = (x, y, z, col, size = 1) => { const f = flashes[flashI++ % flashes.length]; f.m.position.copy(W(x, y + 0.004, z)); f.m.material.color.set(col); f.t = 0.3; f.s = size; };
  // where the ball will land, while it is coming at you: a soft ring on the table (big help on a phone)
  const landRing = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.045, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.6, depthWrite: false, depthTest: false })); landRing.renderOrder = 40; scene.add(landRing);
  const motes = (() => { const n = touch ? 20 : 34, g = new THREE.BufferGeometry(), a = new Float32Array(n * 3), base = []; for (let i = 0; i < n; i++) base.push([T0.x + rr(-1, 1), rr(1.2, 2.6), T0.z + rr(-1.5, 1.5), rr(0, 6)]); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color: 0xffe6b0, size: 0.06, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(p); return { a, base, g }; })();
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

  // ---------- state ----------
  const S0 = () => ({ mode: 'intro', ph: 'idle', t: 0, score: { you: 0, him: 0 }, stake: 0, view: 'back', zoom: 1, flash: null, flashT: 0, call: '', callT: 0, toast: null, toastT: 0, done: null, demo: false, dlg: null, near: null, server: 'you', serveN: 0, serveT: 0, pointT: 0, best: 0, rally: 0, maxRally: 0, hits: 0, shake: 0, lastHit: null, bounces: [], glow: 0 });
  let HIDDEN = false; let S = S0(), PAUSE = false; const stick = { x: 0, y: 0 }, keys = new Set();
  const B = { x: 0, y: TY + 0.3, z: 0.9, vx: 0, vy: 0, vz: 0, spin: 0, live: false };
  const YP = { x: 0, z: TL + 0.35, tx: 0, tz: TL + 0.35, vx: 0, vz: 0, y: TY + 0.2 }, OPd = { x: 0, z: -TL - 0.35, tx: 0, tz: -TL - 0.35, vx: 0, vz: 0, y: TY + 0.2 };
  const PL = { x: spots.enter.x, z: spots.enter.z, yaw: Math.PI, mv: 0, hop: 0 }, OX = { x: homeOpp.x, z: homeOpp.z, yaw: Math.PI / 2, mv: 0 };
  const flash = (txt, col = '#ffd23a', t = 1.4) => { S.flash = { txt, col }; S.flashT = t; }, call = (txt, t = 2.6) => { S.call = txt; S.callT = t; }, toast = (txt, t = 3) => { S.toast = txt; S.toastT = t; };
  const ON = OP.name, ONc = OP.cap, kmh = v => Math.round(v * 3.6);

  // ---------- paddles move like the hockey mallet: toward a target, at a top speed ----------
  const zLim = side => side === 'you' ? [TL - 0.05, TL + 0.95] : [-TL - 0.95, -TL + 0.05];
  function movePaddle(p, side, h, spd) { const [z0, z1] = zLim(side), tx = clamp(p.tx, -TW - 0.55, TW + 0.55), tz = clamp(p.tz, z0, z1), dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz), mx = spd * h, ox = p.x, oz = p.z;
    if (d <= mx) { p.x = tx; p.z = tz; } else { p.x += dx / d * mx; p.z += dz / d * mx; } p.vx = damp(p.vx, (p.x - ox) / h, 25, h); p.vz = damp(p.vz, (p.z - oz) / h, 25, h); }

  // ---------- the shot: where it meets the paddle aims it, sliding into it powers it, sliding across it curves it ----------
  function solveShot(from, side, power, aimX, curve, err, bad = null) { const dir = side === 'you' ? -1 : 1;   // toward the other end
    let tz = dir * (0.3 + power * 0.92), tx = clamp(aimX, -TW + 0.03, TW - 0.03); tx += rr(-1, 1) * err * 0.55; tz += rr(-1, 1) * err * 0.45;
    if (bad === 'long') tz = dir * (TL + rr(0.1, 0.4)); else if (bad === 'wide') tx = (Math.sign(tx) || 1) * (TW + rr(0.08, 0.3));
    let T = 0.98 - power * 0.5; const ax = curve * 1.6, land = TY + BR; let vx, vy, vz;
    for (let k = 0; k < 24; k++) { vx = (tx - from.x - 0.5 * ax * T * T) / T; vz = (tz - from.z) / T; vy = (land - from.y + 0.5 * G * T * T) / T; const tn = (0 - from.z) / vz, yn = from.y + vy * tn - 0.5 * G * tn * tn; if (bad === 'net' || yn > TY + NET + 0.035 + err * 0.02 || tn < 0) break; T += 0.035; }
    if (bad === 'net') { const tn = (0 - from.z) / vz, want = TY + NET * rr(0.2, 0.75); vy = (want - from.y + 0.5 * G * tn * tn) / tn; }
    return { vx, vy, vz, spin: ax }; }
  function hit(side, p, x0, y0, z0) { const sp0 = Math.hypot(B.vx, B.vy, B.vz), dir = side === 'you' ? -1 : 1, fwd = Math.max(0, dir * p.vz), off = clamp((B.x - p.x) / PONG.REACH, -1, 1);
    let power, aimX, curve, err; const bot = side === 'him' ? botOpp : (S.demo ? botYou : null);
    if (bot && !bot.plan) bot.plan = { power: 0.45, aimX: rr(-0.4, 0.4), curve: 0 };
    if (bot) { power = clamp(bot.plan.power, 0.15, 1); aimX = bot.plan.aimX; curve = bot.plan.curve || 0; err = bot.err; }   // now and then a bot shot goes wrong: long, wide or into the net
    else { power = clamp(0.24 + fwd / 3.2, 0.2, 1); aimX = B.x + off * 0.5 + clamp(p.vx, -2, 2) * 0.12; curve = clamp(p.vx * 0.25, -0.55, 0.55); err = 0.04 + Math.max(0, Math.abs(off) - 0.72) * 0.9 + (power > 0.75 ? 0.06 : 0) + (B.y < TY + NET && power > 0.8 ? 0.35 : 0); }
    const bad = bot && Math.random() < bot.miss ? pick(['long', 'wide', 'net', 'net']) : null;   // now and then a bot shot just goes wrong
    const s = solveShot({ x: B.x, y: B.y, z: B.z }, side, power, aimX, curve, err, bad); B.vx = s.vx; B.vy = s.vy; B.vz = s.vz; B.spin = s.spin; B.z = side === 'you' ? Math.min(B.z, p.z - 0.01) : Math.max(B.z, p.z + 0.01);
    S.lastHit = side; S.bounces = []; S.hits++; S.missWhy = null; if (S.lastSide !== side) { S.rally++; S.maxRally = Math.max(S.maxRally, S.rally); if (S.mode === 'play' && S.rally >= 10 && S.rally % 10 === 0) { flash('RALLY ' + S.rally + '!', '#ffd23a', 1); TA.cheer(0.3); } } S.lastSide = side;
    const out = Math.hypot(B.vx, B.vy, B.vz); TA.tok('paddle', 0.2 + power * 0.8); impact(B.x, B.y, B.z, side === 'you' ? 0xffb09a : 0x9ac4ff, 0.7 + power); S.swing = side === 'you' ? 0.25 : S.swing; S.oSwing = side === 'him' ? 0.25 : S.oSwing;
    if (side === 'you') { buzz(Math.round(8 + power * 20)); if (power > 0.82) { const k = kmh(out), rec = save.stat(SK.best, 0); S.best = Math.max(S.best, k); if (!S.demo && rec && k > rec && !S.recFlashed) { S.recFlashed = true; flash('NEW RECORD · ' + k + ' km/h', '#22c55e', 1.3); TA.cheer(0.6); } else flash('SMASH · ' + k + ' km/h', '#ffd23a', 0.8); S.shake = 0.01; } else if (Math.abs(curve) > 0.3) flash('CURVE!', '#a78bfa', 0.6); } }
  // ---------- physics ----------
  function point(winner, why) { if (S.ph !== 'live') return; S.ph = 'point'; S.pointT = 1.35; B.live = false; S.score[winner]++; const mine = winner === 'you';
    buzz(mine ? [20, 30, 20] : 90); react(mine ? 'pt' : 'his'); S.glow = 1.2; S.glowCol = mine ? 0xff3a2a : 0x3a7aff;
    flash((mine ? '' : '') + why, mine ? '#22c55e' : '#ff9a8a', 1.3); TA.beep(mine); if (mine) TA.cheer(0.4);
    const a = S.score.you, b = S.score.him, done = (a >= PONG.TO || b >= PONG.TO) && Math.abs(a - b) >= 2; drawBoard();
    if (done) { endMatch(a > b ? 'win' : 'loss'); return; }
    S.serveN++; const deuce = a >= PONG.TO - 1 && b >= PONG.TO - 1; if (deuce || S.serveN >= 2) { S.serveN = 0; S.server = S.server === 'you' ? 'him' : 'you'; }
    call(deuce ? (a === b ? 'DEUCE' : (a > b ? 'ADVANTAGE BEN' : 'ADVANTAGE ' + ON)) : a + '–' + b + (Math.max(a, b) === PONG.TO - 1 && a !== b ? ' · GAME POINT' : ''), 2.2); }
  function sub(h) { const spd = S.mode === 'play' ? 1 : 0; movePaddle(YP, 'you', h, 5.2); movePaddle(OPd, 'him', h, 5.2 * (S.oppSpd || 0.6)); if (!B.live || !spd) return;
    B.vy -= G * h; B.vx += (B.spin || 0) * h; B.x += B.vx * h; B.y += B.vy * h; B.z += B.vz * h;
    // the net
    if (Math.sign(B.z) !== Math.sign(B.z - B.vz * h) && B.y < TY + NET + BR && B.y > TY - 0.02 && Math.abs(B.x) < TW + 0.12) { B.z = -Math.sign(B.vz) * 0.03; B.vz *= -0.25; B.vx *= 0.4; TA.tok('net'); impact(B.x, TY + NET, 0, 0xffffff, 0.8); S.netWob = 1; if (S.mode === 'play' && !S.netT) { S.netT = 1; flash('NET!', '#ffffff', 0.7); } }
    // the table (or off the end onto the floor)
    if (B.y < TY + BR && B.vy < 0) { const on = Math.abs(B.x) < TW && Math.abs(B.z) < TL && B.y > TY - 0.05;
      if (on) { B.y = TY + BR; B.vy = -B.vy * PONG.REST; B.vx *= 0.96; B.vz *= 0.96; B.spin *= 0.4; TA.tok('table', Math.min(1, Math.abs(B.vy) / 3)); const sd = B.z > 0 ? 'you' : 'him'; S.bounces.push(sd); const edge = Math.abs(B.x) > TW - 0.035 || Math.abs(B.z) > TL - 0.035; impact(B.x, TY, B.z, edge ? 0xffd23a : 0xffffff, edge ? 1.1 : 0.45); if (edge && S.mode === 'play' && sd !== S.lastHit) { flash(S.lastHit === 'you' ? 'EDGE!' : 'EDGE BALL', S.lastHit === 'you' ? '#ffd23a' : '#ff9a8a', 0.8); TA.ooh(); }
        const hitter = S.lastHit, recv = hitter === 'you' ? 'him' : 'you';
        if (sd === hitter) { point(recv, hitter === 'you' ? (S.netT ? 'IN THE NET' : 'YOUR SIDE') : (S.netT ? ON + ' NETS IT' : ON + ' MISSES')); return; }   // landed back on your own side = the net stopped it
        if (S.bounces.filter(x => x === recv).length >= 2) { point(hitter, hitter === 'you' ? (S.bounces.length > 2 ? 'TWO BOUNCES' : 'POINT!') : ON + "'S POINT"); return; } } }
    if (B.y < BR + 0.01) { B.y = BR + 0.01; TA.tok('floor', 0.5); const hitter = S.lastHit, recv = hitter === 'you' ? 'him' : 'you', landed = S.bounces.includes(recv);
      if (landed) point(hitter, hitter === 'you' ? (Math.abs(B.x) > TW * 0.8 ? 'ACE THE EDGE' : 'POINT!') : (S.missWhy || ON + "'S POINT")); else point(recv, hitter === 'you' ? (Math.abs(B.x) > TW ? 'WIDE' : 'LONG') : (Math.abs(B.x) > TW ? ON + ' HITS IT WIDE' : ON + ' HITS IT LONG')); return; }
    // the paddles: a ball that has bounced on your side and reaches your paddle gets hit
    for (const [side, p] of [['you', YP], ['him', OPd]]) { const dir = side === 'you' ? 1 : -1; if (S.lastHit === side || dir * B.vz <= 0 || !S.bounces.includes(side)) continue;
      if (dir * B.z >= dir * p.z - 0.02) { const dx = Math.abs(B.x - p.x), okY = B.y > TY - 0.08 && B.y < TY + 0.9; if (dx < PONG.REACH && okY) hit(side, p); else if (!p.missed) { p.missed = true; if (side === 'you') S.missWhy = !okY ? (B.y < TY ? 'TOO LATE · STEP IN' : 'TOO HIGH') : 'MISSED · MOVE ' + (B.x < p.x ? 'LEFT' : 'RIGHT'); } } } }
  let acc = 0; function physics(dt) { acc += dt; const h = 1 / 360; let n = 0; while (acc >= h && n < 30) { sub(h); acc -= h; n++; } if (n >= 30) acc = 0; }
  function serve(side, power = 0.45) { S.missWhy = null; const p = side === 'you' ? YP : OPd, dir = side === 'you' ? -1 : 1; B.x = p.x; B.z = p.z + dir * 0.06; B.y = TY + 0.28; B.live = true; S.ph = 'live'; S.lastHit = side; S.lastSide = side; S.rally = 0; S.bounces = []; S.netT = 0; YP.missed = OPd.missed = false;
    // a serve goes straight over to the far half (tavern rules); short and low unless you swipe hard
    const aimX = side === 'you' ? clamp(B.x + YP.vx * 0.15 + rr(-0.15, 0.15), -TW + 0.1, TW - 0.1) : clamp(rr(-0.5, 0.5), -TW + 0.1, TW - 0.1);
    const s = solveShot({ x: B.x, y: B.y, z: B.z }, side, clamp(power, 0.2, 0.85), aimX, 0, side === 'him' ? botOpp.err * 0.5 : 0.02); B.vx = s.vx; B.vy = s.vy; B.vz = s.vz; B.spin = 0; TA.tok('paddle', 0.3 + power * 0.5); TA.serve(); if (side === 'you') S.swing = 0.25; else S.oSwing = 0.25; }
  function toServe(side) { S.ph = 'serve'; S.server = side; S.serveT = side === 'you' ? 6 : 1.1; B.live = false; YP.missed = OPd.missed = false; S.lastHit = null; call(side === 'you' ? 'YOUR SERVE · SWIPE UP' : ON + ' TO SERVE', 2); }
  function endMatch(res) { S.ph = 'over'; S.overT = S.t + 2.4; S.res = res; buzz(res === 'win' ? [40, 60, 40, 60, 120] : 220); call(res === 'win' ? 'GAME! THE TABLE IS YOURS' : ON + ' TAKES THE GAME', 3); flash(res === 'win' ? 'GAME!' : 'GAME TO ' + ON, res === 'win' ? '#22c55e' : '#ff9a8a', 2.2); if (res === 'win') { TA.cheer(1); react('win'); } else { TA.groan(); react('loss'); } }
  function finishMatch() { const res = S.res, st = S.stake, demo = S.demo; let gold = 0, unlocked = null; const prevBest = save.stat(SK.best, 0);
    if (!demo) { try { if (res === 'win') { if (st > 0) { save.addGold(st); gold = st; TA.coins(Math.min(12, 3 + Math.round(st / 10))); save.setFlag(FL.won); save.setStat(SK.stake, Math.min(PONG.BET_MAX, Math.max(20, st * 2))); } save.addXp(st > 0 ? 40 : 12); save.setStat(SK.wins, save.stat(SK.wins, 0) + 1); if (st > 0 && save.stat(SK.wins, 0) >= 3 && !save.flag(FL.table)) { save.setFlag(FL.table); unlocked = true; } }
      else { const lose = Math.min(st, save.data.gold); if (lose > 0) save.addGold(-lose); gold = -lose; save.setStat(SK.losses, save.stat(SK.losses, 0) + 1); } if (S.best) save.best(SK.best, S.best); if (S.maxRally) save.best(SK.rally, S.maxRally); } catch (e) {} }
    S.done = { res, stake: st, gold, demo, unlocked, wins: save.stat(SK.wins, 0), losses: save.stat(SK.losses, 0), score: { ...S.score }, best: S.best, rally: S.maxRally, newRec: !demo && S.best > prevBest && S.best > 0, line: pick(res === 'win' ? OP.win : OP.loss) };
    S.mode = demo ? 'intro' : 'done'; if (demo) { S.demo = false; S.done = null; toIntro(); } }

  // ---------- the regular at the far end (and the demo's autopilot for you): predict, move, choose a shot ----------
  function predictAt(side) { // simulate the ball forward (no paddles) to where it crosses this side's paddle line after bouncing on this side
    const p = side === 'you' ? YP : OPd, dir = side === 'you' ? 1 : -1; let x = B.x, y = B.y, z = B.z, vx = B.vx, vy = B.vy, vz = B.vz, sp = B.spin || 0, bounced = S.bounces.includes(side), t = 0; const h = 1 / 120;
    for (let i = 0; i < 360; i++) { vy -= G * h; vx += sp * h; x += vx * h; y += vy * h; z += vz * h; t += h; if (y < TY + BR && vy < 0 && Math.abs(x) < TW && Math.abs(z) < TL) { y = TY + BR; vy = -vy * PONG.REST; vx *= 0.96; vz *= 0.96; sp *= 0.4; if (dir * z > 0) bounced = true; } if (bounced && dir * vz > 0 && y > TY - 0.05 && y < TY + 0.55 && dir * z > TL - 0.15) return { x, y, z, t }; if (y < 0.05) break; }
    return null; }
  function brain(Bt, p, side, dt) { const dir = side === 'you' ? 1 : -1, other = side === 'you' ? YP : OPd; Bt.re -= dt; if (Bt.re > 0) return; Bt.re = Bt.react * rr(0.8, 1.25);
    if (S.ph === 'serve') { p.tx = rr(-0.25, 0.25) * 0 + (Bt.srvX ?? (Bt.srvX = rr(-0.3, 0.3))); p.tz = dir * (TL + 0.3); return; } Bt.srvX = null;
    const coming = B.live && S.lastHit !== side && dir * B.vz > 0;
    if (coming) { const pr = predictAt(side); if (pr) { p.tx = pr.x + rr(-1, 1) * Bt.err * 0.6; p.tz = clamp(pr.z, dir > 0 ? TL - 0.05 : -TL - 0.95, dir > 0 ? TL + 0.95 : -TL + 0.05) + dir * 0.02;
        if (!Bt.plan || Bt.plan.ball !== S.hits) { const foe = side === 'you' ? OPd : YP, away = -Math.sign(foe.x || rr(-1, 1)) * rr(0.25, 0.6), hard = pr.y > TY + NET + 0.12 && Math.random() < 0.25 + Bt.skill * 0.35; Bt.plan = { ball: S.hits, power: hard ? rr(0.75, 0.95) : rr(0.3, 0.6) + Bt.skill * 0.1, aimX: away, curve: Math.random() < Bt.skill * 0.4 ? rr(-0.4, 0.4) : 0 }; } }
      else { p.tx = B.x; } }
    else { p.tx = (B.live ? B.x * 0.3 : 0); p.tz = dir * (TL + 0.4); } }
  const botOpp = { re: 0, react: 0.12, skill: 0.4, err: 0.08, miss: 0.16, plan: null }, botYou = { re: 0, react: 0.08, skill: 0.7, err: 0.05, miss: 0.1, plan: null };
  function setLevel() { const lvl = !!save.flag(FL.table), w = save.stat(SK.wins, 0), st = S.stake || 0, k = S.demo ? 0.35 : clamp(0.3 + w * 0.06 + st / 400 + (lvl ? 0.12 : 0), 0.25, 0.85);
    Object.assign(botOpp, { react: 0.16 - k * 0.08, skill: k, err: 0.16 - k * 0.11, miss: 0.24 - k * 0.17 }); S.oppSpd = 0.5 + k * 0.32; }

  // ---------- the room reacts ----------
  function moodFor(f, mood, t = 2.4) { const u = f.userData; if (u.moodBack == null) u.moodBack = u.mood; u.mood = mood; u.moodT = t; }
  function react(kind) { const crowd = [...regs.map(g => g.f), keeper];
    if (kind === 'pt') { crowd.forEach((f, i) => { if (Math.random() < 0.4) setTimeout(() => { f.userData.hop = 1; }, i * 90); moodFor(f, 'happy', 1.4); }); moodFor(opp, 'stern', 1.6); moodFor(ben, 'excited', 1.4); }
    else if (kind === 'his') { moodFor(opp, 'excited', 1.8); }
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
    const cands = [{ id: 'opp', p: opp.position, r: 1.9, label: 'Talk to ' + ONc }, { id: 'table', p: null, label: 'Play ping-pong' }, { id: 'keeper', p: spots.barFront, r: 1.7, label: 'Talk to ' + capName(TV.keeper.name) }, ...regs.map((g, i) => ({ id: 'reg' + i, p: g.f.position, r: 1.6, label: 'Talk to ' + capName(g.r.name) })), { id: 'door', p: spots.door, r: 1.5, label: 'Leave the tavern' }];
    let near = null, nd = 1e9; for (const c of cands) { let d; if (c.id === 'table') { const dx = Math.max(0, Math.abs(PL.x - T0.x) - TW), dz = Math.max(0, Math.abs(PL.z - T0.z) - TL); d = Math.hypot(dx, dz); if (d < 0.75 && d < nd) { nd = d; near = c; } continue; } d = Math.hypot(PL.x - c.p.x, PL.z - c.p.z); if (d < c.r && d < nd) { nd = d; near = c; } }
    S.near = near; }
  // ---------- talk ----------
  const N = t => ({ who: 'n', text: t }), Pp = t => ({ who: 'p', text: t });
  function openDlg(name, role, lines, choices, onChoose, fox) { S.dlg = { name, role, lines, i: 0, chars: 0, choices, onChoose, fox }; if (fox) fox.userData.talking = true; }
  function closeDlg() { if (S.dlg && S.dlg.fox) S.dlg.fox.userData.talking = false; S.dlg = null; }
  function oppTalk() { const won = save.flag(FL.won), lvl = save.flag(FL.table), told = save.flag(FL.told); let lines;
    if (lvl && !told) { lines = OP.level.map(N); save.setFlag(FL.told); } else lines = (won ? OP.again : OP.hi).map(N);
    const asked = S.asked || (S.asked = {}), ch = () => [{ text: "Let's play.", k: 'play' }, ...Object.entries(OP.topics).map(([k, v]) => ({ text: v[0], k })), { text: 'Another time.', k: 'bye', bye: true }].map(c => ({ ...c, asked: !!asked[c.k] }));
    const onChoose = c => { if (c.k === 'play') { closeDlg(); api.openStake(); return; } if (c.k === 'bye') { openDlg(ON, OP.role, [N('Paddles stay on the table. Come back.')], null, null, opp); return; } asked[c.k] = true; openDlg(ON, OP.role, OP.topics[c.k].slice(1).map(N), ch(), onChoose, opp); };
    openDlg(ON, OP.role, lines, ch(), onChoose, opp); }
  function keeperTalk() { const K = TV.keeper, ch = () => [...K.stock.map(([id, label, price]) => ({ text: label + ' · ' + price + 'g', id, label, price })), { text: 'Bye.', bye: true }];
    const onChoose = c => { if (c.bye) { closeDlg(); return; } if (save.spend(c.price)) { save.give(c.id, 1); toast('+1 ' + c.label + ' · −' + c.price + 'g'); TA.coins(4); } else toast('Not enough gold for ' + c.label + '.'); openDlg(K.name, K.role, [N('Anything else?')], ch(), onChoose, keeper); };
    openDlg(K.name, K.role, [N(K.greeting)], ch(), onChoose, keeper); }
  function talk() { if (S.mode !== 'walk') return; const d = S.dlg; if (d) { const ln = d.lines[d.i]; if (d.chars < ln.text.length) { d.chars = ln.text.length; return; } if (d.i < d.lines.length - 1) { d.i++; d.chars = 0; return; } if (!d.choices) closeDlg(); return; }
    const n = S.near; if (!n) return; ainit(); if (n.id === 'opp' || n.id === 'table') oppTalk(); else if (n.id === 'keeper') keeperTalk(); else if (n.id === 'door') { TA.door(); if (api.onExit) api.onExit(); else toast(TV.door + ' The world map takes it from here.'); } else { const g = regs[+n.id.slice(3)]; openDlg(g.r.name, g.r.role, g.r.lines.map(([w, t]) => w === 'p' ? Pp(t) : N(t)), null, null, g.f); } }

  // ---------- camera ----------
  const CAM = { pos: V3(T0.x + 6, 5, T0.z + 7), look: V3(T0.x, TY, T0.z) }; camera.position.copy(CAM.pos);
  const SAFE = { t: 0, b: 0, l: 0, r: 0 }, fitCam = new THREE.PerspectiveCamera(50, 1, 0.05, 90), fitCache = new Map(), _p = V3();
  function fitView(key, pts, yaw, el, fov) { const Wd = CW(), H = CHh(), ck = key + '|' + Wd + 'x' + H + '|' + SAFE.t + '|' + SAFE.b + '|' + SAFE.l + '|' + SAFE.r + '|' + S.zoom.toFixed(2); if (fitCache.has(ck)) return fitCache.get(ck);
    fitCam.aspect = Wd / H; fitCam.fov = fov; fitCam.updateProjectionMatrix(); const yT = 1 - 2 * SAFE.t / H - 0.03, yB = -1 + 2 * SAFE.b / H + 0.03, xL = -1 + 2 * SAFE.l / Wd + 0.03, xR = 1 - 2 * SAFE.r / Wd - 0.03, sx = (xL + xR) / 2, sy = (yT + yB) / 2;
    const dir = V3(Math.sin(yaw) * Math.cos(el), Math.sin(el), Math.cos(yaw) * Math.cos(el)), tgt = V3(); pts.forEach(p => tgt.add(p)); tgt.multiplyScalar(1 / pts.length);
    const bounds = d => { fitCam.position.copy(tgt).addScaledVector(dir, d); fitCam.lookAt(tgt); fitCam.updateMatrixWorld(); let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for (const p of pts) { _p.copy(p).project(fitCam); if (_p.z > 1) return null; x0 = Math.min(x0, _p.x); x1 = Math.max(x1, _p.x); y0 = Math.min(y0, _p.y); y1 = Math.max(y1, _p.y); } return { x0, x1, y0, y1 }; };
    const fits = d => { const b = bounds(d); return b && b.x1 - b.x0 <= xR - xL && b.y1 - b.y0 <= yT - yB; }; let d = 4;
    for (let it = 0; it < 4; it++) { let lo = 0.5, hi = 40; for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; } d = hi; const b = bounds(d); if (!b) break; const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, th = Math.tan(fov * Math.PI / 360) * d, right = V3().setFromMatrixColumn(fitCam.matrixWorld, 0), up = V3().setFromMatrixColumn(fitCam.matrixWorld, 1); tgt.addScaledVector(right, (cx - sx) * th * fitCam.aspect).addScaledVector(up, (cy - sy) * th); }
    d /= S.zoom; const out = { pos: tgt.clone().addScaledVector(dir, d), look: tgt.clone() }; if (fitCache.size > 80) fitCache.clear(); fitCache.set(ck, out); return out; }
  // the view frames the table plus the air above it (the ball flies up to ~0.7 m) and the space behind each end where the paddles live
  const tablePts = () => { const pts = []; for (const [x, z] of [[-TW - 0.15, -TL - 0.55], [TW + 0.15, -TL - 0.55], [-TW - 0.25, TL + 0.75], [TW + 0.25, TL + 0.75]]) { pts.push(W(x, TY, z)); } pts.push(W(0, TY + 0.75, -TL)); return pts; };
  function camShot() { const Wd = CW(), H = CHh(), port = Wd < H;
    if (S.mode === 'play' || S.mode === 'stake' || S.mode === 'done') { if (S.view === 'top') { const fov = port ? 46 : 38; camera.fov = fov; return fitView('top', tablePts(), port ? 0 : Math.PI / 2, 1.2, fov); }
      const fov = port ? 52 : 42; camera.fov = fov; return fitView('back', tablePts(), 0, port ? 0.9 : 0.72, fov); }
    if (S.mode === 'intro') { const a = S.t * 0.12, r = port ? 7.5 : 6.4; camera.fov = port ? 62 : 48; const look = V3(T0.x + (port ? 0 : -1.0), TY - (port ? 0.9 : 0.2), T0.z); return { pos: V3(T0.x + Math.sin(a) * r, port ? 6.2 : 4.0, T0.z + Math.cos(a) * r), look }; }
    camera.fov = port ? 60 : 50; const off = port ? V3(0, 9.6, 7.4) : V3(0, 9.4, 6.2); return { pos: V3(PL.x + off.x, off.y, PL.z + off.z), look: V3(PL.x, 0.8, PL.z - (port ? 0.6 : 1.1)) }; }

  // ---------- your paddle: thumb pad / table (slides by how far you move), mouse (under the pointer), keys ----------
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TY), ndc = new THREE.Vector2(), hitP = V3(), ptrs = new Map(); let pinch = null;
  const tableAt = (cx, cy) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); if (!ray.ray.intersectPlane(plane, hitP)) return null; return { x: hitP.x - T0.x, z: hitP.z - T0.z }; };
  const canMove = () => S.mode === 'play' && !S.demo && !PAUSE;
  const GAIN = 1.25; let padP = null;
  function padDown(x, y, id = 'pad', mouse = false) { if (!canMove()) return false; ainit(); const t = tableAt(x, y); if (mouse && t) { YP.tx = t.x; YP.tz = Math.max(t.z, TL - 0.05); } padP = { id, x, y, t, mouse }; S.touching = true; return true; }
  // a thumb slide moves the paddle by screen distance × (how many metres one pixel of the TABLE is), along the camera's own left/right and up,
  // so it feels the same wherever the pad sits (the landscape pad is far from the table, where a raycast would exaggerate it)
  const _a = V3(), _b = V3(), _r = V3(), _f = V3();
  function mPerPx() { const r = renderer.domElement.getBoundingClientRect(); _a.copy(W(-TW, TY, TL * 0.5)).project(camera); _b.copy(W(TW, TY, TL * 0.5)).project(camera); const px = Math.hypot((_b.x - _a.x) * r.width / 2, (_b.y - _a.y) * r.height / 2); return px > 4 ? 2 * TW / px : 0.004; }
  function padMove(x, y, id = 'pad') { if (!padP || padP.id !== id || !canMove()) return; if (padP.mouse) { const t = tableAt(x, y); if (t) { YP.tx = t.x; YP.tz = Math.max(t.z, TL - 0.05); } padP.x = x; padP.y = y; return; }
    const dx = x - padP.x, dy = y - padP.y; padP.x = x; padP.y = y; const k = mPerPx() * GAIN; camera.updateMatrixWorld(); _r.setFromMatrixColumn(camera.matrixWorld, 0); camera.getWorldDirection(_f); _r.y = 0; _f.y = 0; _r.normalize(); _f.normalize();
    const [z0, z1] = zLim('you'); YP.tx = clamp(YP.tx + (_r.x * dx - _f.x * dy) * k, -TW - 0.55, TW + 0.55); YP.tz = clamp(YP.tz + (_r.z * dx - _f.z * dy) * k, z0, z1); }
  function padUp(id = 'pad') { if (padP && padP.id === id) { padP = null; S.touching = false; } }
  const el = renderer.domElement;
  const onDown = e => { if (S.mode !== 'play') return; e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (er) {} ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: S.zoom }; padUp(e.pointerId); return; } padDown(e.clientX, e.clientY, e.pointerId, e.pointerType === 'mouse'); };
  const onMove = e => { if (!ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse' && canMove() && !padP) { const t = tableAt(e.clientX, e.clientY); if (t) { YP.tx = t.x; YP.tz = Math.max(t.z, TL - 0.05); } } return; } ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pinch && ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; S.zoom = clamp(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(30, pinch.d), 0.75, 1.6); return; } padMove(e.clientX, e.clientY, e.pointerId); };
  const onUp = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; padUp(e.pointerId); };
  el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);
  const onWheel = e => { if (S.mode !== 'play') return; e.preventDefault(); S.zoom = clamp(S.zoom * (e.deltaY > 0 ? 0.93 : 1.07), 0.75, 1.6); }; el.addEventListener('wheel', onWheel, { passive: false });
  function keyMove(dt) { let kx = 0, kz = 0; if (keys.has('KeyA') || keys.has('ArrowLeft')) kx -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) kx += 1; if (keys.has('KeyW') || keys.has('ArrowUp')) kz -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) kz += 1; if (!kx && !kz) return;
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4.5 : 2.6) * dt * 2.2, [z0, z1] = zLim('you'); YP.tx = clamp(YP.x + kx * sp, -TW - 0.55, TW + 0.55); YP.tz = clamp(YP.z + kz * sp, z0, z1); }

  // ---------- per-frame ----------
  const clock = new THREE.Clock(); let raf = 0, hudT = 0;
  const placeFox = (f, x, z, yaw, mv, dt) => { f.position.x = x; f.position.z = z; let d = ((yaw - f.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI; f.rotation.y += d * Math.min(1, dt * 10); kit.animFox(f, dt, mv); };
  const walkTo = (o, tx, tz, sp, dt) => { const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz); if (d < 0.03) { o.mv = 0; return true; } const k = Math.min(1, sp * dt / d); o.x += dx * k; o.z += dz * k; o.mv = Math.min(d / dt, sp); o.yaw = Math.atan2(dx, dz); return false; };
  function posePlayer(f, sw) { const P = f.userData.P; const k = sw > 0 ? Math.sin((1 - sw / 0.25) * Math.PI) : 0; P.arms[0].rotation.set(-1.0 - k * 0.9, 0, 0.35 - k * 0.5); P.arms[1].rotation.set(-0.4, 0, -0.2); P.body.rotation.x = 0.28; P.legs[0].rotation.x = 0.35; P.legs[1].rotation.x = -0.3; }
  const ghostMats = new Map(); const ghostify = f => { if (ghostMats.has(f)) return ghostMats.get(f); const list = []; f.traverse(o => { if (!o.isMesh || !o.material) return; const one = m => { const c = m.clone(); c.transparent = true; list.push(c); return c; }; o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material); }); ghostMats.set(f, list); return list; };
  const fadeFox = (f, target, dt) => { const Lm = ghostify(f), cur = f.userData.fade ?? 1, v = cur + (target - cur) * Math.min(1, dt * 8); f.userData.fade = v; for (const m of Lm) { const base = m.userData.op0 ?? (m.userData.op0 = m.opacity); m.opacity = base * v; m.depthWrite = v > 0.95; } };
  const foxBlobs = [ben, opp, keeper, ...regs.map(g => g.f)].map(f => ({ f, b: blob(1.15, 1.15, 0.85) }));
  function step(dt) { S.t += dt; S.flashT -= dt; if (S.flashT <= 0) S.flash = null; S.callT -= dt; if (S.callT <= 0) S.call = ''; S.toastT -= dt; if (S.toastT <= 0) S.toast = null; S.swing = Math.max(0, (S.swing || 0) - dt); S.oSwing = Math.max(0, (S.oSwing || 0) - dt); if (S.netT) S.netT = Math.max(0, S.netT - dt);
    for (const p of smokeS) { if (p.life <= 0) { p.s.material.opacity = 0; continue; } p.life -= dt * 0.9; p.s.position.addScaledVector(p.v, dt); p.s.material.opacity = 0.4 * p.life; p.s.scale.setScalar(0.2 + (1 - p.life) * 0.4); }
    if (S.dlg) S.dlg.chars = Math.min(S.dlg.lines[S.dlg.i].text.length, S.dlg.chars + dt * 70);
    const play = S.mode === 'play';
    if (play) { if (!S.demo) keyMove(dt); else brain(botYou, YP, 'you', dt); brain(botOpp, OPd, 'him', dt);
      if (S.ph === 'serve') { S.serveT -= dt; if (S.server === 'him' && S.serveT <= 0) serve('him', rr(0.3, 0.5) + botOpp.skill * 0.15);
        else if (S.server === 'you') { const fwd = -YP.vz; if ((fwd > 1.1 && !S.demo) || S.serveT <= 0 || (S.demo && S.serveT < 4.6)) serve('you', S.demo ? 0.5 : clamp(0.3 + Math.max(0, fwd) / 4, 0.3, 0.8)); } }
      else if (S.ph === 'point') { S.pointT -= dt; if (S.pointT <= 0) toServe(S.server); }
      else if (S.ph === 'over' && S.t >= S.overT) finishMatch();
      physics(dt);
      if (S.demo && S.t > S.demoEnd && S.ph !== 'live') { S.demo = false; toIntro(); return; } }
    else if (S.mode === 'walk') walkStep(dt);
    if (!play) { for (const [p, side] of [[YP, 'you'], [OPd, 'him']]) { p.tx = 0; p.tz = (side === 'you' ? 1 : -1) * (TL + 0.35); movePaddle(p, side, dt, 3); } }
    // the ball, its shadow, its landing ring
    const showBall = play && (B.live || S.ph === 'serve' || S.ph === 'point'); if (play && S.ph === 'serve') { const p = S.server === 'you' ? YP : OPd, dir = S.server === 'you' ? -1 : 1; B.x = p.x; B.z = p.z + dir * 0.06; B.y = TY + 0.22 + Math.abs(Math.sin(S.t * 3.2)) * 0.16; }
    ball.visible = showBall; ball.position.copy(W(B.x, B.y, B.z)); halo.visible = showBall; halo.position.copy(ball.position); if (B.live) { ball.rotation.x -= B.vz * dt * 9; ball.rotation.y += (B.spin || 0) * dt * 6; ball.rotation.z += B.vx * dt * 6; } ballSh.visible = showBall; { const onT = Math.abs(B.x) < TW && Math.abs(B.z) < TL && B.y >= TY - 0.02, gy = onT ? TY + 0.003 : 0.012, h = Math.max(0, B.y - gy); ballSh.position.copy(W(B.x, gy, B.z)); const s = clamp(1 - h * 0.6, 0.35, 1); ballSh.scale.setScalar(s); ballSh.material.opacity = 0.75 * s; }
    { let show = false; if (play && B.live && S.lastHit === 'him' && B.vz > 0 && !S.bounces.includes('you')) { let x = B.x, y = B.y, z = B.z, vx = B.vx, vy = B.vy, vz = B.vz, sp = B.spin || 0; const h = 1 / 120; for (let i = 0; i < 240; i++) { vy -= G * h; vx += sp * h; x += vx * h; y += vy * h; z += vz * h; if (y < TY + BR && vy < 0) { if (Math.abs(x) < TW && Math.abs(z) < TL && z > 0) { landRing.position.copy(W(x, TY + 0.004, z)); show = true; } break; } } } landRing.visible = show; if (show) landRing.scale.setScalar(1 + Math.sin(S.t * 10) * 0.08); }
    for (const f of flashes) { if (f.t > 0) { f.t -= dt; const k = 1 - Math.max(0, f.t) / 0.3; f.m.material.opacity = (1 - k) * 0.9; f.m.scale.setScalar((0.03 + k * 0.1) * f.s); } else f.m.material.opacity = 0; }
    { const sp = Math.hypot(B.vx, B.vy, B.vz); trailP.unshift(W(B.x, B.y, B.z)); if (trailP.length > trail.length) trailP.pop(); trail.forEach((s, i) => { const p = trailP[i]; if (!p || !ball.visible || !B.live) { s.material.opacity = 0; return; } s.position.copy(p); const k = clamp((sp - 3) / 6, 0, 1); s.material.opacity = k * 0.45 * (1 - i / trail.length); s.material.color.set(sp > 8 ? 0xff6a2a : 0xffd23a); s.scale.setScalar(rb * (2.6 - i * 0.2)); }); }
    // paddles: blade at ball height when the ball is near, otherwise ready position; tilt with the swing
    for (const [p, g, side, sw] of [[YP, youP, 'you', S.swing], [OPd, oppP, 'him', S.oSwing]]) { const dir = side === 'you' ? 1 : -1, near = B.live && Math.abs(B.z - p.z) < 0.9 && dir * B.vz > 0, ty = near ? clamp(B.y, TY - 0.02, TY + 0.6) : TY + 0.18; p.y = damp(p.y, ty, 14, dt);
      g.position.copy(W(p.x, p.y, p.z)); g.rotation.set(-0.25 - (sw > 0 ? Math.sin((1 - sw / 0.25) * Math.PI) * 0.7 : 0), side === 'you' ? 0 : Math.PI, clamp(-p.vx * 0.12, -0.5, 0.5)); g.visible = play || S.mode === 'done' || S.mode === 'stake'; }
    // the foxes stand behind their paddles (right-handed)
    if (play || S.mode === 'done' || S.mode === 'stake') { if (play) { PL.x = damp(PL.x, T0.x + YP.x + 0.28, 10, dt); PL.z = damp(PL.z, T0.z + YP.z + 0.32, 10, dt); PL.yaw = Math.PI; PL.mv = 0; OX.x = damp(OX.x, T0.x + OPd.x - 0.28, 9, dt); OX.z = damp(OX.z, T0.z + OPd.z - 0.5, 9, dt); OX.yaw = 0; OX.mv = 0; }
      else { walkTo(PL, T0.x + TW + 0.9, T0.z + TL - 0.2, 3.5, dt); walkTo(OX, homeOpp.x, homeOpp.z, 3.5, dt); if (PL.mv === 0) PL.yaw = Math.atan2(T0.x - PL.x, T0.z - PL.z); if (OX.mv === 0) OX.yaw = Math.atan2(T0.x - OX.x, T0.z - OX.z); } }
    else { walkTo(OX, homeOpp.x, homeOpp.z, 3, dt); if (OX.mv === 0) OX.yaw = S.dlg && S.dlg.fox === opp ? Math.atan2(PL.x - OX.x, PL.z - OX.z) : Math.atan2(T0.x - OX.x, T0.z - OX.z); }
    PL.hop = Math.max(0, PL.hop - dt); placeFox(ben, PL.x, PL.z, PL.yaw, PL.mv, dt); ben.position.y = PL.hop > 0 ? Math.sin((1 - PL.hop / 0.5) * Math.PI) * 0.4 : 0; placeFox(opp, OX.x, OX.z, OX.yaw, OX.mv, dt);
    placeFox(keeper, keeper.position.x, keeper.position.z, S.dlg && S.dlg.fox === keeper ? Math.atan2(PL.x - keeper.position.x, PL.z - keeper.position.z) : -Math.PI / 2, 0, dt);
    regs.forEach(g => { placeFox(g.f, g.f.position.x, g.f.position.z, S.dlg && S.dlg.fox === g.f ? Math.atan2(PL.x - g.f.position.x, PL.z - g.f.position.z) : (play && g.r.lean ? Math.atan2(T0.x - g.f.position.x, T0.z - g.f.position.z) : g.yaw), 0, dt); if (g.seat) { const P = g.f.userData.P; P.legs[0].rotation.x = P.legs[1].rotation.x = -1.45; } });
    if (play) { posePlayer(ben, S.swing); posePlayer(opp, S.oSwing); }
    { const back = play && S.view === 'back', top = play && S.view === 'top'; fadeFox(ben, back ? 0 : top ? 0.3 : 1, dt); ben.visible = !(back && (ben.userData.fade ?? 1) < 0.04); fadeFox(opp, back ? 0.45 : 1, dt); }
    ben.userData.lookAt = play && ball.visible ? ball.position.clone() : S.dlg && S.dlg.fox ? S.dlg.fox.position.clone().setY(1.6) : null; opp.userData.lookAt = play && ball.visible ? ball.position.clone() : null;
    for (const g of [...regs.map(r => r.f), keeper]) { if (!(S.dlg && S.dlg.fox === g)) g.userData.lookAt = play && ball.visible ? ball.position.clone() : null; }
    for (const f of foxBlobs) f.b.position.set(f.f.position.x, 0.012, f.f.position.z);
    { const t = S.t; motes.base.forEach(([x, y, z, ph], i) => { motes.a[i * 3] = x + Math.sin(t * 0.21 + ph) * 0.3; motes.a[i * 3 + 1] = y + Math.sin(t * 0.13 + ph * 2) * 0.25; motes.a[i * 3 + 2] = z + Math.cos(t * 0.17 + ph) * 0.3; }); motes.g.attributes.position.needsUpdate = true; }
    for (const f of [ben, opp, keeper, ...regs.map(g => g.f)]) { const u = f.userData; if (u.moodT > 0) { u.moodT -= dt; if (u.moodT <= 0 && u.moodBack != null) { u.mood = u.moodBack; u.moodBack = null; } } }
    S.glow = Math.max(0, (S.glow || 0) - dt); S.netWob = Math.max(0, (S.netWob || 0) - dt * 2.2); PT.net.position.z = Math.sin(S.t * 46) * 0.012 * S.netWob; PT.net.scale.y = 1 - 0.08 * S.netWob * Math.abs(Math.sin(S.t * 46));
    TA.duck(play ? 0.7 : S.dlg ? 0.6 : 0); TA.update(dt);
    HALL.lampG.visible = false; pend.visible = !play;
    drawChalk(); drawBoard();
    const sh = camShot(); camera.updateProjectionMatrix(); const k = Math.min(1, dt * (S.mode === 'walk' ? 5 : 3.2)); CAM.pos.lerp(sh.pos, k); CAM.look.lerp(sh.look, k); camera.position.copy(CAM.pos); if (S.shake > 0.002) { camera.position.x += rr(-1, 1) * S.shake; camera.position.y += rr(-1, 1) * S.shake * 0.5; S.shake *= Math.pow(0.02, dt); } camera.lookAt(CAM.look); }
  let boardKey = ''; function drawBoard() { const k = S.score.you + '|' + S.score.him + '|' + S.server + '|' + (S.glow > 0 ? 1 : 0); if (k === boardKey) return; boardKey = k; const c = PT.boardCv.getContext('2d');
    c.fillStyle = S.glow > 0 ? (S.glowCol === 0xff3a2a ? '#3a0c08' : '#08143a') : '#f6f3ee'; c.fillRect(0, 0, 256, 128); for (const [n, x, col] of [[S.score.you, 64, '#e0442a'], [S.score.him, 192, '#2f6fd8']]) { c.fillStyle = col; c.fillRect(x - 54, 14, 108, 100); c.fillStyle = '#ffffff'; c.font = '900 72px Archivo, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), x, 68); }
    c.fillStyle = '#ffd23a'; c.beginPath(); c.arc(S.server === 'you' ? 64 : 192, 120, 6, 0, 7); c.fill(); PT.boardT.needsUpdate = true; }
  let chalkKey = ''; function drawChalk() { const w = save.stat(SK.wins, 0), l = save.stat(SK.losses, 0), b = save.stat(SK.best, 0), r = save.stat(SK.rally, 0), k = w + '|' + l + '|' + b + '|' + r; if (k === chalkKey) return; chalkKey = k; const c = HALL.chalkCv.getContext('2d');
    c.fillStyle = '#1f2a24'; c.fillRect(0, 0, 512, 256); c.strokeStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 30; i++) { c.beginPath(); c.moveTo(Math.random() * 512, Math.random() * 256); c.lineTo(Math.random() * 512, Math.random() * 256); c.stroke(); }
    c.fillStyle = '#f6f3ee'; c.font = '900 34px Archivo, Arial'; c.fillText('PING-PONG', 22, 50); c.font = '700 22px Archivo, Arial'; c.fillStyle = '#ffd23a'; c.fillText('FASTEST SMASH ' + (b ? b + ' km/h' : '—') + '   LONGEST RALLY ' + (r || '—'), 22, 86);
    c.fillStyle = '#f6f3ee'; c.font = '800 26px Archivo, Arial'; c.fillText('BEN  ' + w + ' won', 22, 150); c.fillText(ON + '  ' + l + ' won', 22, 206); HALL.chalkT.needsUpdate = true; }
  function frame() { raf = requestAnimationFrame(frame); const dt = Math.min(0.05, clock.getDelta()); if (HIDDEN) return; if (!PAUSE) step(dt); renderer.render(scene, camera); hudT -= dt; if (hudT <= 0) { hudT = S.mode === 'play' ? 0.066 : 0.1; onState(hud()); } }
  function onRs() { renderer.setSize(CW(), CHh()); camera.aspect = CW() / CHh(); camera.updateProjectionMatrix(); } addEventListener('resize', onRs); const ro = new ResizeObserver(onRs); ro.observe(container);
  const onKD = e => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (S.mode === 'walk') { if (e.code === 'KeyE' && !e.repeat) { e.preventDefault(); talk(); return; } if (S.dlg && /Digit[1-9]/.test(e.code) && S.dlg.choices && S.dlg.chars >= S.dlg.lines[S.dlg.i].text.length && S.dlg.i === S.dlg.lines.length - 1) { api.choose(+e.code.slice(5) - 1); return; } if (e.code === 'Space' && !e.repeat) { e.preventDefault(); api.jump(); return; } if (e.code === 'Digit1' && !S.dlg) api.melee(); }
    if (S.mode === 'play' && !S.demo) { if (e.code === 'KeyV' && !e.repeat) api.toggleView(); if (e.code === 'Space' && !e.repeat) { e.preventDefault(); if (S.ph === 'serve' && S.server === 'you') serve('you', 0.5); } }
    if (/^(Arrow|Key[WASD]|Shift)/.test(e.code)) { keys.add(e.code); if (S.mode !== 'intro' && /^Arrow/.test(e.code)) e.preventDefault(); } };
  const onKU = e => keys.delete(e.code), onBlur = () => keys.clear(); addEventListener('keydown', onKD); addEventListener('keyup', onKU); addEventListener('blur', onBlur);

  // the overlay's pad map reads mal/puck like the hockey one: x 0..1 across, y 1..2 from the net back to the end of your run-off
  const toMap = (x, z) => ({ x: clamp((x + TW + 0.55) / (2 * TW + 1.1), 0, 1), y: 1 + clamp(z / (TL + 0.95), 0, 1) });
  function hud() { const play = S.mode === 'play', d = S.dlg, ln = d && d.lines[d.i], a = S.score.you, b = S.score.him, deuce = a >= PONG.TO - 1 && b >= PONG.TO - 1;
    const quest = play ? 'BEN ' + a + ' · ' + ON + ' ' + b + ' · FIRST TO ' + PONG.TO + (S.stake ? ' · STAKE ' + S.stake + 'g' : ' · FRIENDLY') : S.mode === 'walk' ? 'TALK TO ' + ON + ' · PLAY PING-PONG' : OP.title.toUpperCase();
    const demoCap = !S.demo ? null : S.ph === 'serve' ? ['PAD', 'SLIDE YOUR THUMB ON THE PAD TO MOVE THE PADDLE. SWIPE UP TO SERVE'] : S.ph === 'point' ? ['', 'FIRST TO ELEVEN. SERVE CHANGES EVERY TWO POINTS'] : S.lastHit === 'him' ? ['MOVE', 'GET YOUR PADDLE IN FRONT OF THE YELLOW RING. IT HITS BY ITSELF'] : ['SWIPE', 'WHERE IT MEETS THE PADDLE AIMS IT. SWIPE UP THROUGH IT TO SMASH'];
    return { mode: S.mode, ph: S.ph, score: { you: a, him: b }, to: PONG.TO, view: S.view === 'back' ? 'top' : 'low', viewName: S.view === 'back' ? 'BACK' : 'TOP', flash: S.flash, call: S.call, stake: S.stake, gold: save.data.gold, done: S.done, demo: demoCap, hand: S.demo && play ? { kind: 'pad', x: toMap(YP.x, YP.z).x, y: toMap(YP.x, YP.z).y - 1 } : null, touching: !!S.touching, serve: S.ph === 'serve' ? S.server : null, matchPoint: !deuce && Math.max(a, b) === PONG.TO - 1 && a !== b, deuce, best: S.best, quest,
      mal: toMap(YP.x, YP.z), puck: B.z > 0 ? toMap(B.x, B.z) : { x: 0.5, y: 0.5 },
      prog: { wins: save.stat(SK.wins, 0), losses: save.stat(SK.losses, 0), best: save.stat(SK.best, 0), suggest: save.stat(SK.stake, 20), maxBet: Math.max(0, Math.min(PONG.BET_MAX, Math.floor(save.data.gold || 0))), level: !!save.flag(FL.table), won: !!save.flag(FL.won) },
      musicOn: TA.musicOn, tv: { key: WK, world: TV.world, room: TV.room, place: TV.place, title: OP.title, hall: TV.hall, opp: ON, keeper: TV.keeper.name, ph: !!OP.ph },
      std: { prompt: S.mode === 'walk' && !d && S.near ? S.near.label : null, toast: S.toast, dialog: d && S.mode === 'walk' ? { name: ln.who === 'p' ? 'BEN' : d.name, role: ln.who === 'p' ? 'You' : d.role, text: ln.text.slice(0, Math.floor(d.chars)), step: d.i + 1, total: d.lines.length, done: d.chars >= ln.text.length, you: ln.who === 'p', more: false, required: false, choices: d.choices && d.i === d.lines.length - 1 && d.chars >= ln.text.length ? d.choices.map(c => ({ text: c.text, asked: !!c.asked, bye: !!c.bye })) : null } : null, quest } };
  }
  // ---------- modes ----------
  function resetTable() { Object.assign(B, { x: 0, y: TY + 0.3, z: 0.9, vx: 0, vy: 0, vz: 0, spin: 0, live: false }); Object.assign(YP, { x: 0, z: TL + 0.35, tx: 0, tz: TL + 0.35, vx: 0, vz: 0 }); Object.assign(OPd, { x: 0, z: -TL - 0.35, tx: 0, tz: -TL - 0.35, vx: 0, vz: 0 }); }
  function toIntro() { S.mode = 'intro'; S.ph = 'idle'; S.done = null; S.demo = false; closeDlg(); resetTable(); PL.x = spots.enter.x; PL.z = spots.enter.z; PL.yaw = Math.PI; OX.x = homeOpp.x; OX.z = homeOpp.z; S.view = 'back'; S.zoom = 1; S.score = { you: 0, him: 0 }; }
  function begin(stake, demo = false) { ainit(); const mx = Math.max(0, Math.min(PONG.BET_MAX, Math.floor(save.data.gold || 0))); S.stake = demo ? 0 : clamp(Math.round(stake || 0), 0, mx); S.mode = 'play'; S.done = null; S.res = null; S.demo = demo; S.score = { you: 0, him: 0 }; S.best = 0; S.recFlashed = false; S.hits = 0; S.rally = 0; S.maxRally = 0; S.serveN = 0; S.zoom = 1; closeDlg(); stick.x = stick.y = 0; resetTable(); setLevel(); botOpp.plan = botYou.plan = null;
    toServe('you'); call(demo ? 'DEMO · NOTHING IS SAVED' : 'YOUR SERVE · SWIPE UP' + (S.stake ? ' · ' + S.stake + 'g ON IT' : ''), 2.6); if (demo) S.demoEnd = S.t + 70; TA.beep(true); drawBoard(); }
  resetTable(); drawBoard(); frame();
  const api = {
    walk() { ainit(); if (S.mode === 'intro' || S.mode === 'done' || S.mode === 'stake') { if (S.mode === 'intro') { PL.x = spots.enter.x; PL.z = spots.enter.z; PL.yaw = Math.PI; } S.mode = 'walk'; S.done = null; S.demo = false; toast('Walk up to ' + ONc + ' and press TALK to play.', 3.2); } },
    openStake() { ainit(); closeDlg(); S.mode = 'stake'; S.done = null; },
    begin, toIntro, demoStart() { if (S.mode === 'play') return; begin(0, true); }, demoStop() { if (!S.demo) return; S.demo = false; toIntro(); },
    quit() { if (S.mode !== 'play' || S.demo) return; S.mode = 'walk'; S.ph = 'idle'; resetTable(); call(''); toast('Called it off. Your money stays in your pocket.', 3); },
    padDown, padMove, padUp, serveNow() { if (S.mode === 'play' && S.ph === 'serve' && S.server === 'you' && !S.demo) serve('you', 0.5); },
    toggleView() { S.view = S.view === 'back' ? 'top' : 'back'; return S.view; }, setSafe(t, b, l, r) { if (Math.abs(SAFE.t - t) + Math.abs(SAFE.b - b) + Math.abs(SAFE.l - l) + Math.abs(SAFE.r - r) > 3) { SAFE.t = t; SAFE.b = b; SAFE.l = l; SAFE.r = r; } },
    start() {}, talk, choose(i) { const d = S.dlg; if (!d || !d.choices) return; const c = d.choices[i]; if (c && d.onChoose) d.onChoose(c); }, closeDialog: closeDlg, nextLine: talk, clearToast() { S.toast = null; },
    melee() { if (S.mode !== 'walk' || S.dlg) return; toast(WK === 'luxor' ? 'TIB: “Gloves on, weapons past the gate.”' : 'No brawling in the tavern.', 2.4); }, range() { api.melee(); }, jump() { if (S.mode === 'walk' && !S.dlg && PL.hop <= 0) { PL.hop = 0.5; TA.tap(); } }, meleeUp() {},
    useItem(id) { if (S.mode === 'play') { flash('SAVE IT FOR AFTER THE GAME', '#ffffff', 1.2); return; } if (save.take(id, 1)) toast(id === 'erToGo' ? 'Warm all the way down. +40 HP' : id === 'energyPod' ? 'Energy topped up.' : 'A treat.', 2.4); },
    closeWheel() {}, skipTime() {}, setPaused(v) { PAUSE = !!v; }, setVisible(v) { HIDDEN = !v; if (v) clock.getDelta(); }, setHudPad() {}, setStick(x, y) { stick.x = x; stick.y = y; }, eyeLook() {}, eyeRelease() {}, togglePov() { return false; }, lookBy() {}, zoomBy(d) { S.zoom = clamp(S.zoom * (1 - d * 0.1), 0.75, 1.6); }, getCam() { return { dist: 10, pitch: 0.6 }; }, setCam() {}, setMinimap() {}, toggleSound() { audio.setMuted && audio.setMuted(!audio.muted); }, cycleWeather() {},
    mapData() { return { p: [PL.x, PL.z, PL.yaw], b: [['PING-PONG', T0.x, T0.z], ['BAR', 4.2, -1.6], ['DOOR', 0, HALL.D / 2]], f: [[opp.position.x, opp.position.z], [keeper.position.x, keeper.position.z], ...regs.map(g => [g.f.position.x, g.f.position.z])], e: [], q: [opp.position.x, opp.position.z, ON] }; },
    hud, onExit, hall: HALL, setMusic(on) { ainit(); TA.setMusic(on); }, toggleMusic() { ainit(); TA.setMusic(!TA.musicOn); return TA.musicOn; }, uiTap() { ainit(); TA.tap(); },
    _state: () => S, _ball: () => ({ ...B }), _paddles: () => ({ you: { ...YP }, him: { ...OPd } }), _bots: () => ({ botYou, botOpp }), _sim(n, cb, dt = 1 / 30) { for (let i = 0; i < n; i++) { step(dt); if (cb && cb(S, i) === false) break; } renderer.render(scene, camera); onState(hud()); }, _place: (x, z) => { PL.x = x; PL.z = z; }, _point(w) { S.ph = 'live'; B.live = true; point(w, 'TEST'); },
    destroy() { cancelAnimationFrame(raf); removeEventListener('resize', onRs); ro.disconnect(); removeEventListener('keydown', onKD); removeEventListener('keyup', onKU); removeEventListener('blur', onBlur); el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp); el.removeEventListener('wheel', onWheel); renderer.dispose(); renderer.domElement.remove(); try { TA.dispose(); audio.ctx && audio.ctx.close(); } catch (e) {} } };
  api.onExit = onExit;
  if (startIn === 'walk') api.walk();
  return api;
}
