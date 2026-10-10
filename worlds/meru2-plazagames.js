// MERU 2.0 — FOUNTAIN PLAZA GAMES (Ben): round the fountain, a pair of each: CHESS tables (NE), CHECKERS tables (NW), TETHERBALL poles (SE).
// In each pair one is in use (two foxes playing, a watcher at chess) and the other is open: E · PLAY opens the real game in the panel
// (g/chess-club, g/checkers-club, g/tetherball-hall, copied from the 3D-foxgate8 repo). Static parts merged per material (roomkit Bin).
import { makeRoomKit } from './meru2-roomkit.js';
export function buildPlazaGames({ THREE, scene, kit, cols, touch }) {
  const { CT, Bin, flat } = makeRoomKit({ THREE, touch });
  const K = 1.35, G = new THREE.Group(); G.name = 'plazaGames'; G.scale.setScalar(K); scene.add(G); const b = Bin(), spots = [], people = [], seated = [];
  const ring = (x, z, r) => cols.push({ c: [x * K, z * K, r * K] }), ringW = (x, z, r) => cols.push({ c: [x, z, r] });
  const PLAY = (key, label, url, x, z, r = 1.4) => spots.push({ key, x, z, r, prompt: 'PLAY \u00b7 ' + label, play: { label, url } });
  const fox = (key, opt, x, z, ry, sit) => { const f = kit.makeFox({ key, ...opt }); f.position.set(x * K, sit ? 0.48 * K - 0.5 : 0, z * K); f.rotation.y = ry; scene.add(f); people.push(f); if (sit) seated.push(f); else ringW(x * K, z * K, 0.45); return f; };   // x, z in plaza-local units
  const boardTex = (a, c, edge) => CT(256, 256, (g, w) => { g.fillStyle = edge; g.fillRect(0, 0, w, w); const s = (w - 24) / 8; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? c : a; g.fillRect(12 + i * s, 12 + j * s, s, s); } });
  const chessB = boardTex('#efe3c4', '#3f6b4f', '#5a3d26'), checkB = boardTex('#efe3c4', '#b3261e', '#201e1d');
  const SQ = 0.84 / 8, at = (x, z, i, j) => [x + (i - 3.5) * SQ, z + (j - 3.5) * SQ];
  // a stone park table: pedestal, square top with the board inlaid, two stools (players sit east / west of it)
  function table(x, z, tex) { b.cyl('mat', '#a39a8c', 0.42, 0.06, x, 0.03, z, 16); b.cyl('mat', '#bdb3a3', 0.16, 0.66, x, 0.36, z, 12); b.box('mat', '#d9cfbd', 1.06, 0.08, 1.06, x, 0.74, z); b.box('mat', '#b9ae9b', 1.1, 0.03, 1.1, x, 0.695, z);
    flat(G, tex, 0.94, 0.94, x, 0.782, z);
    for (const s of [-1, 1]) { b.cyl('mat', '#bdb3a3', 0.13, 0.42, x + s * 0.95, 0.21, z, 10); b.cyl('mat', '#d9cfbd', 0.22, 0.06, x + s * 0.95, 0.45, z, 14); }
    ring(x, z, 0.62); ring(x - 0.95, z, 0.24); ring(x + 0.95, z, 0.24); }
  const Y = 0.79;
  const chessPiece = (x, z, white, kind) => { const c = white ? '#f3efe6' : '#201e1d', h = [0.05, 0.08, 0.075, 0.075, 0.1, 0.11][kind];
    b.cyl('gls', c, 0.032, 0.02, x, Y + 0.01, z, 10); b.cyl('gls', c, 0.02, h, x, Y + 0.02 + h / 2, z, 8); b.sph('gls', c, kind === 0 ? 0.022 : 0.026, x, Y + 0.03 + h, z, 1, 8);
    if (kind >= 4) b.box('gls', white ? '#e6b45a' : '#e6b45a', 0.012, 0.03, 0.012, x, Y + 0.07 + h, z); };
  const BACK = [3, 1, 2, 4, 5, 2, 1, 3];   // rook knight bishop queen king bishop knight rook (sizes only)
  // board files run along z (players sit on x), so white's rows are i = 0..1 (west player), black i = 6..7
  function chessSet(x, z, mid) { for (let j = 0; j < 8; j++) for (const [i, w, k] of [[0, 1, BACK[j]], [1, 1, 0], [6, 0, 0], [7, 0, BACK[j]]]) {
      let ii = i; if (mid) { const h = (j * 7 + i * 3) % 5; if (k === 0 && h < 2) ii = w ? 3 : 4; else if (h === 4 && k !== 5) continue; }
      const [px, pz] = at(x, z, ii, j); chessPiece(px, pz, w, k); }
    if (mid) for (let k = 0; k < 4; k++) { const sx = x + (k < 2 ? -0.62 : 0.62), sz = z + 0.36 + (k % 2) * 0.07; chessPiece(sx, sz, k >= 2, 0); } }
  const disc = (x, z, red, king) => { const c = red ? '#c42d3c' : '#201e1d'; b.cyl('gls', c, 0.04, 0.022, x, Y + 0.011, z, 14); b.cyl('gls', red ? '#e85a5a' : '#3a3634', 0.028, 0.004, x, Y + 0.024, z, 12); if (king) { b.cyl('gls', c, 0.04, 0.022, x, Y + 0.033, z, 14); b.cyl('glo', '#e6b45a', 0.02, 0.004, x, Y + 0.046, z, 10); } };
  function checkSet(x, z, mid) { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { if ((i + j) % 2 === 0) continue; const red = i < 3, blk = i > 4; if (!red && !blk) continue;
      if (mid && ((i * 5 + j * 3) % 4 === 0)) continue; const [px, pz] = at(x, z, i, j); disc(px, pz, red, false); }
    if (mid) { for (const [i, j, r, k] of [[3, 2, 1, 0], [4, 5, 0, 0], [3, 4, 1, 0], [5, 2, 1, 1]]) { const [px, pz] = at(x, z, i, j); disc(px, pz, !!r, !!k); }
      for (let k = 0; k < 3; k++) disc(x - 0.62, z + 0.3 + k * 0.09, false, false); for (let k = 0; k < 2; k++) disc(x + 0.62, z + 0.3 + k * 0.09, true, false); } }
  // CHESS (NE) — in use + open
  const CH = [[19, -19], [23.6, -19]].map(([x, z]) => [x / K, z / K]), CK = [[-23.6, -19], [-19, -19]].map(([x, z]) => [x / K, z / K]);
  CH.forEach(([x, z], k) => { table(x, z, chessB); chessSet(x, z, k === 0); });
  CK.forEach(([x, z], k) => { table(x, z, checkB); checkSet(x, z, k === 0); });
  fox('plazaChessA', { torso: '#6b737b', outfit: 'coat', mood: 'stern' }, CH[0][0] - 0.95, CH[0][1], Math.PI / 2, true);
  fox('plazaChessB', { torso: '#e6b45a', outfit: 'vest', mood: 'determined' }, CH[0][0] + 0.95, CH[0][1], -Math.PI / 2, true);
  if (!matchMedia('(pointer: coarse)').matches) fox('plazaChessWatch', { torso: '#2e4a6b', outfit: 'robe', mood: 'neutral' }, CH[0][0] + 0.2, CH[0][1] - 1.2, 0.1, false);
  fox('plazaCheckA', { torso: '#c94c3a', outfit: 'vest', mood: 'happy' }, CK[0][0] - 0.95, CK[0][1], Math.PI / 2, true);
  fox('plazaCheckB', { torso: '#7c3aed', outfit: 'dress', female: true, mood: 'warm' }, CK[0][0] + 0.95, CK[0][1], -Math.PI / 2, true);
  PLAY('plaza:chess', 'CHESS', 'g/chess-club/chess-club.dc.html?embed=1', (CH[1][0] + 1.25) * K, CH[1][1] * K, 1.4);
  PLAY('plaza:checkers', 'CHECKERS', 'g/checkers-club/checkers-club.dc.html?embed=1', (CK[1][0] + 1.25) * K, CK[1][1] * K, 1.4);
  // TETHERBALL (SE) — two poles on painted circles; one game going, one open
  const TB = [[17.5, 19.5], [24.5, 21]].map(([x, z]) => [x / K, z / K]), TOP = 2.5, ROPE = 1.45, ropes = [], balls = [];
  const circle = CT(256, 256, (g, w) => { g.clearRect(0, 0, w, w); g.strokeStyle = '#f3f2f2'; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.stroke(); g.beginPath(); g.moveTo(128, 10); g.lineTo(128, 246); g.stroke(); g.fillStyle = 'rgba(236,48,19,0.18)'; g.beginPath(); g.arc(128, 128, 114, 0, 7); g.fill(); });
  const circM = new THREE.MeshBasicMaterial({ map: circle, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const ropeM = new THREE.LineBasicMaterial({ color: 0xe6e1d3 }), ballM = new THREE.MeshLambertMaterial({ color: 0xffd23a });
  TB.forEach(([x, z]) => { const c = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), circM); c.rotation.x = -Math.PI / 2; c.position.set(x, 0.035, z); G.add(c);
    b.cyl('mat', '#8a8f99', 0.22, 0.12, x, 0.06, z, 14); b.cyl('gls', '#c0c4cc', 0.045, TOP, x, TOP / 2, z, 10); b.sph('gls', '#ec3013', 0.07, x, TOP + 0.03, z, 1, 10); b.cyl('glo', '#ec3013', 0.05, 0.12, x, 1.7, z, 10); ring(x, z, 0.12);
    const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([x, TOP - 0.1, z, x, 1.3, z], 3)); const ln = new THREE.Line(geo, ropeM); G.add(ln); ropes.push(ln);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), ballM); G.add(ball); balls.push(ball); });
  const pA = fox('plazaTetherA', { torso: '#38bdf8', outfit: 'vest', mood: 'excited' }, TB[0][0] - 1.55, TB[0][1], Math.PI / 2, false);
  const pB = fox('plazaTetherB', { torso: '#f97316', outfit: 'vest', mood: 'determined' }, TB[0][0] + 1.55, TB[0][1], -Math.PI / 2, false);
  PLAY('plaza:tetherball', 'TETHERBALL', 'g/tetherball-hall/Main.dc.html?embed=1', TB[1][0] * K, (TB[1][1] + 1.7) * K, 1.6);
  b.build(G);
  // per frame (only when near): seated pose, a move now and then, the tetherball game
  let th = 0, dir = 1, swingA = 0, swingB = 0, near = true, moveT = 0, mover = 0; const far = touch ? 55 : 90;
  function tick(dt, t, cam) {
    const on = !cam || Math.hypot(cam.x - 0, cam.z - 0) < far; if (on !== near) { near = on; G.visible = on; for (const f of people) f.visible = on; } if (!on) return;
    for (const f of people) kit.animFox(f, dt, 0, false);
    moveT -= dt; if (moveT <= 0) { moveT = 2.5 + Math.random() * 4; mover = Math.floor(Math.random() * seated.length); }
    seated.forEach((f, i) => { const P = f.userData.P; if (!P) return; P.body.position.y = 0; P.legs.forEach(l => l.rotation.x = -1.45); P.head.rotation.x = 0.32;
      const reach = i === mover && moveT > 1.6 ? Math.sin((moveT - 1.6) / 0.9 * Math.PI) : 0; if (P.arms) { P.arms[0].rotation.x = -0.55; P.arms[1].rotation.x = -0.55 - reach * 0.7; } });
    // ball 1: orbits the pole; each player smacks it as it passes their side (direction flips now and then)
    th += dir * dt * 3.1; const phi = 1.12 + Math.sin(t * 0.7) * 0.08, r = ROPE * Math.sin(phi), y = TOP - 0.1 - ROPE * Math.cos(phi);
    const [x0, z0] = TB[0], bx = x0 + Math.cos(th) * r, bz = z0 + Math.sin(th) * r; balls[0].position.set(bx, y, bz);
    const p0 = ropes[0].geometry.attributes.position; p0.setXYZ(1, bx, y, bz); p0.needsUpdate = true;
    const a = Math.atan2(Math.sin(th), Math.cos(th));
    if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.2 && swingA <= 0) { swingA = 0.5; pA.userData.hop = 0.6; if (Math.random() < 0.15) dir = -dir; }
    if (Math.abs(a) < 0.2 && swingB <= 0) { swingB = 0.5; if (Math.random() < 0.15) dir = -dir; }
    for (const [f, s] of [[pA, swingA], [pB, swingB]]) { const P = f.userData.P; if (P && P.arms) P.arms[1].rotation.x = s > 0 ? -2.6 + (0.5 - s) * 4 : -0.3; }
    swingA -= dt; swingB -= dt;
    pA.lookAt(bx * K, 0, bz * K); pA.rotation.x = pA.rotation.z = 0; pB.lookAt(bx * K, 0, bz * K); pB.rotation.x = pB.rotation.z = 0;
    // ball 2: hangs at rest, sways in the breeze
    const [x1, z1] = TB[1], sw = Math.sin(t * 1.3) * 0.09, hx = x1 + sw, hy = TOP - 0.1 - ROPE * Math.cos(sw / ROPE), hz = z1 + Math.cos(t * 0.9) * 0.05;
    balls[1].position.set(hx, hy, hz); const p1 = ropes[1].geometry.attributes.position; p1.setXYZ(1, hx, hy, hz); p1.needsUpdate = true;
  }
  return { spots, tick, people };
}
