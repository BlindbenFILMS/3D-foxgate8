// MERU 2.0 — step 3: interiors, part 1. TAVERN [meruTavern] and CASINO [meruCasino], dressed inside the city shells.
// Every game spot opens the original 2D minigame (minigames/meru/*.html) full-screen in the job panel.
// Casino = three SOUND BAYS split by glass partitions (slots west, poker north, wheel south) + the cashier cage, so voices don't stack.
const G = 'minigames/meru/';
export function buildRooms({ THREE, scene, M, toon, kit, cast, cols }) {
  const B = (w, h, d, col, x, y, z, ry = 0, o = 0.02) => { const m = M(new THREE.BoxGeometry(w, h, d), typeof col === 'string' ? toon(col) : col, x, y, z, null, o); m.rotation.y = ry; return m; };
  const C = (r, h, col, x, y, z, o = 0.02) => M(new THREE.CylinderGeometry(r, r, h, 20), typeof col === 'string' ? toon(col) : col, x, y, z, null, o);
  const box = (x0, x1, z0, z1) => cols.push({ f: [x0, x1, z0, z1] }), ring = (x, z, r) => cols.push({ c: [x, z, r] });
  const glow = c => new THREE.MeshBasicMaterial({ color: c });
  const fox = (key, opt, x, z, ry) => { const f = kit.makeFox({ key, ...opt }); f.position.set(x, 0, z); f.rotation.y = ry; scene.add(f); ring(x, z, 0.5); return f; };
  const tex = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const spots = [], npcs = [], flick = [];
  const play = (label, url, x, z, r = 1.8) => spots.push({ key: label, x, z, r, prompt: 'PLAY \u00b7 ' + label, play: { label, url: G + url } });

  // ================= TAVERN (f 12..52 × -100..-60, door S at x 32) =================
  { const wood = toon('#6b4a32'), top = toon('#3d2a1c');
    B(24, 1.1, 1, wood, 32, 0.55, -95); B(24.2, 0.1, 1.3, top, 32, 1.15, -95, 0, 0); box(20, 44, -95.6, -94.4);
    B(24, 3.2, 0.5, '#4a3324', 32, 1.9, -99.3); for (let i = 0; i < 3; i++) B(23, 0.08, 0.5, top, 32, 1.2 + i * 0.9, -99, 0, 0);
    const btl = ['#2f7d4a', '#8a3b2a', '#c9a227', '#3b5e8a']; for (let x = 21; x < 43.5; x += 0.7) for (let i = 0; i < 3; i++) C(0.09, 0.5, btl[(Math.round(x * 3) + i) % 4], x, 1.5 + i * 0.9, -98.9, 0);
    for (let x = 22; x <= 42; x += 2.5) { C(0.28, 0.08, top, x, 0.85, -93.6, 0.01); C(0.06, 0.8, '#201e1d', x, 0.42, -93.6, 0); }
    // fireplace on the west wall
    B(1.4, 3.4, 5, '#8a8580', 13.1, 1.7, -80); B(0.4, 1.6, 2.6, '#201e1d', 13.7, 0.8, -80, 0, 0); box(12.4, 13.9, -82.5, -77.5);
    const fire = B(0.3, 0.9, 2, glow(0xff8a2a), 13.8, 0.5, -80, 0, 0); flick.push(fire);
    // tables + chairs (kept clear of Noble at 26,-76 and Doc Braun at 39,-85)
    for (const [x, z] of [[20, -86], [32, -86], [44, -78], [32, -70], [20, -68], [44, -68]]) { C(0.9, 0.08, top, x, 0.78, z, 0.01); C(0.12, 0.76, '#201e1d', x, 0.38, z, 0); ring(x, z, 1.1);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; B(0.5, 0.5, 0.5, wood, x + Math.sin(a) * 1.35, 0.25, z + Math.cos(a) * 1.35, a, 0.01); }
      C(0.35, 0.3, glow(0xffd28a), x, 5.4, z, 0); C(0.02, 1.4, '#201e1d', x, 6.2, z, 0); }
    // darts on the east wall, jukebox in the north-east corner
    const dt = tex(256, 256, (g, w) => { const cx = w / 2; ['#201e1d', '#f3e9d2', '#ec3013', '#201e1d', '#2f7d4a', '#ec3013'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(cx, cx, cx * (1 - i * 0.16), 0, 7); g.fill(); }); g.strokeStyle = '#c9c2b0'; g.lineWidth = 2; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; g.beginPath(); g.moveTo(cx, cx); g.lineTo(cx + Math.cos(a) * cx, cx + Math.sin(a) * cx); g.stroke(); } });
    const board = M(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 32), [toon('#201e1d'), new THREE.MeshBasicMaterial({ map: dt }), toon('#201e1d')], 51.5, 1.75, -78, null, 0); board.rotation.z = Math.PI / 2;
    B(0.1, 0.05, 2.4, '#ffd23a', 51.7, 0.02, -78, 0, 0); play('DARTS', 'darts.html', 49.3, -78);
    B(1.3, 1.9, 0.9, '#7a2a3a', 49.5, 0.95, -97.6); B(1.0, 0.8, 0.05, glow(0xffc64a), 49.5, 1.25, -97.12, 0, 0); C(0.5, 0.92, glow(0xff5fb0), 49.5, 1.9, -97.6, 0).rotation.x = Math.PI / 2; box(48.8, 50.2, -98.1, -97.1);
    play('JUKEBOX', 'jukebox.html', 49.5, -95.6);
    const noble = cast.make('noble'); noble.position.set(26, 0, -76); noble.rotation.y = Math.PI * 0.85; scene.add(noble); ring(26, -76, 0.6); npcs.push(noble);
    npcs.push(fox('docBraun', { torso: '#5c6670', outfit: 'coat' }, 39, -85, -Math.PI * 0.75)); }

  // ================= CASINO (f -150..-105 × -32..32, door E at z 0) =================
  { const felt = toon('#1f6b45'), rim = toon('#3d2a1c'), gl = new THREE.MeshPhongMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.22, depthWrite: false, shininess: 120 });
    // glass partitions make the bays (with wide openings toward the middle aisle)
    for (const z of [-11, 11]) { B(26, 2.6, 0.06, gl, -131, 1.3, z, 0, 0); B(26, 0.12, 0.12, '#ffc64a', -131, 2.66, z, 0, 0); box(-144, -118, z - 0.1, z + 0.1); }
    B(0.06, 2.6, 18, gl, -142, 1.3, 0, 0, 0); box(-142.1, -141.9, -9, 9);
    // SLOTS bay (west wall)
    const kinds = [['SLOTS', 'slot1.html'], ['TRIPLE SLOTS', 'slot3.html'], ['FOX SLOTS', 'slotFox.html']];
    for (let i = 0; i < 6; i++) { const z = -7.5 + i * 3, [lab, url] = kinds[i % 3], col = ['#ec3013', '#2e4a6b', '#ffc64a'][i % 3];
      B(1.1, 2.1, 1, col, -148.8, 1.05, z); B(0.05, 0.8, 0.8, glow(0xfff1c4), -148.22, 1.45, z, 0, 0); B(0.4, 0.5, 0.05, glow(0xff3fb4), -148.22, 2.35, z, Math.PI / 2, 0); box(-149.6, -148.2, z - 0.5, z + 0.5);
      C(0.25, 0.6, '#201e1d', -147, 0.3, z, 0.01); }
    for (let i = 0; i < 3; i++) play(kinds[i][0], kinds[i][1], -146.4, -7.5 + i * 3, 1.3);
    for (let i = 3; i < 6; i++) spots.push({ ...spots[spots.length - 3], z: -7.5 + i * 3 });
    // POKER bay (north)
    for (const [x, z, lab, url] of [[-137, -21, 'FIVE CARD POKER', 'poker5.html'], [-122, -22, "TEXAS HOLD'EM", 'pokerTexas.html']]) { const t = C(1.6, 0.12, felt, x, 0.9, z, 0.02); t.scale.x = 1.5; const r2 = C(1.7, 0.1, rim, x, 0.84, z, 0); r2.scale.x = 1.5; C(0.3, 0.8, '#201e1d', x, 0.4, z, 0); ring(x, z, 2.2);
      for (let k = 0; k < 5; k++) { const a = Math.PI * 0.2 + k * Math.PI * 0.15; B(0.5, 0.9, 0.5, '#7a2a3a', x + Math.cos(a) * 3.0, 0.45, z + Math.sin(a) * 1.9, 0, 0.01); }
      C(0.5, 0.2, glow(0xffd28a), x, 3.4, z, 0); play(lab, url, x, z + 3.4, 1.6); }
    // WHEEL bay (south)
    const wt = tex(256, 256, (g, w) => { const cx = w / 2, n = 16; for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#ec3013' : '#f3f2f2'; if (i === 0) g.fillStyle = '#ffc64a'; g.beginPath(); g.moveTo(cx, cx); g.arc(cx, cx, cx, i / n * 6.283, (i + 1) / n * 6.283); g.fill(); } g.fillStyle = '#201e1d'; g.beginPath(); g.arc(cx, cx, cx * 0.18, 0, 7); g.fill(); });
    const wheel = M(new THREE.CylinderGeometry(2.2, 2.2, 0.2, 40), [toon('#3d2a1c'), new THREE.MeshBasicMaterial({ map: wt }), toon('#3d2a1c')], -118, 3.0, 26, null, 0.02); wheel.rotation.x = Math.PI / 2; B(0.4, 3, 0.4, '#3d2a1c', -118, 1.5, 26.4); B(0.3, 0.6, 0.1, '#ffc64a', -118, 5.35, 25.85, 0, 0);
    box(-120.4, -115.6, 25.6, 26.8); flick.push({ spin: wheel }); play('THE WHEEL', 'wheel.html', -118, 22.5, 1.8);
    // CASHIER cage (south-west)
    B(8, 1.2, 0.8, '#3d2a1c', -140, 0.6, 22); for (let x = -143.8; x <= -136.2; x += 0.4) B(0.05, 1.6, 0.05, '#ffc64a', x, 2.0, 22, 0, 0); B(8, 0.1, 0.9, '#ffc64a', -140, 2.85, 22, 0, 0); box(-144, -136, 21.6, 22.4);
    // neon trim round the hall
    for (const [w, d, x, z] of [[44, 0.1, -127.5, -31.4], [44, 0.1, -127.5, 31.4], [0.1, 62, -149.4, 0]]) B(w, 0.18, d, glow(0xff3fb4), x, 6.2, z, 0, 0);
    npcs.push(fox('casinoPoker1', { torso: '#201e1d', outfit: 'vest' }, -137, -23.6, 0), fox('casinoPoker2', { torso: '#201e1d', outfit: 'vest' }, -122, -24.6, 0), fox('casinoWheel', { torso: '#7a2a3a', outfit: 'suit' }, -121, 26, Math.PI), fox('casinoCashier', { torso: '#2e4a6b', outfit: 'vest' }, -140, 23.6, Math.PI)); }

  function tick(dt, t) { for (const f of npcs) kit.animFox(f, dt, 0, false); for (const f of flick) { if (f.spin) f.spin.rotation.y += dt * 0.4; else f.scale.y = 0.85 + Math.sin(t * 13) * 0.1 + Math.sin(t * 7.1) * 0.08; } }
  return { spots, tick };
}
