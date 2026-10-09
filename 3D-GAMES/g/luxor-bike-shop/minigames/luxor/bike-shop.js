// 8 GATES — LUXOR BIKE SHOP [luxorBikeShop] (the 2D Bike Shop room inside luxorTownSquare). Ben fixes the Run's bikes in Sparrow's shop.
// A job location like Jon's Boatworks: one bike at a time, no clock, scored on quality. 3 bikes = a day.
// Cast from the 2D Luxor file: SPARROW builds + repairs (opinions about everybody's tyre pressure), LUCIUS behind the counter (stock: Spare Cell 11, Riding Leathers 50),
// COBB on the tune pad. Riders who bring bikes in: the Luxor square's riders (Wick, Ansel, Peel, Sabe, Ornn, Cinder, Beck, Rill, Jax, Brek, Tarn, Mell).
// Flow: the rider rides the bike in through the roll-up door → the lift raises it → JOB CARD → work the jobs in any order → HAND BACK → reaction + pay → rides out.
// Tasks (one touch gesture each):
//   TYRE   pull the nail (drag it out), then HOLD to fill and let go on the card's PSI (over? hold again to bleed)
//   TRUE   the wheel spins; TAP when the red mark passes the yellow gauge (3 hits)
//   CHAIN  swipe the oiler back and forth along the rusty chain
//   PLUG   twist your finger round the plug to unscrew it, pick the card's plug, twist it back in
//   DENTS  tap each dent to hammer it flat
//   POLISH rub the lava soot off (dents first); the rider's number goes on at the end
//   TUNE   hold the throttle and keep the needle in the green band for 3 seconds (plug + chain first)
// WALK MODE: between jobs Ben can walk the shop: tap the floor to walk, hold + drag to steer, tap someone to talk (WASD / arrows + E on desktop).
// MERGE: buildBikeShop(ctx) builds the room at an origin and returns walk data (bounds, colliders, NPC spots, exits) so any Luxor (or other) building can host it.
//        createBikeShop({ container, onState }) runs it stand-alone. Save keys luxor.bikes.*, flag bikeUniform.
import * as THREE from '../../vendor/three/three.module.js';
import { rr, clamp, damp, smooth, pick } from '../../village-game.js';
import { canvasTex } from '../../meru-game.js';
import { CAST } from '../../engine/cast.js';
import { save } from '../../engine/save.js';
import { createStage, cameraFit, hintRings, dinerUniform } from '../../engine/restaurant-kit.js';

export const BIKESHOP = { name: 'LUXOR BIKE SHOP', room: 'luxorBikeShop', world: 'luxor', perDay: 3 };
export const BIKES = {
  dirt: { name: 'DIRT BIKE', price: 14, psi: 20, col: '#f2c94c', tasks: ['tyre', 'true', 'chain', 'plug', 'dents', 'polish', 'tune'] },
  street: { name: 'STREET BIKE', price: 18, psi: 36, col: '#ec3013', tasks: ['tyre', 'true', 'chain', 'plug', 'dents', 'polish', 'tune'] },
  chopper: { name: 'CHOPPER', price: 16, psi: 30, col: '#1f3a5f', tasks: ['tyre', 'true', 'chain', 'plug', 'dents', 'polish', 'tune'] } };
export const TASKS = { tyre: { label: 'TYRE', name: 'Fix the flat tyre' }, true: { label: 'TRUE', name: 'True the front wheel' }, chain: { label: 'CHAIN', name: 'Oil the rusty chain' }, plug: { label: 'PLUG', name: 'Change the spark plug' }, dents: { label: 'DENTS', name: 'Hammer out the dents' }, polish: { label: 'POLISH', name: 'Polish off the lava soot' }, tune: { label: 'TUNE', name: 'Tune the engine' } };
const ORDER = ['tyre', 'true', 'chain', 'plug', 'dents', 'polish', 'tune'];
export const PLUGS = { hot: { name: 'HOT', col: '#ec3013' }, cold: { name: 'COLD', col: '#38bdf8' }, race: { name: 'RACE', col: '#f2c94c' } };
const PLK = Object.keys(PLUGS);
export const UPGRADES = [
  { id: 'gauge', name: 'BIG DIAL GAUGE', cost: 35, line: 'The tyre PSI window is wider.' },
  { id: 'spoke', name: 'SPOKE KEY', cost: 40, line: 'Wheel truing: bigger timing window.' },
  { id: 'oiler', name: 'OIL GUN', cost: 30, line: 'Chain links come clean in 2 passes, not 3.' },
  { id: 'mallet', name: 'DEAD-BLOW MALLET', cost: 30, line: 'Dents pop out in 2 taps, not 3.' },
  { id: 'radio', name: 'VOLCANO RUN RADIO', cost: 60, line: 'Riders tip 25% more.' }];
const RIDERS = [
  { name: 'WICK', fur: '#e9855a', furDark: '#a83a18', torso: ['#201e1d', '#ec3013', '#3a3836'] }, { name: 'ANSEL', fur: '#d8c4a8', furDark: '#9a8468', torso: ['#5c718f', '#f2c94c', '#232c3c'] },
  { name: 'PEEL', torso: ['#f2c94c', '#201e1d', '#a8792e'] }, { name: 'SABE', fur: '#9a6f4a', furDark: '#6b4a2c', torso: ['#2f9a8f', '#fbf8ec', '#1f6a62'] },
  { name: 'ORNN', fur: '#9a9a9e', furDark: '#6a6a70', torso: ['#3a3836', '#ec3013', '#201e1d'], outfit: 'coat' }, { name: 'CINDER', fur: '#c9682a', furDark: '#8a4213', torso: ['#ec3013', '#201e1d', '#8f2b1e'] },
  { name: 'BECK', torso: ['#7c8aa0', '#cfd6e4', '#2b3240'] }, { name: 'RILL', fur: '#f0dcbe', furDark: '#c2a577', torso: ['#a78bfa', '#201e1d', '#5b21b6'] },
  { name: 'JAX', fur: '#fdba74', furDark: '#ea580c', torso: ['#f6a97a', '#5c718f', '#232c3c'] }, { name: 'BREK', fur: '#6a6058', furDark: '#3a3430', torso: ['#201e1d', '#f2c94c', '#3a3836'], outfit: 'coat' },
  { name: 'TARN', torso: ['#8f2b1e', '#f2c94c', '#5a1a12'] }, { name: 'MELL', fur: '#f0c9a0', furDark: '#c28a5a', torso: ['#f07a72', '#201e1d', '#a82c26'] }];
const HELLO = ['Took the lava jump short. Twice.', 'Cinder put me into the wall on lap two.', 'She coughs, she pulls left and she smells of ash.', 'The Run rides tonight. Can you have her ready?', 'Ash in everything. EVERYTHING.', 'Sparrow says you are the new hands. Be gentle.', 'Hit a cone on the city circuit. Then a lamp. Then a bin.'];
const SAVE = { day: 'luxor.bikes.day', best: 'luxor.bikes.best', upg: 'luxor.bikes.upg.', stars: 'luxor.bikes.stars' };
const R = 0.5, LIFT_UP = 0.85;

// ---------------- the shop (interior at an origin) ----------------
export function buildBikeShop(ctx) {
  const { THREE: T3, M, toon, canvasTex: CTX, scene, origin = { x: 0, z: 0 } } = ctx, root = new T3.Group(); root.position.set(origin.x, 0, origin.z); scene.add(root);
  const Y = { root, front: [], colliders: [], lamps: [] }, ink = toon('#201e1d'), red = toon('#ec3013'), redD = toon('#8f2b1e'), steel = toon('#9ca3af'), yel = toon('#f2c94c'), iron = toon('#3a3836'), wood = toon('#7a5a3a');
  const col = (x0, x1, z0, z1) => Y.colliders.push({ x0, x1, z0, z1 });
  // floor: oily concrete with a yellow work bay around the lift
  const floorT = CTX(512, 512, c => { c.fillStyle = '#6d625c'; c.fillRect(0, 0, 512, 512); for (let i = 0; i < 260; i++) { c.fillStyle = i % 2 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)'; c.fillRect((i * 97) % 512, (i * 61) % 512, 3 + (i % 5), 3); } c.strokeStyle = 'rgba(30,20,18,0.35)'; c.lineWidth = 3; for (let x = 0; x <= 512; x += 128) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 512); c.stroke(); c.beginPath(); c.moveTo(0, x); c.lineTo(512, x); c.stroke(); } for (let i = 0; i < 7; i++) { const g = c.createRadialGradient(0, 0, 2, 0, 0, 40); g.addColorStop(0, 'rgba(20,14,12,0.45)'); g.addColorStop(1, 'rgba(20,14,12,0)'); c.save(); c.translate((i * 173) % 512, (i * 311) % 512); c.scale(1.6, 1); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 40, 0, 7); c.fill(); c.restore(); } });
  floorT.wrapS = floorT.wrapT = T3.RepeatWrapping; floorT.repeat.set(3, 2);
  const floor = new T3.Mesh(new T3.PlaneGeometry(18, 12), new T3.MeshToonMaterial({ map: floorT, gradientMap: ctx.grad })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -0.5); floor.receiveShadow = true; root.add(floor); Y.floor = floor;
  { const bay = CTX(256, 128, c => { c.clearRect(0, 0, 256, 128); c.strokeStyle = '#f2c94c'; c.lineWidth = 8; c.strokeRect(6, 6, 244, 116); for (let x = -128; x < 256; x += 28) { c.fillStyle = '#f2c94c'; c.save(); c.beginPath(); c.rect(0, 0, 256, 12); c.rect(0, 116, 256, 12); c.clip(); c.translate(x, 0); c.rotate(0.6); c.fillRect(0, -10, 10, 200); c.restore(); } }); const b = new T3.Mesh(new T3.PlaneGeometry(5.6, 2.8), new T3.MeshBasicMaterial({ map: bay, transparent: true, depthWrite: false })); b.rotation.x = -Math.PI / 2; b.position.set(0, 0.01, -0.5); root.add(b); }
  // walls: red Luxor stone above a basalt band
  const wallT = CTX(512, 256, c => { c.fillStyle = '#8f3a2a'; c.fillRect(0, 0, 512, 256); for (let y = 0; y < 256; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < 512; x += 64) { c.fillStyle = ['#9a4231', '#86352a', '#a14a36'][(x + y) % 3 === 0 ? 0 : (x * 7 + y) % 2 ? 1 : 2]; c.fillRect(x + 2, y + 2, 60, 28); } c.fillStyle = '#2a2224'; c.fillRect(0, 196, 512, 60); c.fillStyle = '#3a3034'; for (let x = 0; x < 512; x += 48) c.fillRect(x, 200, 44, 52); });
  wallT.wrapS = T3.RepeatWrapping; const wallM = new T3.MeshToonMaterial({ map: wallT, gradientMap: ctx.grad });
  const wall = (w, h, x, y, z, ry, rep) => { const t = wallT.clone(); t.needsUpdate = true; t.wrapS = T3.RepeatWrapping; t.repeat.set(rep || w / 6, 1); const m = new T3.Mesh(new T3.PlaneGeometry(w, h), new T3.MeshToonMaterial({ map: t, gradientMap: ctx.grad })); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; root.add(m); return m; };
  wall(18, 4.4, 0, 2.2, -6.5, 0, 3); wall(12, 4.4, 9, 2.2, -0.5, -Math.PI / 2, 2);
  // left wall with the roll-up door (opening z -2.3 .. 1.3, 3.2 high)
  wall(4.2, 4.4, -9, 2.2, -4.4, Math.PI / 2, 0.7); wall(4.2, 4.4, -9, 2.2, 3.4, Math.PI / 2, 0.7); wall(3.6, 1.2, -9, 3.8, -0.5, Math.PI / 2, 0.6);
  for (const z of [-2.35, 1.35]) M(new T3.BoxGeometry(0.3, 3.3, 0.3), yel, -9, 1.65, z, root, 0.015);
  M(new T3.BoxGeometry(0.4, 0.4, 4.1), iron, -9, 3.35, -0.5, root, 0.02);
  Y.shutter = M(new T3.BoxGeometry(0.12, 3.2, 3.6), toon('#5a6068'), -9.05, 1.6, -0.5, root, 0.012); Y.shutter.geometry.translate(0, 1.6, 0); Y.shutter.position.y = 0; Y.shutterOpen = 1;
  { const st = CTX(64, 256, c => { c.fillStyle = '#5a6068'; c.fillRect(0, 0, 64, 256); c.fillStyle = '#454a52'; for (let y = 0; y < 256; y += 16) c.fillRect(0, y, 64, 4); }); Y.shutter.material = new T3.MeshToonMaterial({ map: st, gradientMap: ctx.grad }); }
  // outside the door: red cobbled street, ember dusk, the volcano
  { const cob = CTX(256, 256, c => { c.fillStyle = '#4a2420'; c.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 24) for (let x = (y / 24) % 2 ? -16 : 0; x < 256; x += 32) { c.fillStyle = (x + y) % 3 ? '#7a3428' : '#8a3c2c'; c.beginPath(); c.ellipse(x + 16, y + 12, 14, 10, 0, 0, 7); c.fill(); } }); cob.wrapS = cob.wrapT = T3.RepeatWrapping; cob.repeat.set(10, 4);
    const st = new T3.Mesh(new T3.PlaneGeometry(40, 16), new T3.MeshToonMaterial({ map: cob, gradientMap: ctx.grad })); st.rotation.x = -Math.PI / 2; st.position.set(-29, -0.01, -0.5); root.add(st);
    const sky = CTX(16, 256, c => { const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#2a1630'); g.addColorStop(0.55, '#a8402a'); g.addColorStop(0.8, '#f2994a'); g.addColorStop(1, '#ffd08a'); c.fillStyle = g; c.fillRect(0, 0, 16, 256); });
    const sk = new T3.Mesh(new T3.PlaneGeometry(60, 30), new T3.MeshBasicMaterial({ map: sky, fog: false })); sk.position.set(-40, 10, -0.5); sk.rotation.y = Math.PI / 2; root.add(sk);
    const vol = M(new T3.ConeGeometry(9, 10, 18, 1, true), toon('#3a2224'), -36, 4, -9, root, 0); const glow = M(new T3.CylinderGeometry(1.4, 2.2, 0.6, 14), new T3.MeshBasicMaterial({ color: 0xff7a1a }), -36, 9.2, -9, root, 0); Y.volcanoGlow = glow;
    for (const [x, z, h] of [[-15, -6, 6], [-15, 5.5, 5], [-22, -7, 8], [-24, 6, 7]]) M(new T3.BoxGeometry(4, h, 4), toon('#6a2a20'), x, h / 2, z, root, 0.03);
    for (const z of [-3.5, 2.5]) { const fc = root.children.length; M(new T3.CylinderGeometry(0.08, 0.1, 2.6, 8), iron, -12, 1.3, z, root, 0.01); M(new T3.CylinderGeometry(0.4, 0.25, 0.4, 10), iron, -12, 2.7, z, root, 0.015); const f = new T3.Mesh(new T3.SphereGeometry(0.3, 10, 8), new T3.MeshBasicMaterial({ color: 0xffa040 })); f.position.set(-12, 3.0, z); root.add(f); Y.lamps.push(f); } }
  // back wall: neon sign with the L crest, pegboard, Sparrow's bench, posters
  const signT = CTX(1024, 200, c => { c.fillStyle = '#1a1214'; c.fillRect(0, 0, 1024, 200); c.strokeStyle = '#ff5a3a'; c.shadowColor = '#ff5a3a'; c.shadowBlur = 18; c.lineWidth = 8; c.strokeRect(14, 14, 996, 172); c.font = '900 104px Archivo, "Arial Black", Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffd23a'; c.shadowColor = '#ffb020'; c.fillText('BIKE SHOP', 560, 104); c.shadowBlur = 12; c.shadowColor = '#ff5a3a'; c.fillStyle = '#ff5a3a'; c.font = '900 120px Archivo, Arial'; c.fillText('L', 120, 106); c.beginPath(); c.arc(120, 100, 66, 0, 7); c.lineWidth = 7; c.stroke(); });
  { const s = new T3.Mesh(new T3.PlaneGeometry(5.6, 1.1), new T3.MeshBasicMaterial({ map: signT })); s.position.set(0, 3.55, -6.45); root.add(s); Y.sign = s; }
  const pegT = CTX(512, 256, c => { c.fillStyle = '#c9a06a'; c.fillRect(0, 0, 512, 256); c.fillStyle = '#9a7444'; for (let y = 12; y < 256; y += 20) for (let x = 12; x < 512; x += 20) c.fillRect(x, y, 3, 3); c.fillStyle = '#201e1d'; c.strokeStyle = '#201e1d'; c.lineWidth = 12; c.lineCap = 'round';
    c.beginPath(); c.moveTo(40, 40); c.lineTo(40, 190); c.stroke(); c.beginPath(); c.arc(40, 40, 18, 0, 7); c.stroke(); c.beginPath(); c.moveTo(100, 50); c.lineTo(100, 180); c.stroke(); c.beginPath(); c.arc(100, 190, 14, 0, 7); c.stroke(); c.fillRect(150, 40, 70, 30); c.fillRect(178, 70, 14, 110);
    c.beginPath(); c.moveTo(260, 40); c.lineTo(300, 200); c.moveTo(300, 40); c.lineTo(260, 200); c.stroke(); c.beginPath(); c.arc(390, 110, 52, 0, 7); c.stroke(); c.beginPath(); c.arc(390, 110, 22, 0, 7); c.stroke(); c.fillStyle = '#ec3013'; c.fillRect(460, 40, 30, 150); });
  { const p = new T3.Mesh(new T3.PlaneGeometry(3.6, 1.8), new T3.MeshBasicMaterial({ map: pegT })); p.position.set(-3.2, 2.0, -6.47); root.add(p); }
  M(new T3.BoxGeometry(3.4, 0.9, 1.0), wood, -3.2, 0.45, -5.9, root, 0.02); M(new T3.BoxGeometry(3.5, 0.08, 1.1), iron, -3.2, 0.94, -5.9, root, 0.01); col(-5, -1.4, -6.5, -5.3);
  M(new T3.BoxGeometry(0.5, 0.3, 0.3), red, -4.3, 1.13, -5.8, root, 0.01); M(new T3.CylinderGeometry(0.14, 0.14, 0.3, 12), toon('#2f6b4a'), -2.2, 1.13, -5.8, root, 0.01, 0.14);
  const poster = (txt, sub, bg, x) => { const t = CTX(256, 360, c => { c.fillStyle = bg; c.fillRect(0, 0, 256, 360); c.fillStyle = '#201e1d'; c.fillRect(0, 250, 256, 110); c.fillStyle = '#fbf8ec'; c.font = '900 44px Archivo, Arial'; c.textAlign = 'left'; c.fillText(txt[0], 18, 296); c.font = '800 24px Archivo, Arial'; c.fillStyle = '#ffd23a'; c.fillText(sub, 18, 334); c.fillStyle = '#201e1d'; c.beginPath(); c.moveTo(20, 230); c.lineTo(128, 40); c.lineTo(236, 230); c.fill(); c.fillStyle = '#ff7a1a'; c.beginPath(); c.arc(128, 60, 26, 0, 7); c.fill(); }); const m = new T3.Mesh(new T3.PlaneGeometry(0.95, 1.33), new T3.MeshBasicMaterial({ map: t })); m.position.set(x, 2.1, -6.46); root.add(m); };
  poster(['VOLCANO RUN'], '3 LAPS · LAVA JUMP', '#f2994a', 1.4); poster(['CINDER CUP'], 'CITY CIRCUIT', '#ffd23a', 2.6);
  // tyre rack (back-left corner)
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) M(new T3.TorusGeometry(0.42, 0.13, 8, 18), toon('#1f2023'), -8.3 + j * 0.0, 0.6 + i * 0.0 + j * 1.05, -6.0 + i * 0.32, root, 0.012).rotation.y = Math.PI / 2;
  M(new T3.BoxGeometry(0.9, 0.06, 1.8), iron, -8.3, 1.12, -5.3, root, 0.01); col(-9, -7.6, -6.5, -4.3);
  // tune pad (back-right): roller dyno + truing stand, Cobb's corner
  { const pad = new T3.Group(); pad.position.set(6.0, 0, -4.9); root.add(pad); Y.pad = pad;
    M(new T3.BoxGeometry(4.2, 0.18, 2.6), toon('#4b5563'), 0, 0.09, 0, pad, 0.02); M(new T3.BoxGeometry(4.0, 0.02, 0.18), yel, 0, 0.19, 1.15, pad, 0); M(new T3.BoxGeometry(4.0, 0.02, 0.18), yel, 0, 0.19, -1.15, pad, 0);
    for (const x of [-0.6, 0.0]) M(new T3.CylinderGeometry(0.22, 0.22, 1.6, 16), steel, x, 0.2, 0, pad, 0.01, 0.22).rotation.x = Math.PI / 2;
    const tsT = CTX(256, 64, c => { c.fillStyle = '#201e1d'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#ffd23a'; c.font = '900 40px Archivo, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TUNE PAD', 128, 34); }); const ts = new T3.Mesh(new T3.PlaneGeometry(1.6, 0.4), new T3.MeshBasicMaterial({ map: tsT })); ts.position.set(0, 0.2, 1.31); pad.add(ts);
    const stand = new T3.Group(); stand.position.set(1.4, 0.18, -0.4); pad.add(stand); M(new T3.BoxGeometry(0.1, 1.3, 0.1), iron, -0.4, 0.65, 0, stand, 0.01); M(new T3.BoxGeometry(0.1, 1.3, 0.1), iron, 0.4, 0.65, 0, stand, 0.01); M(new T3.BoxGeometry(0.9, 0.1, 0.4), iron, 0, 0.05, 0, stand, 0.01);
    const w = new T3.Group(); w.position.set(0, 1.25, 0); stand.add(w); Y.padWheel = w; const t = M(new T3.TorusGeometry(0.42, 0.09, 8, 22), toon('#1f2023'), 0, 0, 0, w, 0.01); M(new T3.TorusGeometry(0.33, 0.03, 6, 22), toon('#e5e7eb'), 0, 0, 0, w, 0); for (let i = 0; i < 8; i++) M(new T3.BoxGeometry(0.02, 0.66, 0.02), toon('#e5e7eb'), 0, 0, 0, w, 0).rotation.z = i * Math.PI / 8;
    M(new T3.BoxGeometry(0.6, 0.9, 0.5), toon('#334155'), -1.6, 0.6, -0.8, pad, 0.015); const scr = new T3.Mesh(new T3.PlaneGeometry(0.46, 0.3), new T3.MeshBasicMaterial({ color: 0x5cff8a })); scr.position.set(-1.6, 0.85, -0.54); pad.add(scr); }
  col(3.9, 8.2, -6.2, -3.6);
  // counter (right): Lucius behind it, parts shelf on the right wall
  { const ct = new T3.Group(); ct.position.set(6.4, 0, 1.5); root.add(ct); M(new T3.BoxGeometry(1.1, 1.05, 3.6), toon('#3a2a2a'), 0, 0.525, 0, ct, 0.02); M(new T3.BoxGeometry(1.3, 0.08, 3.8), red, 0, 1.08, 0, ct, 0.012);
    const fT = CTX(512, 128, c => { c.fillStyle = '#3a2a2a'; c.fillRect(0, 0, 512, 128); c.fillStyle = '#ffd23a'; c.font = '900 64px Archivo, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('THE RUN', 256, 66); }); const f = new T3.Mesh(new T3.PlaneGeometry(3.0, 0.75), new T3.MeshBasicMaterial({ map: fT })); f.position.set(-0.56, 0.6, 0); f.rotation.y = -Math.PI / 2; ct.add(f);
    M(new T3.BoxGeometry(0.4, 0.3, 0.35), toon('#201e1d'), 0, 1.27, -1.2, ct, 0.01); const cell = M(new T3.CylinderGeometry(0.09, 0.09, 0.26, 12), toon('#38bdf8'), 0.05, 1.25, 0.6, ct, 0.01, 0.09); M(new T3.BoxGeometry(0.5, 0.12, 0.4), toon('#5a3a2a'), 0, 1.18, 1.2, ct, 0.01); }
  col(5.7, 7.1, -0.4, 3.4);
  for (let i = 0; i < 3; i++) { M(new T3.BoxGeometry(0.5, 0.06, 3.4), wood, 8.7, 1.2 + i * 0.75, 1.5, root, 0.01); for (let k = 0; k < 5; k++) M(new T3.BoxGeometry(0.3, 0.3, 0.3), toon(['#ec3013', '#f2c94c', '#38bdf8', '#9ca3af', '#2f6b4a'][(i + k) % 5]), 8.7, 1.38 + i * 0.75, 0.2 + k * 0.62, root, 0.008); }
  // display bike + oil drums (front right) and a parked bike on the left
  for (const [x, z, c] of [[7.9, 4.6, '#ec3013'], [8.5, 3.8, '#2f6b4a'], [7.4, 3.7, '#3a3836']]) { M(new T3.CylinderGeometry(0.34, 0.34, 1.0, 14), toon(c), x, 0.5, z, root, 0.015, 0.34); M(new T3.CylinderGeometry(0.35, 0.35, 0.05, 14), toon('#d7dde3'), x, 1.0, z, root, 0); }
  col(6.9, 9, 3.2, 5.3);
  { const fc = root.children.length; const fw = (w, x) => { const m = new T3.Mesh(new T3.BoxGeometry(w, 0.6, 0.3), wallM); m.position.set(x, 0.3, 5.5); root.add(m); }; fw(2.6, -7.7); fw(12.6, 2.7); Y.front.push(...root.children.slice(fc)); }
  { const dT = CTX(256, 128, c => { c.fillStyle = '#201e1d'; c.fillRect(0, 0, 256, 128); c.fillStyle = '#ffd23a'; c.font = '900 34px Archivo, Arial'; c.textAlign = 'center'; c.fillText('TO THE', 128, 54); c.fillText('SQUARE ▼', 128, 96); }); const d = new T3.Mesh(new T3.PlaneGeometry(1.1, 0.55), new T3.MeshBasicMaterial({ map: dT, side: T3.DoubleSide })); d.rotation.x = -Math.PI / 2; d.position.set(-5.4, 0.02, 4.9); root.add(d); Y.doorMat = d; }
  // hanging lamps + an ember brazier by the door
  for (const x of [-4.8, 4.8]) { M(new T3.CylinderGeometry(0.01, 0.01, 1.2, 4), ink, x, 3.8, -0.5, root, 0); M(new T3.ConeGeometry(0.42, 0.34, 16, 1, true), toon('#201e1d', { side: T3.DoubleSide }), x, 3.1, -0.5, root, 0.008); const b = new T3.Mesh(new T3.SphereGeometry(0.12, 8, 6), new T3.MeshBasicMaterial({ color: 0xfff0c0 })); b.position.set(x, 2.98, -0.5); root.add(b); }
  { M(new T3.CylinderGeometry(0.42, 0.22, 0.5, 12), iron, -7.7, 0.95, 2.6, root, 0.015); M(new T3.CylinderGeometry(0.05, 0.05, 0.75, 6), iron, -7.7, 0.4, 2.6, root, 0); const e = new T3.Mesh(new T3.SphereGeometry(0.34, 10, 8), new T3.MeshBasicMaterial({ color: 0xff7a1a })); e.scale.y = 0.5; e.position.set(-7.7, 1.2, 2.6); root.add(e); Y.ember = e; col(-8.2, -7.2, 2.1, 3.1); }
  // the lift: a red hydraulic bike table that rises out of the floor
  { const L = new T3.Group(); L.position.set(0, 0, -0.5); root.add(L); Y.lift = L; M(new T3.BoxGeometry(3.6, 0.06, 1.2), iron, 0, 0.03, 0, L, 0.01);
    const top = new T3.Group(); L.add(top); Y.liftTop = top; M(new T3.BoxGeometry(3.4, 0.12, 0.9), red, 0, -0.06, 0, top, 0.015); M(new T3.BoxGeometry(0.3, 0.3, 0.5), iron, 1.55, 0.09, 0, top, 0.012);
    Y.scissor = []; for (const s of [-1, 1]) { const a = M(new T3.BoxGeometry(2.2, 0.08, 0.08), toon('#5a6068'), 0, 0, s * 0.35, L, 0.006); Y.scissor.push(a); } }
  col(-1.8, 1.8, -1.2, 0.2);
  Y.bounds = { x0: -8.6, x1: 8.6, z0: -6.1, z1: 5.0 };
  Y.spots = { ben: { x: -0.6, z: 2.4 }, sparrow: { x: -2.1, z: 2.2 }, sparrowWork: { x: -1.6, z: -5.0 }, owner: { x: -3.7, z: -2.6 }, talk: { x: -4.4, z: 2.4 }, lucius: { x: 7.6, z: 1.5 }, cobb: { x: 5.3, z: -3.4 }, door: { x: -5.4, z: 4.6 }, rollIn: { x: -20, z: -0.5 } };
  Y.npcTalk = { sparrow: { x: -2.1, z: 3.2 }, lucius: { x: 5.0, z: 1.5 }, cobb: { x: 4.6, z: -2.6 } };
  Y.exits = [{ x: -5.4, z: 5.3, r: 1.0, to: 'luxorTownSquare', label: 'Luxor Town Square' }];
  return Y;
}

// ---------------- one bike ----------------
let BIKE_ID = 1;
function makeBike(ST, type, job) {
  const { M, toon, addOutline, scene, V3 } = ST, D = BIKES[type], g = new THREE.Group(); scene.add(g);
  const B = { id: BIKE_ID++, type, D, g, job, links: [], soot: [], dents: [] };
  const ink = toon('#201e1d'), chrome = toon('#e5e7eb'), tyreM = toon('#1f2023'), paint = toon(job.col), dark = toon('#2a2826');
  const chopper = type === 'chopper', street = type === 'street', dirt = type === 'dirt';
  const wb = chopper ? 1.25 : 1.05, xr = -wb, xf = chopper ? 1.35 : wb; B.xr = xr; B.xf = xf;
  function wheel(x, front) { const w = new THREE.Group(); w.position.set(x, R, 0); g.add(w); const sq = new THREE.Group(); w.add(sq); const sp = new THREE.Group(); sq.add(sp);
    const t = new THREE.Mesh(new THREE.TorusGeometry(R - 0.11, 0.11, 10, 28), tyreM); addOutline(t, 0.012, R); sp.add(t);
    if (dirt) for (let i = 0; i < 16; i++) { const q = i / 16 * Math.PI * 2, k = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.2), tyreM); k.position.set(Math.cos(q) * R, Math.sin(q) * R, 0); k.rotation.z = q; sp.add(k); }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.19, 0.025, 6, 28), chrome); sp.add(rim); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 12), chrome); hub.rotation.x = Math.PI / 2; sp.add(hub);
    for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.012, R - 0.2, 0.012), toon('#cfd6e4')); s.position.set(Math.cos(i * Math.PI / 6) * (R - 0.2) / 2, Math.sin(i * Math.PI / 6) * (R - 0.2) / 2, (i % 2 - 0.5) * 0.06); s.rotation.z = i * Math.PI / 6 - Math.PI / 2; sp.add(s); }
    if (!front) { const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 18), toon('#5a646d')); sk.rotation.x = Math.PI / 2; sk.position.z = 0.17; addOutline(sk, 0.006, 0.2); sp.add(sk); }
    return { w, sq, sp }; }
  B.wr = wheel(xr, false); B.wf = wheel(xf, true);
  // frame + swingarm + engine
  const tube = (a, b, r, mat) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), mat); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); addOutline(m, 0.008, r); g.add(m); return m; };
  const head = V3(chopper ? 0.85 : 0.72, chopper ? 1.25 : 1.2, 0), pivot = V3(-0.25, 0.55, 0), seatP = V3(-0.55, 1.0, 0);
  tube(head, pivot, 0.05, paint); tube(head, V3(-0.35, 1.0, 0), 0.045, paint); tube(pivot, seatP, 0.04, paint);
  for (const z of [-0.12, 0.12]) tube(V3(pivot.x, pivot.y, z), V3(xr, R, z), 0.035, dark);
  // fork
  const forkTop = head.clone().add(V3(0.05, 0.12, 0)); for (const z of [-0.1, 0.1]) tube(V3(forkTop.x, forkTop.y, z), V3(xf, R, z), chopper ? 0.03 : 0.04, chrome);
  M(new THREE.CylinderGeometry(0.025, 0.025, chopper ? 1.0 : 0.8, 8), ink, forkTop.x - 0.05, forkTop.y + (chopper ? 0.25 : 0.08), 0, g, 0.006).rotation.x = Math.PI / 2;
  if (chopper) for (const z of [-0.5, 0.5]) M(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), ink, forkTop.x - 0.05, forkTop.y + 0.1, z * 0.95, g, 0.004);
  { const hl = M(new THREE.SphereGeometry(0.12, 12, 10), chrome, forkTop.x + 0.14, forkTop.y - 0.12, 0, g, 0.01, 0.12); const l = new THREE.Mesh(new THREE.CircleGeometry(0.09, 14), new THREE.MeshBasicMaterial({ color: 0xfff7cc })); l.position.set(forkTop.x + 0.26, forkTop.y - 0.12, 0); l.rotation.y = Math.PI / 2; g.add(l); }
  const eng = M(new THREE.BoxGeometry(0.62, 0.48, 0.42), toon('#4b5563'), 0.08, 0.62, 0, g, 0.015); B.engY = 0.62;
  const cyl = M(new THREE.BoxGeometry(0.4, 0.3, 0.36), toon('#6b7280'), 0.2, 0.98, 0, g, 0.012); cyl.rotation.z = chopper ? 0.35 : -0.2;
  for (let i = 0; i < 4; i++) M(new THREE.BoxGeometry(0.46, 0.025, 0.42), toon('#9ca3af'), 0.2, 0.9 + i * 0.06, 0, g, 0).rotation.z = cyl.rotation.z;
  // spark plug sits on the +z side of the cylinder head
  B.plugBase = V3(0.24, 0.88, 0.2); B.plug = plugMesh(toon, addOutline, 'old'); B.plug.position.copy(B.plugBase); g.add(B.plug); B.plugState = job.tasks.includes('plug') ? 'old' : 'snug'; B.plugTurn = 0; B.plugWrong = 0;
  { tube(V3(0.24, 0.98, 0.4), V3(0.62, 1.05, 0.15), 0.014, toon('#ec3013')); }
  // tank + seat + fenders + exhaust
  const tank = M(new THREE.SphereGeometry(0.34, 18, 12), paint, chopper ? 0.38 : 0.32, chopper ? 1.24 : 1.22, 0, g, 0.018, 0.34); tank.scale.set(1.35, 0.72, 0.78); B.tankMesh = tank;
  M(new THREE.BoxGeometry(0.75, 0.12, 0.34), dark, -0.5, chopper ? 0.98 : 1.06, 0, g, 0.012); B.seatTop = chopper ? 1.04 : 1.12;
  if (chopper) M(new THREE.BoxGeometry(0.06, 0.6, 0.06), chrome, -0.95, 1.25, 0, g, 0.006);
  const fend = new THREE.Mesh(new THREE.TorusGeometry(R + 0.04, 0.05, 6, 16, Math.PI * 0.6), paint); fend.rotation.z = Math.PI * 0.35; fend.position.set(xr, R, 0); fend.scale.z = 3; addOutline(fend, 0.01); g.add(fend);
  const ffend = new THREE.Mesh(new THREE.TorusGeometry(R + 0.04, 0.04, 6, 14, Math.PI * 0.5), paint); ffend.rotation.z = Math.PI * 0.25; ffend.position.set(xf, R, 0); ffend.scale.z = 2.5; addOutline(ffend, 0.01); g.add(ffend);
  const ex = tube(V3(0.25, 0.75, -0.2), V3(-1.1, 0.42, -0.24), 0.06, chrome); M(new THREE.CylinderGeometry(0.075, 0.06, 0.3, 10), chrome, -1.15, 0.41, -0.24, g, 0.008).rotation.z = Math.PI / 2 - 0.2; B.exhaust = V3(-1.32, 0.38, -0.24);
  // side panels on +z (dents, soot and the number live here)
  const panel = (w, h, x, y, z, key) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); m.position.set(x, y, z); m.userData.key = key; g.add(m); return m; };
  B.panels = [panel(0.8, 0.4, tank.position.x, tank.position.y, 0.272, 'tank')];
  if (street) { const fair = M(new THREE.BoxGeometry(0.62, 0.55, 0.5), paint, 0.6, 0.78, 0, g, 0.016); fair.rotation.z = -0.25; B.panels.push(panel(0.5, 0.42, 0.62, 0.78, 0.262, 'fairing')); const ws = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.34), new THREE.MeshToonMaterial({ color: '#cfe8f4', transparent: true, opacity: 0.6, gradientMap: ST.grad })); ws.position.set(forkTop.x + 0.05, forkTop.y + 0.2, 0); ws.rotation.z = 0.5; g.add(ws); }
  else { const sc = M(new THREE.BoxGeometry(0.42, 0.34, 0.06), paint, -0.42, 0.78, 0.2, g, 0.01); B.panels.push(panel(0.38, 0.3, -0.42, 0.78, 0.236, 'cover')); }
  // number plate decal (goes on when POLISH is done)
  const decT = canvasTex(256, 128, c => { c.clearRect(0, 0, 256, 128); c.fillStyle = '#fbf8ec'; c.strokeStyle = '#201e1d'; c.lineWidth = 10; c.lineJoin = 'round'; c.font = 'italic 900 92px Archivo, "Arial Black", Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(job.num, 128, 68); c.fillText(job.num, 128, 68); });
  B.decal = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21), new THREE.MeshBasicMaterial({ map: decT, transparent: true, opacity: job.tasks.includes('polish') ? 0 : 1, depthWrite: false })); B.decal.position.set(tank.position.x - 0.04, tank.position.y + 0.02, 0.284); g.add(B.decal);
  // chain: a loop of links round the two sprockets (+z side)
  { const a = V3(-0.02, 0.5, 0.2), b = V3(xr, R, 0.2), ra = 0.1, rb = 0.2, pts = []; const n = 30;
    const loop = t => { // simple belt: top run, rear arc, bottom run, front arc
      const L1 = Math.hypot(b.x - a.x, b.y - a.y), s = t * 4; if (s < 1) return V3(a.x + (b.x - a.x) * s, a.y + ra + (b.y + rb - a.y - ra) * s, 0.2); if (s < 2) { const q = Math.PI / 2 + (s - 1) * Math.PI; return V3(b.x + Math.cos(q) * rb, b.y + Math.sin(q) * rb, 0.2); } if (s < 3) { const k = s - 2; return V3(b.x + (a.x - b.x) * k, b.y - rb + (a.y - ra - b.y + rb) * k, 0.2); } const q = -Math.PI / 2 + (s - 3) * Math.PI; return V3(a.x + Math.cos(q) * ra, a.y + Math.sin(q) * ra, 0.2); };
    const rusty = job.tasks.includes('chain'); for (let i = 0; i < n; i++) { const p = loop(i / n), p2 = loop((i + 0.5) / n), m = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.035, 0.05), new THREE.MeshToonMaterial({ color: rusty ? '#a0522d' : '#cfd6e4', gradientMap: ST.grad })); m.position.copy(p); m.rotation.z = Math.atan2(p2.y - p.y, p2.x - p.x); g.add(m); m.userData = { clean: rusty ? 0 : 3, last: 0 }; B.links.push(m); }
    const fs = M(new THREE.CylinderGeometry(ra, ra, 0.03, 12), toon('#5a646d'), a.x, a.y, 0.19, g, 0.004, ra); fs.rotation.x = Math.PI / 2; }
  // dents on the tank / fairing
  if (job.tasks.includes('dents')) { const n = Math.min(4, 2 + Math.floor(job.day / 2) + (Math.random() < 0.4 ? 1 : 0)); for (let i = 0; i < n; i++) { const P = B.panels[i % B.panels.length], d = new THREE.Group(); d.position.set(P.position.x + rr(-0.28, 0.28) * (P.geometry.parameters.width / 0.8), P.position.y + rr(-0.12, 0.1), P.position.z + 0.012); g.add(d);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.045, 0.075, 16), new THREE.MeshBasicMaterial({ color: 0x201e1d, transparent: true, opacity: 0.7 })); d.add(ring); const dim = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(job.col).multiplyScalar(0.45), transparent: true, opacity: 0.9 })); dim.position.z = 0.001; d.add(dim);
      const gl = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.085, 12, 1, 0.6, 1.6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })); gl.position.z = 0.002; d.add(gl); d.userData = { hits: 0, panel: P.userData.key, ring, dim, gl }; B.dents.push(d); } }
  // lava soot splotches
  if (job.tasks.includes('polish')) { const sootT = canvasTex(128, 128, c => { c.clearRect(0, 0, 128, 128); for (let i = 0; i < 9; i++) { const gr = c.createRadialGradient(64 + Math.cos(i) * 26, 64 + Math.sin(i * 1.7) * 22, 2, 64 + Math.cos(i) * 26, 64 + Math.sin(i * 1.7) * 22, 34); gr.addColorStop(0, 'rgba(24,18,16,0.9)'); gr.addColorStop(1, 'rgba(24,18,16,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); } c.fillStyle = 'rgba(255,120,40,0.5)'; for (let i = 0; i < 6; i++) c.fillRect(30 + i * 13, 50 + (i * 17) % 30, 4, 4); });
    const spots = [[B.panels[0], -0.2, 0.02], [B.panels[0], 0.18, -0.06], [B.panels[1], 0, 0]]; if (job.day >= 3) spots.push([B.panels[0], 0, 0.1]);
    for (const [P, dx, dy] of spots) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.3), new THREE.MeshBasicMaterial({ map: sootT, transparent: true, depthWrite: false })); m.position.set(P.position.x + dx, P.position.y + dy, P.position.z + 0.02); m.rotation.z = rr(0, 3); g.add(m); m.userData = { dirt: 1, panel: P.userData.key }; B.soot.push(m); } }
  // flat tyre (rear) + nail + valve
  B.psi = job.tasks.includes('tyre') ? 4 : D.psi; B.tyreState = job.tasks.includes('tyre') ? 'nail' : 'done'; B.overs = 0;
  { const sq = B.wr.sq; const nail = new THREE.Group(); nail.position.set(Math.cos(-0.9) * (R - 0.05), Math.sin(-0.9) * (R - 0.05), 0.11); sq.add(nail); M(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), toon('#9ca3af'), 0, 0, 0.02, nail, 0.004).rotation.x = Math.PI / 2; M(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 10), toon('#6b7280'), 0, 0, 0.1, nail, 0.004).rotation.x = Math.PI / 2; B.nail = nail; nail.visible = B.tyreState === 'nail';
    const v = new THREE.Group(); v.position.set(0, R - 0.2, 0.08); B.wr.sp.add(v); M(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 6), toon('#201e1d'), 0, 0.03, 0.02, v, 0.004); const vc = M(new THREE.CylinderGeometry(0.024, 0.024, 0.04, 8), yel(toon), 0, 0.09, 0.02, v, 0.004); B.valve = v; }
  // truing: a red mark on the front rim, a yellow gauge finger on the fork
  B.wobble = job.tasks.includes('true') ? 0.16 : 0; B.trueHits = 0; B.trueMiss = 0; B.markA = rr(0, 6);
  { const mk = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0xec3013 })); mk.position.set(Math.cos(B.markA) * (R - 0.19), Math.sin(B.markA) * (R - 0.19), 0.04); B.wf.sp.add(mk); B.mark = mk; mk.visible = B.wobble > 0;
    const gauge = new THREE.Group(); gauge.position.set(xf, R + R - 0.12, 0.16); g.add(gauge); M(new THREE.BoxGeometry(0.03, 0.22, 0.03), toon('#f2c94c'), 0, 0.14, 0, gauge, 0.005); const tip = M(new THREE.ConeGeometry(0.04, 0.08, 8), toon('#f2c94c'), 0, 0.01, 0, gauge, 0.005); tip.rotation.z = Math.PI; B.gauge = gauge; gauge.visible = B.wobble > 0;
    const gr = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.1, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthTest: false })); gr.renderOrder = 22; gr.position.set(0, -0.06, 0.08); gauge.add(gr); B.gRing = gr; }
  // tune: rpm, the green-band clock
  B.rpm = 0; B.tuneT = 0; B.tuneBad = 0; B.tuneOut = 0; B.tuned = !job.tasks.includes('tune');
  B.panels.forEach(p => p.userData.dents = () => B.dents.filter(d => d.userData.panel === p.userData.key && d.userData.hits < 99).length);
  return B;
  function yel(t) { return t('#f2c94c'); }
}
function plugMesh(toon, addOutline, kind) { const g = new THREE.Group(), add = (geo, c, z) => { const m = new THREE.Mesh(geo, toon(c)); m.rotation.x = Math.PI / 2; m.position.z = z; addOutline(m, 0.004); g.add(m); return m; };
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 10), kind === 'old' ? '#3a3034' : '#9ca3af', 0.02); add(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 6), kind === 'old' ? '#5a4a3a' : '#d7dde3', 0.08); add(new THREE.CylinderGeometry(0.035, 0.03, 0.14, 12), kind === 'old' ? '#c8b89a' : '#fbfbf7', 0.17);
  if (PLUGS[kind]) add(new THREE.CylinderGeometry(0.037, 0.037, 0.03, 12), PLUGS[kind].col, 0.15); return g; }

// ---------------- the stand-alone game ----------------
export async function createBikeShop({ container, onState = () => {} }) {
  const ST = createStage(container, { bg: '#241614' }), { CW, CHh, renderer, scene, camera, glowTex, V3, toon, addOutline, M, kit, audio, tone, puff, smokeS } = ST;
  scene.fog = new THREE.Fog('#2a1814', 30, 70);
  const Y = buildBikeShop({ THREE, M, toon, canvasTex, scene, grad: ST.grad, addOutline });
  { const pl = new THREE.PointLight(0xff8a3a, 1.4, 14, 1.6); pl.position.set(-8, 2.4, -0.5); scene.add(pl); Y.doorLight = pl; }
  // ---------- cast ----------
  const strip = f => { const P = f.userData.P; if (P.sword) P.sword.visible = false; if (P.gun) P.gun.visible = false; scene.add(f); return f; };
  const sandy = { ...CAST.player.look, fur: '#e8a355', furDark: '#b8762c', muzzle: '#ffe6c2', ear: '#0f172a', paw: '#dd9648', tailBase: '#dd9648', tailMid: '#ffdcae' };
  const sparrow = strip(kit.makeFox({ ...CAST.player, look: sandy, torso: ['#9fb0c8', '#5c718f', '#232c3c'], outfit: 'vest', crest: '', gear: 'none', mood: 'happy' }));
  const lucius = strip(kit.makeFox({ ...CAST.player, look: { ...CAST.player.look, fur: '#c9682a', furDark: '#8a4213' }, torso: ['#5a1a12', '#201e1d', '#ec3013'], outfit: 'coat', crest: '', gear: 'none', mood: 'stern' }));
  const cobb = strip(kit.makeFox({ ...CAST.player, look: { ...sandy, fur: '#fbc98a', furDark: '#e8a355' }, torso: ['#cfd6e4', '#7c8aa0', '#2b3240'], outfit: 'tee', bow: true, crest: '', gear: 'none', mood: 'curious' }));
  const ben = strip(kit.makeFox({ ...CAST.player, outfit: 'tee', torso: ['#201e1d', '#201e1d', '#ec3013'], crest: '', gear: 'none', mood: 'happy' })); const BP = ben.userData.P;
  const NPC = { sparrow: { f: sparrow, name: 'SPARROW' }, lucius: { f: lucius, name: 'LUCIUS' }, cobb: { f: cobb, name: 'COBB' } };
  const place = (f, s, ry = 0) => { f.position.set(s.x, 0, s.z); f.rotation.y = ry; };
  const home = () => { place(ben, Y.spots.ben, -0.2); place(sparrow, Y.spots.sparrow, 0.35); place(lucius, Y.spots.lucius, -Math.PI / 2); place(cobb, Y.spots.cobb, 0.4); }; home();
  const uniform = (() => { const print = canvasTex(256, 256, g => { g.clearRect(0, 0, 256, 256); g.save(); g.translate(128, 96); g.strokeStyle = '#ec3013'; g.lineWidth = 12; g.beginPath(); g.arc(0, 0, 58, 0, 7); g.stroke(); g.fillStyle = '#ffd23a'; g.font = '900 84px Archivo, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('L', 0, 4); g.restore();
      g.save(); g.translate(128, 196); g.rotate(-0.05); g.fillStyle = '#ec3013'; g.fillRect(-124, -26, 248, 52); g.font = 'italic 900 38px Archivo, "Arial Black", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fbf8ec'; g.fillText('BIKE SHOP', 0, 2); g.restore(); });
    const U = dinerUniform(ST, ben, { print, printY: 1.17, stripe: '#ec3013', towelCol: '#3a3836' }), hat = U.hat, hs = BP.head.scale.x || 1;
    while (hat.children.length) hat.remove(hat.children[0]); hat.scale.setScalar(hs); hat.position.y -= 0.1 * hs;
    M(new THREE.SphereGeometry(0.31, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#ec3013'), 0, 0, -0.02, hat, 0.012); for (let i = 0; i < 6; i++) M(new THREE.SphereGeometry(0.03, 6, 4), toon('#fbf8ec'), Math.cos(i) * 0.2, 0.12 + (i % 2) * 0.06, Math.sin(i) * 0.2, hat, 0);
    { const k = new THREE.Group(); k.position.set(0, 0.04, -0.3); hat.add(k); for (const s of [-1, 1]) { const t = M(new THREE.BoxGeometry(0.06, 0.2, 0.03), toon('#ec3013'), s * 0.05, -0.1, 0, k, 0.005); t.rotation.z = s * 0.35; } }
    return U.parts; })();
  const crestSlots = []; ben.traverse(m => { if (m.isMesh && Array.isArray(m.material) && m.material[1] && m.material[1].map) crestSlots.push(m); });
  const setUniform = on => { uniform.forEach(p => p.visible = on); crestSlots.forEach(m => m.visible = !on); }; setUniform(true);
  const riderFox = RIDERS.map(o => { const f = strip(kit.makeFox({ ...CAST.player, look: o.fur ? { ...CAST.player.look, fur: o.fur, furDark: o.furDark } : CAST.player.look, torso: o.torso, outfit: o.outfit || 'armor', crest: '', gear: 'none', mood: 'happy' })); f.visible = false; return f; });

  // ---------- state ----------
  const S = { phase: 'intro', day: Math.max(1, save.stat(SAVE.day, 1)), bikeN: 0, earned: 0, tips: 0, starList: [], tool: null, flash: null, flashT: 0, say: '', sayT: 0, hold: null, ptr: null, react: null, done: null, phT: 0, confirm: 0, talk: null, goal: null, near: null, keys: new Set() };
  const upg = id => !!save.stat(SAVE.upg + id, 0);
  const flash = (txt, col = '#ffd23a', t = 1.4) => { S.flash = { txt, col }; S.flashT = t; }, say = (s, t = 3.5) => { S.say = s; S.sayT = t; };
  let B = null, rider = null, RID = null, lastRider = -1;
  const wp = o => o.getWorldPosition(new THREE.Vector3());
  function newJob() { const d = S.day, type = S.forceType || pick(['dirt', 'street', 'chopper']), D = BIKES[type];
    const pool = D.tasks.slice(), n = Math.min(pool.length, d <= 1 ? 3 : d <= 2 ? 4 : d <= 4 ? 4 + (Math.random() < 0.5 ? 1 : 0) : 5 + (Math.random() < 0.5 ? 1 : 0)), tasks = [];
    if (Math.random() < 0.75) tasks.push('tyre'); if (n >= 3 && Math.random() < 0.6) tasks.push('tune'); while (tasks.length < n) tasks.push(pick(pool.filter(q => !tasks.includes(q))));
    if (S.forceType) { tasks.length = 0; tasks.push(...pool); } tasks.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    let ri; do { ri = Math.floor(Math.random() * RIDERS.length); } while (ri === lastRider); lastRider = ri; const rd = RIDERS[ri];
    return { type, tasks, col: type === 'dirt' ? pick(['#f2c94c', '#2f9a8f', '#ec3013']) : type === 'street' ? pick(['#ec3013', '#1f3a5f', '#f2c94c']) : pick(['#1f3a5f', '#201e1d', '#8f2b1e']), num: String(pick([3, 7, 8, 11, 13, 21, 27, 42, 66, 88])), plug: pick(PLK), rider: ri, day: d, line: pick(HELLO) }; }
  function nextBike() { if (B) { scene.remove(B.g); B = null; } const job = newJob(); B = makeBike(ST, job.type, job); RID = RIDERS[job.rider]; rider = riderFox[job.rider]; riderFox.forEach(f => f.visible = f === rider); B.g.position.set(Y.spots.rollIn.x, 0, -0.5); S.phase = 'arrive'; S.phT = 0; S.tool = null; S.confirm = 0; S.doneSeen = {}; Y.shutterOpen = 1; engine(0.3); }
  const seatOf = () => V3(-0.42, B.seatTop - 0.72, 0);
  // engine sound: a low sawtooth pulse train while riding / tuning
  let engT = 0; function engine(k) { engT -= 1 / 60; if (engT > 0) return; engT = 0.07; tone(55 + k * 140, 0.08, 0.02 + k * 0.02, 'sawtooth'); }

  // ---------- task progress ----------
  const linkNeed = () => upg('oiler') ? 2 : 3, dentNeed = () => upg('mallet') ? 2 : 3, psiTol = () => upg('gauge') ? 5 : 3, trueWin = () => upg('spoke') ? 0.42 : 0.28;
  function info(id) { if (!B) return { done: false, q: 0, prog: 0 };
    if (id === 'tyre') { const done = B.tyreState === 'done', diff = Math.abs(B.psi - B.D.psi); return { done, q: done ? Math.max(0.5, (diff <= 1.5 ? 1 : diff <= 3 ? 0.85 : 0.7) - B.overs * 0.1) : 0, prog: B.tyreState === 'nail' ? 0 : done ? 1 : 0.5 + 0.5 * Math.min(1, B.psi / B.D.psi), txt: done ? 'DONE' : B.tyreState === 'nail' ? 'NAIL' : Math.round(B.psi) + '/' + B.D.psi }; }
    if (id === 'true') { const done = B.trueHits >= 3; return { done, q: Math.max(0.5, 1 - B.trueMiss * 0.08), prog: B.trueHits / 3, txt: done ? 'DONE' : B.trueHits + ' / 3' }; }
    if (id === 'chain') { const l = B.links.filter(k => k.userData.clean < linkNeed()).length, n = B.links.length; return { done: !l, q: 1, prog: 1 - l / n, txt: l ? Math.round((1 - l / n) * 100) + '%' : 'DONE' }; }
    if (id === 'plug') { const done = B.plugState === 'snug'; return { done, q: Math.max(0.5, 1 - B.plugWrong * 0.25), prog: { old: B.plugTurn / 6, out: 0.4, loose: 0.6 + B.plugTurn / 6, snug: 1 }[B.plugState] || 0, txt: done ? 'DONE' : B.plugState === 'out' ? 'PICK' : B.plugState === 'old' ? 'TWIST' : 'TIGHTEN' }; }
    if (id === 'dents') { const l = B.dents.filter(d => d.userData.hits < dentNeed()).length; return { done: !l, q: 1, prog: B.dents.length ? 1 - l / B.dents.length : 1, txt: l ? l + ' LEFT' : 'DONE' }; }
    if (id === 'polish') { const l = B.soot.filter(s => s.userData.dirt > 0).length; return { done: !l, q: 1, prog: B.soot.length ? 1 - l / B.soot.length : 1, txt: l ? l + ' LEFT' : 'DONE' }; }
    if (id === 'tune') { return { done: B.tuned, q: Math.max(0.5, 1 - B.tuneBad * 0.15 - Math.min(0.3, B.tuneOut * 0.04)), prog: Math.min(1, B.tuneT / 3), txt: B.tuned ? 'DONE' : Math.round(Math.min(1, B.tuneT / 3) * 100) + '%' }; }
    return { done: true, q: 1 }; }
  const allDone = () => B && B.job.tasks.every(t => info(t).done);
  const nextTask = () => B && B.job.tasks.find(t => !info(t).done);
  function setTool(id) { if (S.phase !== 'work' || !B || !B.job.tasks.includes(id)) return; S.tool = id; S.userToolT = performance.now(); S.ptr = null; S.hold = null; }
  function checkDone() { if (!B) return; for (const t of B.job.tasks) { const I = info(t); if (I.done && !S.doneSeen[t]) { S.doneSeen[t] = 1; flash(TASKS[t].label + ' DONE ✓', '#22c55e', 1.4); tone(1175, 0.1, 0.05); setTimeout(() => tone(1568, 0.14, 0.05), 110); const p = wp(B.g); for (let i = 0; i < 6; i++) puff(p.x + rr(-1.2, 1.2), p.y + rr(0.4, 1.4), 0.6, 0xffe7a0, 1);
        if (t === 'polish') B.decal.userData.fade = 1;
        const nx = nextTask(); if (!nx) say('SPARROW: "Clean. Hand it back to ' + RID.name + '."', 4); else { const was = S.tool; setTimeout(() => { if (S.phase === 'work' && S.tool === was && !S.ptr && !S.hold) S.tool = nx; }, 1100); } } } }

  // ---------- actions ----------
  const scale = () => Math.min(1.6, Math.max(0.85, Math.min(CW(), CHh()) / 420));
  const scr = p => { const v = p.clone().project(camera); return { x: (v.x + 1) / 2 * CW(), y: (1 - v.y) / 2 * CHh(), z: v.z }; };
  const near = (obj, x, y, r) => { const s = scr(wp(obj)); return Math.hypot(s.x - x, s.y - y) < r * scale(); };
  // TYRE
  function nailPull(h) { if (B.tyreState !== 'nail') return; B.tyreState = 'air'; B.nailFly = { t: 0, m: B.nail }; tone(1500, 0.06, 0.05, 'square'); tone(400, 0.2, 0.03); flash('NAIL OUT · PLUG IN · NOW HOLD TO FILL TO ' + B.D.psi + ' PSI', '#22c55e', 2); const p = wp(B.nail); puff(p.x, p.y, p.z + 0.1, 0xdddddd, 3); }
  function airStart() { if (B.tyreState !== 'air') return; S.hold = { kind: 'air', bleed: B.psi > B.D.psi + psiTol() }; tone(S.hold.bleed ? 300 : 500, 0.15, 0.03, 'sine'); }
  function airEnd() { const d = B.psi - B.D.psi, tol = psiTol(); S.hold = null;
    if (Math.abs(d) <= tol) { B.tyreState = 'done'; flash(Math.abs(d) <= 1.5 ? 'PERFECT · ' + Math.round(B.psi) + ' PSI!' : 'GOOD · ' + Math.round(B.psi) + ' PSI', Math.abs(d) <= 1.5 ? '#22c55e' : '#e6b45a', 1.4); if (Math.abs(d) <= 1.5) say('SPARROW: "' + B.D.psi + '. Not ' + (B.D.psi - 1) + '. ' + B.D.psi + '. Good."', 3); tone(1320, 0.1, 0.04); checkDone(); }
    else if (d > tol) { B.overs++; flash('TOO HIGH · HOLD AGAIN TO LET AIR OUT', '#ec3013', 1.8); tone(220, 0.15, 0.04, 'sawtooth'); }
    else flash('KEEP GOING · HOLD AGAIN', '#ffffff', 1.1); }
  // TRUE
  const markAngle = () => { const a = B.markA + B.wf.sp.rotation.z; let d = ((a - Math.PI / 2) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; return d; };
  function trueTap() { if (B.trueHits >= 3) return; const d = Math.abs(markAngle());
    if (d < trueWin()) { B.trueHits++; B.wobble *= 0.45; if (B.trueHits >= 3) B.wobble = 0; tone(900 + B.trueHits * 200, 0.08, 0.05, 'square'); flash(d < 0.12 ? 'PERFECT TWEAK' : 'GOOD TWEAK', d < 0.12 ? '#22c55e' : '#e6b45a', 0.9); const p = wp(B.gauge); puff(p.x, p.y, p.z + 0.1, 0xffe7a0, 2); if (B.trueHits >= 3) { B.mark.visible = false; B.gauge.visible = false; checkDone(); } }
    else { B.trueMiss++; tone(200, 0.1, 0.04, 'sawtooth'); flash('WAIT FOR THE RED MARK', '#ffffff', 0.8); } }
  // CHAIN
  function chainAt(x, y) { const now = performance.now(); let hit = false; for (const k of B.links) { const U = k.userData; if (U.clean >= linkNeed() || now - U.last < 160 || !near(k, x, y, 26)) continue; U.last = now; U.clean++; hit = true; const c = U.clean / linkNeed(); k.material.color.set('#a0522d').lerp(new THREE.Color(c < 1 ? '#3a3034' : '#e5e7eb'), c < 1 ? c * 1.2 : 1); if (U.clean >= linkNeed()) { const p = wp(k); puff(p.x, p.y, p.z + 0.05, 0xffffff, 1); } }
    if (hit) { if (Math.random() < 0.4) tone(1200 + Math.random() * 400, 0.03, 0.03, 'square'); checkDone(); } }
  // PLUG
  function twistMove(x, y) { const c = scr(wp(B.plug)), a = Math.atan2(y - c.y, x - c.x), P = S.ptr; if (Math.hypot(x - c.x, y - c.y) < 10) return; if (P.ang == null) { P.ang = a; return; } let d = a - P.ang; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; P.ang = a; const add = Math.abs(d) / (Math.PI * 2) * 4;
    if (B.plugState === 'old' || B.plugState === 'loose') { B.plugTurn = Math.min(6, B.plugTurn + add); B.plug.rotation.z += (B.plugState === 'old' ? -1 : 1) * Math.abs(d) * 1.5; B.plug.position.z = B.plugBase.z + (B.plugState === 'old' ? B.plugTurn / 6 : 1 - B.plugTurn / 6) * 0.08; if (Math.random() < 0.25) tone(600 + B.plugTurn * 80, 0.03, 0.03, 'square');
      if (B.plugTurn >= 6) { if (B.plugState === 'old') { B.plugState = 'out'; B.plugTurn = 0; B.plugFly = { t: 0, m: B.plug }; flash('OLD PLUG OUT · CARD SAYS ' + PLUGS[B.job.plug].name + ' · PICK IT BELOW', '#ffffff', 2); tone(300, 0.2, 0.04); } else { B.plugState = 'snug'; flash('SNUG ✓', '#22c55e', 1); tone(1320, 0.1, 0.05); checkDone(); } S.ptr && (S.ptr.kind = null); } } }
  function pickPlug(k) { if (!B || B.plugState !== 'out') return; if (k !== B.job.plug) { B.plugWrong++; flash(PLUGS[k].name + ' PLUG IS WRONG · CARD SAYS ' + PLUGS[B.job.plug].name, '#ec3013', 1.6); tone(180, 0.2, 0.05, 'sawtooth'); return; }
    const p = plugMesh(toon, addOutline, k); p.position.copy(B.plugBase); p.position.z += 0.08; B.g.add(p); B.plug = p; B.plugState = 'loose'; B.plugTurn = 0; tone(990, 0.1, 0.05); flash('NOW TWIST IT IN', '#22c55e', 1.2); }
  // DENTS
  function dentTap(x, y) { const d = B.dents.find(q => q.userData.hits < dentNeed() && near(q, x, y, 40)); if (!d) { flash('TAP A DENT', '#ffffff', 0.8); return; } const U = d.userData; U.hits++; const k = 1 - U.hits / dentNeed(); U.ring.material.opacity = 0.7 * k; U.dim.scale.setScalar(Math.max(0.01, k)); U.gl.material.opacity = 0.9 * k; d.scale.setScalar(1 + 0.25 * Math.sin(U.hits)); tone(1400 + Math.random() * 300, 0.04, 0.05, 'square'); tone(180, 0.06, 0.04); const p = wp(d); puff(p.x, p.y, p.z + 0.05, 0xffffff, 1); S.hammer = 0.15; if (U.hits >= dentNeed()) { d.visible = false; flash('DENT OUT', '#22c55e', 0.7); checkDone(); } }
  // POLISH
  function polishAt(x, y, dist) { const s = B.soot.find(q => q.userData.dirt > 0 && near(q, x, y, 60)); if (!s) return; const blocked = B.dents.some(d => d.userData.panel === s.userData.panel && d.userData.hits < dentNeed());
    if (blocked) { if (performance.now() - (S.warnT || 0) > 1500) { S.warnT = performance.now(); flash('HAMMER THE DENTS HERE FIRST', '#ec3013', 1.4); tone(220, 0.15, 0.04, 'sawtooth'); } return; }
    const U = s.userData; U.dirt = Math.max(0, U.dirt - dist / 380); s.material.opacity = U.dirt; if (Math.random() < 0.2) { const p = wp(s); puff(p.x + rr(-0.1, 0.1), p.y, p.z + 0.08, 0x8a7a70, 1); } if (Math.random() < 0.15) tone(2000 + Math.random() * 800, 0.03, 0.015, 'sine');
    if (U.dirt <= 0) { s.visible = false; tone(1760, 0.08, 0.04); const p = wp(s); for (let i = 0; i < 4; i++) puff(p.x + rr(-0.15, 0.15), p.y + rr(-0.1, 0.1), p.z + 0.1, 0xffffff, 1); checkDone(); } }
  // TUNE
  const band = () => { const t = performance.now() / 1000, w = upg('dyno') ? 0.22 : 0.18, c = 0.58 + Math.sin(t * 0.9) * 0.14; return [c - w / 2, c + w / 2]; };
  function tuneStart() { if (B.tuned) return; const need = ['plug', 'chain'].filter(t => B.job.tasks.includes(t) && !info(t).done); if (need.length) { flash('DO ' + need.map(t => TASKS[t].label).join(' + ') + ' FIRST', '#ec3013', 1.6); tone(220, 0.15, 0.04, 'sawtooth'); return; } S.hold = { kind: 'tune' }; }

  // ---------- walking (when not on a job) ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const floorAt = (x, y) => { ndc.set(x / CW() * 2 - 1, -(y / CHh()) * 2 + 1); ray.setFromCamera(ndc, camera); const p = new THREE.Vector3(); return ray.ray.intersectPlane(floorPlane, p) ? p : null; };
  const npcAt = (x, y) => { ndc.set(x / CW() * 2 - 1, -(y / CHh()) * 2 + 1); ray.setFromCamera(ndc, camera); let best = null, bd = 1e9; for (const k in NPC) { const h = ray.intersectObject(NPC[k].f, true)[0]; if (h && h.distance < bd) { bd = h.distance; best = k; } } if (!best) { const h = ray.intersectObject(Y.liftTop, true)[0]; if (h) best = 'sparrow'; } return best; };
  function collide(p, r = 0.38) { const b = Y.bounds; p.x = clamp(p.x, b.x0, b.x1); p.z = clamp(p.z, b.z0, b.z1);
    for (const c of Y.colliders) { const cx = clamp(p.x, c.x0, c.x1), cz = clamp(p.z, c.z0, c.z1), dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz); if (d < r) { if (d < 1e-4) { const ox = Math.min(p.x - c.x0, c.x1 - p.x), oz = Math.min(p.z - c.z0, c.z1 - p.z); if (ox < oz) p.x = p.x - c.x0 < c.x1 - p.x ? c.x0 - r : c.x1 + r; else p.z = p.z - c.z0 < c.z1 - p.z ? c.z0 - r : c.z1 + r; } else { p.x = cx + dx / d * r; p.z = cz + dz / d * r; } } }
    for (const k in NPC) { const f = NPC[k].f; if (!f.visible) continue; const dx = p.x - f.position.x, dz = p.z - f.position.z, d = Math.hypot(dx, dz); if (d < 0.75 && d > 1e-4) { p.x = f.position.x + dx / d * 0.75; p.z = f.position.z + dz / d * 0.75; } } }
  function walkTo(x, z, then = null) { S.goal = { x, z, then }; }
  function walkStep(dt) { let mx = 0, mz = 0; const K = S.keys; if (K.has('KeyW') || K.has('ArrowUp')) mz -= 1; if (K.has('KeyS') || K.has('ArrowDown')) mz += 1; if (K.has('KeyA') || K.has('ArrowLeft')) mx -= 1; if (K.has('KeyD') || K.has('ArrowRight')) mx += 1;
    if (mx || mz) S.goal = null; else if (S.goal) { const dx = S.goal.x - ben.position.x, dz = S.goal.z - ben.position.z, d = Math.hypot(dx, dz); if (d < (S.goal.then ? 0.5 : 0.15)) { const th = S.goal.then; S.goal = null; if (th) th(); } else { mx = dx / d; mz = dz / d; if (d < 0.6) { mx *= d / 0.6; mz *= d / 0.6; } } }
    const m = Math.hypot(mx, mz), sp = 3.4; let speed = 0;
    if (m > 0.01) { const k = Math.min(1, m); const before = ben.position.clone(); ben.position.x += mx / m * sp * k * dt; ben.position.z += mz / m * sp * k * dt; collide(ben.position); speed = before.distanceTo(ben.position) / dt; const want = Math.atan2(mx, mz); let dr = want - ben.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); ben.rotation.y += dr * Math.min(1, dt * 12); if (S.goal && speed < 0.3 && !S.goal.then) S.goal.stuck = (S.goal.stuck || 0) + dt; if (S.goal && S.goal.stuck > 0.4) S.goal = null; }
    kit.animFox(ben, dt, speed);
    // nearest person to talk to
    let nb = null, nd = 2.3; for (const k in NPC) { const f = NPC[k].f, d = Math.hypot(f.position.x - ben.position.x, f.position.z - ben.position.z); if (d < nd) { nd = d; nb = k; } } S.near = nb;
    for (const k in NPC) NPC[k].f.userData.lookAt = Math.hypot(NPC[k].f.position.x - ben.position.x, NPC[k].f.position.z - ben.position.z) < 4 ? ben.position.clone().add(V3(0, 1.6, 0)) : null;
    // the door to the square
    for (const e of Y.exits) if (Math.hypot(ben.position.x - e.x, ben.position.z - e.z) < e.r + 0.3) { if (performance.now() - (S.exitT || 0) > 3000) { S.exitT = performance.now(); flash('THE DOOR TO ' + e.label.toUpperCase() + ' · IN THE WORLD THIS FADES OUT', '#ffd23a', 2.4); } ben.position.z = Math.min(ben.position.z, e.z - e.r - 0.35); S.goal = null; } }
  function lookAround() { if (S.phase !== 'intro' && S.phase !== 'done') return; audio.init && audio.init(); S.phase = 'walk'; S.done = null; S.talk = null; setUniform(!!save.flag('bikeUniform')); home(); ben.position.set(Y.spots.door.x, 0, Y.spots.door.z - 0.6); ben.rotation.y = Math.PI; save.where && save.where(BIKESHOP.world, BIKESHOP.room); flash('TAP THE FLOOR TO WALK · TAP SOMEONE TO TALK', '#ffd23a', 3); }
  // ---------- talk (lines from the 2D Luxor file; Sparrow's job lines are new) ----------
  function talkTo(k) { if (S.phase !== 'walk' || S.talk) return; const f = NPC[k].f; S.goal = null; ben.rotation.y = Math.atan2(f.position.x - ben.position.x, f.position.z - ben.position.z); f.userData.lookAt = ben.position.clone().add(V3(0, 1.6, 0)); f.userData.talking = true; let lines, choices = [];
    if (k === 'sparrow') { lines = [['npc', 'Anything with wheels. Anything without, try the armory.']]; choices = [{ label: 'Put me to work.', go: () => { endTalk(); toIntro(); } }, { label: 'Tyre pressure?', go: () => { S.talk.lines = [['npc', 'Everybody gets it wrong. Dirt bike, twenty. Chopper, thirty. Street, thirty-six.'], ['npc', 'Not thirty-five. Thirty-six. I will check.']]; S.talk.i = 0; S.talk.choices = [{ label: 'Got it.', go: endTalk }]; } }, { label: 'Bye.', go: endTalk }]; }
    else if (k === 'lucius') { lines = save.flag('gang.bikers') ? [['npc', 'There he is. Colours on the arm and everything.'], ['npc', 'Anything on that shelf is yours at what it cost me, not what it costs them.'], ['npc', 'And no, we did not take the crystal. Half of us cannot get up the castle road without being stopped twice.'], ['npc', 'But something came DOWN out of the sky over the red plains a fortnight back, and it did not land like a ship lands. Cobb saw it. Ask him.']] : [['npc', 'Parts, tyres, or are you here to look?'], ['player', 'I hear the Run keeps this counter.'], ['npc', 'The Run IS this counter. And before you ask — you do not join by asking. Win all three circuits, or go into that mountain and bring Kelm’s bike out onto the plains on its own wheels.'], ['npc', 'Either one tells me the same thing about you.']];
      choices = [{ label: 'Spare Cell · 11g', go: () => buy('energyPod', 11, 'SPARE CELL') }, { label: 'Riding Leathers · 50g', go: () => buy('gear.reinforced', 50, 'RIDING LEATHERS', true) }, { label: 'Bye.', go: endTalk }]; }
    else lines = save.flag('gang.bikers') ? [['npc', 'You want to know about the lights. Everyone wants to know about the lights.'], ['npc', 'Red plains, fortnight back, middle of the night. Something came down and there was no sound. Not a quiet sound. NO sound.'], ['npc', 'I went out at dawn and there was nothing there, and the grass was flat in a ring forty across.']] : [['npc', 'Do not touch the pad, I have just trued that wheel.']];
    S.talk = { k, name: NPC[k].name, lines, i: 0, choices: choices.length ? choices : null }; tone(660, 0.06, 0.03); }
  function buy(id, cost, name, gear) { const disc = save.flag('gang.bikers') ? 0 : 0; if (gear && save.flag(id)) { flash('YOU ALREADY OWN ' + name, '#ffffff'); return; } if (!save.spend(cost - disc)) { flash('NOT ENOUGH GOLD · ' + cost + 'g', '#ec3013'); tone(200, 0.15, 0.04, 'sawtooth'); return; } if (gear) save.setFlag(id); else save.give(id); flash(name + ' · BOUGHT', '#22c55e', 1.6); tone(1320, 0.1, 0.05); }
  function endTalk() { if (!S.talk) return; NPC[S.talk.k].f.userData.talking = false; S.talk = null; }
  function talkNext() { const T = S.talk; if (!T) return; if (T.i < T.lines.length - 1) { T.i++; tone(560, 0.04, 0.02); return; } if (!T.choices) endTalk(); }
  function talkChoose(i) { const T = S.talk; if (!T || !T.choices || T.i < T.lines.length - 1) return; const c = T.choices[i]; c && c.go(); }
  function talkNear() { if (S.phase === 'walk' && S.near && !S.talk) talkTo(S.near); }

  // ---------- input ----------
  const local = e => { const r = renderer.domElement.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function onDown(e) { audio.init && audio.init(); S.lastInput = performance.now(); if (DM.on) return; const { x, y } = local(e); e.preventDefault();
    if (S.phase === 'walk') { if (S.talk) { talkNext(); return; } const k = npcAt(x, y); if (k) { const s = Y.npcTalk[k]; walkTo(s.x, s.z, () => talkTo(k)); return; } const p = floorAt(x, y); if (p) { walkTo(p.x - Y.root.position.x, p.z - Y.root.position.z); S.ptr = { x, y, kind: 'steer' }; } return; }
    if (S.phase !== 'work' || !B || S.hold) return; const T = S.tool; S.ptr = { x, y, kind: null, t: performance.now() };
    if (T === 'tyre') { if (B.tyreState === 'nail') { if (near(B.nail, x, y, 70)) { S.ptr.kind = 'nail'; S.ptr.d = 0; } else flash('DRAG THE NAIL OUT OF THE TYRE', '#ffffff', 1); } else if (B.tyreState === 'air') airStart(); }
    else if (T === 'true') trueTap();
    else if (T === 'chain') { S.ptr.kind = 'chain'; chainAt(x, y); }
    else if (T === 'plug') { if (B.plugState === 'old' || B.plugState === 'loose') { S.ptr.kind = 'twist'; S.ptr.ang = null; } else if (B.plugState === 'out') flash('PICK THE ' + PLUGS[B.job.plug].name + ' PLUG BELOW', '#ffffff', 1); }
    else if (T === 'dents') dentTap(x, y);
    else if (T === 'polish') { S.ptr.kind = 'polish'; polishAt(x, y, 10); }
    else if (T === 'tune') tuneStart(); }
  function onMove(e) { const P = S.ptr; if (!P || !P.kind) return; const { x, y } = local(e), d = Math.hypot(x - P.x, y - P.y); if (d < 1) return;
    if (P.kind === 'steer') { const p = floorAt(x, y); if (p && S.phase === 'walk') walkTo(p.x - Y.root.position.x, p.z - Y.root.position.z); }
    else if (P.kind === 'nail') { P.d += d; B.nail.position.z = 0.11 + Math.min(0.1, P.d / 900); if (P.d > 70 * scale()) { nailPull(); P.kind = null; } }
    else if (P.kind === 'chain') { const n = Math.ceil(d / 10); for (let i = 1; i <= n; i++) chainAt(P.x + (x - P.x) * i / n, P.y + (y - P.y) * i / n); }
    else if (P.kind === 'twist') twistMove(x, y);
    else if (P.kind === 'polish') polishAt(x, y, d);
    P.x = x; P.y = y; }
  function onUp() { if (S.hold) { if (S.hold.kind === 'air') airEnd(); else if (S.hold.kind === 'tune') S.hold = null; } S.ptr = null; }
  const onKD = e => { if (/INPUT|TEXTAREA/.test(e.target.tagName)) return; if (S.phase !== 'walk') return; if (/^(Key[WASDE]|Arrow)/.test(e.code)) e.preventDefault(); if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') { if (S.talk) talkNext(); else talkNear(); return; } if (S.talk && /^Digit[1-3]$/.test(e.code)) { talkChoose(+e.code.slice(5) - 1); return; } S.keys.add(e.code); };
  const onKU = e => S.keys.delete(e.code);
  renderer.domElement.addEventListener('pointerdown', onDown); addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp); addEventListener('keydown', onKD); addEventListener('keyup', onKU);

  // ---------- flow ----------
  function toIntro() { S.phase = 'intro'; S.done = null; S.talk = null; S.goal = null; setUniform(true); home(); }
  function startDay() { if (S.phase !== 'intro' && S.phase !== 'done' && S.phase !== 'walk') return; audio.init && audio.init(); endTalk(); Object.assign(S, { bikeN: 0, earned: 0, tips: 0, starList: [], done: null, react: null, goal: null }); setUniform(!!save.flag('bikeUniform')); ben.visible = false; place(sparrow, Y.spots.sparrowWork, 0.4); say('SPARROW: "Bike coming in. Read the card. No clock in here, just do it right."', 5); nextBike(); }
  function handBack() { if (S.phase !== 'work' || !B) return; if (!allDone() && performance.now() - S.confirm > 2500) { S.confirm = performance.now(); flash('NOT FINISHED · TAP HAND BACK AGAIN TO SEND IT', '#e6b45a', 2.2); return; } finishJob(); }
  const REACT = { thrilled: { word: 'THRILLED!', col: '#22c55e', mood: 'excited', lines: ['She runs better than new!', 'I could win the Cinder Cup on this.', 'Listen to that engine. LISTEN to it.'] }, happy: { word: 'HAPPY', col: '#7dd3fc', mood: 'happy', lines: ['Nice work. She is ready for the Run.', 'Good as new.', 'Thanks. See you on the track.'] }, okay: { word: 'OKAY', col: '#e6b45a', mood: 'neutral', lines: ['It will do. She still coughs a bit.', 'Hmm. A few things are off.', 'Sparrow would have done better.'] }, grumpy: { word: 'GRUMPY', col: '#ff9a8a', mood: 'sad', lines: ['Half the job is not done!', 'I am walking home in this, am I?', 'This is not what I paid for.'] } };
  function finishJob() { const T = B.job.tasks, qs = T.map(t => { const I = info(t); return I.done ? I.q : I.prog * 0.4; }), q = qs.reduce((a, b) => a + b, 0) / T.length, stars = q >= 0.92 ? 3 : q >= 0.7 ? 2 : 1, level = stars === 3 ? (q >= 0.99 ? 'thrilled' : 'happy') : stars === 2 ? 'okay' : 'grumpy';
    const fixed = T.filter(t => info(t).done).length, pay = B.D.price + fixed * 3, tip = Math.round((level === 'thrilled' ? Math.ceil(pay * 0.4) + 2 : level === 'happy' ? Math.ceil(pay * 0.2) : 0) * (upg('radio') ? 1.25 : 1));
    S.flash = null; S.say = ''; S.earned += pay; S.tips += tip; S.starList.push(stars); const Rc = REACT[level]; rider.userData.mood = Rc.mood; S.react = { word: Rc.word, col: Rc.col, line: pick(Rc.lines), who: RID.name, stars, tip, pay, t: 0, level }; rider.position.set(Y.spots.talk.x, 0, Y.spots.talk.z); rider.rotation.y = 0.6; S.phase = 'react'; S.phT = 0; S.hold = null; S.ptr = null; S.tool = null; B.wheelie = level === 'thrilled';
    tone(level === 'grumpy' ? 260 : 880, 0.18, 0.05, level === 'grumpy' ? 'sawtooth' : 'triangle'); if (stars === 3) { setTimeout(() => tone(1175, 0.1, 0.05), 110); setTimeout(() => tone(1568, 0.16, 0.05), 220); for (let i = 0; i < 10; i++) puff(rider.position.x + rr(-0.4, 0.4), rr(1.4, 2.4), rider.position.z + rr(-0.2, 0.2), 0xffd23a, 1); } }
  function endDay() { S.phase = 'done'; if (B) { scene.remove(B.g); B = null; } riderFox.forEach(f => f.visible = false); ben.visible = true; home();
    const avg = S.starList.length ? S.starList.reduce((a, b) => a + b, 0) / S.starList.length : 0, eod = avg >= 2.67, wage = 8 + S.day * 2, total = wage + S.earned + S.tips; let newDay = false; const unlock = [];
    try { save.addGold(total); save.best(SAVE.best, total); if (avg >= 2) { save.setStat(SAVE.day, S.day + 1); newDay = true; } if (!save.flag('bikeUniform')) { save.setFlag('bikeUniform'); setUniform(true); unlock.push('BIKE SHOP UNIFORM (bandana, rag + tee)'); } if (eod) save.setStat(SAVE.stars, save.stat(SAVE.stars, 0) + 1); } catch (e) {}
    S.done = { day: S.day, fixed: S.starList.length, avg: Math.round(avg * 10) / 10, wage, earned: S.earned, tips: S.tips, total, eod, newDay, unlock, stars: save.stat(SAVE.stars, 0) }; if (newDay) S.day += 1;
    say(eod ? 'SPARROW: "Employee of the day. Lucius is putting it in the ledger."' : avg >= 2 ? 'SPARROW: "Good day. Same time tomorrow."' : 'SPARROW: "Rough one. Slow down and read the card."', 6); }
  function buyUpgrade(id) { const u = UPGRADES.find(q => q.id === id); if (!u || upg(id)) return false; if (!save.spend(u.cost)) { flash('NOT ENOUGH GOLD', '#ec3013'); return false; } save.setStat(SAVE.upg + id, 1); flash(u.name + ' · BOUGHT', '#22c55e', 1.6); tone(1320, 0.1, 0.05); return true; }

  // ---------- camera ----------
  const { SAFE, shotFor } = cameraFit(ST), CAM = { look: V3(0, 1.2, 0) };
  camera.position.set(0, 3.2, 10); camera.lookAt(CAM.look);
  const box = (p, r, out) => { out.push(V3(p.x - r, p.y - r, p.z), V3(p.x + r, p.y + r, p.z)); return out; };
  function shot() { const port = CW() < CHh(), k = port ? 'P' : 'L';
    if (S.phase === 'walk') { const p = ben.position; if (port) return { pos: V3(clamp(p.x * 0.55, -3.5, 3.5), 11.5, Math.min(p.z + 7.6, 11)), look: V3(clamp(p.x * 0.75, -5.5, 5.5), 0, p.z - 2.6) }; return { pos: V3(clamp(p.x * 0.8, -5, 5), 6.4, p.z + 7.2), look: V3(clamp(p.x * 0.9, -6.5, 6.5), 0.6, p.z - 1.0) }; }
    if (S.phase === 'intro' || S.phase === 'done') return shotFor('wide' + k, () => { const o = []; for (const s of [Y.spots.ben, Y.spots.sparrow]) o.push(V3(s.x - 0.5, 0, s.z), V3(s.x + 0.5, 0, s.z), V3(s.x, 2.5, s.z)); o.push(V3(1.4, 2.4, -0.5), V3(-1.6, 0.2, -0.5)); return o; }, 0.14, Math.PI, port ? 0.12 : 0.06);
    if (!B) return shotFor('room' + k, () => [V3(-4, 0, 0), V3(4, 0, 0), V3(0, 3, -2)], 0.2, Math.PI, 0.05);
    if (S.phase === 'arrive') { const p = B.g.position; return { pos: V3(clamp(p.x + 4, -7, 2), 2.6, 6.5), look: V3(clamp(p.x, -9, 0), 1.0, -0.5) }; }
    if (S.phase === 'react') { const f = rider.position; return shotFor('react' + k + B.id, () => [V3(f.x - 0.9, 0.3, f.z), V3(f.x + 0.9, 0.3, f.z), V3(f.x, 2.6, f.z), V3(f.x + 2.2, 1.4, f.z - 1)], 0.12, Math.PI - 0.4, 0.1); }
    const gp = B.g.position, bw = (x, y, z = 0.3) => V3(gp.x + x, gp.y + y, gp.z + z);
    if (S.phase !== 'work' || !S.tool) return shotFor('bike' + k + B.id, () => [bw(-1.8, 0), bw(1.9, 0), bw(0, 1.9), bw(0, -0.4)], 0.18, Math.PI, 0.05);
    const T = S.tool;
    if (T === 'tyre') return shotFor('tyre' + k + B.id, () => [bw(B.xr - 0.65, -0.05), bw(B.xr + 0.75, -0.05), bw(B.xr, 1.2), bw(B.xr, -0.15)], 0.08, Math.PI, 0.08);
    if (T === 'true') return shotFor('true' + k + B.id, () => [bw(B.xf - 0.65, 0), bw(B.xf + 0.7, 0), bw(B.xf, 1.35), bw(B.xf, -0.1)], 0.08, Math.PI, 0.08);
    if (T === 'chain') return shotFor('chain' + k + B.id, () => [bw(B.xr - 0.35, 0.2), bw(0.25, 0.2), bw(B.xr, 0.85), bw(0.1, 0.25)], 0.12, Math.PI, 0.07);
    if (T === 'plug') return shotFor('plug' + k + B.id, () => [bw(-0.35, 0.5), bw(0.85, 0.5), bw(0.25, 1.45), bw(0.25, 0.55)], 0.1, Math.PI - 0.1, 0.1);
    if (T === 'dents' || T === 'polish') return shotFor(T + k + B.id, () => { const o = []; for (const p of B.panels) { const c = wp(p), w = p.geometry.parameters.width / 2 + 0.08, h = p.geometry.parameters.height / 2 + 0.06; o.push(V3(c.x - w, c.y - h, c.z), V3(c.x + w, c.y + h, c.z)); } return o; }, 0.1, Math.PI, 0.07);
    if (T === 'tune') return shotFor('tune' + k + B.id, () => [bw(-1.7, 0), bw(1.9, 0), bw(0, 1.6), bw(-1.5, 0.4)], 0.14, Math.PI - 0.15, 0.05);
    return shotFor('bike' + k + B.id, () => [bw(-1.8, 0), bw(1.9, 0), bw(0, 1.9)], 0.18, Math.PI, 0.05); }

  // ---------- DEMO: autopilot fixes one street bike (every job) with captions; nothing is saved ----------
  const DM = { on: false, cd: 0, cap: '', key: '', seen: {}, holdTo: null };
  const hand = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd23a, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })); hand.scale.setScalar(0.4); hand.visible = false; hand.renderOrder = 40; scene.add(hand);
  const handAt = (p, j = 0) => { hand.visible = true; hand.position.copy(p).add(V3(j, 0, 0.15)); hand.scale.setScalar(0.5); };
  const cap = (id, key, text, wait = 1.8) => { if (DM.seen[id]) return 0; DM.seen[id] = 1; DM.cap = text; DM.key = key; return wait; };
  function demoAct() { if (!B) return 0.5; const T = nextTask();
    if (!T) { DM.cap = 'EVERY JOB DONE: TAP HAND BACK'; DM.key = 'TAP'; hand.visible = false; if (!DM.seen.hand) { DM.seen.hand = 1; return 1.6; } handBack(); return 1; }
    if (S.tool !== T) { setTool(T); DM.cap = 'JOB ' + (B.job.tasks.indexOf(T) + 1) + ' OF ' + B.job.tasks.length + ': TAP ' + TASKS[T].label + ' AT THE BOTTOM'; DM.key = 'TAP'; hand.visible = false; return 1.5; }
    if (T === 'tyre') { if (B.tyreState === 'nail') { const w = cap('nail', 'DRAG', 'DRAG THE NAIL OUT OF THE FLAT TYRE'); if (w) return w; handAt(wp(B.nail)); nailPull(); return 1.2; }
      const w = cap('air', 'HOLD', 'HOLD TO FILL. LET GO WHEN THE NEEDLE HITS ' + B.D.psi + ' PSI', 2.2); if (w) return w; handAt(wp(B.valve)); airStart(); DM.holdTo = { kind: 'air' }; return 0.1; }
    if (T === 'true') { const w = cap('true', 'TAP', 'THE WHEEL SPINS. TAP WHEN THE RED MARK PASSES THE YELLOW GAUGE', 2.4); if (w) return w; if (Math.abs(markAngle()) < 0.1) { handAt(wp(B.gauge)); trueTap(); return 0.5; } return 0.02; }
    if (T === 'chain') { const k = B.links.find(q => q.userData.clean < linkNeed()); const w = cap('chain', 'SWIPE', 'SWIPE THE OILER BACK AND FORTH ALONG THE RUSTY CHAIN'); if (w) return w; handAt(wp(k)); k.userData.last = 0; const s = scr(wp(k)); chainAt(s.x, s.y); return 0.06; }
    if (T === 'plug') { if (B.plugState === 'old' || B.plugState === 'loose') { const w = cap('plug' + B.plugState, 'TWIST', B.plugState === 'old' ? 'TWIST YOUR FINGER ROUND THE PLUG TO UNSCREW IT' : 'NOW TWIST THE NEW PLUG IN'); if (w) return w; handAt(wp(B.plug)); if (!S.ptr || S.ptr.kind !== 'twist') S.ptr = { kind: 'twist', ang: null }; const c = scr(wp(B.plug)); DM.a = (DM.a || 0) + 0.9; twistMove(c.x + Math.cos(DM.a) * 40, c.y + Math.sin(DM.a) * 40); if (B.plugState !== 'old' && B.plugState !== 'loose') S.ptr = null; return 0.05; }
      if (B.plugState === 'out') { const w = cap('pick', PLUGS[B.job.plug].name, 'THE CARD SAYS ' + PLUGS[B.job.plug].name + ': PICK THAT PLUG BELOW', 2.2); if (w) return w; hand.visible = false; pickPlug(B.job.plug); return 1; } return 0.4; }
    if (T === 'dents') { const d = B.dents.find(q => q.userData.hits < dentNeed()); const w = cap('dents', 'TAP', 'TAP EACH DENT TO HAMMER IT FLAT'); if (w) return w; handAt(wp(d)); const s = scr(wp(d)); dentTap(s.x, s.y); return 0.32; }
    if (T === 'polish') { const s = B.soot.find(q => q.userData.dirt > 0); const w = cap('polish', 'RUB', 'RUB THE LAVA SOOT OFF. THE RIDER\'S NUMBER GOES ON AT THE END'); if (w) return w; DM.j = (DM.j || 1) * -1; handAt(wp(s), DM.j * 0.08); const p = scr(wp(s)); polishAt(p.x, p.y, 40); return 0.07; }
    if (T === 'tune') { const w = cap('tune', 'HOLD', 'HOLD THE THROTTLE. KEEP THE NEEDLE IN THE GREEN FOR 3 SECONDS', 2.4); if (w) return w; hand.visible = false; if (!S.hold) tuneStart(); DM.holdTo = { kind: 'tune' }; return 0.1; }
    return 0.5; }
  function demoStep(dt) { if (S.hold && DM.holdTo) { if (DM.holdTo.kind === 'air' && B.psi >= B.D.psi) { DM.holdTo = null; airEnd(); DM.cd = 0.8; } else if (DM.holdTo.kind === 'tune') { const [a, b] = band(); if (B.tuned) { DM.holdTo = null; S.hold = null; DM.cd = 0.8; } else S.hold.lift = B.rpm < (a + b) / 2; } return; }
    hand.scale.setScalar(Math.max(0.3, hand.scale.x - dt * 0.8));
    if (S.phase === 'arrive' || S.phase === 'lift') { DM.cap = 'RIDERS BRING THEIR BIKES IN. SPARROW\'S LIFT RAISES THEM'; DM.key = ''; hand.visible = false; return; }
    if (S.phase === 'react') { DM.cap = 'THE RIDER CHECKS YOUR WORK. CLEAN JOBS EARN STARS AND TIPS'; DM.key = '★'; hand.visible = false; return; }
    if (S.phase === 'lower' || S.phase === 'leave') { DM.cap = 'YOUR TURN! TAP PUT ME TO WORK'; DM.key = 'GO'; return; }
    if (S.phase !== 'work') return; DM.cd -= dt; if (DM.cd > 0) return; DM.cd = demoAct(); }
  function demoStart() { if (DM.on || (S.phase !== 'intro' && S.phase !== 'done' && S.phase !== 'walk')) return; audio.init && audio.init(); DM.on = true; DM.seen = {}; DM.cd = 1.6; DM.holdTo = null; DM.cap = 'WATCH A JOB AT THE LUXOR BIKE SHOP'; DM.key = ''; S.done = null; S.phase = 'intro'; DM.day0 = S.day; S.day = 3; S.forceType = 'street'; startDay(); S.forceType = null; }
  function demoStop() { if (!DM.on) return; DM.on = false; hand.visible = false; S.hold = null; S.ptr = null; S.react = null; S.flash = null; S.day = DM.day0; if (B) { scene.remove(B.g); B = null; } riderFox.forEach(f => f.visible = false); Object.assign(S, { phase: 'intro', done: null, bikeN: 0, earned: 0, tips: 0, starList: [], tool: null }); setUniform(true); ben.visible = true; home(); }

  // ---------- hint ----------
  const RINGS = hintRings(ST);
  function nextHint() { if (S.phase !== 'work' || !B) return null; const T = S.tool, H = (p, text, tool = T, v = true) => ({ p, text, tool, r: 0.16, v });
    if (!T || info(T).done) { const nx = nextTask(); return nx ? { text: 'NEXT · TAP ' + TASKS[nx].label + ' BELOW', tool: nx } : { text: 'ALL DONE · TAP HAND BACK', tool: 'hand' }; }
    if (T === 'tyre') return B.tyreState === 'nail' ? H(wp(B.nail), 'DRAG THE NAIL OUT OF THE TYRE') : { text: S.hold ? (S.hold.bleed ? 'LETTING AIR OUT · LET GO ON ' + B.D.psi : 'FILLING · LET GO ON ' + B.D.psi + ' PSI') : B.psi > B.D.psi + psiTol() ? 'TOO HIGH · HOLD TO LET AIR OUT' : 'HOLD ANYWHERE TO FILL · TARGET ' + B.D.psi + ' PSI', tool: T };
    if (T === 'true') return H(wp(B.gauge), 'TAP WHEN THE RED MARK PASSES THE GAUGE · ' + B.trueHits + ' / 3');
    if (T === 'chain') { const k = B.links.find(q => q.userData.clean < linkNeed()); return H(wp(k), 'SWIPE BACK AND FORTH ALONG THE CHAIN · ' + info(T).txt); }
    if (T === 'plug') return B.plugState === 'out' ? { text: 'PICK THE ' + PLUGS[B.job.plug].name + ' PLUG BELOW', tool: T } : H(wp(B.plug), (B.plugState === 'old' ? 'TWIST ROUND THE PLUG TO UNSCREW IT · ' : 'TWIST THE NEW PLUG IN · ') + Math.round(B.plugTurn / 6 * 100) + '%');
    if (T === 'dents') { const d = B.dents.find(q => q.userData.hits < dentNeed()); return H(wp(d), 'TAP THE DENT TO HAMMER IT · ' + info(T).txt); }
    if (T === 'polish') { const s = B.soot.find(q => q.userData.dirt > 0); return H(wp(s), 'RUB THE SOOT OFF · ' + Math.round((1 - s.userData.dirt) * 100) + '%'); }
    if (T === 'tune') return { text: S.hold ? 'KEEP THE NEEDLE IN THE GREEN · ' + Math.round(Math.min(1, B.tuneT / 3) * 100) + '%' : 'HOLD ANYWHERE FOR THROTTLE', tool: T };
    return null; }
  let HINT = null, hintT = 0;

  // ---------- per-frame ----------
  const clock = new THREE.Clock(); let raf = 0, hudT = 0, PAUSE = false;
  const ridePose = (f, k = 1) => { const P = f.userData.P; P.legs.forEach((l, i) => { l.rotation.x = -1.25 * k; l.rotation.z = (i ? 1 : -1) * 0.25 * k; }); P.arms.forEach((a, i) => { a.rotation.x = -1.35 * k; a.rotation.z = (i ? 1 : -1) * 0.3 * k; }); P.body.rotation.x = 0.35 * k; };
  function step(dt) { const t = clock.elapsedTime; S.phT += dt;
    S.flashT -= dt; if (S.flashT <= 0) S.flash = null; S.sayT -= dt; if (S.sayT <= 0) S.say = '';
    for (const p of smokeS) { if (p.life <= 0) { p.s.material.opacity = 0; continue; } p.life -= dt * 0.8; p.s.position.addScaledVector(p.v, dt); p.s.material.opacity = 0.45 * p.life; p.s.scale.setScalar(0.18 + (1 - p.life) * 0.3); }
    Y.ember.scale.set(1 + Math.sin(t * 7) * 0.08, 0.5 + Math.sin(t * 11) * 0.06, 1); Y.doorLight.intensity = 1.3 + Math.sin(t * 5) * 0.15; Y.volcanoGlow.material.color.setHSL(0.07, 1, 0.5 + Math.sin(t * 2) * 0.08); if (Y.padWheel) Y.padWheel.rotation.z += dt * 2;
    Y.front.forEach(m => m.visible = S.phase === 'walk'); Y.shutter.scale.y = damp(Y.shutter.scale.y, Y.shutterOpen ? 0.06 : 1, 3, dt); Y.shutter.position.y = 3.2 * (1 - Y.shutter.scale.y);
    let liftY = 0;
    if (B) { const g = B.g;
      if (S.phase === 'arrive') { const sp = Math.max(1.2, Math.min(7, -g.position.x * 1.1)); g.position.x = Math.min(0, g.position.x + sp * dt); g.position.y = 0; const r = dt * sp / R; B.wr.sp.rotation.z -= r; B.wf.sp.rotation.z -= r; rider.position.copy(g.localToWorld(seatOf())); rider.rotation.y = Math.PI / 2; engine(0.2 + sp / 14); if (Math.random() < dt * 12) puff(g.position.x + B.exhaust.x, B.exhaust.y, B.exhaust.z - 0.5, 0x8a8a8a, 1); if (g.position.x >= -0.001) { g.position.x = 0; S.phase = 'lift'; S.phT = 0; say(RID.name + ': "' + B.job.line + '"', 4); tone(140, 0.4, 0.03, 'square'); } }
      else if (S.phase === 'lift') { const k = smooth(0, 1, Math.min(1, S.phT / 2.4)); liftY = LIFT_UP * k; const j = Math.min(1, S.phT / 0.9), a = g.localToWorld(seatOf()), b = V3(Y.spots.owner.x, 0, Y.spots.owner.z); rider.position.lerpVectors(a, b, smooth(0, 1, j)); rider.position.y += Math.sin(j * Math.PI) * 0.6; rider.rotation.y = Math.PI / 2 - 0.4; if (Math.random() < dt * 8 && k < 0.95) tone(90 + k * 60, 0.05, 0.015, 'sawtooth'); if (S.phT > 2.5) { S.phase = 'work'; S.tool = B.job.tasks[0]; Y.shutterOpen = 0; tone(880, 0.08, 0.04); } }
      else if (S.phase === 'work') { liftY = LIFT_UP; rider.position.set(Y.spots.owner.x, 0, Y.spots.owner.z); rider.rotation.y = Math.PI / 2 - 0.4; }
      else if (S.phase === 'react') { liftY = LIFT_UP; if (S.react) S.react.t += dt; if (S.phT > 2.8) { S.react = null; S.phase = 'lower'; S.phT = 0; Y.shutterOpen = 1; } }
      else if (S.phase === 'lower') { const k = smooth(0, 1, Math.min(1, S.phT / 2)); liftY = LIFT_UP * (1 - k); if (S.phT > 2.0) { const j = Math.min(1, (S.phT - 2) / 0.7), a = V3(Y.spots.talk.x, 0, Y.spots.talk.z), b = g.localToWorld(seatOf()); rider.position.lerpVectors(a, b, smooth(0, 1, j)); rider.position.y += Math.sin(j * Math.PI) * 0.6; } if (S.phT > 2.8) { S.phase = 'leave'; S.phT = 0; tone(90, 0.6, 0.04, 'sawtooth'); } }
      else if (S.phase === 'leave') { const sp = 1 + S.phT * 5; g.position.x -= dt * sp; const r = dt * sp / R; B.wr.sp.rotation.z += r; B.wf.sp.rotation.z += r; g.rotation.y = Math.PI; g.rotation.z = (B.wheelie ? -Math.min(0.45, S.phT * 0.6) : 0); rider.position.copy(g.localToWorld(seatOf())); rider.rotation.y = -Math.PI / 2; engine(Math.min(1, 0.3 + S.phT * 0.4)); if (Math.random() < dt * 20) puff(g.position.x + 1.3, 0.4, -0.5, 0x8a8a8a, 1); if (g.position.x < -20 && DM.on) { demoStop(); return; } if (g.position.x < -20) { S.bikeN++; if (S.bikeN >= BIKESHOP.perDay) endDay(); else nextBike(); } }
      if (B) { if (S.phase !== 'arrive' && S.phase !== 'leave') g.position.y = liftY; kit.animFox && kit.animFox(rider, dt, 0); if (S.phase === 'arrive' || S.phase === 'leave' || (S.phase === 'lower' && S.phT > 2.4)) ridePose(rider);
        // rear tyre: flat → round as it fills
        const flat = B.tyreState === 'nail' ? 0.78 : 0.78 + 0.22 * Math.min(1, B.psi / B.D.psi); B.wr.sq.scale.set(1 + (1 - flat) * 0.25, flat, 1); B.wr.sq.position.y = -(1 - flat) * R * 0.5;
        if (B.nailFly) { B.nailFly.t += dt; const m = B.nailFly.m; m.position.z += dt * 2; m.position.y -= dt * (B.nailFly.t * 6); m.rotation.x += dt * 8; if (B.nailFly.t > 0.8) { m.visible = false; B.nailFly = null; } }
        if (B.plugFly) { B.plugFly.t += dt; const m = B.plugFly.m; m.position.z += dt * 1.5; m.position.y -= dt * B.plugFly.t * 5; if (B.plugFly.t > 0.8) { B.g.remove(m); B.plugFly = null; } }
        if (S.phase === 'work' && S.tool === 'true' && B.wobble > 0) { B.wf.sp.rotation.z -= dt * 2.6; B.wf.w.rotation.y = Math.sin(B.wf.sp.rotation.z + B.markA) * B.wobble; const d = Math.abs(markAngle()), on = d < trueWin(); B.gRing.material.color.set(on ? 0x22c55e : 0xffffff); B.gRing.scale.setScalar(on ? 1.3 : 1); B.mark.material.color.set(on ? 0x22c55e : 0xec3013); } else B.wf.w.rotation.y = damp(B.wf.w.rotation.y, 0, 6, dt);
        if (S.hold && S.hold.kind === 'air') { B.psi = clamp(B.psi + (S.hold.bleed ? -9 : 12) * dt, 0, 52); if (Math.random() < dt * 14) tone(S.hold.bleed ? 2400 : 1800 + B.psi * 20, 0.03, 0.012, 'square'); if (S.hold.bleed && B.psi < B.D.psi - psiTol() - 2) { airEnd(); } }
        // tune: hold = throttle, the green band drifts
        if (S.tool === 'tune' && S.phase === 'work' && !B.tuned) { const up = S.hold && S.hold.kind === 'tune' && (S.hold.lift == null || S.hold.lift); B.rpm = clamp(B.rpm + (up ? 0.55 : -0.42) * dt, 0, 1); if (B.rpm > 0.02) { const r = dt * B.rpm * 40; B.wr.sp.rotation.z -= r; engine(B.rpm); if (Math.random() < dt * (4 + B.rpm * 10)) puff(B.g.position.x + B.exhaust.x, B.g.position.y + B.exhaust.y, B.exhaust.z - 0.5, 0x6a6a6a, 1); }
          const [a, b] = band(); if (S.hold && S.hold.kind === 'tune') { if (B.rpm >= a && B.rpm <= b) B.tuneT += dt; else B.tuneOut += dt; }
          if (B.rpm > 0.97) { B.tuneBad++; B.rpm = 0.45; flash('BACKFIRE! EASE OFF THE THROTTLE', '#ec3013', 1.2); tone(90, 0.25, 0.07, 'sawtooth'); puff(B.g.position.x + B.exhaust.x, B.g.position.y + B.exhaust.y, B.exhaust.z - 0.4, 0xff7a1a, 4); }
          if (B.tuneT >= 3) { B.tuned = true; S.hold = null; flash('TUNED · SHE PURRS', '#22c55e', 1.4); checkDone(); } }
        else if (B.rpm > 0) B.rpm = Math.max(0, B.rpm - dt * 0.8);
        if (B.decal.userData.fade && B.decal.material.opacity < 1) B.decal.material.opacity = Math.min(1, B.decal.material.opacity + dt * 1.5);
        } }
    // lift table + scissors follow the bike
    Y.liftTop.position.y = (B ? B.g.position.y : 0) + (B && (S.phase === 'arrive' || S.phase === 'leave') ? -10 : 0); if (!B || S.phase === 'arrive' || S.phase === 'leave') Y.liftTop.position.y = 0.06; else Y.liftTop.position.y = Math.max(0.06, liftY);
    { const h = Y.liftTop.position.y, a = Math.asin(clamp(h / 2.2, 0, 0.99)); Y.scissor.forEach((s, i) => { s.position.y = h / 2; s.rotation.z = (i ? 1 : -1) * a; }); }
    if (S.phase === 'walk') { if (!S.talk) walkStep(dt); else kit.animFox(ben, dt, 0); }
    // auto-follow: idle on a finished tool → next task
    if (!DM.on && S.phase === 'work' && S.tool && info(S.tool).done && !S.ptr && !S.hold && performance.now() - (S.userToolT || 0) > 3000 && performance.now() - (S.lastInput || 0) > 1200) { const nx = nextTask(); if (nx) S.tool = nx; }
    const sh = shot(), rate = S.phase === 'walk' ? 4 : S.phase === 'work' ? 3.2 : 2.2; camera.position.lerp(sh.pos, Math.min(1, dt * rate)); CAM.look.lerp(sh.look, Math.min(1, dt * rate)); camera.lookAt(CAM.look);
    if (DM.on) demoStep(dt); hintT += dt; HINT = DM.on ? null : nextHint(); const vis = HINT && HINT.p ? HINT : null; RINGS.place(vis, hintT, dt); if (vis && vis.v) { RINGS.pulse.rotation.x = RINGS.pulse2.rotation.x = Math.PI / 2; RINGS.pulse.position.z += 0.06; RINGS.pulse2.position.z += 0.06; RINGS.pulse.scale.multiplyScalar(0.4); RINGS.pulse2.scale.multiplyScalar(0.4); RINGS.arrow.visible = false; } else { RINGS.pulse.rotation.x = RINGS.pulse2.rotation.x = 0; }
    const greet = S.phase === 'intro' || S.phase === 'done'; if (S.phase !== 'walk') kit.animFox(ben, dt, 0); for (const k in NPC) kit.animFox(NPC[k].f, dt, 0); ben.userData.mood = greet ? 'excited' : 'happy';
    if (greet && BP.arms && BP.arms[0]) BP.arms[0].rotation.set(-0.25, 0, -2.55 + Math.sin(t * 7) * 0.32);
    if (S.phase === 'work' && S.tool === 'dents' && S.hammer > 0) S.hammer -= dt; }
  function frame() { raf = requestAnimationFrame(frame); const dt = Math.min(0.05, clock.getDelta()); if (!PAUSE) step(dt); renderer.render(scene, camera); hudT -= dt; if (hudT <= 0) { hudT = 0.08; onState(hud()); } }
  function onRs() { renderer.setSize(CW(), CHh()); camera.aspect = CW() / CHh(); camera.updateProjectionMatrix(); } addEventListener('resize', onRs); const ro = new ResizeObserver(onRs); ro.observe(container);
  function meter() { if (!B || S.phase !== 'work') return null;
    if (S.tool === 'tyre' && B.tyreState === 'air') { const tol = psiTol(), lo = (B.D.psi - tol) / 50, hi = (B.D.psi + tol) / 50, d = B.psi - B.D.psi; return { label: Math.round(B.psi) + ' PSI', sub: (S.hold && S.hold.bleed) || (!S.hold && d > tol) ? 'LET AIR OUT · LET GO ON ' + B.D.psi : 'FILL · LET GO ON ' + B.D.psi, v: B.psi / 50, a: lo, b: hi, col: Math.abs(d) <= tol ? '#22c55e' : d > tol ? '#ec3013' : '#ffffff', red: 0.9 }; }
    if (S.tool === 'tune' && !B.tuned) { const [a, b] = band(), on = B.rpm >= a && B.rpm <= b; return { label: on ? 'IN THE GREEN · ' + Math.round(Math.min(1, B.tuneT / 3) * 100) + '%' : B.rpm > b ? 'TOO HIGH' : 'MORE THROTTLE', sub: 'HOLD = THROTTLE · STAY IN GREEN', v: B.rpm, a, b, col: on ? '#22c55e' : B.rpm > b ? '#ec3013' : '#ffffff', red: 0.97, prog: Math.min(1, B.tuneT / 3) }; }
    return null; }
  function hud() { const J = B && B.job, T = S.talk;
    return { phase: S.phase, day: S.day, bikeN: S.bikeN, perDay: BIKESHOP.perDay, earned: S.earned, tips: S.tips, stars: S.starList.length ? Math.round(S.starList.reduce((a, b) => a + b, 0) / S.starList.length * 10) / 10 : 0,
      job: J ? { rider: RID.name, bike: BIKES[J.type].name, num: J.num, psi: B.D.psi, plug: J.plug, plugName: PLUGS[J.plug].name, plugCol: PLUGS[J.plug].col, col: J.col, tasks: J.tasks.map(id => { const I = info(id); return { id, label: TASKS[id].label, name: TASKS[id].name, done: I.done, txt: I.txt }; }) } : null,
      tool: S.tool, plugPick: !!(B && S.phase === 'work' && S.tool === 'plug' && B.plugState === 'out'), allDone: !!allDone(), meter: meter(),
      flash: S.flash, say: S.say, react: S.react, done: S.done, gold: save.data.gold, uniform: !!save.flag('bikeUniform'), upgrades: UPGRADES.map(u => ({ ...u, owned: upg(u.id) })), hint: HINT ? { text: HINT.text, tool: HINT.tool } : null, demo: DM.on ? { cap: DM.cap, key: DM.key } : null,
      near: S.phase === 'walk' && !T ? (S.near ? NPC[S.near].name : null) : null, talk: T ? { name: T.lines[T.i][0] === 'player' ? 'BEN' : T.name, text: T.lines[T.i][1], more: T.i < T.lines.length - 1, choices: T.i >= T.lines.length - 1 && T.choices ? T.choices.map(c => c.label) : null } : null }; }
  frame();
  return { setSafe(top, bottom, left = 0) { if (Math.abs(SAFE.top - top) > 3 || Math.abs(SAFE.bottom - bottom) > 3 || Math.abs(SAFE.left - left) > 3) { SAFE.top = top; SAFE.bottom = bottom; SAFE.left = left; } }, setTool, pickPlug, handBack, startDay, demoStart, demoStop, buyUpgrade, hud, lookAround, talkNext, talkChoose, talkNear, endTalk, setPaused(v) { PAUSE = !!v; },
    toIntro() { if (S.phase === 'walk' || S.phase === 'done' || S.phase === 'intro') toIntro(); },
    _pump(n = 1, dt = 1 / 30) { for (let i = 0; i < n; i++) step(dt); renderer.render(scene, camera); onState(hud()); }, _force(t) { S.forceType = t; }, _state: () => S, _bike: () => B, _scr: scr, _wp: wp, _ben: () => ben, _shop: Y, _npc: k => NPC[k].f, _cam: () => ({ pos: camera.position.toArray(), SAFE: { ...SAFE }, shot: (s => [s.pos.toArray(), s.look.toArray()])(shot()), W: CW(), H: CHh() }),
    destroy() { cancelAnimationFrame(raf); removeEventListener('resize', onRs); ro.disconnect(); removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp); removeEventListener('keydown', onKD); removeEventListener('keyup', onKU); renderer.dispose(); renderer.domElement.remove(); try { audio.ctx && audio.ctx.close(); } catch (e) {} } };
}
