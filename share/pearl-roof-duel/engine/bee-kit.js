// s728cs BEE AVATAR (Ben). Built ON the fox rig like the other species (outfit, gear + anims kept; fox head / ears / tail hidden).
// Fur → golden-yellow fuzz, paws → black. HEAD: a round fuzzy yellow head (vertex fuzz shading) with a black face band, BIG glossy black
// compound eyes with 2 shines, ELBOWED antennae with club tips that bob + perk with mood + flick on the ear timer, little brows.
// TALKING MOUTH: a smiling mouth like the bear's: an inked lip line, a dark cavity with the pink tongue + 2 tiny teeth, two small mandibles
// at the corners that open with the speech engine (u.mouth / u.mp). WINGS: 2 pairs of clear veined wings that BUZZ in bursts (blur) and rest
// folded back. ABDOMEN: a big striped fuzzy bum (yellow / black bands) on P.tail with a little stinger, it pulses + wiggles.
export const BEE_LOOK = { fuzz: '#f2b81c', fuzzDark: '#c98a0c', black: '#1c1a18', eye: '#141418', wing: '#dcefff', vein: '#7a8aa0', mouth: '#2a0e12' };
export function beeize({ THREE, M, toon }, fox, look = {}) {
  const B = { ...BEE_LOOK, ...look }, u = fox.userData, P = u.P, Lf = (u.face && u.face.L) || {};
  const FZ = toon(B.fuzz), BK = toon(B.black), FD = toon(B.fuzzDark), INK = new THREE.MeshBasicMaterial({ color: 0x111111 }), WH = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const S = (r, w = 24, h = 16) => new THREE.SphereGeometry(r, w, h), V = (x, y, z) => new THREE.Vector3(x, y, z), sm = (e0, e1, x) => { const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
  const furC = [Lf.fur, Lf.furDark].filter(Boolean).map(c => new THREE.Color(c).getHex()), pawC = Lf.paw ? new THREE.Color(Lf.paw).getHex() : -1;
  fox.traverse(o => { if (!o.isMesh || !o.material || Array.isArray(o.material) || !o.material.color) return; const h = o.material.color.getHex(); if (h === pawC) o.material = BK; else if (furC.includes(h)) o.material = FZ; });
  P.head.children.forEach(c => c.visible = false); P.tail.children.forEach(c => c.visible = false); if (P.ears) P.ears.forEach(e => e.visible = false);
  const VC = toon('#ffffff', { vertexColors: true });
  const fuzzGeo = (r, band) => { const g = S(r, 40, 28), p = g.attributes.position, col = [], c = new THREE.Color(), cF = new THREE.Color(B.fuzz), cD = new THREE.Color(B.fuzzDark), cB = new THREE.Color(B.black);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / r, y = p.getY(i) / r, z = p.getZ(i) / r, n = Math.sin(x * 41 + y * 13) * Math.sin(y * 37 - z * 11) * Math.sin(z * 29 + x * 7); const k = 1 + n * 0.035; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
      c.copy(cF).lerp(cD, 0.08 + n * 0.1 + sm(-0.3, -1, y) * 0.25); if (band) c.lerp(cB, band(x, y, z)); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g; };
  // ---- HEAD ----
  const H = new THREE.Group(); H.position.set(0, -0.02, 0); P.head.add(H);
  const sk = M(fuzzGeo(0.38, (x, y, z) => Math.max(sm(0.6, 0.66, y), sm(0.05, 0.12, y) * sm(0.36, 0.29, y) * sm(0.0, -0.25, z))), VC, 0, 0.02, 0, H, 0.04, 0.38); sk.scale.set(1.08, 1, 0.98);   // black crown cap
     // a smoother, lighter face
  const eyes = [-1, 1].map(s => { const e = new THREE.Group(); e.position.set(s * 0.28, 0.05, 0.25); e.rotation.y = s * 0.5; H.add(e);
    const ball = M(S(0.17, 28, 20), toon(B.eye, { emissive: new THREE.Color('#1c2440'), emissiveIntensity: 0.35 }), 0, 0, 0, e, 0.02, 0.17); ball.scale.set(0.82, 1.12, 0.72);
    M(S(0.04, 10, 8), WH, s * -0.03, 0.07, 0.1, e, 0).scale.set(1, 1.3, 0.5); M(S(0.016, 6, 4), WH, s * 0.04, -0.04, 0.11, e, 0);
    const lid = M(new THREE.SphereGeometry(0.182, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), FZ, 0, 0, 0, e, 0); lid.scale.set(0.82, 1.12, 0.72); lid.rotation.x = -1.55;
    const brow = M(new THREE.CapsuleGeometry(0.018, 0.12, 4, 8), BK, -s * 0.0, 0.22, 0.04, e, 0.006); brow.rotation.z = Math.PI / 2; return { e, lid, brow, s }; });
  const ants = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(s * 0.12, 0.33, 0.12); H.add(a); const k1 = V(s * 0.08, 0.2, 0.04), k2 = V(s * 0.2, 0.32, 0.14);
    for (const [p0, p1, r] of [[V(0, 0, 0), k1, 0.016], [k1, k2, 0.013]]) { const d = p1.clone().sub(p0), m = M(new THREE.CylinderGeometry(r, r, d.length(), 6), BK, 0, 0, 0, a, 0.005); m.position.copy(p0).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); }
    M(S(0.026, 10, 8), BK, k1.x, k1.y, k1.z, a, 0.005); M(S(0.036, 12, 8), BK, k2.x, k2.y, k2.z, a, 0.006).scale.set(1, 1, 1.4); return a; });
  // s728cw cute extras: rosy cheeks + a little fuzz tuft on top
  const CK = new THREE.MeshBasicMaterial({ color: 0xf28a6a, transparent: true, opacity: 0.75, depthWrite: false });
  for (const s of [-1, 1]) { const c = M(new THREE.CircleGeometry(0.05, 16), CK, s * 0.17, -0.1, 0.36, H, 0); c.lookAt(c.position.clone().multiplyScalar(3)); }
  for (const [x, y, zz, r] of [[0, 0.42, 0.06, 0.06], [-0.05, 0.4, 0.1, 0.045], [0.055, 0.405, 0.09, 0.048]]) M(fuzzGeo(r), VC, x, y, zz, H, 0.012, r);
  // s728dv MOUTH v2 (Ben: polish the talking mouth): drawn ON the head surface. Every point is projected onto the head ellipsoid, so the
  // mouth sits flush (no slab floating off the face in 3/4). Closed = a thin smile line with dimples. Open = a D-shaped mouth: the top edge is
  // the smile line, the bottom drops in a round curve; dark inside, a pink tongue in the bottom, 2 little front teeth under the top edge,
  // a thin ink outline round it all. Wide / round visemes change the width; smile / frown bend the corners.
  const HR = [0.38 * 1.08, 0.38, 0.38 * 0.98], HC = V(0, 0.02, 0), onHead = (x, y, lift = 0.014) => { const q = 1 - (x / HR[0]) ** 2 - ((y - HC.y) / HR[1]) ** 2; return V(x, y, HR[2] * Math.sqrt(Math.max(0.02, q)) + lift); };
  const MO = { y: -0.135, w: 0.1 }, mk = (col) => new THREE.Mesh(new THREE.BufferGeometry(), col);
  const inMesh = mk(toon(B.mouth, { side: THREE.DoubleSide })), tgMesh = mk(toon('#d4596c', { side: THREE.DoubleSide })), thMesh = mk(toon('#fbf6ea', { side: THREE.DoubleSide })), lip = mk(INK), dims = [mk(INK), mk(INK)];
  [inMesh, tgMesh, thMesh, lip, ...dims].forEach(m => H.add(m));
  const strip = (top, bot, lift) => { const pos = [], idx = []; top.forEach((p, i) => { const a2 = onHead(p[0], p[1], lift), b2 = onHead(bot[i][0], bot[i][1], lift); pos.push(a2.x, a2.y, a2.z, b2.x, b2.y, b2.z); if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k, k - 1, k + 1); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  const tube = (pts2, r, lift = 0.018, closed = false) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2.map(p => onHead(p[0], p[1], lift)), closed, 'centripetal'), Math.max(8, pts2.length * 2), r, 5, closed);
  const buildLip = (smile, op, wide = 0.5, round = 0) => { const N = 16, w = MO.w * (0.85 + wide * 0.35 - round * 0.3) * (1 - op * 0.08), top = [], bot = [];
    for (let k = 0; k <= N; k++) { const t = k / N * 2 - 1, a2 = Math.abs(t), x = t * w, sO = smile * (1 - op * 0.55);
      const yt = MO.y + sO * 0.05 * Math.pow(a2, 2.2) - (1 - a2) * 0.004, drop = op * (0.075 + round * 0.02) * Math.pow(Math.max(0, 1 - a2 * a2), 0.75); top.push([x, yt]); bot.push([x, yt - drop]); }
    [inMesh, tgMesh, thMesh, lip, ...dims].forEach(m => m.geometry.dispose());
    const open = op > 0.05; inMesh.visible = tgMesh.visible = thMesh.visible = open;
    if (open) { inMesh.geometry = strip(top, bot, 0.012);
      const tT = bot.map((p, i) => [p[0] * 0.72, p[1] + (top[i][1] - p[1]) * 0.42]), tB = bot.map(p => [p[0] * 0.72, p[1] + 0.003]); tgMesh.geometry = strip(tT.slice(3, -3), tB.slice(3, -3), 0.0135);
      const mid = Math.floor(N / 2), th = [], tb = []; for (let k = mid - 2; k <= mid + 2; k++) { const p = top[k]; th.push([p[0] * 0.95, p[1] - 0.002]); tb.push([p[0] * 0.95, p[1] - Math.min(0.02, op * 0.03)]); } thMesh.geometry = strip(th, tb, 0.0135);
      lip.geometry = tube([...top, ...bot.slice(1, -1).reverse()], 0.0055, 0.016, true); }
    else lip.geometry = tube(top, 0.0065);
    dims.forEach((d, i) => { const e = i ? top[N] : top[0], s = i ? 1 : -1, up = smile >= 0 ? 1 : -1, amt = Math.min(1, Math.abs(smile)) * (1 - op); d.visible = amt > 0.15; if (!d.visible) return;
      d.geometry = tube([[e[0], e[1]], [e[0] + s * 0.012, e[1] + up * 0.014 * amt], [e[0] + s * 0.016, e[1] + up * 0.026 * amt]], 0.005); }); };
  const up = H, cav = { visible: false, scale: new THREE.Vector3(), position: new THREE.Vector3(), userData: { tg: { position: new THREE.Vector3() } } }, mand = [];
  // ---- WINGS (2 pairs) on the back ----
  const body = P.head.parent, wingTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, 'rgba(225,240,255,0.6)'); gr.addColorStop(0.5, 'rgba(240,225,255,0.5)'); gr.addColorStop(1, 'rgba(220,255,240,0.55)'); g.fillStyle = gr; g.beginPath(); g.ellipse(64, 64, 60, 36, 0, 0, 7); g.fill(); g.strokeStyle = B.vein; g.lineWidth = 2.5; g.stroke(); g.lineWidth = 1.6; for (const [a, b2, cx, cy] of [[8, 64, 70, 50], [8, 64, 80, 74], [40, 60, 100, 60], [30, 70, 95, 82]]) { g.beginPath(); g.moveTo(a, b2); g.quadraticCurveTo(cx, cy, 120, (cy + 64) / 2); g.stroke(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const WM = new THREE.MeshBasicMaterial({ map: wingTex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const wings = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.12, 1.45, -0.28); body.add(g); const big = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.5), WM); big.position.set(s * 0.45, 0.12, 0); big.rotation.z = s * 0.22; g.add(big); const small = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.32), WM); small.position.set(s * 0.32, -0.12, -0.01); small.rotation.z = -s * 0.25; g.add(small); g.rotation.y = s * 0.5; return { g, s }; });
  // ---- STRIPED ABDOMEN + stinger ----
  const ab = new THREE.Group(); ab.position.set(0, 0.1, 0.02); ab.rotation.x = 0.75; P.tail.add(ab);
  const abG = fuzzGeo(0.32, (x, y, z) => { const b = Math.sin((z + 0.12) * Math.PI * 3); return z < -0.82 ? 1 : sm(0.25, 0.45, b); }); const abm = M(abG, VC, 0, 0, -0.27, ab, 0.03, 0.32); abm.scale.set(1, 0.95, 1.3);
  const sting = M(new THREE.ConeGeometry(0.03, 0.12, 8), BK, 0, 0, -0.72, ab, 0.006); sting.rotation.x = -Math.PI / 2;
  // fuzzy collar between head + body
  const collar = M(fuzzGeo(0.2), VC, 0, 1.52, -0.02, body, 0.02, 0.2); collar.scale.set(1.5, 0.55, 1.2);
  const L = { H, eyes, ants, up, cav, lip, mand, wings, ab, buzz: 0, buzzT: 3, mo: 0, key: '', t: 0 }; buildLip(0.5, 0);
  L.buildLip = buildLip; u.bee = L; u.isBee = true; fox.updateMatrixWorld(true); return L;
}
export function tickBee(fox, dt) {
  const u = fox.userData, L = u.bee; if (!L) return; L.t += dt; const t = L.t, mood = u.lineMood || u.mood, mp = u.mp || {}, lively = mood === 'happy' || mood === 'excited';
  // MOUTH
  const op = Math.min(1, (u.mouth || 0) * 1.25) * (1 - (mp.press || 0) * 0.9); L.mo += (op - L.mo) * Math.min(1, dt * 20); const m = L.mo;
  
  L.mand.forEach((g, i) => { g.rotation.z = (i ? 1 : -1) * (m * 0.5 + Math.sin(t * 8 + i) * 0.03); });
  const smile = (mp.smile ?? 0) + (lively ? 0.4 : mood === 'sad' ? -0.5 : mood === 'stern' ? -0.15 : 0.15), wd = mp.wide ?? 0.5, rd = mp.round || 0, key = [smile, m, wd, rd].map(v => Math.round(v * 20)).join(','); if (key !== L.key) { L.key = key; L.buildLip(Math.max(-0.8, Math.min(0.9, smile)), m, wd, rd); }
  // EYES: blink (lid), brows lift / angle with mood
  const bl = (u.blinkT || 0) > 0, by = mood === 'surprised' || mood === 'excited' ? 0.03 : mood === 'stern' || mood === 'determined' ? -0.02 : 0, bz = mood === 'stern' || mood === 'determined' ? 0.35 : mood === 'sad' ? -0.35 : 0;
  L.eyes.forEach(e => { e.lid.rotation.x += ((bl ? 0.05 : mood === 'smug' ? -0.85 : -1.55) - e.lid.rotation.x) * Math.min(1, dt * 16); e.brow.position.y = 0.22 + by + (m > 0.55 ? 0.015 : 0); e.brow.rotation.z = Math.PI / 2 - e.s * bz; });
  // ANTENNAE: bob, perk with mood, flick on the ear timer
  const tw = (u.twK || 0) > 0 ? Math.sin((u.twK / 0.28) * Math.PI) : 0, perk = mood === 'surprised' || mood === 'curious' || lively ? -0.25 : mood === 'sad' ? 0.55 : 0;
  L.ants.forEach((a, i) => { a.rotation.x = perk + Math.sin(t * 2.4 + i) * 0.1 + (m > 0.4 ? Math.sin(t * 14) * 0.05 : 0) - (u.twE === i ? tw * 0.5 : 0); a.rotation.z = (i ? -1 : 1) * Math.sin(t * 1.7 + i) * 0.08; });
  // WINGS: buzz bursts (fast flap = blur) every few seconds, longer + more when happy / excited; otherwise rest folded back with a slow breathe
  L.buzzT -= dt; if (L.buzzT < 0) { L.buzzT = (lively ? 2 : 4) + Math.random() * 4; L.buzz = lively ? 1.6 : 0.9; } L.buzz = Math.max(0, L.buzz - dt);
  L.wings.forEach(({ g, s }) => { const on = L.buzz > 0, a = on ? Math.sin(t * 90) * 0.6 : 0; g.rotation.y = s * (on ? 0.15 : 0.55) ; g.rotation.z = s * (on ? a : 0.1 + Math.sin(t * 1.2) * 0.03); });
  // ABDOMEN pulses + wiggles; head bob
  L.ab.scale.setScalar(1 + Math.sin(t * 3) * 0.02); L.ab.rotation.y = Math.sin(t * (lively ? 3 : 1.4)) * 0.12; L.H.position.y = -0.02 + Math.sin(t * 1.6) * 0.006;
}
