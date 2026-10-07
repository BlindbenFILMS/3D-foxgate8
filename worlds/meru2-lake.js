// MERU 2.0 — step 5: THE LAKE [meruLake]. Built by the walk (worlds/meru2-walk.js). Data: LAKE in worlds/meru2-layout.js.
// JETTIES (wood decks on piles, rails, lanterns, ladder gaps) · THE SPEEDBOAT (engine/vehicle-fun.js model, replaces the old rowboat;
// rented once for 1 gold = the old boat-hire rule; drive anywhere on the lake, HORN · POWER TURN · NITRO, wake, engine sound,
// left where you get out, saved) · the SPEEDBOAT BAY start gate (drive through + E = the course full-screen) · SWIM helpers
// (climb points, wake rings) · the rippling lake surface · interiors: JON'S BOATWORKS [jonBoatworks], SPEEDBOAT BAY boathouse
// [meruSpeedboatBay], SCHOOL FOR THE BLIND [meruBlindSchool] with HOPE teaching her class.
import { funKit } from '../engine/vehicle-fun.js';
import { PLAYER_MALE } from '../fox-kit.js';
export function buildLake({ THREE, scene, M, toon, grad, kit, cast, cols, L, save, touch, water, terrainAt = () => 0, audio = () => null }) {
  const LK = L.LAKE, W = L.WATER[0].e, I = L.ISLAND, V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  const CT = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const tc = c => typeof c === 'string' ? toon(c) : c, glowM = c => new THREE.MeshBasicMaterial({ color: c });
  const B = (w, h, d, col, x, y, z, ry = 0, o = 0.02, par) => { const m = M(new THREE.BoxGeometry(w, h, d), tc(col), x, y, z, par, o); m.rotation.y = ry; return m; };
  const C = (r, h, col, x, y, z, o = 0.02, par, n = 14) => M(new THREE.CylinderGeometry(r, r, h, n), tc(col), x, y, z, par, o);
  const box = (x0, x1, z0, z1, y1) => cols.push(y1 != null ? { f: [x0, x1, z0, z1], y1 } : { f: [x0, x1, z0, z1] }), ring = (x, z, r) => cols.push({ c: [x, z, r] });
  const spots = [], npcs = [], rooms = [], lamps = [], climbs = [];
  const inLake = (x, z) => ((x - W[0]) / W[2]) ** 2 + ((z - W[1]) / W[3]) ** 2 < 1;
  const islandLand = (x, z) => { const r = Math.hypot(x - I.pond.x, z - I.pond.z); return r < I.c[2] + 6 && L.islandH(r) > 0.1; };
  const glowTex = CT(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,0.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });

  // ---------- the lake surface: a slow ripple map on the blockout water ----------
  let rip = null;
  if (water) { rip = CT(256, 256, (g, w, h) => { g.fillStyle = '#e4f1fa'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const x = Math.random() * w, y = Math.random() * h, l = 8 + Math.random() * 26; g.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(150,190,220,0.55)'; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 3, x + l, y); g.stroke(); } });
    rip.wrapS = rip.wrapT = THREE.RepeatWrapping; rip.repeat.set(70, 24); water.material.map = rip; water.material.needsUpdate = true; }

  // ---------- jetties: plank decks on piles, rails with gaps, lanterns ----------
  const plank = CT(256, 64, (g, w, h) => { g.fillStyle = '#a07a52'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#94704a' : '#a8825a'; g.fillRect(0, i * 8, w, 7); g.fillStyle = '#5c4430'; g.fillRect(0, i * 8 + 7, w, 1); } });
  plank.wrapS = plank.wrapT = THREE.RepeatWrapping;
  const pileP = [], railM = toon('#5c4430'), lampHead = new THREE.MeshBasicMaterial({ color: 0x8a7a5a });
  for (const J of LK.jetties) { const [x0, x1, z0, z1] = J.r, w = x1 - x0, d = z1 - z0, y = J.y;
    const mat = new THREE.MeshToonMaterial({ gradientMap: grad, map: plank.clone() }); mat.map.needsUpdate = true; mat.map.repeat.set(1, d / 2);
    M(new THREE.BoxGeometry(w, 0.25, d), mat, (x0 + x1) / 2, y - 0.125, (z0 + z1) / 2, null, 0.02);
    for (let x = x0 + 0.3; x <= x1 - 0.2; x += 4) for (const z of [z0 + 0.3, z1 - 0.3]) pileP.push([x, z]);
    for (let z = z0 + 0.3; z <= z1 - 0.2; z += 4) for (const x of [x0 + 0.3, x1 - 0.3]) pileP.push([x, z]);
    const sides = { N: [x0, x1, z0, 'x'], S: [x0, x1, z1, 'x'], W: [z0, z1, x0, 'z'], E: [z0, z1, x1, 'z'] };
    for (const sd of Object.keys(sides)) { if ((J.open || []).includes(sd)) continue; const [a0, a1, c, ax] = sides[sd], gs = (J.gaps || []).filter(q => q.side === sd).map(q => ({ ...q, w: q.w || 2.4 })).sort((p, q) => p.at - q.at);
      const segs = []; let a = a0; for (const q of gs) { segs.push([a, q.at - q.w / 2]); a = q.at + q.w / 2; } segs.push([a, a1]);
      for (const [s0, s1] of segs) { const len = s1 - s0; if (len < 0.3) continue; const m = (s0 + s1) / 2;
        if (ax === 'x') { B(len, 0.1, 0.1, railM, m, y + 1.0, c, 0, 0.01); box(s0, s1, c - 0.2, c + 0.2); for (let s = s0; s <= s1 + 0.01; s += 2) C(0.05, 1.0, railM, Math.min(s, s1), y + 0.5, c, 0, null, 6); }
        else { B(0.1, 0.1, len, railM, c, y + 1.0, m, 0, 0.01); box(c - 0.2, c + 0.2, s0, s1); for (let s = s0; s <= s1 + 0.01; s += 2) C(0.05, 1.0, railM, c, y + 0.5, Math.min(s, s1), 0, null, 6); } }
      for (const q of gs) { if (q.join) continue; const g0 = q.at - q.w / 2, g1 = q.at + q.w / 2, inward = sd === 'N' ? 1 : sd === 'S' ? -1 : sd === 'W' ? 1 : -1;
        if (ax === 'x') { box(g0, g1, c - 0.2, c + 0.2, 0.2); climbs.push({ x: q.at, z: c + inward * 0.9, y, edge: [q.at, c], yaw: inward > 0 ? 0 : Math.PI }); for (let k = 0; k < 4; k++) B(0.6, 0.06, 0.08, railM, q.at, y - 0.35 - k * 0.32, c - inward * 0.08, 0, 0); }
        else { box(c - 0.2, c + 0.2, g0, g1, 0.2); climbs.push({ x: c + inward * 0.9, z: q.at, y, edge: [c, q.at], yaw: inward > 0 ? Math.PI / 2 : -Math.PI / 2 }); for (let k = 0; k < 4; k++) B(0.08, 0.06, 0.6, railM, c - inward * 0.08, y - 0.35 - k * 0.32, q.at, 0, 0); } } }
    // lantern posts every 8 m on the long sides
    const long = d >= w; for (let s = (long ? z0 : x0) + 3; s < (long ? z1 : x1) - 1; s += 8) { const lx = long ? x0 + 0.45 : s, lz = long ? s : z1 - 0.45; C(0.07, 2.4, '#201e1d', lx, y + 1.2, lz, 0.01, null, 6); const h = B(0.3, 0.36, 0.3, lampHead, lx, y + 2.5, lz, 0, 0.01); lamps.push({ h, x: lx, y: y + 2.5, z: lz }); } }
  { const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.18, 4, 7), toon('#5c4430'), pileP.length), M4 = new THREE.Matrix4(); pileP.forEach(([x, z], i) => { M4.makeTranslation(x, -1.4, z); pm.setMatrixAt(i, M4); }); scene.add(pm); }
  const glowS = lamps.map(l => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffc67a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(2.6); s.position.set(l.x, l.y, l.z); s.visible = false; scene.add(s); return s; });
  const onDeck = (x, z) => LK.jetties.find(J => x >= J.r[0] && x <= J.r[1] && z >= J.r[2] && z <= J.r[3]);
  function groundAt(x, z, y) { const J = onDeck(x, z); return J && y > -0.35 ? J.y : null; }
  function surfaceAt(x, z, y) { const J = onDeck(x, z); return J && y > 0.5 ? 'wood' : null; }

  // ---------- the slipway at Jon's Boatworks (concrete ramp into the water) ----------
  { const bw = L.BUILDINGS.find(b => b.key === 'boatworks'), cx = (bw.f[0] + bw.f[1]) / 2; const r = B(8, 0.3, 18, '#9aa0a6', cx, -0.2, bw.f[3] + 9, 0, 0.01); r.rotation.x = 0.06; B(8.4, 5, 0.12, '#3d4a57', cx, 2.6, bw.f[3] + 0.08, 0, 0.01); for (let k = 0; k < 9; k++) B(8.2, 0.06, 0.14, '#2a3440', cx, 0.4 + k * 0.55, bw.f[3] + 0.16, 0, 0); }

  // ---------- the speedboat ----------
  const fk = funKit({ THREE, M, toon, grad, glowTex, scene });
  const mkBoat = s => { const r = fk.make('boat'), V = r.userData.V; r.scale.setScalar(s); if (V.tubeGlow) V.tubeGlow.forEach(g => g.scale.setScalar(0.01)); scene.add(r); return r; };
  const boat = mkBoat(1.3), BV = boat.userData.V, S = LK.speed;
  const BT = { x: LK.boat.moor[0], z: LK.boat.moor[1], yaw: LK.boat.moor[2], speed: 0, steer: 0, vx: 0, vz: 0, nitro: 0, ncd: 0, spin: 0, spinDir: 1, pl: 0, kick: 0, on: false, thr: 0 };
  { const p = save.stat('meru2Boat', null); if (p && inLake(p.x, p.z)) Object.assign(BT, { x: p.x, z: p.z, yaw: p.yaw }); }
  const bodyC = [{ c: [0, 0, 1.25], on: true }, { c: [0, 0, 1.25], on: true }]; cols.push(...bodyC);   // the hull blocks walkers + swimmers while moored
  const placeBody = () => { const hx = Math.sin(BT.yaw), hz = Math.cos(BT.yaw); bodyC[0].c[0] = BT.x + hx * 1.4; bodyC[0].c[1] = BT.z + hz * 1.4; bodyC[1].c[0] = BT.x - hx * 1.4; bodyC[1].c[1] = BT.z - hz * 1.4; for (const b of bodyC) b.on = !BT.on; };
  { const t = CT(512, 160, (g, w, h) => { g.fillStyle = '#ffd23a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ec3013'; g.fillRect(0, 0, 18, h); g.fillStyle = '#201e1d'; g.font = '900 30px Archivo, sans-serif'; g.textBaseline = 'top'; g.fillText('SPEEDBOAT', 40, 22); g.font = '900 52px Archivo, sans-serif'; g.fillText(LK.boat.sign, 40, 62, w - 60); });
    const [mx, mz] = LK.boat.moor, sx = 77.4, sz = mz - 4.6, gp = new THREE.Group(); gp.position.set(sx, 0.9, sz); gp.rotation.y = Math.PI / 2; scene.add(gp); for (const s of [-0.9, 0.9]) C(0.06, 2.2, '#201e1d', s, 1.1, 0, 0.01, gp, 6);
    const pm = new THREE.MeshBasicMaterial({ map: t }); for (const ry of [0, Math.PI]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.69), pm); p.position.set(0, 1.9, ry ? -0.02 : 0.02); p.rotation.y = ry; gp.add(p); } ring(sx, sz, 0.3); }
  const buoys = []; { const G = LK.gate, [gx, gz] = G.at, ban = CT(512, 96, (g, w, h) => { g.fillStyle = '#ec3013'; g.fillRect(0, 0, w, h); g.fillStyle = '#201e1d'; g.fillRect(0, 0, 14, h); g.fillStyle = '#ffffff'; g.font = '900 52px Archivo, sans-serif'; g.textBaseline = 'middle'; g.fillText(G.label + ' \u00b7 START', 30, h / 2 + 3, w - 44); });
    for (const s of [-1, 1]) { const g = new THREE.Group(); g.position.set(gx + s * G.w / 2, 0, gz); scene.add(g); for (let k = 0; k < 3; k++) C(0.9 - k * 0.12, 0.6, k % 2 ? '#f3f2f2' : '#ec3013', 0, 0.1 + k * 0.6, 0, 0.02, g, 16); C(0.08, 5, '#201e1d', 0, 3.6, 0, 0.01, g, 6); buoys.push({ g, x: gx + s * G.w / 2, z: gz, ph: Math.random() * 6 }); }
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(G.w, 1.6), new THREE.MeshBasicMaterial({ map: ban, side: THREE.DoubleSide })); bm.position.set(gx, 5.4, gz); scene.add(bm); }
  const PIER = (L.LIGHTHOUSES || []).filter(q => q.pier).map(q => q.pier.r), LH = (L.LIGHTHOUSES || []).map(q => q.at);
  function waterOK(x, z) { if (!inLake(x, z) || islandLand(x, z) || terrainAt(x, z) > 0.3) return false;
    for (const J of LK.jetties) { const r = J.r; if (x > r[0] - 0.5 && x < r[1] + 0.5 && z > r[2] - 0.5 && z < r[3] + 0.5) return false; }
    for (const r of PIER) if (x > r[0] - 0.6 && x < r[1] + 0.6 && z > r[2] - 0.6 && z < r[3] + 0.6) return false;
    for (const [lx, lz] of LH) if (Math.hypot(x - lx, z - lz) < 5) return false;
    for (const b of buoys) if (Math.hypot(x - b.x, z - b.z) < 1.2) return false; if (ferryBlock(x, z)) return false; return true; }
  const PROBE = [[0, 3.0], [0, -2.9], [1.15, 0], [-1.15, 0], [0.85, 2], [-0.85, 2]];
  const okAt = (x, z, yaw) => { const c = Math.cos(yaw), s = Math.sin(yaw); return PROBE.every(([lx, lz]) => waterOK(x + lx * c + lz * s, z - lx * s + lz * c)); };

  // engine + horn (synth until Ben's sound pass)
  let eng = null;
  function engOn() { const c = audio(); if (!c || eng) return; const o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); o1.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = 12; lp.type = 'lowpass'; lp.frequency.value = 520; g.gain.value = 0; o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(c.destination); o1.start(); o2.start(); eng = { c, o1, o2, lp, g }; }
  function engOff() { if (!eng) return; const e = eng; eng = null; e.g.gain.setTargetAtTime(0, e.c.currentTime, 0.08); setTimeout(() => { try { e.o1.stop(); e.o2.stop(); } catch (er) {} }, 400); }
  function tone(f, d, v, type = 'sine') { const c = audio(); if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + d); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d + 0.05); }
  const horn = () => { tone(196, 0.7, 0.07, 'sawtooth'); tone(247, 0.7, 0.05, 'sawtooth'); };
  function splash(v = 0.12) { const c = audio(); if (!c) return; const n = c.createBufferSource(), b = c.createBuffer(1, c.sampleRate * 0.35, c.sampleRate), a = b.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length) ** 2; n.buffer = b; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400; const g = c.createGain(); g.gain.value = v; n.connect(f); f.connect(g); g.connect(c.destination); n.start(); }

  // ---------- wake rings (boat + swimmer) ----------
  const ringTex = CT(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 20, 64, 64, 62); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.7, 'rgba(255,255,255,0.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  const wakes = []; for (let i = 0, N = touch ? 24 : 40; i < N; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, opacity: 0 })); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); wakes.push({ m, t: 1, life: 1, s0: 1, s1: 2, op: 0.5 }); }
  let wi = 0; function wake(x, z, s0, s1, life, op) { const w = wakes[wi = (wi + 1) % wakes.length]; Object.assign(w, { t: 0, life, s0, s1, op }); w.m.position.set(x, 0.11, z); w.m.visible = true; }

  // ---------- interiors ----------
  const room = key => { const b = L.BUILDINGS.find(q => q.key === key), g = new THREE.Group(); scene.add(g); rooms.push({ g, cx: (b.f[0] + b.f[1]) / 2, cz: (b.f[2] + b.f[3]) / 2 }); return { b, g }; };
  const fox = (key, opt, x, z, ry, par, s = 1) => { const f = kit.makeFox({ key, ...opt }); f.position.set(x, 0, z); f.rotation.y = ry; f.scale.multiplyScalar(s); (par || scene).add(f); ring(x, z, 0.45); npcs.push(f); return f; };
  const board = (w, h, draw) => new THREE.MeshBasicMaterial({ map: CT(Math.round(w * 64), Math.round(h * 64), draw) });

  // JON'S BOATWORKS (f -130..-95 × 205..230, door N at x -112): a speedboat up on a cradle under a chain hoist, workbench, props on the wall
  { const { b, g } = room('boatworks'), hz = 220.5;
    const hull = mkBoat(1.3); hull.position.set(-112, 0.95, hz); hull.rotation.set(0, Math.PI / 2, 0.04); g.add(hull);
    for (const x of [-114.6, -112, -109.4]) B(0.7, 0.95, 2.6, '#3d3b3a', x, 0.47, hz, 0, 0.01, g); box(-115.4, -108.6, hz - 1.4, hz + 1.4);
    for (const x of [-117, -107]) for (const z of [hz - 2.6, hz + 2.6]) { C(0.12, 6.2, '#ffd23a', x, 3.1, z, 0.01, g, 8); ring(x, z, 0.25); } for (const x of [-117, -107]) B(0.2, 0.2, 5.4, '#ffd23a', x, 6.2, hz, 0, 0.01, g);
    B(10.4, 0.3, 0.3, '#ffd23a', -112, 6.3, hz, 0, 0.01, g); C(0.03, 3.0, '#9aa0a6', -110, 4.8, hz, 0, g, 6); B(0.5, 0.4, 0.3, '#201e1d', -110, 6.0, hz, 0, 0.01, g); B(0.2, 0.3, 0.06, '#9aa0a6', -110, 3.2, hz, 0, 0, g);
    B(1.4, 1.0, 12, '#6b4a32', -128.6, 0.5, 214, 0, 0.02, g); B(1.6, 0.1, 12.2, '#3d2a1c', -128.6, 1.05, 214, 0, 0, g); box(-129.6, -127.8, 208, 220); B(0.3, 0.3, 0.5, '#4a4745', -128.4, 1.25, 210, 0, 0.01, g);
    const peg = board(4, 2, (q, w, h) => { q.fillStyle = '#c9b48a'; q.fillRect(0, 0, w, h); q.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = 8; x < w; x += 12) for (let y = 8; y < h; y += 12) q.fillRect(x, y, 2, 2); q.fillStyle = '#201e1d'; for (let i = 0; i < 9; i++) { const x = 16 + i * 27; q.fillRect(x, 20 + (i % 3) * 8, 6, 60 + (i % 2) * 20); q.fillRect(x - 6, 20 + (i % 3) * 8, 18, 10); } });
    for (const z of [210, 214.5, 219]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), peg); p.position.set(-129.55, 2.6, z); p.rotation.y = Math.PI / 2; g.add(p); }
    for (const z of [211, 216, 225]) { const pg = new THREE.Group(); pg.position.set(-95.6, 2.8, z); g.add(pg); C(0.12, 0.3, '#cbd5e1', 0, 0, 0, 0.005, pg, 10).rotation.z = Math.PI / 2; for (let k = 0; k < 3; k++) { const bl = B(0.04, 0.7, 0.3, '#cbd5e1', 0, 0, 0, 0, 0.005, pg); bl.rotation.x = k * Math.PI * 2 / 3; bl.position.set(0, Math.cos(k * 2.094) * 0.35, Math.sin(k * 2.094) * 0.35); } }
    B(4, 0.6, 1.2, '#a07a52', -99, 0.3, 226.5, 0, 0.01, g); B(4, 0.3, 1.2, '#94704a', -99, 0.75, 226.5, 0.05, 0.01, g); box(-101, -97, 225.8, 227.2);
    for (const [x, z, c] of [[-104, 227.6, '#ec3013'], [-103.4, 227.6, '#f3f2f2'], [-102.8, 227.6, '#2e4a6b']]) C(0.22, 0.4, c, x, 0.2, z, 0.01, g, 10);
    const jon = fox('jon', { look: { ...PLAYER_MALE, fur: '#a8a29a', furDark: '#6a6560' }, torso: ['#1f3a5f', '#f2c94c', '#16263c'], outfit: 'coat', crest: '', gear: 'none', mood: 'happy' }, -108, 214, -Math.PI * 0.75, g);
    spots.push({ key: 'boatworksJob', x: -112, z: 209.5, r: 2.2, prompt: 'PUT ME TO WORK \u00b7 BOATWORKS JOB', play: { label: b.label.toUpperCase(), url: b.hiring.url } }); }

  // SPEEDBOAT BAY boathouse (f 60..90 × 205..228, door N at x 75): course board, life jackets, a spare boat on its trailer
  { const { b, g } = room('boathouse');
    const course = board(6, 3, (q, w, h) => { q.fillStyle = '#201e1d'; q.fillRect(0, 0, w, h); q.fillStyle = '#ec3013'; q.fillRect(0, 0, 10, h); q.fillStyle = '#ffffff'; q.font = '900 34px Archivo, sans-serif'; q.textBaseline = 'top'; q.fillText('SPEEDBOAT BAY', 26, 14);
      q.font = '800 17px Archivo, sans-serif'; ['1  BUOY SLALOM', '2  POWER-TURN RING', '3  RAMP JUMPS', '4  TORPEDO TARGETS', '5  BEACH SHALLOWS', '6  ROBOT BOAT WAVES'].forEach((s, i) => { q.fillStyle = i % 2 ? '#ffd23a' : '#ffffff'; q.fillText(s, 26, 62 + i * 20); });
      q.strokeStyle = '#ffd23a'; q.lineWidth = 3; q.beginPath(); q.moveTo(250, 160); q.bezierCurveTo(300, 60, 360, 170, 370, 50); q.stroke(); for (const [x, y] of [[262, 132], [300, 98], [338, 128], [366, 70]]) { q.fillStyle = '#ec3013'; q.beginPath(); q.arc(x, y, 6, 0, 7); q.fill(); } });
    { const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), course); p.position.set(75, 2.4, 227.55); p.rotation.y = Math.PI; g.add(p); B(6.3, 3.3, 0.1, '#3d3b3a', 75, 2.4, 227.68, 0, 0, g); }
    for (let k = 0; k < 6; k++) { B(0.5, 0.7, 0.18, '#f97316', 60.7, 1.7, 209 + k * 1.4, 0, 0.01, g); B(0.52, 0.08, 0.2, '#201e1d', 60.7, 1.5, 209 + k * 1.4, 0, 0, g); } B(0.1, 0.1, 9, '#201e1d', 60.55, 2.15, 212.5, 0, 0, g);
    const spare = mkBoat(1.15); spare.position.set(84, 0.95, 216); spare.rotation.y = 0; g.add(spare); B(1.6, 0.3, 6.6, '#4a4745', 84, 0.55, 216, 0, 0.01, g); for (const s of [-1, 1]) C(0.38, 0.25, '#1f2023', 84 + s * 0.95, 0.38, 215, 0.01, g, 14).rotation.z = Math.PI / 2; box(82.4, 85.6, 212, 220);
    for (const [x, z] of [[63, 225.6], [63.7, 225.6], [64.4, 225.6]]) { B(0.45, 0.6, 0.3, '#ec3013', x, 0.3, z, 0, 0.01, g); }
    B(3, 0.45, 0.8, '#a07a52', 69, 0.25, 210, 0, 0.01, g); box(67.5, 70.5, 209.5, 210.5);
    spots.push({ key: 'bayCourse', x: 75, z: 225.4, r: 2.2, prompt: 'PLAY \u00b7 SPEEDBOAT BAY', play: { label: 'SPEEDBOAT BAY', url: b.hiring.url } }); }

  // SCHOOL FOR THE BLIND (f -250..-190 × 170..205, door S at x -220): tactile guide strip from the door, HOPE at the front of her class
  { const { b, g } = room('blindSchool'), cx = -220;
    B(0.6, 0.03, 14, '#ffd23a', cx, 0.06, 197.5, 0, 0, g); for (let z = 191; z < 204.5; z += 0.5) B(0.5, 0.025, 0.06, '#e0a800', cx, 0.085, z, 0, 0, g);
    B(10, 0.03, 0.6, '#ffd23a', cx, 0.06, 190.5, 0, 0, g);
    { const bc = '#201e1d', chalk = board(10, 3, (q, w, h) => { q.fillStyle = bc; q.fillRect(0, 0, w, h); q.fillStyle = '#ffd23a'; q.font = '900 46px Archivo, sans-serif'; q.textBaseline = 'top'; q.fillText("HOPE'S CLASS", 24, 18);
        const P = { a: [1], b: [1, 2], c: [1, 4], d: [1, 4, 5], e: [1, 5], f: [1, 2, 4], g: [1, 2, 4, 5], h: [1, 2, 5], i: [2, 4], j: [2, 4, 5] }, pos = { 1: [0, 0], 2: [0, 1], 3: [0, 2], 4: [1, 0], 5: [1, 1], 6: [1, 2] };
        Object.keys(P).forEach((k, i) => { const x0 = 30 + i * 60, y0 = 90; for (let n = 1; n <= 6; n++) { const [u, v] = pos[n]; q.fillStyle = P[k].includes(n) ? '#ffffff' : 'rgba(255,255,255,0.15)'; q.beginPath(); q.arc(x0 + u * 16, y0 + v * 16, 5.5, 0, 7); q.fill(); } q.fillStyle = '#cfcac2'; q.font = '800 20px Archivo, sans-serif'; q.fillText(k.toUpperCase(), x0 + 2, y0 + 48); }); });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(10, 3), chalk); p.position.set(cx, 2.6, 170.5); g.add(p); }
    B(3, 0.9, 1.2, '#6b4a32', cx, 0.45, 178.4, 0, 0.02, g); box(cx - 1.5, cx + 1.5, 177.8, 179);
    const hope = cast.make('hope'); hope.position.set(cx, 0, 181.5); hope.rotation.y = 0; g.add(hope); ring(cx, 181.5, 0.6); npcs.push(hope);
    const cols8 = ['#ec3013', '#38bdf8', '#ffd23a', '#7cff9b', '#f97316', '#c084fc', '#f3f2f2', '#2e4a6b'];
    // Hope's pupils: names + looks from the school game (minigames/meru/blind-school.js KIDS)
    const KIDS = [['juno', ['#f472b6', '#fce7f3', '#9d174d'], '#e9772c'], ['pip', ['#38bdf8', '#e0f2fe', '#0369a1'], '#f08a3c'], ['tobi', ['#22c55e', '#dcfce7', '#14532d'], '#d86a26'], ['mae', ['#a78bfa', '#ede9fe', '#4c1d95'], '#ef7b30'], ['rio', ['#f59e0b', '#fef3c7', '#92400e'], '#e36f22']];
    for (let i = 0; i < KIDS.length; i++) { const [kk, torso, fur] = KIDS[i], x = cx - 9 + i * 4.5, z = 187;
      B(1.4, 0.08, 0.8, '#a07a52', x, 0.75, z, 0, 0.01, g); for (const s of [-1, 1]) B(0.08, 0.72, 0.7, '#4a4745', x + s * 0.62, 0.37, z, 0, 0, g);
      B(0.5, 0.18, 0.3, '#9aa0a6', x, 0.88, z - 0.05, 0, 0.005, g); for (let k = 0; k < 6; k++) B(0.05, 0.03, 0.08, '#201e1d', x - 0.16 + k * 0.064 + (k > 2 ? 0.02 : 0), 0.98, z + 0.06, 0, 0, g);
      box(x - 0.75, x + 0.75, z - 0.45, z + 0.45); fox(kk, { look: { ...PLAYER_MALE, fur }, torso, outfit: 'tee', crest: '', gear: 'none', mood: 'happy' }, x, z + 0.95, Math.PI, g, 0.74); }
    const chart = board(4, 3, (q, w, h) => { q.fillStyle = '#f3f2f2'; q.fillRect(0, 0, w, h); q.fillStyle = '#201e1d'; q.font = '900 26px Archivo, sans-serif'; q.textBaseline = 'top'; q.fillText('BRAILLE  A \u2013 Z', 14, 10); for (let i = 0; i < 26; i++) { const x = 18 + (i % 7) * 34, y = 52 + Math.floor(i / 7) * 34; for (let n = 0; n < 6; n++) { q.fillStyle = ((i * 7 + n * 3) % 5) < 2 || n === 0 ? '#201e1d' : '#d6cfc4'; q.beginPath(); q.arc(x + (n > 2 ? 9 : 0), y + (n % 3) * 8, 3, 0, 7); q.fill(); } } });
    { const p = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), chart); p.position.set(-249.55, 2.4, 184); p.rotation.y = Math.PI / 2; g.add(p); }
    for (const z of [176, 182, 188]) { B(0.8, 2.4, 4.6, '#6b4a32', -190.8, 1.2, z, 0, 0.01, g); for (let y = 0; y < 4; y++) for (let k = 0; k < 9; k++) B(0.5, 0.42, 0.14, cols8[(k + y) % 8], -191.0, 0.35 + y * 0.56, z - 2 + k * 0.48, 0, 0, g); box(-191.4, -190.2, z - 2.3, z + 2.3); }
    B(1.6, 1.0, 1.2, '#4a4745', -232, 0.5, 200, 0, 0.01, g); { const tm = B(1.5, 0.06, 1.1, '#ffd23a', -232, 1.04, 200, 0, 0, g); tm.rotation.x = -0.25; for (let k = 0; k < 8; k++) B(0.12, 0.08, 0.12, '#201e1d', -232.5 + (k % 4) * 0.32, 1.12, 199.7 + Math.floor(k / 4) * 0.4, 0, 0, g); } box(-232.8, -231.2, 199.4, 200.6);
    spots.push({ key: 'hopesClass', x: cx, z: 184.2, r: 2.0, prompt: "PLAY \u00b7 HOPE'S CLASS", play: { label: "HOPE'S CLASS", url: b.hiring.url } }); }

  // ---------- PEARL ISLAND (step 6): the pearl diver at the deep pond, two locals, the ferry captain, palms, a pearl shack, the lantern trail ----------
  const IS = LK.island, isH = (x, z) => { const r = Math.hypot(x - I.pond.x, z - I.pond.z); return r > I.pond.r && r < I.c[2] + 6 ? Math.max(0, L.islandH(r)) : 0; }, keys = new Set(), outs = [];
  const standFox = (key, opt, x, z, ry) => { const f = kit.makeFox({ key, ...opt }); f.position.set(x, isH(x, z), z); f.rotation.y = ry; scene.add(f); ring(x, z, 0.5); outs.push({ f, x, z, yaw0: ry, yaw: ry }); keys.add(key); return f; };
  for (const s of L.SPEAKERS) { if (!Array.isArray(s.at)) continue; const [x, z] = s.at, look = { pearlDiver: [{ torso: ['#f3f2f2', '#2e4a6b', '#16263c'], outfit: 'vest', look: { ...PLAYER_MALE, fur: '#c9b48a', furDark: '#7a5c38' } }, Math.atan2(I.pond.x - x, I.pond.z - z)],
      pearlLocal1: [{ torso: ['#ffd23a', '#e6b45a', '#7a5c38'], outfit: 'vest', look: { ...PLAYER_MALE, fur: '#e9772c' } }, -Math.PI / 2], pearlLocal2: [{ torso: ['#7cff9b', '#3f8f3a', '#1e4a2a'], outfit: 'robe', look: { ...PLAYER_MALE, fur: '#d86a26' } }, Math.PI],
      ferryCaptain: [{ torso: ['#f3f2f2', '#2e4a6b', '#16263c'], outfit: 'coat', look: { ...PLAYER_MALE, fur: '#a8a29a', furDark: '#6a6560' } }, Math.PI] }[s.key]; if (look) standFox(s.key, look[0], x, z, look[1]); }
  { const d = L.SPEAKERS.find(s => s.key === 'pearlDiver'); if (d) { const [x, z] = d.at, y = isH(x, z); spots.push({ key: 'pondDive', x, z: z - 0.1, r: 2.6, y: [y - 1, y + 2], prompt: 'DIVE \u00b7 ' + IS.dive.label, play: { label: IS.dive.label, url: IS.dive.url } });
      const sg = CT(256, 96, (g, w, h) => { g.fillStyle = '#201e1d'; g.fillRect(0, 0, w, h); g.fillStyle = '#ec3013'; g.fillRect(0, 0, 10, h); g.fillStyle = '#ffffff'; g.font = '900 34px Archivo, sans-serif'; g.textBaseline = 'middle'; g.fillText(IS.dive.label, 22, 34, w - 30); g.fillStyle = '#ffd23a'; g.font = '800 20px Archivo, sans-serif'; g.fillText('HULL PEARLS', 22, 70); });
      const sx = x - 2.4, sz = z - 1.2, sy = isH(sx, sz); C(0.07, 2, '#201e1d', sx, sy + 1, sz, 0.01, null, 6); const pl = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.75), new THREE.MeshBasicMaterial({ map: sg, side: THREE.DoubleSide })); pl.position.set(sx, sy + 2.1, sz); pl.rotation.y = Math.atan2(I.pond.x - sx, I.pond.z - sz) + Math.PI; scene.add(pl); ring(sx, sz, 0.25);
      // a little diving board over the pond by the diver
      const a = Math.atan2(I.pond.x - x, I.pond.z - z), bx = x + Math.sin(a) * 2.2, bz = z + Math.cos(a) * 2.2, by = isH(x, z); const bd = B(0.9, 0.12, 3.2, '#a07a52', bx, by + 0.4, bz, a, 0.01); C(0.1, 0.8, '#5c4430', x + Math.sin(a) * 0.9, by, z + Math.cos(a) * 0.9, 0.01, null, 6); } }
  spots.push({ key: 'pondSwim', x: I.pond.x, z: I.pond.z, r: I.pond.r - 0.5, y: [-4, 0.9], prompt: 'DIVE \u00b7 ' + IS.dive.label, play: { label: IS.dive.label, url: IS.dive.url } });
  // reeds round the pond, palms on the beach ring, a pearl shack, lanterns up the trail
  { const reedM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.05, 1.6, 4), toon('#5c9a43'), touch ? 40 : 80), M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), E4 = new THREE.Euler(); for (let i = 0; i < reedM.count; i++) { const a = Math.random() * 6.28, r = I.pond.r + 0.3 + Math.random() * 1.6, x = I.pond.x + Math.cos(a) * r, z = I.pond.z + Math.sin(a) * r; E4.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3); M4.compose(V3(x, isH(x, z) + 0.6, z), Q4.setFromEuler(E4), V3(1, 0.6 + Math.random() * 0.8, 1)); reedM.setMatrixAt(i, M4); } scene.add(reedM); }
  { const N = touch ? Math.round(IS.palms / 2) : IS.palms, trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.32, 7, 7), toon('#8a6a48'), N), crown = new THREE.InstancedMesh(new THREE.ConeGeometry(2.6, 1.4, 7), toon('#3f8f3a'), N), M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), E4 = new THREE.Euler(); let n = 0;
    for (let k = 0; k < 400 && n < N; k++) { const a = Math.random() * 6.28, r = 50 + Math.random() * 12, x = I.c[0] + Math.cos(a) * r, z = I.c[1] + Math.sin(a) * r; if (onDeck(x, z) || LK.jetties.some(J => x > J.r[0] - 4 && x < J.r[1] + 4 && z > J.r[2] - 4 && z < J.r[3] + 4) || L.SPEAKERS.some(s => Array.isArray(s.at) && Math.hypot(s.at[0] - x, s.at[1] - z) < 4) || Math.hypot(x - IS.shack[0], z - IS.shack[1]) < 6 || (L.LIGHTHOUSES || []).some(q => Math.hypot(q.at[0] - x, q.at[1] - z) < 8)) continue; const y = isH(x, z), lean = 0.12 + Math.random() * 0.15, ya = Math.random() * 6.28; E4.set(lean, ya, 0, 'YXZ'); Q4.setFromEuler(E4); M4.compose(V3(x, y + 3.4, z), Q4, V3(1, 1, 1)); trunk.setMatrixAt(n, M4); const top = V3(0, 3.5, 0).applyQuaternion(Q4); M4.compose(V3(x + top.x, y + 3.4 + top.y + 0.4, z + top.z), new THREE.Quaternion(), V3(1, 1, 1)); crown.setMatrixAt(n, M4); ring(x, z, 0.4); n++; }
    trunk.count = crown.count = n; scene.add(trunk, crown); }
  { const [hx, hz] = IS.shack, hy = isH(hx, hz); B(4.2, 2.6, 3.6, '#a07a52', hx, hy + 1.3, hz, 0, 0.02); const rf = M(new THREE.ConeGeometry(3.6, 1.8, 4), toon('#c9b48a'), hx, hy + 3.5, hz, null, 0.02); rf.rotation.y = Math.PI / 4; B(1.2, 1.9, 0.1, '#3d2a1c', hx + 2.12, hy + 0.95, hz, Math.PI / 2, 0); box(hx - 2.1, hx + 2.1, hz - 1.8, hz + 1.8);
    for (let k = 0; k < 3; k++) C(0.32, 0.3, '#f3f2f2', hx + 2.6, hy + 0.15 + k * 0.3, hz + 1.6 - k * 0.1, 0.01, null, 10); }
  { const P2 = IS.trail; for (let k = 0; k < P2.length - 1; k++) { const [ax, az] = P2[k], [bx, bz] = P2[k + 1], len = Math.hypot(bx - ax, bz - az); for (let t = 0; t < len; t += 7) { const u = t / len, nx = -(bz - az) / len, nz = (bx - ax) / len, s = (k + Math.round(t / 7)) % 2 ? 1 : -1, x = ax + (bx - ax) * u + nx * 1.8 * s, z = az + (bz - az) * u + nz * 1.8 * s, y = isH(x, z); C(0.07, 2.2, '#201e1d', x, y + 1.1, z, 0.01, null, 6); const h = B(0.3, 0.36, 0.3, lampHead, x, y + 2.3, z, 0, 0.01); lamps.push({ h, x, y: y + 2.3, z }); ring(x, z, 0.2); } } }
  for (const l of lamps.slice(glowS.length)) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffc67a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(2.6); s.position.set(l.x, l.y, l.z); s.visible = false; scene.add(s); glowS.push(s); }

  // ---------- THE FERRY (step 6): Pearl Ferry Dock pier ↔ Pearl Island jetty, on a schedule, free (DRAFT) ----------
  const FE = LK.ferry, FP = FE.path, cum = [0]; for (let i = 1; i < FP.length; i++) cum.push(cum[i - 1] + Math.hypot(FP[i][0] - FP[i - 1][0], FP[i][1] - FP[i - 1][1])); const FLEN = cum[cum.length - 1];
  const ptAt = s => { s = clamp(s, 0, FLEN); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const u = (s - cum[i - 1]) / Math.max(1e-3, cum[i] - cum[i - 1]), [ax, az] = FP[i - 1], [bx, bz] = FP[i]; return { x: ax + (bx - ax) * u, z: az + (bz - az) * u, yaw: Math.atan2(bx - ax, bz - az) }; };
  const ferry = new THREE.Group(); scene.add(ferry);
  { const hull = B(4.4, 1.5, 11, '#f3f2f2', 0, 0.35, 0, 0, 0.03, ferry); B(4.46, 0.3, 11.06, '#ec3013', 0, 0.75, 0, 0, 0, ferry); const bow = M(new THREE.CylinderGeometry(2.2, 2.2, 1.5, 3, 1, false, -Math.PI / 6, Math.PI / 3 * 2), toon('#f3f2f2'), 0, 0.35, 5.5, ferry, 0.03); bow.scale.z = 0.9;
    B(4.2, 0.1, 10.8, '#a07a52', 0, 1.12, 0, 0, 0, ferry); B(3.4, 2.2, 3, '#2e4a6b', 0, 2.25, 2.8, 0, 0.02, ferry); B(3.6, 0.2, 3.4, '#f3f2f2', 0, 3.45, 2.8, 0, 0.01, ferry); B(3.0, 0.9, 0.06, new THREE.MeshPhongMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.6, shininess: 100 }), 0, 2.6, 4.32, 0, 0, ferry);
    for (const s of [-1, 1]) { B(0.08, 0.08, 10.4, '#201e1d', s * 2.1, 2.1, 0, 0, 0, ferry); for (let z = -5; z <= 5; z += 1.3) C(0.035, 1.0, '#201e1d', s * 2.1, 1.6, z, 0, ferry, 5); B(0.6, 0.45, 4, '#a07a52', s * 1.5, 1.4, -2.2, 0, 0.01, ferry); }
    const sg = CT(512, 96, (g, w, h) => { g.fillStyle = '#ec3013'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = '900 60px Archivo, sans-serif'; g.textBaseline = 'middle'; g.fillText('PEARL FERRY', 24, h / 2 + 3, w - 40); }); for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.56), new THREE.MeshBasicMaterial({ map: sg })); p.position.set(s * 1.72, 3.0, 2.8); p.rotation.y = s * Math.PI / 2; ferry.add(p); }
    const crew = kit.makeFox({ key: 'ferryCrew', torso: ['#f3f2f2', '#2e4a6b', '#16263c'], outfit: 'vest', look: { ...PLAYER_MALE, fur: '#d86a26' } }); crew.position.set(0, 1.15, 3.2); ferry.add(crew); npcs.push(crew); }
  const FS = { s: 0, dir: 1, phase: 'dwell', t: FE.dwell * 0.5, x: FP[0][0], z: FP[0][1], yaw: 0, v: 0, at: 0, rider: false };
  const ferryStop = () => FS.phase === 'dwell' ? FE.stops[FS.at] : null;
  function ferryStep(dt, t) { if (FS.phase === 'dwell') { FS.t -= dt; FS.v = 0; if (FS.t <= 0) { FS.phase = 'run'; FS.dir = FS.at === 0 ? 1 : -1; tone(150, 0.9, 0.06, 'sawtooth'); tone(190, 0.9, 0.04, 'sawtooth'); } }
    else { const left = FS.dir > 0 ? FLEN - FS.s : FS.s, done = FLEN - left, vmax = Math.min(FE.speed, Math.sqrt(2 * FE.accel * Math.max(0, left)) + 0.3, Math.sqrt(2 * FE.accel * done) + 0.6); FS.v = damp(FS.v, vmax, 2, dt); FS.s += FS.dir * FS.v * dt;
      if ((FS.dir > 0 && FS.s >= FLEN) || (FS.dir < 0 && FS.s <= 0)) { FS.s = FS.dir > 0 ? FLEN : 0; FS.phase = 'dwell'; FS.t = FE.dwell; FS.at = FS.dir > 0 ? 1 : 0; FS.arrived = FE.stops[FS.at]; } }
    const p = ptAt(FS.s); FS.x = p.x; FS.z = p.z; if (FS.phase === 'run') { const ty = p.yaw + (FS.dir < 0 ? Math.PI : 0); FS.yaw += Math.atan2(Math.sin(ty - FS.yaw), Math.cos(ty - FS.yaw)) * Math.min(1, dt * 1.2); }
    ferry.position.set(FS.x, -0.25 + Math.sin(t * 1.3) * 0.06, FS.z); ferry.rotation.set(Math.sin(t * 0.9) * 0.012, FS.yaw, Math.sin(t * 1.1) * 0.02);
    if (FS.v > 1.5 && Math.random() < dt * 14) wake(FS.x - Math.sin(FS.yaw) * 6, FS.z - Math.cos(FS.yaw) * 6, 2, 5, 2, 0.4); }
  const ferryBlock = (x, z) => Math.hypot(x - FS.x, z - FS.z) < 7.5;
  function nearFerry(P) { const st = ferryStop(); if (!st || FS.rider) return null; return Math.hypot(P.x - st.off[0], P.z - st.off[1]) < 4.5 && Math.abs(P.y - st.off[2]) < 1.2 ? st : null; }
  function ferryBoard() { FS.rider = true; }
  function ferryRide(P) { ferry.updateMatrixWorld(true); const p = ferry.localToWorld(V3(1.5, 1.6, -2.2)); P.x = p.x; P.z = p.z; P.y = p.y - 0.3; P.yaw = FS.yaw + Math.PI / 2; P.sp = 0; P.ground = true; P.swim = false; P.vy = 0; }
  function ferryOff(P) { const st = ferryStop() || FE.stops[FS.at]; FS.rider = false; Object.assign(P, { x: st.off[0], z: st.off[1], y: st.off[2], yaw: st.off[3], vy: 0 }); return st; }
  const ferryStatus = () => FS.phase === 'dwell' ? { at: FE.stops[FS.at].label, leaves: Math.ceil(FS.t), next: FE.stops[1 - FS.at].label } : { to: FE.stops[FS.dir > 0 ? 1 : 0].label, eta: Math.ceil((FS.dir > 0 ? FLEN - FS.s : FS.s) / Math.max(2, FS.v)) };

  // ---------- per-frame ----------
  let wakeT = 0, night = null, cullT = 0;
  function tick(dt, t, P, isNight) {
    if (rip) { rip.offset.x = (t * 0.004) % 1; rip.offset.y = (t * 0.0025) % 1; }
    if (isNight !== night) { night = isNight; lampHead.color.set(night ? 0xffd28a : 0x8a7a5a); for (const s of glowS) s.visible = night; }
    cullT -= dt; if (cullT <= 0) { cullT = 0.5; for (const r of rooms) r.g.visible = Math.hypot(P.x - r.cx, P.z - r.cz) < 70; }
    for (const f of npcs) if (f.parent && f.parent.visible !== false) kit.animFox(f, dt, 0, false);
    ferryStep(dt, t); for (const o of outs) { const d = Math.hypot(P.x - o.x, P.z - o.z); o.f.visible = d < (touch ? 60 : 95); if (!o.f.visible) continue; const want = d < 6 ? Math.atan2(P.x - o.x, P.z - o.z) : o.yaw0; o.yaw += Math.atan2(Math.sin(want - o.yaw), Math.cos(want - o.yaw)) * Math.min(1, dt * 4); o.f.rotation.y = o.yaw; kit.animFox(o.f, dt, 0, false); }
    for (const b of buoys) { b.g.position.y = Math.sin(t * 1.6 + b.ph) * 0.12; b.g.rotation.z = Math.sin(t * 1.1 + b.ph) * 0.05; }
    // boat at rest bobs, slows down
    if (!BT.on) { BT.speed = damp(BT.speed, 0, 1.2, dt); BT.vx = damp(BT.vx, 0, 1.2, dt); BT.vz = damp(BT.vz, 0, 1.2, dt); BT.steer = damp(BT.steer, 0, 3, dt); const nx = BT.x + BT.vx * dt, nz = BT.z + BT.vz * dt; if (okAt(nx, nz, BT.yaw)) { BT.x = nx; BT.z = nz; } }
    placeBody(); BT.pl = damp(BT.pl, clamp((Math.abs(BT.speed) - 4) / 10, 0, 1), 3, dt); BT.kick = damp(BT.kick, 0, 5, dt);
    boat.position.set(BT.x, 0.08 + Math.sin(t * 1.7 + BT.x * 0.1) * 0.05 * (1 - BT.pl), BT.z); boat.rotation.y = BT.yaw;
    BV.spin.rotation.x = -(BT.pl * 0.09 + (BT.nitro > 0 ? 0.06 : 0)) + BT.kick * 0.05 + Math.sin(t * 1.3) * 0.015; BV.spin.rotation.z = -BT.steer * 0.12 * BT.pl + Math.sin(t * 1.1 + 1) * 0.02; BV.spin.position.y = -0.2 + BT.pl * 0.14;
    if (BV.prop) BV.prop.rotation.z += (2 + Math.abs(BT.speed) * 2.6) * dt * (BT.on ? 1 : 0); if (BV.trim) BV.trim.rotation.x = -BT.pl * 0.14; if (BV.wheel) BV.wheel.rotation.z = BT.steer * 1.8; if (BV.flag) BV.flag.rotation.y = Math.sin(t * (6 + Math.abs(BT.speed) * 0.4)) * 0.22 * (0.4 + BT.pl);
    wakeT -= dt; const sp = Math.abs(BT.speed);
    if (sp > 2 && wakeT <= 0) { wakeT = BT.nitro > 0 ? 0.035 : 0.06; const hx = Math.sin(BT.yaw), hz = Math.cos(BT.yaw); wake(BT.x - hx * 3.4, BT.z - hz * 3.4, 1.4, 3 + sp * 0.22, 1.8, 0.55 * Math.min(1, sp / 8)); }
    else if (P.swim && wakeT <= 0) { wakeT = P.sp > 0.5 ? 0.45 : 1.3; wake(P.x, P.z, 0.6, 2.2, 1.4, P.dive > 0 ? 0.15 : 0.45); }
    for (const w of wakes) { if (!w.m.visible) continue; w.t += dt; const k = w.t / w.life; if (k >= 1) { w.m.visible = false; continue; } const s = w.s0 + (w.s1 - w.s0) * Math.sqrt(k); w.m.scale.set(s, s, 1); w.m.material.opacity = w.op * (1 - k); }
    if (eng) { const e = eng; e.o1.frequency.setTargetAtTime(48 + sp * 5 + (BT.nitro > 0 ? 25 : 0), e.c.currentTime, 0.08); e.o2.frequency.setTargetAtTime(48 + sp * 5 + (BT.nitro > 0 ? 25 : 0), e.c.currentTime, 0.08); e.lp.frequency.setTargetAtTime(380 + sp * 40, e.c.currentTime, 0.1); e.g.gain.setTargetAtTime(0.025 + Math.abs(BT.thr) * 0.03 + (BT.nitro > 0 ? 0.02 : 0), e.c.currentTime, 0.1); }
  }

  // ---------- driving (called by the walk while you are at the wheel) ----------
  function drive(dt, ix, iy, P) {
    const thr = clamp(iy, -1, 1), str = clamp(ix, -1, 1), cap = BT.speed > S.max ? Math.max(S.max, BT.speed - dt * 6) : S.max; BT.thr = thr; BT.steer = damp(BT.steer, str, 6, dt); BT.ncd -= dt;
    if (BT.nitro > 0) { BT.nitro -= dt; BT.speed = damp(BT.speed, S.nitro, 2.5, dt); }
    else if (thr > 0.05) BT.speed += 8 * thr * dt * (BT.speed < 0 ? 2 : 1);
    else if (thr < -0.05) BT.speed += (BT.speed > 0 ? 12 : 4) * thr * dt;
    else BT.speed = damp(BT.speed, 0, 0.5, dt);
    BT.speed = clamp(BT.speed, -S.rev, BT.nitro > 0 ? S.nitro : cap);
    if (BT.spin > 0) { BT.spin -= dt; BT.yaw += BT.spinDir * Math.PI / 0.6 * dt; if (Math.random() < 0.5) wake(BT.x + (Math.random() - 0.5) * 3, BT.z + (Math.random() - 0.5) * 3, 1, 4, 1.2, 0.5); }
    else { const k = clamp(Math.abs(BT.speed) / 5, 0, 1) * (1 - 0.35 * clamp((Math.abs(BT.speed) - 12) / 16, 0, 1)); BT.yaw -= BT.steer * 1.7 * k * (BT.speed < -0.2 ? -1 : 1) * dt; }
    const hx = Math.sin(BT.yaw), hz = Math.cos(BT.yaw), gk = Math.min(1, dt * (BT.spin > 0 ? 0.8 : 2.4)); BT.vx += (hx * BT.speed - BT.vx) * gk; BT.vz += (hz * BT.speed - BT.vz) * gk;
    const nx = BT.x + BT.vx * dt, nz = BT.z + BT.vz * dt;
    if (okAt(nx, nz, BT.yaw)) { BT.x = nx; BT.z = nz; } else { if (Math.hypot(BT.vx, BT.vz) > 3) { tone(90, 0.25, 0.12, 'triangle'); splash(0.1); } BT.speed *= -0.3; BT.vx *= -0.3; BT.vz *= -0.3; BT.nitro = 0; BT.kick = 1; }
    boat.position.x = BT.x; boat.position.z = BT.z; boat.rotation.y = BT.yaw; boat.updateMatrixWorld(true);
    const p = BV.spin.localToWorld(V3(0, 0.3, -0.62)); P.x = p.x; P.z = p.z; P.y = p.y; P.yaw = BT.yaw; P.sp = Math.abs(BT.speed); P.ground = true; P.swim = false; P.vy = 0;
  }
  function nitro() { if (BT.ncd > 0 || BT.nitro > 0) return false; BT.nitro = S.nitroT; BT.ncd = S.nitroCd; BT.kick = 1; tone(140, 0.5, 0.06, 'sawtooth'); return true; }
  function powerTurn() { if (BT.spin > 0) return; BT.spin = 0.6; BT.spinDir = BT.steer > 0.15 ? -1 : 1; BT.speed *= 0.55; splash(0.14); }
  function enter() { BT.on = true; BT.spin = 0; engOn(); splash(0.06); }
  function exit(P) { if (Math.abs(BT.speed) > 3) return false; BT.on = false; BT.thr = 0; engOff(); save.setStat('meru2Boat', { x: BT.x, z: BT.z, yaw: BT.yaw });
    let best = null, bd = 7; for (const q of climbs) { const d = Math.hypot(q.edge[0] - BT.x, q.edge[1] - BT.z); if (d < bd) { bd = d; best = q; } }
    if (best) { Object.assign(P, { x: best.x, z: best.z, y: best.y, yaw: best.yaw, vy: 0 }); return 'deck'; }
    for (let r = 2.5; r < 8; r += 1) for (let a = 0; a < 6.28; a += 0.4) { const x = BT.x + Math.cos(a) * r, z = BT.z + Math.sin(a) * r; if (!inLake(x, z) || islandLand(x, z) || terrainAt(x, z) > 0.3) { if (onDeck(x, z)) continue; Object.assign(P, { x, z, y: islandLand(x, z) ? L.islandH(Math.hypot(x - I.pond.x, z - I.pond.z)) : terrainAt(x, z), vy: 0 }); return 'land'; } }
    const sx = BT.x + Math.cos(BT.yaw) * 2.2, sz = BT.z - Math.sin(BT.yaw) * 2.2; Object.assign(P, { x: sx, z: sz, y: -0.5, vy: 0 }); splash(0.12); return 'water'; }
  const nearBoat = P => !BT.on && Math.hypot(P.x - BT.x, P.z - BT.z) < (P.swim ? 3.8 : 5.4);
  const nearClimb = P => P.swim ? climbs.find(q => Math.hypot(P.x - q.edge[0], P.z - q.edge[1]) < 2.2) || null : null;
  const nearGate = () => { if (!BT.on) return false; const [gx, gz] = LK.gate.at; return Math.abs(BT.x - gx) < LK.gate.w / 2 + 2 && Math.abs(BT.z - gz) < 7; };

  function park() { if (!BT.on) return; BT.on = false; BT.thr = 0; engOff(); save.setStat('meru2Boat', { x: BT.x, z: BT.z, yaw: BT.yaw }); }
  return { spots, tick, groundAt, surfaceAt, drive, nitro, powerTurn, horn, enter, exit, park, nearBoat, nearClimb, nearGate, splash, waterOK,
    keys, nearFerry, ferryBoard, ferryRide, ferryOff, ferryStatus, ferry: FS,
    boat: BT, gate: LK.gate, stats: { climbs: climbs.length, lamps: lamps.length, piles: pileP.length } };
}
