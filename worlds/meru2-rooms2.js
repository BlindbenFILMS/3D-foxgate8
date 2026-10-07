// MERU 2.0 — step 3: interiors, part 2. BURGERS [meruBurgers] (diner + the Sizzle job), MERU LANES [meruBowling] (tenpin),
// ITEM SHOP [meruItemshop] (Kia), ARMORY [meruArmory] (Bram), FORTUNE TELLER [meruFortune] (Ora). Stock + prices come from worlds/meru-shops.js.
import { KEEPERS } from './meru-shops.js';
export function buildRooms2({ THREE, scene, M, toon, kit, cols }) {
  const B = (w, h, d, col, x, y, z, ry = 0, o = 0.02) => { const m = M(new THREE.BoxGeometry(w, h, d), typeof col === 'string' ? toon(col) : col, x, y, z, null, o); m.rotation.y = ry; return m; };
  const C = (r, h, col, x, y, z, o = 0.02, n = 20) => M(new THREE.CylinderGeometry(r, r, h, n), typeof col === 'string' ? toon(col) : col, x, y, z, null, o);
  const box = (x0, x1, z0, z1) => cols.push({ f: [x0, x1, z0, z1] }), ring = (x, z, r) => cols.push({ c: [x, z, r] }), glow = c => new THREE.MeshBasicMaterial({ color: c });
  const fox = (key, opt, x, z, ry) => { const f = kit.makeFox({ key, ...opt }); f.position.set(x, 0, z); f.rotation.y = ry; scene.add(f); ring(x, z, 0.5); return f; };
  const spots = [], npcs = [];

  // ================= BURGERS (f 70..92 × 40..56, door W at z 48) =================
  { const red = '#c42d3c', chrome = toon('#cbd5e1'), cream = '#f2ead8';
    B(1, 1.1, 10, cream, 79, 0.55, 46); B(1.2, 0.1, 10.2, red, 79, 1.15, 46, 0, 0); box(78.5, 79.5, 41, 51);
    for (let z = 42; z <= 50; z += 2) { C(0.3, 0.08, red, 77.8, 0.8, z, 0.01); C(0.05, 0.78, chrome, 77.8, 0.4, z, 0); }
    B(1.2, 1, 6, '#3d3b3a', 82.6, 0.5, 43.5); B(1.1, 0.06, 2.4, glow(0xff7a2a), 82.6, 1.03, 42.6, 0, 0); B(1.2, 2.2, 0.9, '#9aa0a6', 82.6, 3.0, 43.5, 0, 0); box(82, 83.2, 40.5, 46.5);
    for (const z of [52.4, 54.6]) { B(3.4, 0.08, 1.2, cream, 74.5, 0.78, z, 0, 0.01); for (const dz of [-0.95, 0.95]) B(3.4, 1.0, 0.6, red, 74.5, 0.5, z + dz); box(72.8, 76.2, z - 1.3, z + 1.3); }
    for (let x = 71; x <= 91; x += 2) B(1, 0.04, 16, x % 4 === 1 ? '#201e1d' : '#f3f2f2', x, 0.05, 48, 0, 0);
    B(5, 1.4, 0.1, glow(0xff4a3a), 81, 5.6, 40.5, 0, 0);
    npcs.push(fox('burgerCook', { torso: '#f3f2f2', outfit: 'vest' }, 81.4, 44, -Math.PI / 2), fox('michaelJay', { torso: '#2e4a6b', outfit: 'coat' }, 88, 51, -Math.PI / 2));
    spots.push({ key: 'burgersJob', x: 77, z: 44, r: 1.8, prompt: 'PUT ME TO WORK \u00b7 BURGERS JOB', play: { label: 'BURGERS', url: 'Meru Burgers.dc.html?embed=1' } }); }

  // ================= MERU LANES (f 105..150 × -38..10, door W at z -14) =================
  { const lane = toon('#d9b27a'), gut = toon('#3d3b3a');
    for (let i = 0; i < 6; i++) { const z = -36 + i * 2.5; B(34, 0.06, 1.8, lane, 130, 0.04, z, 0, 0); B(34, 0.05, 0.35, gut, 130, 0.03, z + 1.07, 0, 0);
      for (const [dx, dz] of [[0, 0], [0.5, -0.3], [0.5, 0.3], [1, -0.6], [1, 0], [1, 0.6], [1.5, -0.9], [1.5, -0.3], [1.5, 0.3], [1.5, 0.9]]) C(0.09, 0.42, '#f3f2f2', 144.5 + dx * 0.55, 0.25, z + dz * 0.55, 0.005, 8);
      B(0.4, 0.04, 1.8, '#ec3013', 113.2, 0.07, z, 0, 0); }
    box(114, 149.6, -37.6, -21.4); B(0.4, 3, 16, '#201e1d', 149.3, 1.5, -29.5); B(36, 0.8, 0.3, '#201e1d', 131, 4.8, -21.2); B(30, 0.6, 0.06, glow(0x52e3ff), 131, 4.8, -21.04, 0, 0);
    for (let i = 0; i < 6; i++) { C(0.25, 0.9, '#5c6670', 111.5, 0.45, -36 + i * 2.5, 0.01, 10); B(0.6, 0.6, 0.6, '#201e1d', 111.5, 1.1, -36 + i * 2.5, 0, 0.01); }
    B(10, 1.1, 1, '#c94c3a', 127.5, 0.55, 2); B(10.2, 0.1, 1.2, '#f3f2f2', 127.5, 1.15, 2, 0, 0); box(122.5, 132.5, 1.5, 2.5);
    for (let x = 120; x <= 135; x += 1.2) B(0.9, 1.8, 0.4, '#3d3b3a', x, 0.9, 9.2, 0, 0.01);
    for (const [x, z] of [[112, -18], [122, -18], [140, -18]]) { B(4, 0.5, 1.2, '#2e4a6b', x, 0.25, z); box(x - 2, x + 2, z - 0.6, z + 0.6); }
    const people = [['lanesKeeper', '#c94c3a', 'vest', 127.5, 0.2, Math.PI], ['lanesRegular', '#6b737b', 'coat', 118.5, -16, Math.PI], ['lanesRecord', '#ffc64a', 'vest', 136.5, -16, Math.PI], ['lanesRival', '#201e1d', 'armor', 147, -6, -Math.PI / 2], ['bowlerDash', '#ec3013', 'vest', 110, -31, Math.PI / 2]];
    for (const [k, t, o, x, z, r] of people) npcs.push(fox(k, { torso: t, outfit: o }, x, z, r));
    spots.push({ key: 'tenpin', x: 111.5, z: -26, r: 2.4, prompt: 'PLAY \u00b7 TENPIN', play: { label: 'TENPIN', url: 'minigames/meru/tenpin.html' } }); }

  // ================= ITEM SHOP (Kia) + ARMORY (Bram): door N, counter across the back =================
  for (const [k, cx, shelf, wall] of [['kia', -28, '#e2cba4', '#f6efe0'], ['bram', 28, '#7c8794', '#cbd5e1']]) { const K = KEEPERS.find(q => q.key === k) || {};
    B(12, 1.1, 1, '#6b4a32', cx, 0.55, 70); B(12.2, 0.1, 1.2, '#3d2a1c', cx, 1.15, 70, 0, 0); box(cx - 6, cx + 6, 69.5, 70.5);
    for (let y = 0; y < 4; y++) B(18, 0.08, 0.8, shelf, cx, 0.6 + y * 0.8, 75.2, 0, 0); B(18, 3.4, 0.2, wall, cx, 1.7, 75.6, 0, 0); box(cx - 9.6, cx + 9.6, 74.6, 75.6);
    const goods = k === 'kia' ? ['#ec3013', '#38bdf8', '#ffd23a', '#7cff9b'] : ['#cbd5e1', '#9aa0a6', '#6b737b', '#ffc64a'];
    for (let x = -8.4; x <= 8.4; x += 0.9) for (let y = 0; y < 4; y++) B(0.45, 0.4, 0.4, goods[(Math.round(x * 2) + y) % 4], cx + x, 0.86 + y * 0.8, 75.1, 0, 0.005);
    if (k === 'bram') for (let x = -8; x <= 8; x += 2) { B(0.12, 2.2, 0.06, '#e7edf4', cx + x, 2.2, 61.2, 0, 0.005); B(0.6, 0.08, 0.1, '#ffc64a', cx + x, 1.2, 61.2, 0, 0); }
    npcs.push(fox(k, { torso: (K.torso && K.torso[0]) || shelf, outfit: K.outfit || 'vest' }, cx, 72.2, Math.PI));
    spots.push({ key: 'shop:' + k, x: cx, z: 68.4, r: 2.2, prompt: k === 'kia' ? 'ITEM SHOP \u00b7 BUY' : 'ARMORY \u00b7 BUY' }); }

  // ================= FORTUNE TELLER (Ora): small round room, crystal ball =================
  { C(0.9, 0.85, '#5b3f7a', -80, 0.42, -56.5, 0.02); const ball = C(0.32, 0.01, '#000', -80, 1.2, -56.5, 0); ball.visible = false;
    const orb = M(new THREE.SphereGeometry(0.32, 20, 14), new THREE.MeshPhongMaterial({ color: 0x9fd6ff, emissive: 0x3a6aa8, transparent: true, opacity: 0.8, shininess: 120 }), -80, 1.2, -56.5, null, 0); ring(-80, -56.5, 1.1);
    for (const s of [-1, 1]) B(0.1, 3.6, 7, '#7a2a3a', -80 + s * 5.4, 1.8, -54, 0, 0);
    npcs.push(fox('ora', { torso: '#5b3f7a', outfit: 'robe' }, -80, -58.2, 0)); npcs.orb = orb; }

  function tick(dt, t) { for (const f of npcs) kit.animFox(f, dt, 0, false); if (npcs.orb) npcs.orb.material.emissiveIntensity = 0.8 + Math.sin(t * 2.4) * 0.4; }
  return { spots, tick };
}
