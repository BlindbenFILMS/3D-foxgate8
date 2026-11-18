// SNOW RIDES plugin for the Vehicle Workshop: skis, snowboard, sled and snowmobile.
// Same contract as vehicle-fun.js (specs / make / reset / update / pose / press), plus the SNOW HILL in the
// yard's far corner: a long white slope with slalom gates, a start hut, pine trees, falling snow, a snow
// apron with a kicker at the bottom and a timed run (start line at the crest, finish line at the base).
export function snowKit(X) {
  const { THREE, M, toon } = X;
  const red = () => toon('#ec3013'), dark = () => toon('#201e1d'), white = () => toon('#f3f2f2'), alu = () => toon('#cbd5e1'), gold = () => toon('#ffd23a'), blue = () => toon('#38bdf8'), wood = () => toon('#9a6b3c');
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const tb = (p, q, r, mat, parent, ol = 0.006) => { const d = new THREE.Vector3().subVectors(q, p), m = M(new THREE.CylinderGeometry(r, r, d.length(), 8), mat, (p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2, parent, ol); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m; };
  const glow = (col, s, parent, x, y, z) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: X.glowTex, color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); sp.scale.setScalar(s); sp.position.set(x, y, z); parent.add(sp); return sp; };
  function shell() { const root = new THREE.Group(), body = new THREE.Group(); root.add(body); const spin = new THREE.Group(); body.add(spin); const V = { wheels: [], steer: [], body, spin, seatParent: spin, noSmoke: true }; const ex = new THREE.Object3D(); spin.add(ex); V.exhaust = ex; root.userData.V = V; return { root, V, s: spin }; }
  const SNOW = 0xffffff, GLIDE = { ski: 1, snowboard: 1, sled: 1 };

  const specs = {
    ski: { name: 'SKIS', built: true, snow: true, scale: 1.5, max: 24, rev: 1, accel: 1.5, turn: 2.7, grip: 1, jump: 0, lean: 0.55, r: 0.5, cam: [6.5, 0.32], btn: ['POLE PUSH', 'SPIN', 'JUMP'],
      line: 'Starts at the top of the SNOW HILL. Push off, then gravity does the rest. Steer to carve, S = snowplough. Weave through the red and blue gates for points and beat your best run time to the finish. 1 POLE PUSH (speed). 2 SPIN: air = 360 (+40, land it or wipe out), ground = HOCKEY STOP spray. 3 JUMP. R = back to the top.' },
    snowboard: { name: 'SNOWBOARD', built: true, snow: true, scale: 1, max: 24, rev: 1, accel: 1.5, turn: 2.9, grip: 1, jump: 0, lean: 0.6, r: 0.5, cam: [6.5, 0.32], btn: ['SPRAY', 'GRAB', 'OLLIE'],
      line: 'Starts at the top of the SNOW HILL. Gravity drives, you carve. S = edge to slow down. 1 SPRAY: carve to a stop and throw a wall of snow (buries walkers). 2 GRAB: air = 360 + grab (+50, land it), ground = butter spin. 3 OLLIE. Hit the kicker at the bottom for big air. R = back to the top.' },
    sled: { name: 'SLED', built: true, snow: true, scale: 1.7, max: 26, rev: 1, accel: 1.5, turn: 1.7, grip: 1, jump: 0, lean: 0.2, r: 0.6, cam: [6.5, 0.3], btn: ['SNOWBALL', 'SPIN', 'HOP'],
      line: 'A wooden toboggan: the fastest thing down the SNOW HILL but hard to steer. Paddle with W to get going. 1 throw a SNOWBALL (bonks walkers). 2 SPIN the sled round (+20). 3 HOP. R = back to the top.' },
    snowmobile: { name: 'SNOWMOBILE', built: true, snow: true, scale: 1.5, max: 20, rev: 4, accel: 11, turn: 2.4, grip: 0.85, jump: 0, lean: 0.25, r: 1.1, cam: [8, 0.32], btn: ['SNOWBALLS', 'DONUT', 'BOOST'],
      line: 'Motor sled with a track and front skis. Climbs straight up the SNOW HILL and roosts snow everywhere. Hold 1 = SNOWBALL LAUNCHER. 2 DONUT spin (snow roost knocks walkers over). 3 BOOST (big speed, flies off the kicker).' },
  };

  // ---------- models ----------
  function skiPair(parent, len = 1.3) { const out = [];
    for (const sx of [-1, 1]) { const g = new THREE.Group(); g.position.set(sx * 0.12, 0, 0); parent.add(g);
      M(new THREE.BoxGeometry(0.11, 0.025, len), white(), 0, 0.0125, 0.05, g, 0.004); M(new THREE.BoxGeometry(0.112, 0.027, len * 0.4), red(), 0, 0.014, 0.05, g, 0);
      const tip = M(new THREE.BoxGeometry(0.11, 0.025, 0.18), white(), 0, 0.045, 0.05 + len / 2 + 0.07, g, 0.004); tip.rotation.x = -0.55;
      M(new THREE.BoxGeometry(0.13, 0.13, 0.24), toon('#1f2937'), 0, 0.09, 0, g, 0.006); M(new THREE.BoxGeometry(0.135, 0.03, 0.25), red(), 0, 0.16, 0, g, 0); out.push(g); }
    return out; }
  const B = {
    ski() { const { root, V, s } = shell(); V.skis = skiPair(s);
      V.poles = [-1, 1].map(sx => { const g = new THREE.Group(); g.position.set(sx * 0.3, 0.5, 0.05); s.add(g); M(new THREE.CylinderGeometry(0.013, 0.013, 0.62, 6), alu(), 0, -0.29, 0, g, 0.003); M(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 8), dark(), 0, 0, 0, g, 0); const bk = M(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 10), dark(), 0, -0.52, 0, g, 0); return g; });
      V.seatLocal = V3(0, 0.03, 0); V.pose = 'ski'; return root; },
    snowboard() { const { root, V, s } = shell(); const brd = new THREE.Group(); s.add(brd); V.board = brd;
      const shp = new THREE.Shape(); const L = 0.62, Wd = 0.15; shp.moveTo(-Wd, -L + 0.12); shp.quadraticCurveTo(-Wd, -L, 0, -L - 0.02); shp.quadraticCurveTo(Wd, -L, Wd, -L + 0.12); shp.lineTo(Wd * 0.88, 0); shp.lineTo(Wd, L - 0.12); shp.quadraticCurveTo(Wd, L, 0, L + 0.02); shp.quadraticCurveTo(-Wd, L, -Wd, L - 0.12); shp.lineTo(-Wd * 0.88, 0); shp.closePath();
      const geo = new THREE.ExtrudeGeometry(shp, { depth: 0.03, bevelEnabled: false }); geo.rotateX(Math.PI / 2); geo.translate(0, 0.035, 0);
      M(geo, toon('#38bdf8'), 0, 0, 0, brd, 0.006); M(new THREE.BoxGeometry(0.26, 0.032, 0.12), red(), 0, 0.022, 0, brd, 0); M(new THREE.BoxGeometry(0.2, 0.033, 0.06), white(), 0, 0.023, 0.3, brd, 0); M(new THREE.BoxGeometry(0.2, 0.033, 0.06), white(), 0, 0.023, -0.3, brd, 0);
      for (const z of [-0.2, 0.2]) { M(new THREE.BoxGeometry(0.2, 0.05, 0.12), dark(), 0, 0.06, z, brd, 0.004); M(new THREE.BoxGeometry(0.2, 0.12, 0.03), dark(), 0, 0.1, z - 0.07, brd, 0.003); }
      V.seatLocal = V3(0, 0.05, 0); V.pose = 'board'; return root; },
    sled() { const { root, V, s } = shell(); const sl = new THREE.Group(); s.add(sl); V.sled = sl; const wd = toon('#b07a45'), wd2 = toon('#8a5a2c');
      for (let i = 0; i < 5; i++) M(new THREE.BoxGeometry(0.11, 0.035, 1.25), i % 2 ? wd2 : wd, -0.24 + i * 0.12, 0.1, -0.05, sl, 0.004);
      for (let k = 0; k < 6; k++) { const a = k / 5 * Math.PI * 0.9, r = 0.22; const sl2 = M(new THREE.BoxGeometry(0.58, 0.035, 0.09), k % 2 ? wd2 : wd, 0, 0.1 + r - Math.cos(a) * r, 0.6 + Math.sin(a) * r, sl, 0.004); sl2.rotation.x = -a; }
      for (const sx of [-1, 1]) { tb(V3(sx * 0.27, 0.02, -0.68), V3(sx * 0.27, 0.02, 0.55), 0.022, red(), sl, 0.004); for (const z of [-0.5, 0, 0.45]) tb(V3(sx * 0.27, 0.02, z), V3(sx * 0.25, 0.09, z), 0.016, red(), sl, 0); }
      for (const z of [-0.45, 0.2]) M(new THREE.BoxGeometry(0.6, 0.03, 0.06), wd2, 0, 0.13, z, sl, 0.003);
      const rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(-0.28, 0.42, 0.78), V3(-0.2, 0.24, 0.25), V3(0.2, 0.24, 0.25), V3(0.28, 0.42, 0.78)]), new THREE.LineBasicMaterial({ color: 0xffd23a })); sl.add(rope);
      V.seatLocal = V3(0, 0.13, 0.25); V.pose = 'sled'; return root; },
    snowmobile() { const { root, V, s } = shell(); const R = toon('#ec3013'), K = toon('#201e1d');
      // track + rear tunnel
      const trk = M(new THREE.BoxGeometry(0.5, 0.3, 1.4), toon('#2a2826'), 0, 0.17, -0.45, s, 0.012); const lugs = new THREE.Group(); s.add(lugs); V.lugs = lugs;
      for (let i = 0; i < 9; i++) M(new THREE.BoxGeometry(0.52, 0.04, 0.05), toon('#4b4845'), 0, 0.02, -1.1 + i * 0.16, lugs, 0);
      M(new THREE.BoxGeometry(0.62, 0.08, 1.5), K, 0, 0.36, -0.45, s, 0.01); M(new THREE.BoxGeometry(0.42, 0.18, 0.9), K, 0, 0.5, -0.35, s, 0.01); M(new THREE.BoxGeometry(0.44, 0.06, 0.9), toon('#3a3836'), 0, 0.6, -0.35, s, 0.006);
      // hood + nose
      const hood = M(new THREE.BoxGeometry(0.72, 0.36, 0.8), R, 0, 0.5, 0.45, s, 0.015); M(new THREE.BoxGeometry(0.6, 0.25, 0.4), R, 0, 0.38, 0.95, s, 0.012).rotation.x = 0.35; M(new THREE.BoxGeometry(0.73, 0.06, 0.82), white(), 0, 0.5, 0.45, s, 0);
      const ws = M(new THREE.BoxGeometry(0.6, 0.32, 0.02), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.5 }), 0, 0.82, 0.32, s, 0); ws.rotation.x = -0.5;
      const hl = M(new THREE.BoxGeometry(0.24, 0.1, 0.03), gold(), 0, 0.5, 0.86, s, 0); glow(0xfff1b3, 0.8, s, 0, 0.5, 0.92); tb(V3(-0.32, 0.78, 0.15), V3(0.32, 0.78, 0.15), 0.022, alu(), s, 0.004); tb(V3(0, 0.66, 0.2), V3(0, 0.78, 0.15), 0.025, alu(), s, 0.004);
      // front skis on struts (they steer)
      V.fskis = [-1, 1].map(sx => { const g = new THREE.Group(); g.position.set(sx * 0.45, 0, 0.75); s.add(g); M(new THREE.BoxGeometry(0.12, 0.03, 0.85), K, 0, 0.02, 0, g, 0.005); const tip = M(new THREE.BoxGeometry(0.12, 0.03, 0.2), K, 0, 0.07, 0.48, g, 0.005); tip.rotation.x = -0.6; tb(V3(0, 0.03, 0), V3(-sx * 0.15, 0.36, -0.1), 0.03, alu(), g, 0.004); return g; });
      const ex = V.exhaust; ex.position.set(0.2, 0.35, -1.2);
      V.muzzle = new THREE.Object3D(); V.muzzle.position.set(0, 0.7, 0.95); s.add(V.muzzle);
      V.seatLocal = V3(0, 0.62, -0.3); V.pose = 'sledmob'; return root; },
  };

  // ---------- the SNOW HILL scenery (built once, the first time the yard asks) ----------
  let built = false, flakes = null, gates = [], best = {};
  try { best = JSON.parse(localStorage.getItem('meru.snow.best.v1') || '{}') || {}; } catch (e) { best = {}; }
  const HILL = () => X.snowHill;
  function hillW(lz) { const H = HILL(); return { x: H.x + Math.sin(H.yaw) * lz, z: H.z + Math.cos(H.yaw) * lz }; } // local slope distance -> world (yaw = PI: up the hill is -z)
  function pine(x, z, s = 1, parent = X.scene) { const g = new THREE.Group(); g.position.set(x, X.groundH(x, z), z); parent.add(g); M(new THREE.CylinderGeometry(0.15 * s, 0.2 * s, 0.8 * s, 8), wood(), 0, 0.4 * s, 0, g, 0.01);
    for (let i = 0; i < 3; i++) { const r = (1.3 - i * 0.33) * s, y = (0.8 + i * 0.85) * s; M(new THREE.ConeGeometry(r, 1.3 * s, 10), toon('#2f6b45'), 0, y + 0.55 * s, 0, g, 0.02); M(new THREE.ConeGeometry(r * 0.55, 0.55 * s, 10), white(), 0, y + 0.95 * s, 0, g, 0); } return g; }
  function flagTex(txt, bg, fg = '#ffffff') { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 512, 128); g.fillStyle = fg; g.font = '900 78px Archivo, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  function banner(txt, x, z, w, h, bg, y) { const g = new THREE.Group(); g.position.set(x, 0, z); X.scene.add(g); const gy = y != null ? y : X.groundH(x, z);
    for (const sx of [-1, 1]) M(new THREE.CylinderGeometry(0.12, 0.12, h + 0.6, 8), dark(), sx * w / 2, gy + (h + 0.6) / 2, 0, g, 0.01);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.1), new THREE.MeshBasicMaterial({ map: flagTex(txt, bg), side: THREE.FrontSide })); b.position.set(0, gy + h, 0.02); b.rotation.y = Math.PI; g.add(b); const b2 = b.clone(); b2.rotation.y = 0; b2.position.z = -0.02; g.add(b2); return g; }
  function build() { const H = HILL(); if (built || !H) return; built = true; const S = X.scene;
    // snow apron at the foot of the hill (low friction, white)
    const AP = X.snowApron = { x0: H.x - H.w / 2 - 4, x1: H.x + H.w / 2 + 3, z0: H.z - 2, z1: H.z + 20 };
    const ap = new THREE.Mesh(new THREE.PlaneGeometry(AP.x1 - AP.x0, AP.z1 - AP.z0), toon('#f6f8fb')); ap.rotation.x = -Math.PI / 2; ap.position.set((AP.x0 + AP.x1) / 2, 0.012, (AP.z0 + AP.z1) / 2); ap.receiveShadow = true; S.add(ap);
    // slalom gates down the slope: alternating red / blue, 4 m wide
    gates = []; const n = 5;
    for (let i = 0; i < n; i++) { const lz = H.l - 6 - i * (H.l - 10) / (n - 1), p = hillW(lz), gx = p.x + (i % 2 ? 4.5 : -4.5), gz = p.z, col = i % 2 ? '#2563eb' : '#ec3013', g = new THREE.Group(); g.position.set(gx, 0, gz); S.add(g); const y = X.groundH(gx, gz);
      for (const sx of [-1, 1]) { M(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 8), toon(col), sx * 2, y + 0.85, 0, g, 0.006); const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); fl.position.set(sx * 2 - sx * 0.35, y + 1.45, 0); g.add(fl); }
      gates.push({ x: gx, z: gz, w: 4, g, i }); }
    // start hut + start / finish banners
    const top = hillW(H.l + H.top * 0.55), hut = new THREE.Group(); hut.position.set(H.x + H.w / 2 - 3.2, H.h, top.z); S.add(hut);
    M(new THREE.BoxGeometry(3, 2.2, 2.4), wood(), 0, 1.1, 0, hut, 0.02); const rf = M(new THREE.ConeGeometry(2.4, 1.2, 4), white(), 0, 2.8, 0, hut, 0.02); rf.rotation.y = Math.PI / 4; M(new THREE.BoxGeometry(0.8, 1.4, 0.05), dark(), -0.6, 0.7, 1.22, hut, 0);
    const st = hillW(H.l); banner('START', st.x, st.z - 0.6, H.w * 0.7, 3, '#201e1d', H.h);
    const fin = hillW(-2); banner('FINISH', fin.x, fin.z, H.w * 0.9, 3.6, '#ec3013', 0); X.snowFinishZ = fin.z; X.snowStartZ = st.z;
    // pine trees round the hill
    for (let i = 0; i < 6; i++) { const p = hillW(4 + i * 6); pine(H.x - H.w / 2 - 2.2, p.z + (i % 2) * 1.5, 0.9 + (i % 3) * 0.15); if (H.x + H.w / 2 + 2 < 68) pine(H.x + H.w / 2 + 1.8, p.z - 1, 0.8 + (i % 2) * 0.2); }
    for (const dx of [-H.w / 2 + 2, -H.w / 2 + 5]) { const p = hillW(H.l + H.top - 2); pine(H.x + dx, p.z, 0.9); }
    // falling snow over the hill corner
    const N = 900, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = AP.x0 - 2 + Math.random() * (AP.x1 - AP.x0 + 4); pos[i * 3 + 1] = Math.random() * 20; pos[i * 3 + 2] = (H.z - H.l - H.top - 2) + Math.random() * (AP.z1 - (H.z - H.l - H.top - 2)); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); flakes = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.9, depthWrite: false })); flakes.frustumCulled = false; S.add(flakes); flakes.userData.y0 = 0; }
  function onSnow(x, z) { if (X.snowEverywhere) return true; const H = HILL(); if (!H) return false; const AP = X.snowApron; if (AP && x > AP.x0 && x < AP.x1 && z > AP.z0 && z < AP.z1) return true; const dx = x - H.x, dz = z - H.z, lx = dx * Math.cos(H.yaw) - dz * Math.sin(H.yaw), lz = dx * Math.sin(H.yaw) + dz * Math.cos(H.yaw); return Math.abs(lx) < H.w / 2 && lz > 0 && lz < H.l + H.top; }

  // ---------- shared state ----------
  let F = {}; const balls = [];
  const RUN = { on: false, t0: 0, gates: 0, miss: 0, last: null };
  function knock(x, z, r, pow, text) { let n2 = 0; for (const n of X.npcs) { const d = Math.hypot(n.x - x, n.z - z); if (n.st === 'walk' && d < r) { X.npcDown(n, (n.x - x) / (d || 1) * pow, (n.z - z) / (d || 1) * pow, text); n2++; } } return n2; }
  function snowPuff(x, y, z, n = 6, sp = 3, size = 0.6, life = 0.7) { X.puff(X.tmp.set(x, y, z), SNOW, n, sp, size, life); }
  function sfx(kind) { const a = X.audio; if (kind === 'swish') a.burst(0.18, 2600, 0.06); else if (kind === 'spray') a.burst(0.45, 1800, 0.18); else if (kind === 'land') a.burst(0.2, 700, 0.18); else if (kind === 'pop') a.tone(700, 0.08, 0.04, 'triangle', 1.6); else if (kind === 'ding') a.tone(1320, 0.12, 0.05, 'triangle', 1.4); else if (kind === 'thud') a.burst(0.15, 500, 0.15); }
  function throwBall(from, dir, speed = 20) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), toon('#ffffff')); m.position.copy(from); X.scene.add(m); balls.push({ m, v: dir.clone().multiplyScalar(speed).add(V3(0, 3.5, 0)), life: 2.2 }); sfx('pop'); }
  function updBalls(dt) { for (let i = balls.length - 1; i >= 0; i--) { const b = balls[i], p = b.m.position; b.life -= dt; b.v.y -= 12 * dt; p.addScaledVector(b.v, dt); let hit = false;
      for (const n of X.npcs) if (n.st === 'walk' && Math.hypot(n.x - p.x, n.z - p.z) < 0.7 && p.y < 2) { X.npcDown(n, b.v.x * 0.3, b.v.z * 0.3, 'SNOWBALLED!'); X.St.score += 15; X.popup(X.tmp.set(n.x, 2.6, n.z), 'SNOWBALL +15', '#0e7fb8'); hit = true; break; }
      if (!hit) for (const o of X.props) if (!o.dead && Math.hypot(o.x - p.x, o.z - p.z) < (o.r || 1) && p.y < (o.h || 1.4)) { if (o.kind === 'crate') X.smash(o, 'snowball'); hit = true; break; }
      if (hit || p.y < X.groundH(p.x, p.z) + 0.05 || b.life <= 0) { snowPuff(p.x, Math.max(0.2, p.y), p.z, 8, 2.5, 0.5, 0.5); sfx('thud'); X.scene.remove(b.m); balls.splice(i, 1); } } }

  // timed run: crest (start line) -> base (finish line), gates in between
  function runTrack(px, pz) { const C = X.C, H = HILL(); if (!H || !GLIDE[X.St.key]) return; const sZ = X.snowStartZ, fZ = X.snowFinishZ, inX = Math.abs(C.x - H.x) < H.w / 2 + 3;
    if (pz < sZ && C.z >= sZ && inX) { RUN.on = true; RUN.t0 = X.St.t; RUN.gates = 0; RUN.miss = 0; RUN.hit = new Set(); X.popup(X.tmp.set(C.x, C.y + 2.8, C.z), 'GO!', '#ffd23a'); sfx('ding'); }
    if (!RUN.on) return;
    for (const g of gates) if (!RUN.hit.has(g) && pz < g.z && C.z >= g.z) { RUN.hit.add(g); if (Math.abs(C.x - g.x) < g.w / 2) { RUN.gates++; X.St.score += 25; X.popup(X.tmp.set(C.x, C.y + 2.6, C.z), 'GATE ' + RUN.gates + ' +25', g.i % 2 ? '#2563eb' : '#ec3013'); sfx('ding'); } else { RUN.miss++; X.popup(X.tmp.set(C.x, C.y + 2.6, C.z), 'MISSED GATE', '#9ca3af'); } }
    if (pz < fZ && C.z >= fZ) { RUN.on = false; if (!inX) return; const t = X.St.t - RUN.t0, k = X.St.key, nb = best[k] == null || t < best[k], clean = RUN.miss === 0 && RUN.gates === gates.length; RUN.last = t; if (nb) { best[k] = t; try { localStorage.setItem('meru.snow.best.v1', JSON.stringify(best)); } catch (e) {} }
      const pts = 50 + (clean ? 100 : 0); X.St.score += pts; X.popup(X.tmp.set(C.x, C.y + 3.4, C.z), (nb ? 'NEW BEST ' : 'FINISH ') + t.toFixed(2) + ' s', nb ? '#ffd23a' : '#0e7fb8'); setTimeout(() => X.popup(X.tmp.set(X.C.x, X.C.y + 3, X.C.z), clean ? 'CLEAN RUN +' + pts : RUN.gates + '/' + gates.length + ' GATES +' + pts, clean ? '#ec3013' : '#201e1d'), 700); sfx('ding'); }
    if (C.z < sZ - 3 || C.z > fZ + 30) RUN.on = false; }

  // gravity glide on snow: speed comes from the slope, friction is low on snow and high on concrete
  function glide(dt, thr, o) { const C = X.C, fx = Math.sin(C.yaw), fz = Math.cos(C.yaw);
    if (!C.ground) { F.v = C.speed; return; }
    if (F.v == null) F.v = C.speed;
    const ghF = X.groundH(C.x + fx * 0.8, C.z + fz * 0.8), ghB = X.groundH(C.x - fx * 0.8, C.z - fz * 0.8), sl = (ghF - ghB) / 1.6, snow = onSnow(C.x, C.z);
    let v = F.v; v += -sl / Math.sqrt(1 + sl * sl) * 9.8 * o.g * dt;
    if (F.wipe > 0) { v = X.damp(v, 0, 3, dt); }
    else { if (thr > 0.05 && v < o.push) v = Math.min(o.push, v + o.pushA * thr * dt); if (thr < -0.05) { v -= o.brake * -thr * dt * Math.sign(v || 1); if (Math.abs(v) < 0.6) v = X.damp(v, -thr * -0.8, 2, dt); if (snow && Math.abs(v) > 3 && Math.random() < 0.5) snowPuff(C.x + fx * 0.6, 0.15 + C.y, C.z + fz * 0.6, 1, 2, 0.4, 0.4); } }
    const fr = (snow ? o.fric : 2.6) + 0.0024 * v * v + Math.abs(C.steer) * Math.abs(v) * o.carve; v -= Math.sign(v) * Math.min(Math.abs(v), fr * dt);
    v = Math.max(-1.2, Math.min(o.max, v)); F.v = v; C.speed = v;
    const sp = Math.abs(v); if (snow && sp > 4 && Math.abs(C.steer) > 0.4 && Math.random() < 0.35) { const sd = -Math.sign(C.steer); snowPuff(C.x + Math.cos(C.yaw) * sd * 0.4, C.y + 0.1, C.z - Math.sin(C.yaw) * sd * 0.4, 1, 1.5 + sp * 0.1, 0.45, 0.45); }
    if (snow && sp > 6 && Math.random() < sp * 0.004) sfx('swish');
    if (!snow && sp > 3 && Math.random() < 0.2) X.puff(X.tmp.set(C.x, 0.05, C.z), 0xff9a1a, 1, 1, 0.15, 0.2, true); }
  function jump(vy, label) { const C = X.C; if (!C.ground || F.wipe > 0) return; C.ground = false; C.y += 0.05; C.vy = vy; C.airT = 0; F.v = C.speed; sfx('pop'); if (onSnow(C.x, C.z)) snowPuff(C.x, C.y, C.z, 6, 2, 0.5, 0.5); }
  function wipe(text = 'WIPEOUT') { const C = X.C; F.wipe = 1.3; F.spT = null; F.grab = 0; X.V.spin.rotation.set(0, 0, 0); C.speed *= 0.3; F.v = C.speed; X.popup(X.tmp.set(C.x, C.y + 2.6, C.z), text, '#ec3013'); snowPuff(C.x, C.y + 0.2, C.z, 14, 4, 0.8, 0.8); sfx('land'); X.St.shake = Math.max(X.St.shake || 0, 0.35); }
  // landing check for spins: finished = points, half way round = wipeout
  function landSpin(name, pts) { const C = X.C; if (F.spT == null) return; const p = F.spT; F.spT = null; X.V.spin.rotation.set(0, 0, 0); if (p >= 0.82 || p < 0.18) { if (p >= 0.82) { X.St.score += pts; X.popup(X.tmp.set(C.x, C.y + 2.8, C.z), name + ' +' + pts, '#ffd23a'); sfx('ding'); } } else wipe(); }
  function airLand() { const C = X.C; if (C.ground && !F.wasG) { if (F.spT != null) landSpin(F.spName || '360', F.spPts || 40); if (!(F.wipe > 0)) { if ((C.airT || 0) > 0.75) { const pts = Math.round(C.airT * 10); X.St.score += pts; X.popup(X.tmp.set(C.x, C.y + 3.2, C.z), 'AIR ' + C.airT.toFixed(1) + ' s +' + pts, '#0e7fb8'); } snowPuff(C.x, C.y + 0.1, C.z, onSnow(C.x, C.z) ? 10 : 3, 3, 0.6, 0.6); sfx('land'); } } F.wasG = C.ground; }
  function spinStep(dt, dur) { if (F.spT == null) return; F.spT += dt / dur; X.V.spin.rotation.y = Math.min(1, F.spT) * Math.PI * 2 * (F.spDir || 1); if (F.spT >= 1 && !X.C.ground) { F.spT = 0.999; } }
  function groundSpin(dt, dur, pts, name) { if (F.gsT == null) return; F.gsT += dt / dur; X.V.spin.rotation.y = Math.min(1, F.gsT) * Math.PI * (F.gsFull ? 2 : 1) * (F.spDir || 1); if (F.gsT >= 1) { F.gsT = null; X.V.spin.rotation.y = 0; if (pts) { X.St.score += pts; X.popup(X.tmp.set(X.C.x, X.C.y + 2.6, X.C.z), name + ' +' + pts, '#ffd23a'); } } }
  function sprayWall(name, pts) { const C = X.C, sd = Math.sign(C.steer) || 1, fx = Math.sin(C.yaw), fz = Math.cos(C.yaw); for (let k = 0; k < 18; k++) { const a = (k / 17 - 0.5) * 1.6; snowPuff(C.x + fx * (1 + Math.cos(a)) + Math.cos(C.yaw) * Math.sin(a) * 1.4, C.y + 0.3 + Math.random() * 0.6, C.z + fz * (1 + Math.cos(a)) - Math.sin(C.yaw) * Math.sin(a) * 1.4, 1, 4 + Math.random() * 2, 0.8, 0.9); }
    sfx('spray'); const n2 = knock(C.x + fx * 1.5, C.z + fz * 1.5, 3.2, 6, 'BURIED!'); const p = pts + n2 * 20; X.St.score += p; X.popup(X.tmp.set(C.x, C.y + 2.8, C.z), name + ' +' + p, '#0e7fb8'); }

  // ---------- per-ride update ----------
  const U = {
    ski(dt, thr, sp) { const C = X.C, V = X.V; glide(dt, thr, { g: 1.6, push: 6, pushA: 5, brake: 9, fric: 0.35, carve: 0.14, max: 24 }); airLand(); spinStep(dt, 0.6); groundSpin(dt, 0.45, 0, '');
      if (F.wipe > 0) F.wipe -= dt; if (F.pole > 0) { F.pole -= dt; } if (F.stopT > 0) F.stopT -= dt;
      // skis splay into a wedge when snowploughing, scissor with the carve
      const plow = thr < -0.1 && C.ground ? 1 : 0; F.plow = X.damp(F.plow || 0, plow, 8, dt);
      V.skis.forEach((k, i) => { const sd = i ? 1 : -1; k.rotation.y = -sd * F.plow * 0.28 + (F.stopT > 0 ? Math.PI / 2 * 0.9 : 0) * 0; k.position.x = sd * (0.12 + F.plow * 0.08); k.position.z = (C.steer * sd * 0.06); });
      V.spin.rotation.z = 0; if (F.stopT > 0 && F.gsT == null) V.spin.rotation.y = X.damp(V.spin.rotation.y, Math.PI / 2 * (F.stopDir || 1), 14, dt); else if (F.spT == null && F.gsT == null) V.spin.rotation.y = X.damp(V.spin.rotation.y, 0, 10, dt);
      V.poles.forEach((p, i) => { const pp = F.pole > 0 ? Math.sin((1 - F.pole / 0.45) * Math.PI) : 0, run = C.ground && sp < 6 && thr > 0.1 ? Math.sin(X.St.t * 7 + i * Math.PI) * 0.5 : 0; p.rotation.x = 0.35 + (pp ? -0.6 + pp * 1.3 : run) + (C.ground ? 0 : 0.5); p.rotation.z = (i ? -1 : 1) * (0.12 + F.plow * 0.1); }); },
    snowboard(dt, thr, sp) { const C = X.C, V = X.V; glide(dt, thr, { g: 1.6, push: 4.5, pushA: 4, brake: 8, fric: 0.32, carve: 0.12, max: 24 }); airLand(); spinStep(dt, 0.65); groundSpin(dt, 0.5, 10, 'BUTTER');
      if (F.wipe > 0) F.wipe -= dt; if (F.sprayT > 0) F.sprayT -= dt;
      V.board.rotation.z = X.damp(V.board.rotation.z, C.ground ? -C.steer * 0.25 * Math.min(1, sp / 6) : 0, 8, dt); V.board.rotation.x = F.grab > 0 ? -0.25 : 0; if (F.grab > 0) F.grab -= dt;
      if (F.sprayT > 0 && F.gsT == null) V.spin.rotation.y = X.damp(V.spin.rotation.y, Math.PI / 2 * 0.8 * (F.stopDir || 1), 14, dt); else if (F.spT == null && F.gsT == null) V.spin.rotation.y = X.damp(V.spin.rotation.y, 0, 10, dt); },
    sled(dt, thr, sp) { const C = X.C, V = X.V; glide(dt, thr, { g: 1.75, push: 3.5, pushA: 3, brake: 6, fric: 0.28, carve: 0.08, max: 26 }); airLand(); groundSpin(dt, 0.7, 20, 'SLED SPIN'); spinStep(dt, 0.7);
      if (F.wipe > 0) F.wipe -= dt; if (F.throwT > 0) F.throwT -= dt; F.pad = (F.pad || 0) + (C.ground && thr > 0.1 && sp < 3.5 ? dt * 6 : 0);
      V.sled.rotation.z = X.damp(V.sled.rotation.z, C.ground ? -C.steer * 0.12 * Math.min(1, sp / 6) : 0, 6, dt); if (F.gsT == null && F.spT == null) V.spin.rotation.y = X.damp(V.spin.rotation.y, 0, 10, dt);
      if (C.ground && sp > 8 && onSnow(C.x, C.z) && Math.random() < 0.3) snowPuff(C.x - Math.sin(C.yaw) * 0.8, C.y + 0.1, C.z - Math.cos(C.yaw) * 0.8, 1, 1.5, 0.5, 0.5); },
    snowmobile(dt, thr, sp) { const C = X.C, V = X.V; airLand(); if (F.boost > 0) { F.boost -= dt; C.speed = Math.max(C.speed, 27); if (Math.random() < 0.7) X.puff(X.tmp.set(C.x - Math.sin(C.yaw) * 1.4, C.y + 0.4, C.z - Math.cos(C.yaw) * 1.4), 0xff8a1a, 1, 1, 0.5, 0.3, true); if (F.boost <= 0) C.speed = Math.min(C.speed, 20); }
      if (F.bcd > 0) F.bcd -= dt; if (F.fire > 0) F.fire -= dt;
      V.lugs.position.z = ((V.lugs.position.z || 0) - C.speed * dt * 0.6) % 0.16; V.fskis.forEach(k => { k.rotation.y = -C.steer * 0.35; });
      const snow = onSnow(C.x, C.z); if (C.ground && sp > 1.5 && (snow || Math.random() < 0.3)) { const bx = C.x - Math.sin(C.yaw) * 1.5, bz = C.z - Math.cos(C.yaw) * 1.5; snowPuff(bx, C.y + 0.3, bz, snow ? 2 : 1, 2 + sp * 0.15, 0.55, 0.6); }
      if (X.holds.b1 && F.fire <= 0 && !(F.donut != null)) { F.fire = 0.22; X.veh.updateMatrixWorld(true); const p = X.V.muzzle.getWorldPosition(new THREE.Vector3()); throwBall(p, V3(Math.sin(C.yaw), 0, Math.cos(C.yaw)), 22 + Math.max(0, C.speed)); }
      if (F.donut != null) { F.donut += dt / 1.1; C.yaw += dt * 6.2 * (F.dDir || 1); C.speed = X.damp(C.speed, 4, 3, dt); for (let k = 0; k < 2; k++) snowPuff(C.x - Math.sin(C.yaw) * 1.4, C.y + 0.4, C.z - Math.cos(C.yaw) * 1.4, 1, 5, 0.7, 0.7);
        if (!F.dHit && F.donut > 0.4) { F.dHit = true; const n2 = knock(C.x, C.z, 4.2, 7, 'ROOSTED!'); X.St.score += 20 + n2 * 20; X.popup(X.tmp.set(C.x, C.y + 2.8, C.z), 'DONUT +' + (20 + n2 * 20), '#ffd23a'); sfx('spray'); } if (F.donut >= 1) F.donut = null; } },
  };

  // ---------- rider poses ----------
  const P = {
    ski(fox, FP) { const C = X.C, sp = Math.abs(C.speed), air = !C.ground, tuck = sp > 12 && C.ground && Math.abs(C.steer) < 0.3 ? 1 : 0; F.tuck = X.damp(F.tuck || 0, tuck, 6, 1 / 60); const tk = F.tuck;
      fox.rotation.set(0, 0, 0); if (F.wipe > 0) { fox.rotation.set(-1.3, 0, 0.3); fox.position.set(0, 0.15, -0.3); FP.body.rotation.set(0, 0, 0); FP.legs.forEach((l, i) => { l.rotation.x = -0.4; l.rotation.z = (i ? 1 : -1) * 0.5; }); FP.arms.forEach((a, i) => { a.rotation.x = -2.6; a.rotation.z = (i ? 1 : -1) * 0.9; }); return; }
      FP.body.rotation.set(0.25 + tk * 0.45 + (air ? 0.15 : 0) + (F.plow || 0) * 0.1, 0, C.lean * 0.5); FP.legs.forEach((l, i) => { l.rotation.x = -0.25 - tk * 0.35 - (air ? 0.35 : 0); l.rotation.z = (i ? 1 : -1) * (0.05 + (F.plow || 0) * 0.18); });
      FP.arms.forEach((a, i) => { const pp = F.pole > 0 ? Math.sin((1 - F.pole / 0.45) * Math.PI) : 0; a.rotation.x = -0.55 - tk * 0.5 + pp * 0.9 - (air ? 0.4 : 0); a.rotation.z = (i ? 1 : -1) * (0.3 + (air && F.spT != null ? 0.6 : 0)); });
      fox.position.set(0, 0.03 - tk * 0.12, 0); },
    board(fox, FP) { const C = X.C, sp = Math.abs(C.speed), air = !C.ground, g = F.grab > 0 ? 1 : 0;
      if (F.wipe > 0) { fox.rotation.set(-1.2, Math.PI / 2 * 0.85, 0.3); fox.position.set(0, 0.15, 0); FP.body.rotation.set(0, 0, 0); FP.legs.forEach((l, i) => { l.rotation.x = -0.3; l.rotation.z = (i ? 1 : -1) * 0.4; }); FP.arms.forEach((a, i) => { a.rotation.x = -2.6; a.rotation.z = (i ? 1 : -1) * 1; }); return; }
      fox.rotation.set(0, Math.PI / 2 * 0.85, 0); FP.legs[0].rotation.x = -0.35 - (air ? 0.5 : 0) - g * 0.5; FP.legs[1].rotation.x = 0.35 + (air ? 0.2 : 0) + g * 0.2; FP.legs.forEach((l, i) => l.rotation.z = (i ? 1 : -1) * 0.14);
      FP.arms.forEach((a, i) => { a.rotation.x = g && i ? -1.6 : -0.45 - (air ? 0.3 : 0); a.rotation.z = (i ? 1 : -1) * (g && i ? 0.2 : 1.0) + C.lean * 0.7; });
      FP.body.rotation.x = 0.3 + (air ? 0.25 : 0) + g * 0.4 + (F.sprayT > 0 ? 0.25 : 0); FP.body.rotation.z = C.lean * 0.6; fox.position.set(0, 0.05 - (air ? 0.06 : 0) - g * 0.1, 0); },
    sled(fox, FP) { const C = X.C, ph = F.pad || 0, pad = C.ground && Math.abs(C.speed) < 3.5 && (F.pad || 0) > 0 && X.C.speed >= 0;
      if (F.wipe > 0) { fox.rotation.set(-1.3, 0.4, 0.2); fox.position.set(0.5, 0.15, -0.9); FP.body.rotation.set(0, 0, 0); FP.legs.forEach((l, i) => { l.rotation.x = -0.6; l.rotation.z = (i ? 1 : -1) * 0.5; }); FP.arms.forEach((a, i) => { a.rotation.x = -2.6; a.rotation.z = (i ? 1 : -1) * 0.9; }); return; }
      fox.rotation.set(0, 0, 0); FP.body.rotation.set(Math.abs(C.speed) > 10 ? -0.3 : -0.05, 0, -C.steer * 0.25); FP.legs.forEach((l, i) => { l.rotation.x = -1.45; l.rotation.z = (i ? 1 : -1) * 0.12; });
      FP.arms.forEach((a, i) => { a.rotation.x = F.throwT > 0 && i ? -2.6 : pad ? -0.3 + Math.sin(ph + i * Math.PI) * 0.6 : -1.15; a.rotation.z = (i ? 1 : -1) * (pad ? 0.7 : 0.35); }); fox.position.copy(X.V.seatLocal); },
    sledmob(fox, FP) { const C = X.C; fox.rotation.set(0, 0, 0); FP.body.rotation.set(0.3 + (F.boost > 0 ? 0.15 : 0), 0, -C.steer * 0.25); FP.legs.forEach((l, i) => { l.rotation.x = -1.2; l.rotation.z = (i ? 1 : -1) * 0.35; }); FP.arms.forEach((a, i) => { a.rotation.x = -1.25 + (i ? 1 : -1) * C.steer * 0.25; a.rotation.z = (i ? 1 : -1) * 0.22; }); fox.position.copy(X.V.seatLocal); },
  };

  // ---------- buttons ----------
  const BT = {
    ski(n, d) { const C = X.C; if (!d) return true; if (F.wipe > 0) return true;
      if (n === 1 && C.ground && !(F.pole > 0)) { F.pole = 0.45; F.v = Math.min(18, (F.v ?? C.speed) + 3.2); C.speed = F.v; sfx('swish'); if (onSnow(C.x, C.z)) snowPuff(C.x, C.y + 0.1, C.z, 4, 2, 0.4, 0.4); }
      if (n === 2) { if (!C.ground && F.spT == null) { F.spT = 0; F.spDir = C.steer > 0.2 ? -1 : 1; F.spName = '360'; F.spPts = 40; sfx('pop'); } else if (C.ground && Math.abs(C.speed) > 4 && !(F.stopT > 0)) { F.stopT = 0.5; F.stopDir = C.steer > 0 ? -1 : 1; F.v = (F.v ?? C.speed) * 0.25; C.speed = F.v; sprayWall('HOCKEY STOP', 15); } }
      if (n === 3) jump(7.5); return true; },
    snowboard(n, d) { const C = X.C; if (!d) return true; if (F.wipe > 0) return true;
      if (n === 1 && C.ground && Math.abs(C.speed) > 3 && !(F.sprayT > 0)) { F.sprayT = 0.55; F.stopDir = C.steer > 0 ? -1 : 1; F.v = (F.v ?? C.speed) * 0.3; C.speed = F.v; sprayWall('SPRAY', 15); }
      if (n === 2) { if (!C.ground && F.spT == null) { F.spT = 0; F.grab = 0.7; F.spDir = C.steer > 0.2 ? -1 : 1; F.spName = '360 GRAB'; F.spPts = 50; sfx('pop'); } else if (C.ground && F.gsT == null) { F.gsT = 0; F.gsFull = false; F.spDir = 1; sfx('swish'); } }
      if (n === 3) jump(7.8); return true; },
    sled(n, d) { const C = X.C; if (!d) return true; if (F.wipe > 0) return true;
      if (n === 1 && !(F.throwT > 0)) { F.throwT = 0.4; X.veh.updateMatrixWorld(true); const p = X.fox.getWorldPosition(new THREE.Vector3()); p.y += 0.8; throwBall(p, V3(Math.sin(C.yaw), 0, Math.cos(C.yaw)), 16 + Math.max(0, C.speed)); }
      if (n === 2 && C.ground && F.gsT == null) { F.gsT = 0; F.gsFull = true; F.spDir = C.steer > 0 ? -1 : 1; sfx('swish'); snowPuff(C.x, C.y + 0.2, C.z, 10, 3, 0.6, 0.6); }
      if (n === 3) jump(5.5); return true; },
    snowmobile(n, d) { const C = X.C; if (n === 1) return true; if (!d) return true;
      if (n === 2 && F.donut == null && C.ground) { F.donut = 0; F.dHit = false; F.dDir = C.steer > 0 ? -1 : 1; X.audio.tone(140, 0.6, 0.05, 'sawtooth', 1.5); }
      if (n === 3 && !(F.bcd > 0)) { F.boost = 1.3; F.bcd = 3.2; X.popup(X.tmp.set(C.x, C.y + 2.6, C.z), 'BOOST', '#ff8a1a'); X.audio.burst(0.5, 400, 0.2); X.audio.tone(90, 0.6, 0.06, 'sawtooth', 3); } return true; },
  };

  let lastZ = null;
  return {
    specs, has: k => !!specs[k], isSnow: k => !!specs[k],
    make(k) { build(); const r = B[k](); r.userData.V.spec = specs[k]; return r; },
    reset(k) { F = {}; for (const b of balls) X.scene.remove(b.m); balls.length = 0; RUN.on = false; build(); if (!specs[k]) return;
      const C = X.C, H = HILL(); C.ground = true; C.wheelie = 0; C.vy = 0; C.pitch = 0;
      if (H) { if (GLIDE[k]) { const p = hillW(H.l + 1.4); C.x = p.x - 2; C.z = p.z; C.y = H.h; C.yaw = H.yaw + Math.PI; } else { const p = hillW(-6); C.x = p.x + 6; C.z = p.z; C.y = 0; C.yaw = H.yaw; } X.St.yaw = C.yaw + Math.PI; C.speed = 0; }
      lastZ = C.z; },
    update(dt, thr, sp) { updBalls(dt); if (flakes) { const a = flakes.geometry.attributes.position, t = X.St.t; for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * (1.1 + (i % 5) * 0.15); if (y < 0) y += 20; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(t * 0.7 + i) * dt * 0.25); } a.needsUpdate = true; }
      const k = X.St.key, f = U[k]; if (f) { const pz = lastZ ?? X.C.z; f(dt, thr, sp); runTrack(X.C.x, pz); lastZ = X.C.z; } },
    pose(pz) { const f = P[pz]; if (!f) return false; f(X.fox, X.FP); return true; },
    press(n, down) { const f = BT[X.St.key]; return f ? f(n, down) : false; },
    lap() { const k = X.St.key; if (!GLIDE[k] || !HILL()) return null; const H = HILL(), lzNow = (X.snowStartZ - X.C.z), tot = X.snowFinishZ - X.snowStartZ; return { label: 'BEST RUN', cur: RUN.on ? +(X.St.t - RUN.t0).toFixed(1) : null, last: RUN.last != null ? +RUN.last.toFixed(2) : null, best: best[k] != null ? +best[k].toFixed(2) : null, pct: RUN.on ? Math.round(Math.max(0, Math.min(1, (X.C.z - X.snowStartZ) / tot)) * 100) : 0 }; },
  };
}

// glue: lets the lab treat several ride plugins as one FUN kit
export function mergeKits(a, b) {
  return {
    specs: { ...a.specs, ...b.specs },
    has: k => a.has(k) || b.has(k), isSnow: k => !!(b.isSnow && b.isSnow(k)),
    make: k => b.has(k) ? b.make(k) : a.make(k),
    reset(k) { a.reset(k); b.reset(k); },
    update(dt, thr, sp) { a.update(dt, thr, sp); b.update(dt, thr, sp); },
    pose: pz => b.pose(pz) || a.pose(pz),
    press(n, down) { return b.press(n, down) || a.press(n, down); },
    lap: () => b.lap ? b.lap() : null,
  };
}
