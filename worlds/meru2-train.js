// MERU 2.0 — step 2b: THE TRAIN. A walkable 4-car elevated train on a schedule round the loop (worlds/meru2-layout.js TRAIN),
// 6 stations, each with a platform on the station side (canopy, yellow edge, railings), a glass LIFT from the street to the
// platform and a TICKET MACHINE at its foot. Walk on through the open doors, walk the cars (gangways), SIT by a window.
// Coordinates on a platform: a = metres along the track from the stop centre, ls = metres sideways toward the station.
export function buildTrain({ THREE, scene, toon, grad, CT, L, touch }) {
  const PLAT_Y = 8.5, RAIL_Y = 8.2, CARS = 4, PITCH = 15, DWELL = 22, VMAX = 18, ACC = 1.2, HALF = 32, DOORZ = [-4, 4], ROWS = [-6, -2.6, -1.4, -0.2, 1, 2.2, 6];
  const mod = (a, n) => ((a % n) + n) % n, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const E = new THREE.Euler(), Q = new THREE.Quaternion(), M4 = new THREE.Matrix4(), V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), ONE = V(1, 1, 1), Box = (a, b, c) => new THREE.BoxGeometry(a, b, c);
  function piece(geo, x, y, z, ry = 0, col) { const g = geo.index ? geo.toNonIndexed() : geo; if (g !== geo) geo.dispose(); E.set(0, ry, 0); M4.compose(V(x, y, z), Q.setFromEuler(E), ONE); g.applyMatrix4(M4);
    if (col) { const c = new THREE.Color(col), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); } return g; }
  function merge(list) { let n = 0; for (const g of list) n += g.attributes.position.count; const hasC = list.every(g => g.attributes.color), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = hasC ? new Float32Array(n * 3) : null; let o = 0;
    for (const g of list) { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (col) col.set(g.attributes.color.array, o * 3); o += c; g.dispose(); }
    const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.BufferAttribute(pos, 3)); G.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); if (col) G.setAttribute('color', new THREE.BufferAttribute(col, 3)); G.computeBoundingSphere(); return G; }
  const vc = () => new THREE.MeshToonMaterial({ gradientMap: grad, vertexColors: true }), root = new THREE.Group(); scene.add(root);

  // ---------- the loop, sampled every ~1 m ----------
  const curve = new THREE.CatmullRomCurve3(L.TRAIN.line.map(([x, z]) => V(x, 0, z)), true, 'catmullrom', 0.3), LEN = curve.getLength(), N = Math.ceil(LEN);
  const SX = new Float32Array(N), SZ = new Float32Array(N), TX = new Float32Array(N), TZ = new Float32Array(N);
  for (let i = 0; i < N; i++) { const p = curve.getPointAt(i / N), t = curve.getTangentAt(i / N), l = Math.hypot(t.x, t.z) || 1; SX[i] = p.x; SZ[i] = p.z; TX[i] = t.x / l; TZ[i] = t.z / l; }
  const at = s => { s = mod(s, LEN); const f = s / LEN * N, i = Math.floor(f) % N, j = (i + 1) % N, k = f - Math.floor(f); let tx = TX[i] + (TX[j] - TX[i]) * k, tz = TZ[i] + (TZ[j] - TZ[i]) * k; const l = Math.hypot(tx, tz) || 1; return { x: SX[i] + (SX[j] - SX[i]) * k, z: SZ[i] + (SZ[j] - SZ[i]) * k, tx: tx / l, tz: tz / l }; };

  // ---------- stops ----------
  const stops = L.TRAIN.stops.map(key => { const d = L.TRAIN.stopAt[key], b = L.BUILDINGS.find(q => q.key === key); let bi = 0, bd = 1e18; for (let i = 0; i < N; i++) { const q = (SX[i] - d.c[0]) ** 2 + (SZ[i] - d.c[1]) ** 2; if (q < bd) { bd = q; bi = i; } }
    const s = bi * LEN / N, p = at(s), bc = [(b.f[0] + b.f[1]) / 2, (b.f[2] + b.f[3]) / 2], side = Math.sign((bc[0] - p.x) * p.tz - (bc[1] - p.z) * p.tx) || 1;
    return { key, b, label: b.label, s, side, liftA: d.lift || 0, c: [p.x, p.z], lift: { y: 0.05, target: 0.05, wait: 0, trip: false, mesh: null } }; }).sort((p, q) => p.s - q.s);
  function frame(st, x, z) { if (Math.abs(x - st.c[0]) > 62 || Math.abs(z - st.c[1]) > 62) return null; const i0 = Math.round(st.s / LEN * N); let bo = 0, bd = 1e18; for (let o = -52; o <= 52; o++) { const i = mod(i0 + o, N), q = (SX[i] - x) ** 2 + (SZ[i] - z) ** 2; if (q < bd) { bd = q; bo = o; } }
    const a0 = bo * LEN / N, p = at(st.s + a0), dx = x - p.x, dz = z - p.z, l = dx * p.tz - dz * p.tx; return { a: a0 + dx * p.tx + dz * p.tz, ls: l * st.side }; }
  const toW = (st, a, ls) => { const p = at(st.s + a), l = ls * st.side; return { x: p.x + p.tz * l, z: p.z - p.tx * l, yaw: Math.atan2(p.tx, p.tz) }; };

  // ---------- track: deck, red rail, pillars (kept off roads and water, allowed in a road's centre median) ----------
  const curve6 = new THREE.CatmullRomCurve3(L.TRAIN.line.map(([x, z]) => V(x, 6, z)), true, 'catmullrom', 0.3);
  const deck = new THREE.Mesh(new THREE.TubeGeometry(curve6, Math.ceil(N / 3), 2.2, 6, true), toon('#8a8580')); root.add(deck);
  const rail = new THREE.Mesh(new THREE.TubeGeometry(curve6, Math.ceil(N / 3), 0.5, 5, true), toon('#ec3013')); rail.position.y = 2.2; root.add(rail);
  if (!touch) deck.castShadow = true;
  const segD = (x, z, p) => { let m = 1e9; for (let i = 0; i < p.length - 1; i++) { const [ax, az] = p[i], [bx, bz] = p[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); m = Math.min(m, Math.hypot(x - ax - dx * u, z - az - dz * u)); } return m; };
  const W0 = L.WATER[0].e, inLake = (x, z) => ((x - W0[0]) / W0[2]) ** 2 + ((z - W0[1]) / W0[3]) ** 2 < 1;
  const pil = []; for (let s = 0; s < LEN; s += 24) { const p = at(s), ok = L.ROADS.every(r => { const c = segD(p.x, p.z, r.p); return c > r.w / 2 + 1 || c < 1.2; }) && !inLake(p.x, p.z) && !L.BUILDINGS.some(b => p.x > b.f[0] - 1 && p.x < b.f[1] + 1 && p.z > b.f[2] - 1 && p.z < b.f[3] + 1); if (ok) pil.push([p.x, p.z]); }
  const pilI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.8, 1, 6, 8).translate(0, 3, 0), toon('#bdb7ae'), pil.length); pil.forEach(([x, z], i) => { M4.makeTranslation(x, 0, z); pilI.setMatrixAt(i, M4); }); root.add(pilI);
  const colliders = pil.map(([x, z]) => ({ c: [x, z, 1], y1: 5.5 }));

  // ---------- stations: platform, canopy, railings, lift, ticket machine, name boards ----------
  const sp = [], gp = [], glowP = [], signs = [];
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x9fd6ff, transparent: true, opacity: 0.32, depthWrite: false });
  const signTex = txt => CT(512, 112, (g, w, h) => { g.fillStyle = '#ec3013'; g.fillRect(0, 0, w, h); g.fillStyle = '#201e1d'; g.fillRect(0, 0, 16, h); g.fillStyle = '#ffffff'; g.font = '900 56px Archivo, sans-serif'; g.textBaseline = 'middle'; g.fillText(txt, 36, h / 2 + 3, w - 56); });
  const ticketTex = CT(256, 96, (g, w, h) => { g.fillStyle = '#201e1d'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd23a'; g.font = '900 40px Archivo, sans-serif'; g.textBaseline = 'middle'; g.fillText('TICKETS', 16, h / 2 + 2); });
  const ticketMat = new THREE.MeshBasicMaterial({ map: ticketTex }), machines = [];
  for (const st of stops) { const P = (a, ls, y, geo, col) => { const w = toW(st, a, ls); sp.push(piece(geo, w.x, y, w.z, w.yaw, col)); }, G = (a, ls, y, geo) => { const w = toW(st, a, ls); gp.push(piece(geo, w.x, y, w.z, w.yaw)); };
    for (let a = -HALF; a < HALF; a += 4) { const m = a + 2; P(m, 4.9, PLAT_Y - 0.25, Box(6, 0.5, 4.05), '#cfc9c0'); P(m, 2.05, PLAT_Y + 0.01, Box(0.3, 0.03, 4.05), '#ffd23a'); P(m, 5.1, 12.4, Box(5.6, 0.3, 4.05), '#ec3013');
      if (Math.abs(m - st.liftA) > 2.2) { P(m, 7.85, PLAT_Y + 1.1, Box(0.06, 0.06, 4.05), '#201e1d'); P(a, 7.85, PLAT_Y + 0.55, Box(0.08, 1.1, 0.08), '#201e1d'); }
      if ((a + HALF) % 8 === 0) { P(a, 7.5, (PLAT_Y + 12.4) / 2, Box(0.2, 12.4 - PLAT_Y, 0.2), '#201e1d'); P(a + 4, 4.9, PLAT_Y / 2, new THREE.CylinderGeometry(0.4, 0.4, PLAT_Y, 8), '#bdb7ae'); const w = toW(st, a + 4, 4.9); colliders.push({ c: [w.x, w.z, 0.5], y1: 6 }); const g2 = toW(st, m, 5); glowP.push(g2.x, 12.15, g2.z); } }
    for (const e of [-HALF, HALF]) P(e, 4.9, PLAT_Y + 0.55, Box(6, 1.1, 0.08), '#201e1d');
    for (const da of [-1.5, 1.5]) for (const ls of [7.9, 10.9]) P(st.liftA + da, ls, 6.05, Box(0.16, 12.1, 0.16), '#ffc64a');
    P(st.liftA, 9.4, 12.15, Box(3.2, 0.2, 3.2), '#201e1d'); for (const da of [-1.5, 1.5]) G(st.liftA + da, 9.4, 6.1, Box(3, 11.8, 0.04)); G(st.liftA, 10.9, 9.9, Box(0.04, 4.6, 3));
    { const w = toW(st, st.liftA, 9.4), m = new THREE.Mesh(Box(2.9, 0.2, 2.9), toon('#ffc64a')); m.position.set(w.x, 0, w.z); m.rotation.y = w.yaw; root.add(m); st.lift.mesh = m; }
    { const w = toW(st, st.liftA + 3.3, 9.6); P(st.liftA + 3.3, 9.6, 0.9, Box(0.7, 1.8, 0.6), '#ec3013'); const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.45), ticketMat); pl.position.set(w.x, 2.1, w.z); pl.rotation.y = w.yaw + st.side * Math.PI / 2; const bk = pl.clone(); bk.rotation.y += Math.PI; root.add(pl, bk); machines.push({ st, x: w.x, z: w.z }); colliders.push({ c: [w.x, w.z, 0.55], y1: 3 }); }
    { const mat = new THREE.MeshBasicMaterial({ map: signTex(st.label.toUpperCase()), color: 0xe8e8e8 }); signs.push(mat); for (const [ls, flip] of [[11.0, 0], [7.75, 1]]) { const w = toW(st, st.liftA, ls), pl = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.1), mat); pl.position.set(w.x, 11.6, w.z); pl.rotation.y = w.yaw + st.side * Math.PI / 2 + (flip ? Math.PI : 0); root.add(pl); } } }
  const infra = new THREE.Mesh(merge(sp), vc()); if (!touch) infra.castShadow = infra.receiveShadow = true; root.add(infra, new THREE.Mesh(merge(gp), glassMat));
  const radial = CT(64, 64, (g, w) => { const q = g.createRadialGradient(32, 32, 0, 32, 32, 32); q.addColorStop(0, 'rgba(255,236,190,1)'); q.addColorStop(0.3, 'rgba(255,236,190,0.4)'); q.addColorStop(1, 'rgba(255,236,190,0)'); g.fillStyle = q; g.fillRect(0, 0, w, w); });
  const glow = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(glowP, 3)), new THREE.PointsMaterial({ map: radial, size: 4, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.visible = false; root.add(glow);

  // ---------- the cars ----------
  const winMat = new THREE.MeshBasicMaterial({ color: 0x9fd6ff, transparent: true, opacity: 0.35, depthWrite: false }), leafMat = new THREE.MeshPhongMaterial({ color: 0x2b3a46, shininess: 80 });
  const cars = []; for (let k = 0; k < CARS; k++) { const body = k % 2 ? '#f3f2f2' : '#ec3013', g = new THREE.Group(); root.add(g); const base = [], roof = [], glass = [];
    const B = (list, geo, x, y, z, col) => list.push(piece(geo, x, y, z, 0, col));
    B(base, Box(3.2, 0.3, 13.8), 0, 0.15, 0, '#8a8580');
    for (const z of ROWS) for (const sd of [-1, 1]) { B(base, Box(0.7, 0.45, 0.5), sd * 1.0, 0.52, z, '#3d3b3a'); B(base, Box(0.8, 0.14, 0.56), sd * 1.0, 0.82, z, '#2e4a6b'); B(base, Box(0.8, 0.75, 0.1), sd * 1.0, 1.25, z - 0.28, '#2e4a6b'); }
    for (const ez of [-7, 7]) { const solid = (ez > 0 && k === 0) || (ez < 0 && k === CARS - 1);
      if (solid) { B(base, Box(3.2, 1.0, 0.1), 0, 0.8, ez, body); B(base, Box(3.2, 0.8, 0.1), 0, 2.8, ez, body); B(glass, Box(3.0, 1.1, 0.03), 0, 1.85, ez, null); B(base, Box(3.0, 1.0, 0.8), 0, 0.7, ez + Math.sign(ez) * 0.45, '#201e1d'); }
      else { for (const sx of [-1, 1]) B(base, Box(1.1, 2.9, 0.1), sx * 1.05, 1.75, ez, body); B(base, Box(1.0, 0.6, 0.1), 0, 2.9, ez, body); } }
    if (k < CARS - 1) B(base, Box(1.3, 2.5, 1.0), 0, 1.55, -7.5, '#201e1d');
    B(roof, Box(3.4, 0.2, 14.1), 0, 3.3, 0, '#d9d6cf'); B(roof, Box(0.3, 0.04, 11), 0, 3.18, 0, '#fff3d0'); B(roof, Box(1.6, 0.4, 3), 0, 3.6, 2, '#9aa0a6');
    const walls = {}; for (const sd of [-1, 1]) { const wl = []; for (const [z0, z1] of [[-7, -4.8], [-3.2, 3.2], [4.8, 7]]) { const len = z1 - z0, zc = (z0 + z1) / 2; B(wl, Box(0.1, 1.0, len), sd * 1.6, 0.8, zc, body); B(wl, Box(0.1, 0.8, len), sd * 1.6, 2.8, zc, body); B(glass, Box(0.03, 1.1, len), sd * 1.6, 1.85, zc, null);
        for (let z = z0; z <= z1 + 0.01; z += len / Math.max(1, Math.round(len / 1.9))) B(wl, Box(0.1, 1.1, 0.18), sd * 1.6, 1.85, clamp(z, z0 + 0.09, z1 - 0.09), body); }
      for (const dz of DOORZ) B(wl, Box(0.1, 0.6, 1.6), sd * 1.6, 2.9, dz, body); walls[sd] = new THREE.Mesh(merge(wl), vc()); g.add(walls[sd]); }
    const mb = new THREE.Mesh(merge(base), vc()), mr = new THREE.Mesh(merge(roof), vc()), mg = new THREE.Mesh(merge(glass), winMat); g.add(mb, mr, mg); if (!touch) mb.castShadow = mr.castShadow = walls[-1].castShadow = walls[1].castShadow = true;
    const leaves = []; for (const sd of [-1, 1]) for (const dz of DOORZ) { const m = new THREE.Mesh(Box(0.06, 2.3, 1.6), leafMat); m.position.set(sd * 1.68, 1.45, dz); g.add(m); leaves.push({ m, sd, dz }); }
    cars.push({ g, roof: mr, wl: walls[-1], wr: walls[1], leaves }); }
  const carF = cars.map(() => ({ x: 0, z: 0, yaw: 0 }));
  let S = stops[0].s + 22.5, v = 0, phase = 'dwell', timer = 6, cur = 0, doorOpen = 0, night = false;
  function placeCars() { for (let k = 0; k < CARS; k++) { const sk = S - k * PITCH, a = at(sk - 6), b = at(sk + 6), F = carF[k]; F.x = (a.x + b.x) / 2; F.z = (a.z + b.z) / 2; F.yaw = Math.atan2(b.x - a.x, b.z - a.z); cars[k].g.position.set(F.x, RAIL_Y, F.z); cars[k].g.rotation.y = F.yaw; } }
  const toWorldCar = (k, lx, lz) => { const F = carF[k], c = Math.cos(F.yaw), s = Math.sin(F.yaw); return { x: F.x + lx * c + lz * s, y: PLAT_Y, z: F.z - lx * s + lz * c, yaw: F.yaw }; };
  const docked = () => phase === 'dwell' && doorOpen > 0.7 ? stops[cur] : null;
  const carA = (st, k) => mod(S - k * PITCH - st.s + LEN / 2, LEN) - LEN / 2;
  function boardAt(st, a) { if (docked() !== st) return null; for (let k = 0; k < CARS; k++) { const lz = a - carA(st, k); for (const dz of DOORZ) if (Math.abs(lz - dz) < 0.7) return { car: k, x: st.side * 1.2, z: lz, yaw: Math.atan2(-st.side, 0), sit: null }; } return null; }

  // ---------- walking: ground heights, platform edges, lifts, the inside of the cars ----------
  function groundAt(x, z, y) { for (const st of stops) { const f = frame(st, x, z); if (!f) continue; const { a, ls } = f;
      if (Math.abs(a - st.liftA) <= 1.5 && ls >= 7.9 && ls <= 10.9) { if (y >= st.lift.y - 1.2) return st.lift.y; continue; }
      if (Math.abs(a) <= HALF && ls >= 1.85 && ls <= 7.95 && y > 6) return PLAT_Y; } return null; }
  function walkClamp(x0, z0, nx, nz, y) { for (const st of stops) { const f = frame(st, nx, nz); if (!f) continue; let { a, ls } = f, ch = false; const Lf = st.lift, inPad = Math.abs(a - st.liftA) <= 1.7 && ls >= 7.7 && ls <= 11.1;
      if (inPad && y < 1 && Lf.y > 0.3) return { x: x0, z: z0 };
      if (inPad && y > 0.3) { const a2 = clamp(a, st.liftA - 1.35, st.liftA + 1.35); if (a2 !== a) { a = a2; ch = true; } if (Lf.y > PLAT_Y - 0.15) { if (ls > 10.65) { ls = 10.65; ch = true; } } else if (ls < 8.15 || ls > 10.65) { ls = clamp(ls, 8.15, 10.65); ch = true; } }
      else if (y > 6 && Math.abs(a) <= HALF + 1 && ls > 1 && ls < 8.6) {
        if (Math.abs(a) > HALF) { a = Math.sign(a) * HALF; ch = true; }
        if (ls > 7.9 && (Math.abs(a - st.liftA) > 1.35 || Lf.y < PLAT_Y - 0.15)) { ls = 7.9; ch = true; }
        if (ls < 1.9) { const b = boardAt(st, a); if (b) return { x: nx, z: nz, board: b }; ls = 1.9; ch = true; } }
      if (ch) { const w = toW(st, a, ls); return { x: w.x, z: w.z }; } } return { x: nx, z: nz }; }
  function moveInCar(ab, lx, lz) { const dk = docked(), side = dk ? dk.side : 0, inDoor = DOORZ.some(d => Math.abs(lz - d) < 0.75);
    if (inDoor && side && lx * side > 1.3) { const w = toWorldCar(ab.car, side * 2.5, lz); return { exit: w }; }
    lx = clamp(lx, -(inDoor ? 1.2 : 0.55), inDoor ? 1.2 : 0.55); const gw = Math.abs(lx) < 0.5;
    if (lz > 7.5 && gw && ab.car > 0) { ab.car--; lz -= PITCH; } else if (lz < -7.5 && gw && ab.car < CARS - 1) { ab.car++; lz += PITCH; }
    lz = clamp(lz, ab.car === CARS - 1 || !gw ? -6.6 : -7.6, ab.car === 0 || !gw ? 6.6 : 7.6); ab.x = lx; ab.z = lz; return {}; }
  const nearSeat = ab => { if (ab.sit) return null; for (const z of ROWS) if (Math.abs(ab.z - z) < 0.6 && Math.abs(ab.x) < 0.7) return { x: (ab.x >= 0 ? 1 : -1) * 1.0, z }; return null; };
  const nearMachine = (x, z, y) => y < 1.5 ? (machines.find(m => Math.hypot(m.x - x, m.z - z) < 2.3) || null) : null;
  function onPlatform(x, z, y) { if (y < 6) return null; for (const st of stops) { const f = frame(st, x, z); if (f && Math.abs(f.a) <= HALF + 1 && f.ls > 1 && f.ls < 11) return st; } return null; }
  function keepOut(x, z, m = 0) { for (const st of stops) { const f = frame(st, x, z); if (f && Math.abs(f.a) < HALF + 4 + m && f.ls > -m && f.ls < 12 + m) return true; } return false; }
  function placeAt(key, mode) { const st = stops.find(q => q.key === key); if (!st) return null;
    if (mode === 'train') { const w = toW(st, st.liftA - 5, 5); return { x: w.x, z: w.z, y: PLAT_Y, yaw: w.yaw }; }
    const b = st.b, F = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }[b.face]; return { x: b.door[0] + F[0] * 3.5, z: b.door[1] + F[1] * 3.5, y: 0, yaw: Math.atan2(F[0], F[1]) }; }
  function setView(vw) { for (const c of cars) { const walk = vw && !vw.sit; c.roof.visible = !walk; c.wl.visible = !(walk && vw.camSide < 0); c.wr.visible = !(walk && vw.camSide > 0); for (const l of c.leaves) l.m.visible = !(walk && vw.camSide && l.sd === vw.camSide); } }
  function setNight(on) { night = on; winMat.color.set(on ? 0xffd99a : 0x9fd6ff); winMat.opacity = on ? 0.6 : 0.35; glow.visible = on; for (const m of signs) m.color.set(on ? 0xffffff : 0xe8e8e8); }
  function status() { const st = stops[cur], nx = stops[(cur + 1) % stops.length]; if (phase === 'dwell') return { phase, at: st, next: nx, t: Math.max(0, Math.ceil(DWELL - timer)) }; const rem = mod(st.s + 22.5 - S, LEN); return { phase, next: st, t: Math.ceil(rem / Math.max(v, 9)) }; }

  // ---------- per frame: schedule, cars, doors, lifts ----------
  function tick(dt, now) { const p = api.player;
    if (phase === 'dwell') { timer += dt; const want = timer > 1.5 && timer < DWELL - 2.5; doorOpen = clamp(doorOpen + (want ? 1.6 : -1.6) * dt, 0, 1); if (timer >= DWELL && doorOpen <= 0) { phase = 'run'; cur = (cur + 1) % stops.length; } }
    else { const tgt = stops[cur].s + 22.5, rem = mod(tgt - S, LEN), vt = Math.min(VMAX, Math.sqrt(2 * ACC * Math.max(0, rem - 0.02))); v = Math.min(v + ACC * dt, vt); const stp = v * dt;
      if (stp >= rem || rem < 0.03) { S = tgt; v = 0; phase = 'dwell'; timer = 0; if (api.onArrive) api.onArrive(stops[cur]); } else S += stp; }
    S = mod(S, LEN); placeCars();
    const side = phase === 'dwell' ? stops[cur].side : 0, e = doorOpen * doorOpen * (3 - 2 * doorOpen);
    for (const c of cars) for (const l of c.leaves) l.m.position.z = l.dz + Math.sign(l.dz) * 1.55 * (l.sd === side ? e : 0);
    for (const st of stops) { const Lf = st.lift; let onPad = false, riding = false;
      if (p && !p.ab) { const f = frame(st, p.x, p.z); if (f) { onPad = Math.abs(f.a - st.liftA) <= 1.5 && f.ls >= 7.9 && f.ls <= 10.9; riding = onPad && Math.abs(p.y - Lf.y) < 0.8;
        if (!onPad && p.y < 1 && Math.abs(f.a - st.liftA) < 4 && f.ls > 6 && f.ls < 14) Lf.target = 0.05;
        if (!onPad && p.y > 6 && Math.abs(f.a - st.liftA) < 2.5 && f.ls > 5.5) Lf.target = PLAT_Y; } }
      if (riding) { if (!Lf.trip) { Lf.wait += dt; if (Lf.wait > 0.7) { Lf.trip = true; Lf.target = Lf.y < 4 ? PLAT_Y : 0.05; } } } else if (!onPad) { Lf.trip = false; Lf.wait = 0; }
      Lf.y += clamp(Lf.target - Lf.y, -3 * dt, 3 * dt); Lf.mesh.position.y = Lf.y - 0.1; } }
  placeCars();
  const api = { toW: (key, a, ls) => toW(stops.find(q => q.key === key), a, ls), carA: (key, k) => carA(stops.find(q => q.key === key), k), stops, PLAT_Y, LEN, line: L.TRAIN.line, colliders, groundAt, walkClamp, moveInCar, toWorldCar, carF, docked, nearSeat, nearMachine, onPlatform, keepOut, placeAt, setView, setNight, status, tick, player: null, onArrive: null };
  return api;
}
