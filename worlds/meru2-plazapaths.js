// MERU 2.0 — FOUNTAIN-AREA PATHS IN 3D (Ben, s34). Builds the network Ben agreed in the Town Layout Workshop (PATHS tab):
// brick ENTRANCE CLEARINGS in front of every door, door paths / second paths / extra paths 2.4 m, front strips + links 2 m, all in the
// same yellow brick as the main road, with grey EDGING STONES on both sides (flat, set just under the bricks so joins stay flush:
// where two paths meet the bricks cover the edging, corners are square-capped so they mitre). Everything on the network + 1 m is
// cleared (trees, shrubs, flowers, tufts, instanced props, small colliders; city lamps stay), then the lawns that are left are REPLANTED.
// ?oldpaths=1 = the s33 spurs instead. Debug: window.__m2plaza.
import { liveNet, keepClear } from './meru2-townnet.js';
import { floraRemove, plantTrees, plantFlowers } from './meru2-flora.js';
export function buildPlazaPaths({ THREE, scene, L, cols, heightAt = () => 0, roadD = () => 99, touch }) {
  const R = liveNet(L), on = R.filter(r => r.on && r.kind !== 'main'), PL = R.plazas, KC = keepClear(L);
  const G = new THREE.Group(); G.name = 'plazaPaths'; scene.add(G);
  // ---- clear the network ----
  const TOWN = [-160, 160, -140, 150], inT = (x, z) => x > TOWN[0] && x < TOWN[1] && z > TOWN[2] && z < TOWN[3];
  const bInside = (x, z, m = 0.3) => L.BUILDINGS.some(b => b.f && x > b.f[0] - m && x < b.f[1] + m && z > b.f[2] - m && z < b.f[3] + m);
  let n = floraRemove((x, z) => inT(x, z) && KC(x, z, 0.4) && roadD(x, z) > 0.5);
  const M4 = new THREE.Matrix4(), v = new THREE.Vector3(), Z = new THREE.Matrix4().makeScale(0, 0, 0);
  scene.traverse(o => { if (!o.isInstancedMesh || o.userData.lamp) return; let p = o, moved = false; while (p) { if (p.name && p.name.startsWith('moved:')) { moved = true; break; } p = p.parent; } if (moved) return;
    o.updateWorldMatrix(true, false); let hit = false;
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M4); v.setFromMatrixPosition(M4).applyMatrix4(o.matrixWorld); if (v.y < 5 && inT(v.x, v.z) && KC(v.x, v.z, 0.3) && roadD(v.x, v.z) > 0.5 && !bInside(v.x, v.z, -0.3)) { o.setMatrixAt(i, Z); hit = true; n++; } }
    if (hit) o.instanceMatrix.needsUpdate = true; });
  for (let i = cols.length - 1; i >= 0; i--) { const c = cols[i]; if (c._keep) continue; let x, z, small;
    if (c.c) { x = c.c[0]; z = c.c[1]; small = c.c[2] < 2.5; } else if (c.f) { x = (c.f[0] + c.f[1]) / 2; z = (c.f[2] + c.f[3]) / 2; small = c.f[1] - c.f[0] < 4 && c.f[3] - c.f[2] < 4; } else continue;
    if (small && inT(x, z) && KC(x, z, 0) && !bInside(x, z, 0.5)) { cols.splice(i, 1); n++; } }
  // ---- surfaces ----
  const brickTex = (rot) => { const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#8a6a1c'; g.fillRect(0, 0, 128, 256);
    for (let r = 0; r < 16; r++) { const o = r % 2 ? 0 : 16; for (let i = -1; i < 5; i++) { const k = 0.86 + ((i * 7 + r * 11) % 7) / 28; g.fillStyle = 'rgb(' + (240 * k | 0) + ',' + (196 * k | 0) + ',' + (58 * k | 0) + ')'; g.fillRect(i * 32 + o + 1.5, r * 16 + 1.5, 29, 13); } }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const weaveTex = () => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#8a6a1c'; g.fillRect(0, 0, 128, 128);
    for (let by = 0; by < 4; by++) for (let bx = 0; bx < 4; bx++) { const vert = (bx + by) % 2, k0 = 0.88 + ((bx * 5 + by * 3) % 5) / 30;
      for (let j = 0; j < 2; j++) { const k = k0 - j * 0.04; g.fillStyle = 'rgb(' + (238 * k | 0) + ',' + (190 * k | 0) + ',' + (60 * k | 0) + ')'; if (vert) g.fillRect(bx * 32 + j * 16 + 1.5, by * 32 + 1.5, 13, 29); else g.fillRect(bx * 32 + 1.5, by * 32 + j * 16 + 1.5, 29, 13); } }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const kerbTex = () => { const c = document.createElement('canvas'); c.width = 32; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#5e5a55'; g.fillRect(0, 0, 32, 128);
    for (let i = 0; i < 4; i++) { const k = 0.92 + (i % 3) * 0.04; g.fillStyle = 'rgb(' + (176 * k | 0) + ',' + (170 * k | 0) + ',' + (160 * k | 0) + ')'; g.fillRect(1, i * 32 + 1, 30, 30); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const mk = (tex, off) => new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: off, polygonOffsetUnits: off });
  const matBrick = mk(brickTex(), -3), matWeave = mk(weaveTex(), -3), matKerb = mk(kerbTex(), -2);
  const B = { brick: [[], [], []], weave: [[], [], []], kerb: [[], [], []] };
  // a flat quad from a centre line a→b, half width h, extended e at both ends, lifted y; uv along the strip (metres / s)
  const quad = (S, ax, az, bx, bz, h, e, y, s, ws = 1) => { const len = Math.hypot(bx - ax, bz - az); if (len < 0.05) return; const ux = (bx - ax) / len, uz = (bz - az) / len, nx = -uz, nz = ux;
    const x0 = ax - ux * e, z0 = az - uz * e, x1 = bx + ux * e, z1 = bz + uz * e, L1 = len + 2 * e, steps = Math.max(1, Math.ceil(L1 / 2)), base = S[0].length / 3;
    for (let i = 0; i <= steps; i++) { const t = i / steps, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, yy = heightAt(x, z) + y;
      S[0].push(x + nx * h, yy, z + nz * h, x - nx * h, yy, z - nz * h); S[1].push(0, t * L1 / s, (2 * h) / s * ws, t * L1 / s);
      if (i) { const k = base + (i - 1) * 2; S[2].push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } } };
  const rectQ = (S, r, y, s) => { const [x0, x1, z0, z1] = r, nx = Math.max(1, Math.ceil((x1 - x0) / 2)), nz = Math.max(1, Math.ceil((z1 - z0) / 2)), base = S[0].length / 3;
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * j / nz; S[0].push(x, heightAt(x, z) + y, z); S[1].push(x / s, z / s); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = base + j * (nx + 1) + i; S[2].push(k, k + nx + 1, k + 1, k + 1, k + nx + 1, k + nx + 2); } };
  const YB = 0.07, YK = 0.058, KW = 0.24;
  // clearings: woven brick, edging round the three open sides (the wall side has the building)
  const DIR = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
  for (const p of PL) { const b = L.BUILDINGS.find(q => q.key === p.key); rectQ(B.weave, p.r, YB + 0.002, 1.6);
    const [x0, x1, z0, z1] = p.r, wallSide = { N: 'S', S: 'N', E: 'W', W: 'E' }[b ? b.face : 'S'], ed = { N: [x0, z0, x1, z0], S: [x0, z1, x1, z1], W: [x0, z0, x0, z1], E: [x1, z0, x1, z1] };
    for (const sd of ['N', 'S', 'E', 'W']) { if (sd === wallSide) continue; const [ax, az, bx, bz] = ed[sd], [dx, dz] = DIR[sd]; quad(B.kerb, ax + dx * KW / 2, az + dz * KW / 2, bx + dx * KW / 2, bz + dz * KW / 2, KW / 2, KW, YK, 1); } }
  // strips: bricks square-capped by half their width (so corners fill and mitre), edging both sides, capped by the edging width
  for (const r of on) { const h = r.w / 2;
    for (let i = 0; i < r.pts.length - 1; i++) { const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], len = Math.hypot(bx - ax, bz - az); if (len < 0.05) continue; const ux = (bx - ax) / len, uz = (bz - az) / len, nx = -uz, nz = ux;
      quad(B.brick, ax, az, bx, bz, h, h, YB, 1.6, 0.75 / (2 * h / 1.6));
      for (const sd of [-1, 1]) { const ox = nx * sd * (h + KW / 2), oz = nz * sd * (h + KW / 2); quad(B.kerb, ax + ox, az + oz, bx + ox, bz + oz, KW / 2, h + KW, YK, 1); } } }
  const meshOf = (S, mat) => { if (!S[0].length) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(S[0], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(S[1], 2)); g.setIndex(S[2]); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.renderOrder = -1; m.receiveShadow = !touch; G.add(m); return m; };
  meshOf(B.kerb, matKerb); meshOf(B.brick, matBrick); meshOf(B.weave, matWeave);
  // ---- replant the lawns that are left: trees on a jittered grid, flower clusters by the clearings' outer corners ----
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const surf = (x, z) => (L.surfaceAt ? L.surfaceAt(x, z) : 'grass');
  const blocked = (x, z, r) => cols.some(c => c.c ? Math.hypot(c.c[0] - x, c.c[1] - z) < c.c[2] + r : c.f ? x > c.f[0] - r && x < c.f[1] + r && z > c.f[2] - r && z < c.f[3] + r : false);
  const pathD = (x, z) => Math.min(Math.abs(x), Math.abs(z));
  const trees = [], CELL = touch ? 15 : 11, MAX = touch ? 40 : 110;
  for (let gz = TOWN[2] + 8; gz < TOWN[3] - 8 && trees.length < MAX; gz += CELL) for (let gx = TOWN[0] + 8; gx < TOWN[1] - 8 && trees.length < MAX; gx += CELL) {
    const x = gx + (hash(gx, gz) - 0.5) * CELL * 0.6, z = gz + (hash(gz, gx) - 0.5) * CELL * 0.6;
    if (surf(x, z) !== 'grass' || Math.hypot(x, z) < 16 || pathD(x, z) < 5 || roadD(x, z) < 4 || bInside(x, z, 4) || KC(x, z, 2.6) || blocked(x, z, 2.2)) continue;
    trees.push({ x, z, kind: ['broad', 'lime', 'birch', 'broad', 'poplar'][Math.floor(hash(x, z) * 5)], s: 0.85 + hash(z, x) * 0.35, y: heightAt(x, z) }); cols.push({ c: [x, z, 0.45], _keep: true }); }
  let treeGroup = null; try { if (trees.length) { treeGroup = plantTrees(trees.map(t => [t.x, t.y, t.z, t.s, t.kind]), { shadow: !touch }); const tg = treeGroup && (treeGroup.isObject3D ? treeGroup : treeGroup.group); if (tg && tg.isObject3D && !tg.parent) scene.add(tg); } } catch (e) { console.warn('replant trees failed', e); }
  const flowers = []; for (const p of PL) { const [x0, x1, z0, z1] = p.r; for (const [x, z] of [[x0 - 2, z0 - 2], [x1 + 2, z0 - 2], [x0 - 2, z1 + 2], [x1 + 2, z1 + 2]]) for (let k = 0; k < 3; k++) { const fx = x + (hash(x, k) - 0.5) * 1.6, fz = z + (hash(k, z) - 0.5) * 1.6;
      if (surf(fx, fz) === 'grass' && !KC(fx, fz, 0.3) && !bInside(fx, fz, 0.6) && roadD(fx, fz) > (L.SIDEWALK || 3.3) + 1) flowers.push([fx, heightAt(fx, fz), fz, 0.9 + hash(fx, fz) * 0.4]); } }
  try { if (flowers.length && !touch) { const fr = plantFlowers(flowers), fg = fr && (fr.isObject3D ? fr : fr.group); if (fg && fg.isObject3D && !fg.parent) scene.add(fg); } } catch (e) { console.warn('replant flowers failed', e); }
  const info = { paths: on.length, clearings: PL.length, cleared: n, trees: trees.length, flowers: flowers.length };
  if (typeof window !== 'undefined') window.__m2plaza = { ...info, routes: R, keepClear: KC };
  return { ...info, group: G, routes: R, segs: on.flatMap(r => r.pts.slice(1).map((p, i) => [r.pts[i][0], r.pts[i][1], p[0], p[1], r.w / 2 + 0.3])) };
}
