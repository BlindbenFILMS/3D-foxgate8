// MERU 2.0 — step 3: interiors, part 3. CRESTVIEW HOUSE + LAKESIDE TOWER apartments, rooms ×2 the old size (worlds/meru-apartments.js).
// Ground floor = LOBBY (realtor, sofas, elevator at the back). Floors 1 and 2 sit inside the tower at their real heights (the city
// cutaway hides the tower above you). Each floor: a hall from the elevator, rooms A B (one side), C D (other side), E across from the
// elevator at the end. Numbers = floor*100 + n (101..205). Floor 2's E is the PENTHOUSE: 10 CR a night, the bed = sleep to morning.
export const FY = [0, 7.2, 10.8];
const ROOMS = [{ id: 'A', n: 1, u: [-16, -6], v: [-13, -2], door: -11 }, { id: 'B', n: 2, u: [-6, 4], v: [-13, -2], door: -1 }, { id: 'C', n: 3, u: [-16, -6], v: [2, 13], door: -11 }, { id: 'E', n: 4, u: [4, 16], v: [-6, 6], end: true }, { id: 'D', n: 5, u: [-6, 4], v: [2, 13], door: -1 }];
export function buildApts({ THREE, scene, M, toon, kit, cols, L }) {
  const FACE = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }, blds = [], spots = [];
  const tvTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 144; const g = c.getContext('2d'); g.fillStyle = '#1d2a33'; g.fillRect(0, 0, 256, 144); g.fillStyle = '#ec3013'; g.fillRect(0, 108, 256, 36); g.fillStyle = '#fff'; g.font = '900 26px Archivo, sans-serif'; g.fillText('MERU NEWS 8', 12, 134); g.fillStyle = '#ffd23a'; g.fillRect(12, 18, 90, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const tvM = new THREE.MeshBasicMaterial({ map: tvTex });
  for (const key of ['crest', 'lake']) { const b = L.BUILDINGS.find(q => q.key === key); if (!b) continue; const F = FACE[b.face], cx = (b.f[0] + b.f[1]) / 2, cz = (b.f[2] + b.f[3]) / 2, Rv = [-F[1], F[0]], ry = Math.atan2(F[0], F[1]);
    const W = (u, v) => [cx + u * F[0] + v * Rv[0], cz + u * F[1] + v * Rv[1]];
    const aabb = (u0, u1, v0, v1) => { const a = W(u0, v0), c = W(u1, v1); return [Math.min(a[0], c[0]), Math.max(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[1], c[1])]; };
    const put = (g, w, h, d, col, u, y, v, o = 0.015, rot = 0) => { const [x, z] = W(u, v), m = M(new THREE.BoxGeometry(w, h, d), typeof col === 'string' ? toon(col) : col, x, y, z, g, o); m.rotation.y = ry + rot; return m; };
    const wall = (g, u0, u1, v0, v1, y, col) => { const along = Math.abs(u1 - u0) > Math.abs(v1 - v0), len = along ? u1 - u0 : v1 - v0; put(g, along ? 0.2 : len, 3.4, along ? len : 0.2, col, (u0 + u1) / 2, y + 1.7, (v0 + v1) / 2, 0.01, 0); cols.push({ f: aabb(u0, u1, v0, v1), y0: y - 0.5, y1: y + 3 }); };
    const stone = key === 'crest', wallC = stone ? '#e9dcc4' : '#dfe6ea', floorC = stone ? '#b08b5e' : '#c9ced3', B = { key, b, W, aabb, floors: [], pent: null };
    // ---- lobby ----
    const lob = new THREE.Group(); scene.add(lob); B.shafts = [];
    B.shafts.push(put(lob, 3.2, 3.4, 3.2, '#5c6670', -14.5, 1.7, 0)); put(lob, 0.05, 2.6, 2.2, '#ffc64a', -12.85, 1.3, 0, 0); cols.push({ f: aabb(-16.1, -12.9, -1.6, 1.6) });
    put(lob, 3, 1.1, 1, stone ? '#6b4a32' : '#201e1d', 8, 0.55, -8); cols.push({ f: aabb(7.5, 8.5, -9.5, -6.5) });
    for (const v of [6, 11]) { put(lob, 2.4, 0.8, 1, '#2e4a6b', 4, 0.4, v); cols.push({ f: aabb(3.5, 4.5, v - 1.2, v + 1.2) }); }
    put(lob, 6, 0.04, 8, stone ? '#7a2a3a' : '#2e4a6b', 6, 0.04, 0, 0);
    const realtor = kit.makeFox({ key: key === 'crest' ? 'aptRealCrest' : 'aptRealLake', torso: stone ? '#f5e6c8' : '#e0f2fe', outfit: 'suit' }); { const [x, z] = W(8, -9.2); realtor.position.set(x, 0, z); realtor.rotation.y = ry; scene.add(realtor); B.realtor = realtor; }
    { const [x, z] = W(-11.6, 0); spots.push({ key: 'elev:' + key + ':0', x, z, r: 1.8, prompt: 'ELEVATOR', y: [0, 3] }); }
    { const [x, z] = W(8, -6.3); spots.push({ key: 'pent:' + key, x, z, r: 2, prompt: 'PENTHOUSE \u00b7 10 CR A NIGHT', y: [0, 3] }); }
    // ---- floors 1 + 2 ----
    for (const f of [1, 2]) { const y = FY[f], g = new THREE.Group(); g.visible = false; scene.add(g); B.floors[f] = g;
      M(new THREE.BoxGeometry(b.f[1] - b.f[0] - 0.8, 0.3, b.f[3] - b.f[2] - 0.8), toon('#9aa0a6'), cx, y - 0.15, cz, g, 0);
      put(g, 32, 0.04, 4, '#3d3b3a', 0, y + 0.02, 0, 0, Math.PI / 2); B.shafts.push(put(g, 3.2, 3.4, 3.2, '#5c6670', -14.5, y + 1.7, 0)); cols.push({ f: aabb(-16.1, -12.9, -1.6, 1.6), y0: y - 0.5, y1: y + 3 });
      for (const r of ROOMS) { const isP = f === 2 && r.id === 'E', no = f * 100 + r.n, [u0, u1] = r.u, [v0, v1] = r.v;
        put(g, u1 - u0 - 0.2, 0.03, v1 - v0 - 0.2, isP ? '#ffc64a' : floorC, (u0 + u1) / 2, y + 0.03, (v0 + v1) / 2, 0, Math.PI / 2);
        if (r.end) { wall(g, u0, u0, v0, -0.8, y, wallC); wall(g, u0, u0, 0.8, v1, y, wallC); wall(g, u0, u1, v0, v0, y, wallC); wall(g, u0, u1, v1, v1, y, wallC); }
        else { const hv = v0 < 0 ? v1 : v0; wall(g, u0, r.door - 0.8, hv, hv, y, wallC); wall(g, r.door + 0.8, u1, hv, hv, y, wallC); wall(g, u1, u1, v0, v1, y, wallC); }
        const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, far = v0 < 0 ? v0 + 1.5 : v1 - 1.5;
        if (r.end) { put(g, 3, 0.6, 4, isP ? '#7a2a3a' : '#2e4a6b', u1 - 2, y + 0.3, 0); put(g, 3.4, 0.4, 0.3, '#3d2a1c', u1 - 0.3, y + 1.0, 0); put(g, 0.1, 1.4, 2.4, tvM, u0 + 0.3, y + 1.8, 4.6, 0); put(g, 4, 0.04, 6, isP ? '#201e1d' : '#5c6670', cu, y + 0.06, 0, 0); cols.push({ f: aabb(u1 - 4, u1, -1.5, 1.5), y0: y - 0.5, y1: y + 3 });
          if (isP) { const [x, z] = W(u1 - 4.2, 0); spots.push({ key: 'sleep:' + key, x, z, r: 1.8, prompt: 'SLEEP TILL MORNING', y: [y - 0.5, y + 2] }); B.pent = { u: u0, y, blk: { f: aabb(u0 - 0.15, u0 + 0.15, -0.8, 0.8), y0: y - 0.5, y1: y + 3, on: true } }; cols.push(B.pent.blk); } }
        else { put(g, 3, 0.5, 2.2, '#f3f2f2', cu - 2, y + 0.3, far, 0); put(g, 2.4, 0.7, 1, '#2e4a6b', cu + 2.5, y + 0.35, cv, 0); put(g, 0.1, 1.1, 1.8, tvM, cu + 2.5, y + 1.3, far, 0, Math.PI / 2); cols.push({ f: aabb(cu - 3.1, cu - 0.9, far - 1.5, far + 1.5), y0: y - 0.5, y1: y + 3 }); }
        { const lab = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const q = c.getContext('2d'); q.fillStyle = '#201e1d'; q.fillRect(0, 0, 128, 64); q.fillStyle = isP ? '#ffc64a' : '#fff'; q.font = '900 40px Archivo, sans-serif'; q.fillText(String(no), 14, 46); return new THREE.CanvasTexture(c); })();
          const du = r.end ? u0 - 0.15 : r.door + 1.3, dv = r.end ? 1.6 : (v0 < 0 ? v1 + 0.15 : v0 - 0.15); put(g, r.end ? 0.04 : 0.7, 0.35, r.end ? 0.7 : 0.04, new THREE.MeshBasicMaterial({ map: lab }), du, y + 2.3, dv, 0); } }
      { const [x, z] = W(-11.6, 0); spots.push({ key: 'elev:' + key + ':' + f, x, z, r: 1.8, prompt: 'ELEVATOR', y: [y - 0.5, y + 2] }); } }
    blds.push(B); }
  function groundAt(x, z, y) { for (const B of blds) { const f = B.b.f; if (x < f[0] || x > f[1] || z < f[2] || z > f[3] || y < 5) continue; return y > FY[2] - 1.2 ? FY[2] : FY[1]; } return null; }
  function floorOf(x, z, y) { for (const B of blds) { const f = B.b.f; if (x > f[0] && x < f[1] && z > f[2] && z < f[3]) return { B, f: y > FY[2] - 1.2 ? 2 : y > FY[1] - 1.2 ? 1 : 0 }; } return null; }
  function tick(dt, p, rentedKey, cam) { const at = p ? floorOf(p.x, p.z, p.y) : null; for (const B of blds) { if (cam) { const sb = B.aabb(-16.6, -12.4, -2.1, 2.1); const inX = cam.x > sb[0] && cam.x < sb[1] && cam.z > sb[2] && cam.z < sb[3]; for (const m of B.shafts) m.visible = !inX; } for (const f of [1, 2]) B.floors[f].visible = !!at && at.B === B && at.f === f; if (B.pent) B.pent.blk.on = rentedKey !== B.key; kit.animFox(B.realtor, dt, 0, false); } return at; }
  const elevTo = (key, f) => { const B = blds.find(q => q.key === key); if (!B) return null; const [x, z] = B.W(-6, 0); return { x, z, y: FY[f], yaw: Math.atan2(...(() => { const F = FACE[B.b.face]; return [F[0], F[1]]; })()) }; };
  return { spots, groundAt, floorOf, tick, elevTo, FY };
}
