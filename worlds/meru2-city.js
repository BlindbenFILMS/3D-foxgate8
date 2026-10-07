// MERU 2.0 — step 2: TOWN SQUARE CITY CENTRE (outsides). Called by meru2-blockout.js.
// Every Town Square building as a real shell (4 walls + a top) with a facade texture (windows light up at night), a GOLD light-up
// frame round 4 × 4.5 m automatic sliding glass doors (2.5 m sensor, chime), a shop sign over every door, NOW HIRING signs,
// and the CUTAWAY: inside a building (or when the camera is), the top and the walls between camera and player fade out.
// Plus the plaza: fountain, trees, benches, city lamps with light pools, crosswalks, cars on the ring road (roads only).
// Old stone kept for Meru history: Tavern, Fortune Teller, Bank. Phone budget: merged static meshes, instanced lamps/trees/cars.
export function buildCity({ THREE, scene, camera, toon, grad, CT, L, touch, avoid = () => false }) {
  const STY = {
    tavern: { s: 'stone', base: '#b9a27e', h: 9, roof: 'hip', roofC: '#7a4a33', awn: '#7a4a33' },
    casino: { s: 'glass', base: '#2a2236', gl: ['#7b5fa3', '#2e2244'], h: 14, neon: 'neonP', roofC: '#201e1d' },
    bowling: { s: 'panel', base: '#c94c3a', h: 10, neon: 'neonB', pin: true, roofC: '#3d3b3a' },
    itemshop: { s: 'panel', base: '#e9e3d6', h: 7, awn: '#ec3013' },
    armory: { s: 'panel', base: '#6b737b', h: 7, awn: '#201e1d' },
    fortune: { s: 'stone', base: '#a99579', h: 7, dome: '#5b3f7a' },
    burgers: { s: 'panel', base: '#f0d9a8', h: 7, awn: '#ec3013' },
    police: { s: 'panel', base: '#2e4a6b', h: 12, bar: true },
    bank: { s: 'stone', base: '#ece6d8', h: 16, cols: true },
    carRental: { s: 'glass', base: '#56636e', h: 7, awn: '#ec3013' },
    crest: { s: 'glass', base: '#4f5c66', h: 34, crown: true },
    lake: { s: 'glass', base: '#43525e', h: 46, crown: true },
    stationTown: { s: 'glass', base: '#56636e', h: 8, canopy: true, sign: ['#ec3013', '#ffffff'] },
    // step 5: the lakeside buildings
    blindSchool: { s: 'stone', base: '#e8d9b8', h: 9, roof: 'hip', roofC: '#2e4a6b', awn: '#ffd23a' },
    boatworks: { s: 'panel', base: '#8b6a48', h: 9, awn: '#2e4a6b', roofC: '#3d3b3a' },
    boathouse: { s: 'panel', base: '#f3f2f2', h: 8, awn: '#ec3013', roofC: '#2e4a6b' },
    // step 7: the Barracks yard workshops
    tankWorks: { s: 'panel', base: '#6c7166', h: 9, awn: '#ffd23a', roofC: '#3d3b3a' },
    tankRange: { s: 'panel', base: '#7a7a63', h: 9, awn: '#ec3013', roofC: '#3d3b3a' },
  };
  const keys = new Set(Object.keys(STY)), RECT = [-170, 170, -150, 160];
  const T = 0.4, DW = 4, DH = 4.5, GAP = DW / 2 + 0.45, CW = 3, CH = 3.5, TU = 4 * CW, TV = 4 * CH, SIDES = ['N', 'S', 'W', 'E'];
  const FACE = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const E = new THREE.Euler(), Q = new THREE.Quaternion(), M4 = new THREE.Matrix4(), V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), ONE = V(1, 1, 1);
  const Box = (a, b, c) => new THREE.BoxGeometry(a, b, c), Cyl = (a, b, h, n = 12) => new THREE.CylinderGeometry(a, b, h, n);
  function piece(geo, x, y, z, ry = 0, rx = 0, col) { const g = geo.index ? geo.toNonIndexed() : geo; if (g !== geo) geo.dispose(); E.set(rx, ry, 0, 'YXZ'); M4.compose(V(x, y, z), Q.setFromEuler(E), ONE); g.applyMatrix4(M4);
    if (col) { const c = new THREE.Color(col), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); } return g; }
  function merge(list) { let n = 0; for (const g of list) n += g.attributes.position.count; const hasC = list.every(g => g.attributes.color);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = hasC ? new Float32Array(n * 3) : null; let o = 0;
    for (const g of list) { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); if (col) col.set(g.attributes.color.array, o * 3); o += c; g.dispose(); }
    const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.BufferAttribute(pos, 3)); G.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); G.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); if (col) G.setAttribute('color', new THREE.BufferAttribute(col, 3)); G.computeBoundingSphere(); return G; }
  const root = new THREE.Group(); scene.add(root);
  const MAT = { gold: new THREE.MeshBasicMaterial({ color: 0xffc64a }), neonP: new THREE.MeshBasicMaterial({ color: 0xb8407f }), neonB: new THREE.MeshBasicMaterial({ color: 0x3a8fa8 }) };
  const NEON = { neonP: [0xb8407f, 0xff3fb4], neonB: [0x3a8fa8, 0x52e3ff] }, matFor = k => MAT[k] || (MAT[k] = toon(k));
  const bins = {}, D = (k, geo, x, y, z, ry = 0, rx = 0) => (bins[k] || (bins[k] = [])).push(piece(geo, x, y, z, ry, rx));
  const colliders = [], doors = [], blds = [], facMats = [], signMats = [], neonMats = [], blink = [], pools = [], glowP = [], bladeMats = [], bladeGlow = [];
  const BLADE = ['#ff3fb4', '#52e3ff', '#ffd23a', '#7dff6a', '#ff6a3a', '#b98bff']; let nBlade = 0;
  const glass = new THREE.MeshPhongMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.3, shininess: 120, specular: 0xffffff, depthWrite: false });

  // ---------- facade textures: a 4 × 4 cell tile (cell = 3 m × 3.5 m), windows light up at night via the emissive map ----------
  const TS = touch ? 256 : 512, c4 = TS / 4;
  function facade(S) { const style = S.s, lit = []; for (let i = 0; i < 16; i++) lit.push(Math.random() < 0.62 ? (Math.random() < 0.7 ? '#ffd28a' : '#cfe0ff') : '#05070a');
    const shape = (g, i, j) => { const x = i * c4, y = j * c4; g.beginPath();
      if (style === 'glass') g.rect(x + c4 * 0.05, y + c4 * 0.04, c4 * 0.9, c4 * 0.78);
      else if (style === 'panel') g.rect(x + c4 * 0.14, y + c4 * 0.18, c4 * 0.72, c4 * 0.56);
      else { g.rect(x + c4 * 0.33, y + c4 * 0.36, c4 * 0.34, c4 * 0.44); g.moveTo(x + c4 * 0.67, y + c4 * 0.36); g.arc(x + c4 * 0.5, y + c4 * 0.36, c4 * 0.17, 0, Math.PI, true); } };
    const map = CT(TS, TS, g => { g.fillStyle = S.base; g.fillRect(0, 0, TS, TS);
      if (style === 'stone') { g.strokeStyle = 'rgba(60,40,20,0.2)'; g.lineWidth = Math.max(1, TS / 256); const rh = c4 / 6; for (let y = 0, r = 0; y < TS; y += rh, r++) { g.beginPath(); g.moveTo(0, y); g.lineTo(TS, y); g.stroke(); for (let x = r % 2 ? c4 / 4 : 0; x < TS; x += c4 / 2) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + rh); g.stroke(); } } }
      if (style === 'glass') { g.fillStyle = 'rgba(0,0,0,0.28)'; for (let j = 0; j < 4; j++) g.fillRect(0, j * c4 + c4 * 0.84, TS, c4 * 0.16); }
      if (style === 'panel') { g.fillStyle = 'rgba(0,0,0,0.12)'; for (let j = 0; j < 4; j++) g.fillRect(0, j * c4 + c4 * 0.9, TS, c4 * 0.1); }
      const gc = S.gl || (style === 'glass' ? ['#a8d4ea', '#5d8fae'] : ['#50646f', '#22303a']);
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const gr = g.createLinearGradient(0, j * c4, 0, (j + 1) * c4); gr.addColorStop(0, gc[0]); gr.addColorStop(1, gc[1]); g.fillStyle = gr; shape(g, i, j); g.fill();
        if (style === 'stone') { g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(i * c4 + c4 * 0.29, j * c4 + c4 * 0.8, c4 * 0.42, c4 * 0.05); } } });
    const em = CT(TS, TS, g => { g.fillStyle = '#000'; g.fillRect(0, 0, TS, TS); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = lit[j * 4 + i]; shape(g, i, j); g.fill(); } });
    for (const t of [map, em]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return style === 'glass' ? new THREE.MeshPhongMaterial({ map, emissiveMap: em, emissive: 0x000000, shininess: 60, specular: 0x556677 }) : new THREE.MeshToonMaterial({ gradientMap: grad, map, emissiveMap: em, emissive: 0x000000 }); }
  function wallGeo(len, hh, uoff, y0) { const g = Box(len, hh, T), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uoff + uv.getX(i) * len) / TU, (y0 + uv.getY(i) * hh) / TV); return g; }
  const signTex = (txt, bg, fg) => CT(512, 112, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = bg === '#ec3013' ? '#201e1d' : '#ec3013'; g.fillRect(0, 0, 16, h); g.fillStyle = fg; g.font = '900 60px Archivo, sans-serif'; g.textBaseline = 'middle'; g.fillText(txt, 36, h / 2 + 3, w - 56); });
  const hireTex = CT(256, 96, (g, w, h) => { g.fillStyle = '#16a34a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = '900 38px Archivo, sans-serif'; g.textBaseline = 'middle'; g.fillText('NOW', 18, 30); g.fillText('HIRING', 18, 70); g.fillStyle = '#ffd23a'; g.fillRect(w - 50, 22, 30, 52); g.fillStyle = '#16a34a'; g.beginPath(); g.moveTo(w - 42, 32); g.lineTo(w - 26, 48); g.lineTo(w - 42, 64); g.fill(); });
  const hireMat = new THREE.MeshBasicMaterial({ map: hireTex }); signMats.push(hireMat);
  const part = () => ({ meshes: [], mats: [], a: 1 });
  const addPart = (p, mesh) => { p.meshes.push(mesh); const ms = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; for (const m of ms) if (!p.mats.includes(m)) p.mats.push(m); if (!touch && !(mesh.material instanceof THREE.MeshBasicMaterial)) mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); };

  // ---------- the buildings ----------
  for (const b of L.BUILDINGS) { if (!keys.has(b.key)) continue; const S = STY[b.key], [x0, x1, z0, z1] = b.f, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, h = S.h, h1 = h > 9 ? 7 : h;
    const fac = facade(S), bd = { b, x0, x1, z0, z1, h, cut: { N: part(), S: part(), W: part(), E: part(), top: part() } }; blds.push(bd);
    bd.sv = (sd, x, z) => sd === 'N' ? z - z0 : sd === 'S' ? z1 - z : sd === 'W' ? x - x0 : x1 - x;
    const dl = [[b.door, b.face], ...(b.door2 ? [[b.door2, b.face2]] : [])];
    const seg = (side, s0, s1, y0, y1, out, collide) => { const along = side === 'N' || side === 'S', len = s1 - s0; if (len < 0.05 || y1 - y0 < 0.05) return; const a = (s0 + s1) / 2, g = wallGeo(len, y1 - y0, s0 - (along ? x0 : z0), y0), yc = (y0 + y1) / 2;
      out.push(side === 'N' ? piece(g, a, yc, z0 + T / 2) : side === 'S' ? piece(g, a, yc, z1 - T / 2) : side === 'W' ? piece(g, x0 + T / 2, yc, a, Math.PI / 2) : piece(g, x1 - T / 2, yc, a, Math.PI / 2));
      if (collide) colliders.push({ f: side === 'N' ? [s0, s1, z0, z0 + T] : side === 'S' ? [s0, s1, z1 - T, z1] : side === 'W' ? [x0, x0 + T, s0, s1] : [x1 - T, x1, s0, s1] }); };
    for (const side of SIDES) { const along = side === 'N' || side === 'S', a0 = along ? x0 : z0, a1 = along ? x1 : z1, out = [];
      const gaps = dl.filter(([, f]) => f === side).map(([p]) => along ? p[0] : p[1]).sort((p, q) => p - q); let a = a0;
      for (const u of gaps) { seg(side, a, u - GAP, 0, h1, out, true); seg(side, u - GAP, u + GAP, DH + 0.45, h1, out, false); a = u + GAP; } seg(side, a, a1, 0, h1, out, true);
      const m = fac.clone(); facMats.push(m); addPart(bd.cut[side], new THREE.Mesh(merge(out), m)); }
    // the top: upper storeys + roof (all fade together when you are inside)
    if (h > h1) { const out = []; for (const side of SIDES) { const along = side === 'N' || side === 'S'; seg(side, along ? x0 : z0, along ? x1 : z1, h1, h, out, false); } const m = fac.clone(); facMats.push(m); addPart(bd.cut.top, new THREE.Mesh(merge(out), m)); }
    { const rp = [], C = (geo, x, y, z, col, ry = 0, rx = 0) => rp.push(piece(geo, x, y, z, ry, rx, col));
      if (S.canopy) C(Box(w + 6, 0.8, d + 6), cx, h + 0.4, cz, '#ec3013'); else C(Box(w - 0.2, 0.4, d - 0.2), cx, h + 0.2, cz, S.roofC || '#4a4745');
      if (!S.roof && !S.dome && !S.canopy) { const pc = S.s === 'glass' ? '#c9ced3' : S.base, ph = S.crown ? 2.2 : 0.9; C(Box(w, ph, 0.3), cx, h + ph / 2, z0 + 0.15, pc); C(Box(w, ph, 0.3), cx, h + ph / 2, z1 - 0.15, pc); C(Box(0.3, ph, d), x0 + 0.15, h + ph / 2, cz, pc); C(Box(0.3, ph, d), x1 - 0.15, h + ph / 2, cz, pc); }
      if (h >= 10 && !S.canopy) for (let i = 0; i < 3; i++) { const s = 2 + Math.random() * 2; C(Box(s, 1.4, s * 0.8), x0 + 4 + Math.random() * (w - 8), h + 1.1, z0 + 4 + Math.random() * (d - 8), '#9aa0a6'); }
      if (S.crown) C(Cyl(0.12, 0.12, 9, 6), cx, h + 4.9, cz, '#c9ced3');
      if (S.roof === 'hip') { const g = new THREE.ConeGeometry(1, 4.5, 4); g.rotateY(Math.PI / 4); g.scale((w / 2 + 0.6) / 0.7071, 1, (d / 2 + 0.6) / 0.7071); C(g, cx, h + 0.4 + 2.25, cz, S.roofC); }
      if (S.dome) { C(new THREE.SphereGeometry(Math.min(w, d) * 0.38, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), cx, h + 0.4, cz, S.dome); C(Cyl(0.08, 0.2, 1.6, 6), cx, h + 0.4 + Math.min(w, d) * 0.38 + 0.7, cz, '#ffc64a'); }
      if (S.pin) { const pr = [[0, 0], [0.9, 0.3], [1.25, 2], [0.85, 3.6], [0.58, 4.4], [0.9, 5.6], [0.62, 6.6], [0.001, 6.95]].map(([r, y]) => new THREE.Vector2(r, y)); C(new THREE.LatheGeometry(pr, 16), x0 + 7, h + 0.4, cz, '#f3f2f2'); C(Cyl(0.63, 0.66, 0.4, 16), x0 + 7, h + 0.4 + 4.55, cz, '#ec3013'); }
      if (S.bar) C(Box(5, 0.5, 1.2), cx, h + 0.65, z1 - 3, '#201e1d');
      addPart(bd.cut.top, new THREE.Mesh(merge(rp), new THREE.MeshToonMaterial({ gradientMap: grad, vertexColors: true }))); }
    if (S.neon) { const np = [], y = h - 0.35; np.push(piece(Box(w + 0.12, 0.28, 0.1), cx, y, z0 - 0.06), piece(Box(w + 0.12, 0.28, 0.1), cx, y, z1 + 0.06), piece(Box(0.1, 0.28, d + 0.12), x0 - 0.06, y, cz), piece(Box(0.1, 0.28, d + 0.12), x1 + 0.06, y, cz));
      for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) np.push(piece(Box(0.16, h - 1, 0.16), px + (px === x0 ? -0.06 : 0.06), h / 2, pz + (pz === z0 ? -0.06 : 0.06)));
      const m = MAT[S.neon].clone(); neonMats.push([m, ...NEON[S.neon]]); addPart(bd.cut.top, new THREE.Mesh(merge(np), m)); }
    if (S.bar) { for (const [k, c, off] of [['r', 0xff2a2a, -1.2], ['b', 0x2a6bff, 1.2]]) { const m = new THREE.MeshBasicMaterial({ color: c }), me = new THREE.Mesh(Box(1.6, 0.5, 0.9), m); me.position.set(cx + off, h + 1.15, z1 - 3); addPart(bd.cut.top, me); blink.push([m, c, k]); } }
    // step 9: shop-window light spills onto the pavement round the ground floor at night
    for (let u = x0 + 2.5; u < x1 - 1; u += 5) for (const zz of [z0 - 2, z1 + 2]) pools.push([u, 0, zz, 6]);
    for (let u = z0 + 2.5; u < z1 - 1; u += 5) for (const xx of [x0 - 2, x1 + 2]) pools.push([xx, 0, u, 6]);
    // interior floor (the room itself is step 3)
    { const fl = b.room ? b.room.floor : 'stone'; D({ wood: '#b08b5e', rug: '#8f6aa8', stone: '#d8d2c8', grit: '#c9b48a' }[fl] || '#d8d2c8', new THREE.PlaneGeometry(w - 0.8, d - 0.8), cx, 0.04, cz, 0, -Math.PI / 2); }
    // doors: gold light-up frame, two sliding glass leaves (pocket into the wall), sign, mat, light pool; NOW HIRING sign by the first door
    const smat = new THREE.MeshBasicMaterial({ map: signTex(b.label.toUpperCase(), (S.sign || ['#201e1d'])[0], (S.sign || [0, '#ffffff'])[1]), color: 0xe8e8e8 }); signMats.push(smat);
    dl.forEach(([p, face], di) => { const F = FACE[face], ry = Math.atan2(F[0], F[1]), cs = Math.cos(ry), sn = Math.sin(ry), dx = p[0], dz = p[1];
      const W = (lx, ly, lz) => [dx + lx * cs + lz * sn, ly, dz - lx * sn + lz * cs], inv = (wx, wz) => (wx - dx) * cs - (wz - dz) * sn;
      const ends = face === 'N' || face === 'S' ? [inv(x0, dz), inv(x1, dz)] : [inv(dx, z0), inv(dx, z1)], lo = Math.min(...ends), hi = Math.max(...ends);
      for (const sx of [-1, 1]) D('gold', Box(0.45, DH + 0.45, 0.4), ...W(sx * (DW / 2 + 0.22), (DH + 0.45) / 2, 0.2), ry); D('gold', Box(DW + 0.9, 0.45, 0.4), ...W(0, DH + 0.22, 0.2), ry);
      D('#201e1d', Box(DW + 0.9, 0.04, 2.4), ...W(0, 0.02, 1.2), ry);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(DW + 0.9, 1.1), smat); sg.position.set(...W(0, DH + 1.1, 0.42)); sg.rotation.y = ry; root.add(sg);
      const g = new THREE.Group(); g.position.set(dx, 0, dz); g.rotation.y = ry; root.add(g);
      const leaf = sx => { const m = new THREE.Mesh(Box(DW / 2, DH, 0.06), glass); m.position.set(sx * DW / 4, DH / 2, -T / 2); g.add(m); return m; };
      const along = face === 'N' || face === 'S', wz = face === 'N' ? [z0, z0 + T] : face === 'S' ? [z1 - T, z1] : null, wx = face === 'W' ? [x0, x0 + T] : face === 'E' ? [x1 - T, x1] : null;
      const blk = { f: along ? [dx - GAP, dx + GAP, wz[0], wz[1]] : [wx[0], wx[1], dz - GAP, dz + GAP], on: true }; colliders.push(blk);
      doors.push({ b, x: dx, z: dz, l: leaf(-1), r: leaf(1), open: 0, was: false, blk });
      pools.push([...W(0, 0, 2.6), 8]); glowP.push(W(0, DH + 0.25, 0.7));
      // step 9: neon BLADE SIGN projecting from the wall beside the first door (stacked letters, both faces, lit at night)
      if (di === 0) { const bx = -(DW / 2 + 2.6) > lo + 0.8 ? -(DW / 2 + 2.6) : !b.hiring && DW / 2 + 2.6 < hi - 0.8 ? DW / 2 + 2.6 : null;
        if (bx !== null && h >= 6) { const words = b.label.toUpperCase().split(/\s+/).filter(t => !['THE', 'MERU', 'OF', '&'].includes(t)), word = (words[0] || b.label.toUpperCase()).slice(0, 8), n = word.length;
          const col = S.s === 'stone' ? '#ffb347' : BLADE[nBlade++ % BLADE.length], top = Math.min(h - 0.6, 11), bh = Math.min(top - (S.awn ? 4.9 : 3.2), n * 0.8 + 0.5), y0 = top - bh, cell = bh / (n + 0.6), bw = 1.25;
          if (cell > 0.45) { const tex = CT(96 * bw / cell | 0, 96 * (n + 0.6) | 0, (g, w, hh) => { g.fillStyle = '#151317'; g.fillRect(0, 0, w, hh); g.strokeStyle = col; g.lineWidth = 3; g.strokeRect(5, 5, w - 10, hh - 10); g.font = '900 64px Archivo, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = col; g.shadowBlur = 14; g.fillStyle = col; for (let i = 0; i < n; i++) g.fillText(word[i], w / 2, 96 * (i + 0.8)); g.shadowBlur = 0; g.fillStyle = '#ffffff'; g.globalAlpha = 0.55; g.font = '900 40px Archivo, sans-serif'; for (let i = 0; i < n; i++) g.fillText(word[i], w / 2, 96 * (i + 0.8)); });
            const bm = new THREE.MeshBasicMaterial({ map: tex, color: 0x8a8a8a }); bladeMats.push(bm);
            const ink = toon('#201e1d'), blade = new THREE.Group(); blade.position.set(...W(bx, y0 + bh / 2, 0.25 + bw / 2)); blade.rotation.y = ry;
            const back = new THREE.Mesh(Box(0.2, bh, bw), ink); blade.add(back); for (const s of [1, -1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), bm); pl.rotation.y = s * Math.PI / 2; pl.position.x = s * 0.11; blade.add(pl); }
            const arm = new THREE.Mesh(Box(0.08, 0.08, bw + 0.3), ink); arm.position.set(0, bh / 2 + 0.12, -0.1); blade.add(arm);
            root.add(blade); for (const c of blade.children) addPart(bd.cut[face], c);
            bladeGlow.push([...W(bx, y0 + bh / 2, 0.25 + bw / 2), new THREE.Color(col)]); } } }
      if (b.hiring && di === 0) { const s = new THREE.Group(); s.position.set(DW / 2 + 2.2, 0, 1.2); g.add(s); const post = new THREE.Mesh(Box(0.15, 1.6, 0.15), matFor('#201e1d')); post.position.y = 0.8; s.add(post); const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.82), hireMat); pl.position.y = 2.0; s.add(pl); const bk = pl.clone(); bk.rotation.y = Math.PI; s.add(bk); }
      if (S.awn) for (const [s0, s1] of [[lo + 0.8, -3.3], [3.3, hi - 0.8]]) if (s1 - s0 > 2) D(S.awn, Box(s1 - s0, 0.12, 2), ...W((s0 + s1) / 2, 4.4, 1), ry, 0.22);
      if (S.cols && di === 0) { for (let lx = lo + 2.5; lx < hi - 2; lx += 5.5) { if (Math.abs(lx) < 4) continue; const q = W(lx, 3.5, 1.9); D('#e6dfcf', Cyl(0.7, 0.8, 7, 12), ...q); colliders.push({ c: [q[0], q[2], 0.8] }); }
        D('#ece6d8', Box(hi - lo - 1, 1.2, 3.8), ...W((lo + hi) / 2, 7.6, 1.7), ry); D('#cfc6b4', Box(hi - lo - 1, 0.25, 3.8), ...W((lo + hi) / 2, 0.125, 1.7), ry); } }); }

  // ---------- helpers for placing street things ----------
  const segD = (x, z, p) => { let m = 1e9; for (let i = 0; i < p.length - 1; i++) { const [ax, az] = p[i], [bx, bz] = p[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); m = Math.min(m, Math.hypot(x - ax - dx * u, z - az - dz * u)); } return m; };
  const roadD = (x, z) => Math.min(...L.ROADS.map(r => segD(x, z, r.p) - r.w / 2)), pathD = (x, z) => Math.min(...L.PATHS.map(p => segD(x, z, p.p)));
  const inB = (x, z, m) => L.BUILDINGS.some(b => (x > b.f[0] - m && x < b.f[1] + m && z > b.f[2] - m && z < b.f[3] + m) || (b.lot && x > b.lot.r[0] - m && x < b.lot.r[1] + m && z > b.lot.r[2] - m && z < b.lot.r[3] + m));
  const inRect = (x, z) => x > RECT[0] && x < RECT[1] && z > RECT[2] && z < RECT[3];

  // ---------- fountain (Fountain Plaza centre) ----------
  const waterMat = new THREE.MeshPhongMaterial({ color: 0x4aa3d8, shininess: 110, specular: 0xffffff, transparent: true, opacity: 0.88 });
  D('#d9cdb4', Cyl(7.4, 7.6, 0.9, 40), 0, 0.45, 0); D('#e6dcc6', new THREE.TorusGeometry(7.1, 0.35, 6, 48), 0, 0.92, 0, 0, Math.PI / 2);
  D('#d9cdb4', Cyl(1.1, 1.4, 2.4, 16), 0, 2.1, 0); D('#e6dcc6', Cyl(3, 2.2, 0.5, 24), 0, 3.3, 0); D('#d9cdb4', Cyl(0.35, 0.5, 1.6, 10), 0, 4.3, 0);
  root.add(new THREE.Mesh(merge([piece(new THREE.CircleGeometry(6.85, 40), 0, 0.93, 0, 0, -Math.PI / 2), piece(new THREE.CircleGeometry(2.8, 24), 0, 3.57, 0, 0, -Math.PI / 2)]), waterMat));
  const jetMat = new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.6, depthWrite: false });
  const jetG = Cyl(0.1, 0.28, 1, 8); jetG.translate(0, 0.5, 0); const jet = new THREE.Mesh(jetG, jetMat); jet.position.y = 5.1; root.add(jet);
  const ring = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, g = Cyl(0.05, 0.12, 4.4, 6); g.translate(0, 2.2, 0); g.rotateX(-0.75); ring.push(piece(g, Math.sin(a) * 6.6, 0.93, Math.cos(a) * 6.6, a)); }
  const ringJets = new THREE.Mesh(merge(ring), jetMat); root.add(ringJets); colliders.push({ c: [0, 0, 7.6] }); pools.push([0, 0, 0, 24]);

  // ---------- city lamps (instanced) with glow + light pools at night ----------
  const lampP = [], okLamp = (x, z) => inRect(x, z) && !avoid(x, z, 1) && !inB(x, z, 1.5) && roadD(x, z) > 1.5 && Math.hypot(x, z) > 15 && !lampP.some(([a, b]) => Math.hypot(a - x, b - z) < 6);
  for (const P of L.PATHS) for (let k = 0; k < P.p.length - 1; k++) { const [ax, az] = P.p[k], [bx, bz] = P.p[k + 1], len = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / len, nz = (bx - ax) / len;
    for (let t = 16; t < len; t += 16) { const x = ax + (bx - ax) * t / len, z = az + (bz - az) * t / len; for (const s of [1, -1]) { const q = [x + nx * 5 * s, z + nz * 5 * s, Math.atan2(-nz, nx)]; if (okLamp(q[0], q[1])) lampP.push(q); } } }
  for (const q of [[-44, -39], [44, -39], [-44, 39], [44, 39], [-22, -39], [22, -39], [-22, 39], [22, 39]]) if (okLamp(...q)) lampP.push(q);
  const XING = [[160, 0, 'z'], [-160, 0, 'z'], [0, 150, 'x'], [0, -140, 'x']], nearX = (x, z) => XING.some(([a, b]) => Math.hypot(x - a, z - b) < 11);
  for (let x = -150; x <= 150; x += 25) for (const z of [-148, -132, 142, 158]) if (!nearX(x, z) && okLamp(x, z)) lampP.push([x, z, Math.PI / 2]);
  for (let z = -125; z <= 140; z += 25) for (const x of [-168, -152, 152, 168]) if (!nearX(x, z) && okLamp(x, z)) lampP.push([x, z, 0]);
  // step 9: twin-arm city lamp (post, base, two arms, two flat heads); the arms reach out over the path / road
  const lampG = merge([piece(Cyl(0.11, 0.16, 6.2, 6), 0, 3.1, 0), piece(Cyl(0.3, 0.36, 0.7, 8), 0, 0.35, 0), piece(Box(3, 0.12, 0.12), 0, 6.1, 0), piece(Box(0.95, 0.18, 0.5), -1.5, 6.02, 0), piece(Box(0.95, 0.18, 0.5), 1.5, 6.02, 0), piece(Cyl(0.16, 0.16, 0.3, 6), 0, 6.3, 0)]), lensMat = new THREE.MeshBasicMaterial({ color: 0xd9d6cf });
  const lampI = new THREE.InstancedMesh(lampG, matFor('#201e1d'), lampP.length), lensI = new THREE.InstancedMesh(merge([piece(Box(0.8, 0.04, 0.38), -1.5, 5.92, 0), piece(Box(0.8, 0.04, 0.38), 1.5, 5.92, 0)]), lensMat, lampP.length);
  lampP.forEach(([x, z, r = 0], i) => { M4.compose(V(x, 0, z), Q.setFromEuler(E.set(0, r, 0)), ONE); lampI.setMatrixAt(i, M4); lensI.setMatrixAt(i, M4); colliders.push({ c: [x, z, 0.3] }); const cx = Math.cos(r) * 1.5, cz = -Math.sin(r) * 1.5; pools.push([x + cx, 0, z + cz, 9], [x - cx, 0, z - cz, 9]); glowP.push([x + cx, 5.8, z + cz], [x - cx, 5.8, z - cz]); });
  root.add(lampI, lensI);
  const radial = (r, gc, a) => CT(64, 64, (g, w) => { const q = g.createRadialGradient(32, 32, 0, 32, 32, 32); q.addColorStop(0, `rgba(${gc},${a})`); q.addColorStop(r, `rgba(${gc},${a * 0.35})`); q.addColorStop(1, `rgba(${gc},0)`); g.fillStyle = q; g.fillRect(0, 0, w, w); });
  const glowPts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(glowP.flat(), 3)), new THREE.PointsMaterial({ map: radial(0.25, '255,226,165', 1), size: 4.5, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const poolI = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: radial(0.5, '255,214,150', 0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 }), pools.length);
  pools.forEach(([x, y, z, s], i) => { M4.compose(V(x, 0.06, z), Q.identity(), V(s, 1, s)); poolI.setMatrixAt(i, M4); }); glowPts.visible = poolI.visible = false; root.add(glowPts, poolI);
  const bladePts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(bladeGlow.flatMap(g => g.slice(0, 3)), 3)).setAttribute('color', new THREE.Float32BufferAttribute(bladeGlow.flatMap(g => [g[3].r * 0.5, g[3].g * 0.5, g[3].b * 0.5]), 3)), new THREE.PointsMaterial({ map: radial(0.3, '255,255,255', 1), size: 7, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); bladePts.visible = false; root.add(bladePts);

  // ---------- trees + benches (instanced) ----------
  const trees = [], okTree = (x, z) => inRect(x, z) && !avoid(x, z, 3) && L.surfaceAt(x, z) === 'grass' && !inB(x, z, 3) && roadD(x, z) > 3 && pathD(x, z) > 5 && segD(x, z, L.TRAIN.line) > 6 && !(Math.abs(x) < 14 && Math.abs(z) < 14) && !lampP.some(([a, b]) => Math.hypot(a - x, b - z) < 3) && !trees.some(([a, b]) => Math.hypot(a - x, b - z) < 6);
  for (let x = -140; x <= 140; x += 12) for (const z of [-19, 19]) if (Math.abs(x) > 50 && okTree(x, z)) trees.push([x, z]);
  for (let i = 0, N = touch ? 80 : 140; i < 5000 && trees.length < N; i++) { const x = RECT[0] + Math.random() * (RECT[1] - RECT[0]), z = RECT[2] + Math.random() * (RECT[3] - RECT[2]); if (okTree(x, z)) trees.push([x, z]); }
  const trunkI = new THREE.InstancedMesh(Cyl(0.25, 0.35, 3.2, 6).translate(0, 1.6, 0), matFor('#6b4a32'), trees.length), crownI = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.4, 0), toon('#ffffff'), trees.length), tc = new THREE.Color();
  trees.forEach(([x, z], i) => { const s = 0.8 + Math.random() * 0.5; M4.compose(V(x, 0, z), Q.identity(), V(s, s, s)); trunkI.setMatrixAt(i, M4); M4.compose(V(x, 3.2 * s + 1.6 * s, z), Q.setFromEuler(E.set(0, Math.random() * 6, 0)), V(s, s * 1.1, s)); crownI.setMatrixAt(i, M4); crownI.setColorAt(i, tc.setHSL(0.26 + Math.random() * 0.06, 0.38, 0.38 + Math.random() * 0.1)); colliders.push({ c: [x, z, 0.45] }); });
  if (!touch) trunkI.castShadow = crownI.castShadow = true; root.add(trunkI, crownI);
  const benchP = []; for (let x = 55; x <= 140; x += 16) for (const sx of [-1, 1]) for (const z of [-13, 13]) if (!inB(sx * x, z, 1)) if (!avoid(sx * x, z, 1)) benchP.push([sx * x, z, z < 0 ? 0 : Math.PI]);
  for (const a of [0.785, 2.356, 3.927, 5.498]) benchP.push([Math.sin(a) * 11, Math.cos(a) * 11, a + Math.PI]);
  const benchG = merge([piece(Box(2.2, 0.12, 0.6), 0, 0.5, 0, 0, 0, '#a77b4f'), piece(Box(2.2, 0.55, 0.1), 0, 0.85, -0.28, 0, 0, '#a77b4f'), piece(Box(0.1, 0.5, 0.6), -0.95, 0.25, 0, 0, 0, '#201e1d'), piece(Box(0.1, 0.5, 0.6), 0.95, 0.25, 0, 0, 0, '#201e1d')]);
  const benchI = new THREE.InstancedMesh(benchG, new THREE.MeshToonMaterial({ gradientMap: grad, vertexColors: true }), benchP.length); benchP.forEach(([x, z, r], i) => { M4.compose(V(x, 0, z), Q.setFromEuler(E.set(0, r, 0)), ONE); benchI.setMatrixAt(i, M4); }); root.add(benchI);

  // ---------- crosswalks where the foot paths cross the ring road ----------
  for (const [x, z, dir] of XING) for (let k = 0; k < 9; k++) { const o = -5.4 + k * 1.35; if (dir === 'z') D('#f3f2f2', Box(0.7, 0.03, 4), x + o, 0.03, z); else D('#f3f2f2', Box(4, 0.03, 0.7), x, 0.03, z + o); }

  // ---------- merge the static bins ----------
  for (const k in bins) { const m = new THREE.Mesh(merge(bins[k]), matFor(k)); if (!touch && !(m.material instanceof THREE.MeshBasicMaterial)) m.castShadow = m.receiveShadow = true; root.add(m); }

  // ---------- cars on the ring road (two lanes, right-hand traffic); they stop for the player and for the car ahead ----------
  const lanes = [[[-157, -137], [157, -137], [157, 147], [-157, 147]], [[-163, -143], [-163, 153], [163, 153], [163, -143]]].map(p => { const seg = []; let s = 0; for (let i = 0; i < 4; i++) { const a = p[i], b = p[(i + 1) % 4], len = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push({ a, b, len, s0: s }); s += len; } return { seg, len: s }; });
  const at = (ln, s) => { s = ((s % ln.len) + ln.len) % ln.len; for (const g of ln.seg) if (s <= g.s0 + g.len) { const u = (s - g.s0) / g.len; return [g.a[0] + (g.b[0] - g.a[0]) * u, g.a[1] + (g.b[1] - g.a[1]) * u]; } return ln.seg[0].a; };
  const carG = merge([piece(Box(2, 0.8, 4.4), 0, 0.75, 0, 0, 0, '#ffffff'), piece(Box(1.75, 0.7, 2.3), 0, 1.5, -0.25, 0, 0, '#2a3540'), piece(Box(1.95, 0.55, 3.4), 0, 0.32, 0, 0, 0, '#151515'),
    piece(Box(0.45, 0.2, 0.06), -0.6, 0.85, 2.21, 0, 0, '#fff3c0'), piece(Box(0.45, 0.2, 0.06), 0.6, 0.85, 2.21, 0, 0, '#fff3c0'), piece(Box(0.45, 0.2, 0.06), -0.6, 0.85, -2.21, 0, 0, '#ff4030'), piece(Box(0.45, 0.2, 0.06), 0.6, 0.85, -2.21, 0, 0, '#ff4030')]);
  const per = touch ? 4 : 6, parked = [[1, 26], [3, 26], [4, 26]], NC = per * 2 + parked.length, PAL = ['#ec3013', '#f3f2f2', '#201e1d', '#5c6670', '#2e4a6b', '#e0b23a', '#8fb3cc', '#3d6b4a'];
  const carI = new THREE.InstancedMesh(carG, new THREE.MeshToonMaterial({ gradientMap: grad, vertexColors: true }), NC); if (!touch) carI.castShadow = true; root.add(carI);
  const cars = []; lanes.forEach((ln, li) => { for (let i = 0; i < per; i++) cars.push({ ln, s: ln.len * (i + Math.random() * 0.4) / per, v: 8 }); });
  cars.forEach((c, i) => carI.setColorAt(i, tc.set(PAL[i % PAL.length])));
  // step 9: night car lights (bright lamps + a headlight beam on the road), sharing the cars' instance matrices
  const carLampI = new THREE.InstancedMesh(merge([piece(Box(0.5, 0.24, 0.05), -0.6, 0.85, 2.24, 0, 0, '#fff6d0'), piece(Box(0.5, 0.24, 0.05), 0.6, 0.85, 2.24, 0, 0, '#fff6d0'), piece(Box(0.5, 0.24, 0.05), -0.6, 0.85, -2.24, 0, 0, '#ff2a1a'), piece(Box(0.5, 0.24, 0.05), 0.6, 0.85, -2.24, 0, 0, '#ff2a1a')]), new THREE.MeshBasicMaterial({ vertexColors: true }), NC);
  const beamTex = CT(64, 128, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, 'rgba(255,240,200,0.55)'); r.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = r; g.beginPath(); g.moveTo(w * 0.3, 0); g.lineTo(w * 0.7, 0); g.lineTo(w, h); g.lineTo(0, h); g.fill(); });
  const carBeamI = new THREE.InstancedMesh(new THREE.PlaneGeometry(3.4, 10).rotateX(-Math.PI / 2).translate(0, 0.07, 7.2), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 }), NC);
  carLampI.instanceMatrix = carBeamI.instanceMatrix = carI.instanceMatrix; carLampI.count = carBeamI.count = cars.length; carLampI.visible = carBeamI.visible = false; carLampI.frustumCulled = carBeamI.frustumCulled = false; root.add(carLampI, carBeamI);
  { const lot = L.BUILDINGS.find(b => b.lot); parked.forEach(([bay, z], j) => { const i = cars.length + j, r = lot ? lot.lot.r : [134, 156, 22, 44], x = r[0] + (r[1] - r[0]) * (bay + 0.5) / 6; M4.compose(V(x, 0, z), Q.setFromEuler(E.set(0, Math.PI, 0)), ONE); carI.setMatrixAt(i, M4); carI.setColorAt(i, tc.set(PAL[(j * 3 + 1) % PAL.length])); }); }

  // ---------- night ----------
  let night = false;
  function setNight(on) { night = on; for (const m of facMats) m.emissive.set(on ? 0xffffff : 0x000000); for (const m of signMats) m.color.set(on ? 0xffffff : 0xe8e8e8); MAT.gold.color.set(on ? 0xffd86b : 0xffc64a);
    for (const [m, dd, n] of neonMats) m.color.set(on ? n : dd); lensMat.color.set(on ? 0xfff1c4 : 0xd9d6cf); glowPts.visible = poolI.visible = on;
    carLampI.visible = carBeamI.visible = on; waterMat.emissive.set(on ? 0x1f6f9c : 0x000000); jetMat.color.set(on ? 0xbff0ff : 0xe8f6ff); for (const m of bladeMats) m.color.set(on ? 0xffffff : 0x8a8a8a); bladePts.visible = on; }

  // ---------- per frame: doors, cutaway fades, fountain, cars, police lights ----------
  const fade = (p, tg, dt) => { const a = clamp(p.a + clamp(tg - p.a, -dt * 4, dt * 4), 0, 1); if (a === p.a) return; p.a = a; for (const m of p.mats) { m.opacity = a; m.transparent = a < 0.999; } for (const me of p.meshes) me.visible = a > 0.01; };
  function tick(dt, now) { const p = api.player, cam = camera.position;
    for (const d of doors) { const near = !!p && p.y < 2 && Math.hypot(p.x - d.x, p.z - d.z) < 2.5; if (near && !d.was && d.open < 0.3 && api.onChime) api.onChime(d.b); d.was = near; d.open = clamp(d.open + (near ? 3 : -1.6) * dt, 0, 1); const e = d.open * d.open * (3 - 2 * d.open); d.l.position.x = -(1 + e * 2.05); d.r.position.x = 1 + e * 2.05; d.blk.on = d.open < 0.6; }
    let ins = null; if (p) for (const bd of blds) if (p.y < bd.h && p.x > bd.x0 && p.x < bd.x1 && p.z > bd.z0 && p.z < bd.z1) { ins = bd; break; } api.inside = ins ? ins.b : null;
    for (const bd of blds) { const cIn = cam.x > bd.x0 && cam.x < bd.x1 && cam.z > bd.z0 && cam.z < bd.z1 && cam.y < bd.h + 1, act = !!p && (ins === bd || cIn);
      for (const sd of SIDES) { let tg = 1; if (act && (bd.sv(sd, p.x, p.z) > 0) !== (bd.sv(sd, cam.x, cam.z) > 0)) tg = 0; fade(bd.cut[sd], tg, dt); } fade(bd.cut.top, act ? 0 : 1, dt); }
    const t = now / 1000; jet.scale.y = 2.6 + Math.sin(t * 3.1) * 0.35 + Math.sin(t * 7.3) * 0.12; ringJets.scale.y = 1 + Math.sin(t * 2.2) * 0.06; jetMat.opacity = 0.55 + Math.sin(t * 9) * 0.05;
    for (const [m, c, k] of blink) { const on = night ? ((now / 260 | 0) % 2 === 0) === (k === 'r') : false; m.color.set(on ? c : 0x3a3a44); }
    for (let i = 0; i < cars.length; i++) { const c = cars[i]; let tg = 11, gap = 1e9; for (const o of cars) if (o !== c && o.ln === c.ln) { const g = ((o.s - c.s) % c.ln.len + c.ln.len) % c.ln.len; if (g > 0 && g < gap) gap = g; }
      if (gap < 16) tg = Math.min(tg, Math.max(0, (gap - 8) * 1.4)); const a = at(c.ln, c.s - 3), b2 = at(c.ln, c.s + 3), x = (a[0] + b2[0]) / 2, z = (a[1] + b2[1]) / 2, fx = b2[0] - a[0], fz = b2[1] - a[1], fl = Math.hypot(fx, fz) || 1;
      if (p && p.y < 2) { const rx = p.x - x, rz = p.z - z, fw = (rx * fx + rz * fz) / fl, lat = Math.abs((rx * fz - rz * fx) / fl); if (fw > 0 && fw < 9 && lat < 2.6) tg = 0; }
      c.v += clamp(tg - c.v, -12 * dt, 4 * dt); c.s += c.v * dt; M4.compose(V(x, 0, z), Q.setFromEuler(E.set(0, Math.atan2(fx, fz), 0)), ONE); carI.setMatrixAt(i, M4); }
    carI.instanceMatrix.needsUpdate = true; }

  const api = { keys, colliders, rect: RECT, covers: inRect, heightOf: k => STY[k] ? STY[k].h : 7, player: null, inside: null, onChime: null, setNight, tick,
    stats: { buildings: blds.length, doors: doors.length, lamps: lampP.length, trees: trees.length, cars: cars.length, blades: bladeMats.length } };
  window.__meru2City = api;   // test hook
  return api;
}
