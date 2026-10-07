// MERU 2.0 — step 2c: inside the POLICE DEPARTMENT (front desk, jail hall, two cells, patrolling guard with a view cone)
// and the BANK (teller counter, storage lockers, a vault you can see through glass). Built inside the city shells (worlds/meru2-city.js).
// Avatars here are new (roles only, no lines): policeDesk, jailGuard, bankTeller, bankVault.
export function buildCivic({ THREE, scene, M, toon, kit, cols }) {
  const B = (w, h, d, col, x, y, z, ry = 0, o = 0.02) => { const m = M(new THREE.BoxGeometry(w, h, d), typeof col === 'string' ? toon(col) : col, x, y, z, null, o); m.rotation.y = ry; return m; };
  const box = (x0, x1, z0, z1) => { const c = { f: [x0, x1, z0, z1] }; cols.push(c); return c; };
  const fox = (key, torso, outfit, x, z, ry) => { const f = kit.makeFox({ key, torso, outfit }); f.position.set(x, 0, z); f.rotation.y = ry; scene.add(f); cols.push({ c: [x, z, 0.5] }); return f; };
  const steel = toon('#5c6670'), dark = toon('#201e1d');

  // ---------- POLICE (f -110..-62 × -125..-80, door S at -86) ----------
  B(9, 1.1, 1, '#2e4a6b', -86, 0.55, -89.5); B(9.2, 0.08, 1.2, '#f3f2f2', -86, 1.14, -89.5, 0, 0); box(-90.5, -81.5, -90, -89);
  const deskFox = fox('policeDesk', '#2e4a6b', 'coat', -86, -91.2, 0);
  for (const [x0, x1] of [[-109.6, -88], [-84, -62.4]]) { B(x1 - x0, 4, 0.3, '#d8d2c8', (x0 + x1) / 2, 2, -95); box(x0, x1, -95.2, -94.8); }
  B(4, 0.6, 0.3, '#d8d2c8', -86, 4.2, -95);
  const cells = []; for (const [cx, open] of [[-99, true], [-73, false]]) { const x0 = cx - 5, x1 = cx + 5, zf = -116;
    for (let x = x0; x <= x1 + 0.01; x += 0.5) if (Math.abs(x - cx) > 0.85) B(0.08, 3.4, 0.08, steel, x, 1.7, zf, 0, 0);
    B(10.1, 0.12, 0.12, steel, cx, 3.4, zf, 0, 0); B(10.1, 0.12, 0.12, steel, cx, 0.1, zf, 0, 0);
    for (const sx of [x0, x1]) { B(0.3, 3.5, 8.6, '#d8d2c8', sx, 1.75, -120.3); box(sx - 0.15, sx + 0.15, -124.6, -116); }
    box(x0, cx - 0.85, zf - 0.1, zf + 0.1); box(cx + 0.85, x1, zf - 0.1, zf + 0.1);
    B(3, 0.5, 1.2, '#8a8580', cx - 2.5, 0.45, -123.6); B(0.8, 0.6, 0.6, '#f3f2f2', cx + 3.6, 0.3, -123.8);
    const door = new THREE.Group(); door.position.set(cx - 0.85, 0, zf); scene.add(door); for (let x = 0.15; x < 1.7; x += 0.5) { const b = M(new THREE.BoxGeometry(0.08, 3.4, 0.08), steel, x, 1.7, 0, door, 0); }
    const blk = box(cx - 0.85, cx + 0.85, zf - 0.1, zf + 0.1); cells.push({ cx, door, blk, open: 0, locked: true, inUse: open }); }
  const guard = fox('jailGuard', '#3d3b3a', 'armor', -86, -104, Math.PI); cols.pop();
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xec3013, transparent: true, opacity: 0.22, depthWrite: false });
  const cone = new THREE.Mesh(new THREE.CircleGeometry(7, 24, -0.6, 1.2).rotateX(-Math.PI / 2), coneMat); cone.position.y = 0.06; scene.add(cone);
  const G = { x: -86, z: -104, dir: 1, yaw: Math.PI / 2, wait: 0 };

  // ---------- BANK (f 62..110 × -125..-80, door S at 86) ----------
  B(32, 1.2, 0.8, '#ece6d8', 86, 0.6, -100.4); B(32.2, 0.1, 1.0, '#a8987c', 86, 1.25, -100.4, 0, 0); box(70, 102, -100.8, -100);
  const gl = new THREE.MeshPhongMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.25, shininess: 120, depthWrite: false });
  B(32, 1.6, 0.04, gl, 86, 2.05, -100.6, 0, 0); for (let x = 70; x <= 102.1; x += 6.4) B(0.1, 1.6, 0.1, '#a8987c', x, 2.05, -100.6, 0, 0);
  const teller = fox('bankTeller', '#e9e3d6', 'vest', 81, -102.4, 0);
  for (let z = -112; z < -99.9; z += 1.5) for (let y = 0; y < 3; y++) B(0.5, 0.95, 1.4, y % 2 ? '#9aa0a6' : '#5c6670', 62.9, 0.5 + y, z + 0.75, 0, 0.01);
  box(62.4, 63.2, -112, -100);
  // vault: glass wall, open round door, gold inside
  B(14, 4, 0.06, gl, 97, 2, -112, 0, 0); box(90, 104, -112.2, -111.8); B(0.4, 4.2, 12.6, '#ece6d8', 90, 2.1, -118.4); box(89.8, 90.2, -124.6, -112);
  const vd = M(new THREE.CylinderGeometry(2.4, 2.4, 0.6, 32), toon('#9aa0a6'), 0, 0, 0, null, 0.03); vd.rotation.x = Math.PI / 2; vd.rotation.z = 0; const vg = new THREE.Group(); vg.add(vd); vd.position.set(2.4, 0, 0); vg.position.set(92.2, 2.6, -112.4); vg.rotation.y = -1.2; scene.add(vg);
  M(new THREE.TorusGeometry(1.2, 0.12, 8, 24), toon('#ffc64a'), 2.4, 0, 0.35, vg, 0);
  const goldM = toon('#ffc64a'); for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 2 + (i % 2); k++) M(new THREE.BoxGeometry(0.9, 0.3, 0.45), goldM, 94 + i * 1.6, 0.15 + k * 0.3, -120 + j * 1.8, null, 0.01);
  const vaultFox = fox('bankVault', '#201e1d', 'suit', 93, -98.5, Math.PI);

  const spots = [
    { key: 'policeDesk', x: -86, z: -87.6, r: 2.2, prompt: 'POLICE DESK \u00b7 FINES' },
    { key: 'bankTeller', x: 81, z: -98.6, r: 2.2, prompt: 'BANK TELLER' },
    { key: 'bankLocker', x: 64.6, z: -106, r: 2.4, prompt: 'STORAGE LOCKER' },
  ];
  const npcs = [deskFox, guard, teller, vaultFox];
  const cellA = cells[0], CELL_IN = { x: cellA.cx - 1.5, z: -120.5 }, EXIT_Z = -94.6;
  function lockCell() { cellA.locked = true; }
  function tick(dt, p, escaping) {
    for (const f of npcs) kit.animFox(f, dt, f === guard && !G.wait ? 1.2 : 0, false);
    // guard walks the hall, stops at each end and looks round
    if (G.wait > 0) { G.wait -= dt; G.yaw += Math.sin(G.wait * 2) * dt * 0.8; if (G.wait <= 0) { G.wait = 0; G.dir *= -1; } }
    else { G.x += G.dir * 1.2 * dt; G.yaw = G.dir > 0 ? Math.PI / 2 : -Math.PI / 2; if (G.x > -70 || G.x < -102) { G.x = Math.max(-102, Math.min(-70, G.x)); G.wait = 2.2; } }
    guard.position.set(G.x, 0, G.z); guard.rotation.y = G.yaw; cone.position.x = G.x; cone.position.z = G.z; cone.rotation.y = G.yaw - Math.PI / 2;
    for (const c of cells) { c.open += ((c.locked ? 0 : 1) - c.open) * Math.min(1, dt * 4); c.door.rotation.y = -c.open * 1.6; c.blk.on = c.open < 0.5; }
    coneMat.opacity = escaping ? 0.32 : 0.12;
    if (!p) return null;
    // spotted: inside the cone (7 m, ±34°) while out of the cell
    if (escaping && p.z > -116 && p.z < -95) { const dx = p.x - G.x, dz = p.z - G.z, d = Math.hypot(dx, dz), a = Math.atan2(dx, dz), da = Math.atan2(Math.sin(a - G.yaw), Math.cos(a - G.yaw)); if (d < 7 && Math.abs(da) < 0.6) return 'caught'; }
    if (escaping && p.z > EXIT_Z && p.x > -110 && p.x < -62) return 'free';
    return null; }
  const nearCellDoor = p => Math.abs(p.x - cellA.cx) < 1.6 && p.z < -116 && p.z > -118.4;
  return { spots, cells, cellA, CELL_IN, tick, lockCell, nearCellDoor, unlock() { cellA.locked = false; }, inJail: p => p.x > -109 && p.x < -63 && p.z < -95 && p.z > -125 };
}
