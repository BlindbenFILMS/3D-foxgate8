// s728q EAGLE AVATAR (Ben: an EAGLE avatar). Built ON the fox rig like lizard-kit / fly-kit: body, outfit + gear kept,
// fur → dark brown feathers, fox head parts + ears + tail hidden. A bald-eagle head (white feathers, a big yellow hooked beak, a heavy brow
// over fierce gold eyes), folded wings on the back that SPREAD now and then, a white fan tail. The crown feathers RUFFLE on the fox
// ear-twitch timer (same rhythm as the lizard tongue + the fly's dab). Sharp birdy head turns.
// s728s GRYPHON (Ben: change the eagle to more of a GRYPHON, a bigger beak + a two-toned head): tawny lion body + tail with a tuft, a gold-brown cap over a cream face, ear tufts, a much bigger beak.
export const EAGLE_LOOK = { brown: '#b7842f', brownHi: '#d9a54a', wing: '#6b4529', wingHi: '#8a5a32', white: '#f4ecd8', cap: '#8a5523', beak: '#f2b51c', beakDark: '#c98a12', iris: '#f2c230', tuft: '#4a2f1c' };
export function eagleize({ THREE, M, toon }, fox, look = {}) {
  const E = { ...EAGLE_LOOK, ...look }, u = fox.userData, P = u.P, Lf = (u.face && u.face.L) || {};
  const BR = toon(E.brown), BH = toon(E.brownHi), WH = toon(E.white), BK = toon(E.beak), BD = toon(E.beakDark), CAP = toon(E.cap), WG = toon(E.wing), TU = toon(E.tuft);
  const INK = new THREE.MeshBasicMaterial({ color: 0x111111 }), SHINE = new THREE.MeshBasicMaterial({ color: 0xffffff }), IR = new THREE.MeshBasicMaterial({ color: E.iris });
  const S = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
  const furC = [Lf.fur, Lf.paw, Lf.furDark].filter(Boolean).map(c => new THREE.Color(c).getHex());
  fox.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.color && furC.includes(o.material.color.getHex())) o.material = BR; });
  P.head.children.forEach(c => c.visible = false); P.tail.children.forEach(c => c.visible = false); if (P.ears) P.ears.forEach(e => e.visible = false);
  // feather shape (a flat pointed leaf) used for the crown, neck ruff, wings + tail
  const featherG = (w, l) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(w, l * 0.35, w * 0.35, l); sh.lineTo(0, l * 1.05); sh.lineTo(-w * 0.35, l); sh.quadraticCurveTo(-w, l * 0.35, 0, 0); const g = new THREE.ShapeGeometry(sh, 4); return g; };
  const FM = c => new THREE.MeshToonMaterial({ color: c, side: THREE.DoubleSide });
  // s728aa GRYPHON HEAD v3 (Ben: free creativity to redo the beak + head). A falcon-style MASK: cream face + throat, gold crown with a
  // widow's-peak V down to the beak (no ring = no hat line), gold brow shelves, a dark streak back from each eye + a dark MALAR teardrop
  // below it, swept-back crest plumes, ear tufts, cheek ruffs. The BEAK is lofted from a real side profile (culmen arch → hanging hook,
  // flat cutting edge, keeled top), closed, with its own normal-offset ink shell; the lower mandible tucks inside it.
  const H = new THREE.Group(); H.position.set(0, -0.03, 0); P.head.add(H);
  const sm = (e0, e1, x) => { const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
  const VC = toon('#ffffff', { vertexColors: true }), INKB = new THREE.MeshBasicMaterial({ color: 0x1a1626, side: THREE.BackSide });
  const shell = (geo, t, par, at) => { const g = geo.clone(), p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * t, p.getY(i) + n.getY(i) * t, p.getZ(i) + n.getZ(i) * t); const o = new THREE.Mesh(g, INKB); if (at) o.position.copy(at.position), o.scale.copy(at.scale), o.rotation.copy(at.rotation); par.add(o); return o; };
  const cFace = new THREE.Color(E.white), cGold = new THREE.Color(E.brown), cCap = new THREE.Color(E.cap), cDk = new THREE.Color(E.tuft);
  const SKR = 0.33, skG = S(SKR, 64, 44);
  { const p = skG.attributes.position, col = [], c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / SKR, y = p.getY(i) / SKR, zz = p.getZ(i) / SKR, ax = Math.abs(x), ang = Math.atan2(x, zz);
      let edge = 0.05 + zz * 0.55 - Math.max(0, -zz) * 0.9 + Math.sin(ang * 11) * 0.035 + Math.sin(ang * 27 + 2) * 0.015; edge -= 0.42 * Math.exp(-((x / 0.22) ** 2)) * sm(0.35, 0.95, zz);   // widow's peak
      const k = sm(-0.07, 0.07, y - edge); c.copy(cFace).lerp(cGold, k).lerp(cCap, k * sm(0.15, 0.95, y) * 0.85); c.multiplyScalar(1 - k * 0.08 * (0.5 + 0.5 * Math.sin(ang * 16 + y * 24)));
      const ey = 0.26 - (0.72 - zz) * 0.2, st = ax > 0.3 ? Math.max(0, 1 - Math.abs(y - ey) / (0.07 + (0.72 - zz) * 0.05)) * sm(0.72, 0.5, zz) * sm(-0.85, -0.4, zz) : 0;   // eye streak
      const tt = Math.min(1, Math.max(0, (0.12 - y) / 0.45)), mz = 0.74 - tt * 0.12, mw = 0.11 * (1 - tt * 0.55), ml = ax > 0.3 && y < 0.14 && y > -0.36 ? Math.max(0, 1 - Math.abs(zz - mz) / mw) : 0;   // malar teardrop
      c.lerp(cDk, Math.min(0.88, Math.max(st, ml) * 1.1)); col.push(c.r, c.g, c.b); }
    skG.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
  const sk = new THREE.Mesh(skG, VC); sk.position.set(0, 0.02, -0.02); sk.scale.set(0.92, 0.95, 1.1); H.add(sk); shell(skG, 0.012, H, sk);
  { const nG = S(0.27, 32, 20), p = nG.attributes.position, col = [], c = new THREE.Color(); for (let i = 0; i < p.count; i++) { const zz = p.getZ(i) / 0.27; c.copy(cFace).lerp(cGold, sm(0.35, -0.15, zz)); col.push(c.r, c.g, c.b); } nG.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const nk = new THREE.Mesh(nG, VC); nk.position.set(0, -0.2, -0.03); nk.scale.set(1, 0.72, 0.95); H.add(nk); }
  { const ch = FM(E.white), body = P.head.parent; for (let k = 0; k < 7; k++) { const a2 = (k - 3) * 0.22, f = new THREE.Mesh(featherG(0.1, 0.2), ch); f.position.set(Math.sin(a2) * 0.2, 1.42, 0.22 + Math.cos(a2) * 0.08); f.rotation.set(Math.PI + 0.5, a2 * 0.8, 0); body.add(f); } }
  // crest plumes swept back off the crown (ruffle on the ear-twitch timer), each a gold plume with a dark tip
  const crown = []; for (let k = 0; k < 5; k++) { const o = k - 2, f = new THREE.Mesh(featherG(0.085, 0.42 - Math.abs(o) * 0.05), FM(E.cap)); f.rotation.order = 'YXZ'; f.position.set(o * 0.06, 0.25 - Math.abs(o) * 0.02, -0.12); f.rotation.set(-1.15 - Math.abs(o) * 0.08, o * 0.28, 0);
    const tip = new THREE.Mesh(featherG(0.05, 0.13), FM(E.tuft)); tip.position.set(0, 0.29 - Math.abs(o) * 0.05, 0.004); f.add(tip); H.add(f); f.userData.b = f.rotation.x; crown.push(f); }
  for (const s of [-1, 1]) { const t = new THREE.Group(); t.position.set(s * 0.21, 0.24, -0.02); t.rotation.set(-0.45, 0, -s * 0.5); t.userData.b = [-0.45, -s * 0.5, s]; H.add(t); (H.userData.tufts = H.userData.tufts || []).push(t);
    for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(featherG(0.065, 0.24 - k * 0.04), FM(k ? E.cap : E.tuft)); f.rotation.z = (k - 1) * 0.28; f.position.z = -k * 0.01; t.add(f); } }
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(featherG(0.07, 0.17 - k * 0.025), FM(k === 1 ? E.brownHi : E.white)); f.rotation.order = 'YXZ'; f.position.set(s * 0.25, -0.1 - k * 0.05, -0.02 - k * 0.02); f.rotation.set(-1.75 + k * 0.15, s * 0.55, 0); H.add(f); }   // cheek ruffs
  // BEAK
  const loft = (Tp, Bp, wf, colf, N = 28, R = 16) => { const T = new THREE.CatmullRomCurve3(Tp.map(([zz, y]) => new THREE.Vector3(0, y, zz))), Bc = new THREE.CatmullRomCurve3(Bp.map(([zz, y]) => new THREE.Vector3(0, y, zz)));
    const pos = [], col = [], idx = [], c = new THREE.Color();
    for (let i = 0; i <= N; i++) { const t = i / N, tp = T.getPoint(t), bp = Bc.getPoint(t), my = (tp.y + bp.y) / 2, mz = (tp.z + bp.z) / 2, hy = (tp.y - bp.y) / 2, hz = (tp.z - bp.z) / 2, w = wf(t); colf(t, c);
      for (let j = 0; j < R; j++) { const an = j / R * Math.PI * 2, sa = Math.sin(an), ca = Math.cos(an), v = sa < 0 ? -Math.pow(-sa, 0.5) : sa, xw = sa > 0 ? 1 - 0.32 * sa * sa : 1, sh = sa > 0 ? 1 + sa * 0.07 : 1 + sa * 0.12;
        pos.push(ca * w * xw, my + hy * v, mz + hz * v); col.push(Math.min(1, c.r * sh), Math.min(1, c.g * sh), Math.min(1, c.b * sh)); } }
    const base = pos.length / 3, t0 = T.getPoint(0), b0 = Bc.getPoint(0), t1 = T.getPoint(1); pos.push(0, (t0.y + b0.y) / 2, (t0.z + b0.z) / 2, 0, t1.y, t1.z); colf(0, c); col.push(c.r, c.g, c.b); colf(1, c); col.push(c.r, c.g, c.b);
    for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) { const q = i * R + j, r = i * R + (j + 1) % R, s2 = (i + 1) * R + j, d = (i + 1) * R + (j + 1) % R; idx.push(q, r, s2, r, d, s2); }
    for (let j = 0; j < R; j++) { idx.push(base, (j + 1) % R, j); idx.push(base + 1, N * R + j, N * R + (j + 1) % R); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return { g, T }; };
  const cCere = new THREE.Color('#f7cf52'), cB0 = new THREE.Color(E.beak), cB1 = new THREE.Color(E.beakDark), cTip = new THREE.Color('#5a3b12');
  const bk = new THREE.Group(); bk.position.set(0, -0.03, 0.265); bk.scale.setScalar(1.25); H.add(bk);
  const up = loft([[0, 0.075], [0.08, 0.098], [0.16, 0.092], [0.23, 0.055], [0.27, 0.0], [0.276, -0.06], [0.255, -0.112]], [[0, -0.035], [0.08, -0.04], [0.16, -0.04], [0.21, -0.046], [0.24, -0.062], [0.252, -0.088], [0.255, -0.112]],
    t => 0.12 * Math.pow(1 - t, 0.8) + 0.005, (t, c) => { if (t < 0.12) c.copy(cCere).lerp(cB0, t / 0.12); else c.copy(cB0).lerp(cB1, sm(0.45, 0.8, t)).lerp(cTip, sm(0.86, 1, t) * 0.8); });
  bk.add(new THREE.Mesh(up.g, VC)); shell(up.g, 0.008, bk);
  { const pts = []; for (let i = 3; i <= 17; i++) pts.push(up.T.getPoint(i / 28).add(new THREE.Vector3(0, 0.003, 0))); const rg = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.006, 5), new THREE.MeshBasicMaterial({ color: 0xfff1b0 })); bk.add(rg); }   // culmen gloss
  for (const s of [-1, 1]) { const n = M(S(0.016, 8, 6), INK, s * 0.07, 0.04, 0.05, bk, 0); n.scale.set(0.5, 0.8, 1.5); }   // nostrils in the cere
  const jaw = new THREE.Group(); jaw.position.set(0, -0.04, 0.0); bk.add(jaw);
  const lo = loft([[0, 0.002], [0.1, -0.004], [0.18, -0.01], [0.222, -0.022]], [[0, -0.06], [0.1, -0.055], [0.18, -0.04], [0.222, -0.025]], t => 0.1 * Math.pow(1 - t, 0.7) + 0.006, (t, c) => c.copy(cB0).lerp(cB1, sm(0.2, 0.9, t)), 20, 14);
  jaw.add(new THREE.Mesh(lo.g, VC)); shell(lo.g, 0.007, jaw);
  { const tongue = M(S(0.06, 12, 8), toon('#c8505a'), 0, 0.02, 0.11, jaw, 0); tongue.scale.set(1.0, 0.45, 1.5);   /* s728ca the bear's pink tongue, sits higher so it shows */ tongue.visible = false; jaw.userData.tg = tongue; }
  const cav = new THREE.Group(); cav.position.set(0, -0.045, 0.1); bk.add(cav); { const cm = M(S(0.1, 14, 10), toon('#3a1414'), 0, 0, 0, cav, 0); cm.scale.set(0.95, 1, 1.5); } cav.scale.set(1, 0.01, 1); bk.userData.cav = cav;   /* s728ao the gape: a dark mouth inside the beak */
  // EYES: dark ring, gold iris, pupil + shine, a gold brow shelf (the frown), cream lids
  const eyes = [-1, 1].map(s => { const e = new THREE.Group(); e.position.set(s * 0.18, 0.1, 0.225); e.rotation.y = s * 0.42; H.add(e);
    M(new THREE.TorusGeometry(0.076, 0.017, 6, 20), toon(E.tuft), 0, 0, 0.022, e, 0);
    const ball = M(S(0.07, 16, 12), IR, 0, 0, 0, e, 0.012, 0.07); M(new THREE.TorusGeometry(0.045, 0.006, 4, 16), new THREE.MeshBasicMaterial({ color: 0xc98a12 }), 0, 0, 0.058, ball, 0); M(S(0.036, 12, 8), INK, 0, 0, 0.05, ball, 0); M(S(0.013, 6, 4), SHINE, s * 0.02, 0.026, 0.066, ball, 0);
    const brow = M(S(0.08, 14, 10), CAP, -s * 0.012, 0.075, 0.012, e, 0.014, 0.08); brow.scale.set(1.45, 0.42, 0.95); brow.rotation.z = s * 0.32; brow.rotation.x = 0.25;
    const lid = M(new THREE.SphereGeometry(0.075, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), WH, 0, 0, 0, e, 0); lid.rotation.x = -1.3;
    return { e, ball, brow, lid, s }; });
  // WINGS: folded on the back (brown coverts + long dark primaries), spread wide now and then
  const body = P.head.parent;
  const wings = [-1, 1].map(s => { const root = new THREE.Group(); root.position.set(s * 0.26, 1.42, -0.3); body.add(root); const w = new THREE.Group(); root.add(w);
    M(S(0.16, 14, 10), WG, 0, -0.1, 0, w, 0.02, 0.16).scale.set(0.6, 1.3, 0.6);
    const fs = []; for (let k = 0; k < 7; k++) { const f = new THREE.Mesh(featherG(0.12, 0.5 + k * 0.06), FM(k < 2 ? E.wingHi : E.wing)); f.position.set(s * k * 0.02, -0.05, -k * 0.02); f.rotation.set(Math.PI, 0, s * (0.05 + k * 0.08)); w.add(f); fs.push(f); }
    for (let k = 0; k < 5; k++) { const f = new THREE.Mesh(featherG(0.1, 0.24), FM(E.brownHi)); f.position.set(s * k * 0.025, -0.02, 0.02); f.rotation.set(Math.PI, 0, s * (0.05 + k * 0.1)); w.add(f); }
    fs.forEach((f, k) => { if (k < 3) return; const tp = new THREE.Mesh(featherG(0.06, 0.1), FM('#e6b45a')); tp.position.y = 0.48 + k * 0.06; tp.position.z = -0.002; f.add(tp); });
    root.rotation.set(0.25, s * 0.3, s * 0.2); return { root, w, fs, s }; });
  // TAIL: a white fan of tail feathers at the hip
  const tl = new THREE.Group(); tl.rotation.x = 1.1; P.tail.add(tl); const tf = []; { let par = tl; for (let k = 0; k < 8; k++) { const sg = new THREE.Group(); sg.position.z = k ? -0.16 : 0; par.add(sg); const m = M(new THREE.CylinderGeometry(0.045, 0.055, 0.18, 10), BR, 0, 0, -0.08, sg, 0.015); m.rotation.x = Math.PI / 2; sg.rotation.x = k ? -0.16 : 0; tf.push(sg); par = sg; }
    const tuft = new THREE.Group(); tuft.position.z = -0.2; par.add(tuft); M(S(0.11, 12, 10), TU, 0, 0, -0.06, tuft, 0.02, 0.11).scale.set(0.85, 0.85, 1.5); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, c = M(new THREE.ConeGeometry(0.045, 0.2, 5), TU, Math.cos(a) * 0.06, Math.sin(a) * 0.06, -0.2, tuft, 0); c.rotation.x = -Math.PI / 2; c.rotation.z = a; c.rotateX(0.25); } }   // LION TAIL with a tuft
  const L = { H, bk, jaw, eyes, crown, wings, tl, tf, ruf: 0, spread: 0, spreadT: 4, t: 0 }; u.eagle = L; u.isEagle = true; fox.updateMatrixWorld(true); return L;
}
export function tickEagle(fox, dt) {
  const u = fox.userData, L = u.eagle; if (!L) return; L.t += dt; const t = L.t, mood = u.lineMood || u.mood, lively = mood === 'happy' || mood === 'excited';
  // CROWN RUFFLE on the fox ear-twitch timer
  const tw = u.twK || 0, rise = tw > (L.tw0 || 0) + 1e-4; L.tw0 = tw; if (rise && L.ruf <= 0) L.ruf = 0.45;
  let r = 0; if (L.ruf > 0) { L.ruf -= dt; r = Math.sin((1 - L.ruf / 0.45) * Math.PI); }
  (L.H.userData.tufts || []).forEach(tf => { const [bx, bz, s] = tf.userData.b; tf.rotation.x = bx - r * 0.35; tf.rotation.z = bz - s * r * 0.25; });
  L.H.position.y = -0.04 + Math.sin(t * 1.6) * 0.008;
  L.crown.forEach((f, k) => { f.rotation.x = f.userData.b + (L.talkE || 0) * 0.2 + r * 0.55 + Math.sin(t * 40 + k) * 0.06 * r; });
  // BEAK opens with talk (+ a cry when the wings spread)
  const mo = Math.min(1, Math.max((u.mouth || 0) * 1.15, L.spread > 0.6 ? 0.6 : 0)); L.mo = (L.mo || 0) + (mo - (L.mo || 0)) * Math.min(1, dt * 20); const m2 = L.mo;
  const mp = u.mp || {}, sh = { wide: mp.wide ?? 0.5, round: mp.round || 0, tongue: mp.tongue || 0, press: mp.press || 0, smile: mp.smile || 0 };   /* s728ap viseme shape from the fox speech engine */
  const op = m2 * (1 - sh.press * 0.9), lift = op * 0.1; L.bk.rotation.x = -lift; L.jaw.rotation.x = op * 0.6 + lift; L.jaw.position.y = -0.04 - op * 0.03; const tgm = L.jaw.userData.tg; tgm.visible = op > 0.08; tgm.position.y = 0.005 + sh.tongue * 0.03;
  const cv = L.bk.userData.cav; cv.scale.set(0.8 + sh.wide * 0.4 - sh.round * 0.3, Math.max(0.01, op * 0.9), 1); cv.position.y = -0.045 - op * 0.04; L.talkE = Math.max((L.talkE || 0) - dt * 3, op > 0.55 ? 1 : 0);
  // EYES: blink, look, a fiercer brow when stern
  const bl = (u.blinkT || 0) > 0, fierce = mood === 'stern' || mood === 'determined' || mood === 'smug' ? 0.15 : mood === 'happy' ? -0.12 : mood === 'sad' ? -0.25 : 0;
  for (const e of L.eyes) { e.lid.rotation.x = bl ? 0.2 : -1.3; e.ball.rotation.y = (u.look || 0) * 0.4; e.brow.rotation.z = e.s * (0.32 + fierce - (L.talkE || 0) * 0.12); e.brow.position.y = 0.075 + (L.talkE || 0) * 0.012; }
  // SHARP BIRD HEAD: quick snaps between still poses
  L.snap = (L.snap ?? 1) - dt; if (L.snap < 0) { L.snap = 0.6 + Math.random() * 1.8; L.hy = (Math.random() - 0.5) * 0.7; L.hx = (Math.random() - 0.5) * 0.2; } L.H.rotation.y += ((L.hy || 0) - L.H.rotation.y) * Math.min(1, dt * 22); L.H.rotation.x += ((L.hx || 0) - L.H.rotation.x) * Math.min(1, dt * 22);
  // WING SPREAD now and then (more when lively): open wide, a couple of beats, fold back
  L.spreadT -= dt; if (L.spreadT < 0 && !(L.sp > 0)) { L.sp = 1.6; L.spreadT = lively ? 4 + Math.random() * 3 : 7 + Math.random() * 6; }
  let k = 0; if (L.sp > 0) { L.sp -= dt; const p = 1 - L.sp / 1.6; k = p < 0.25 ? p / 0.25 : p > 0.8 ? (1 - p) / 0.2 : 1; k = k * k * (3 - 2 * k); } L.spread = k;
  const beat = k > 0.9 ? Math.sin(t * 9) * 0.25 : 0;
  L.wings.forEach(w => { w.root.rotation.set(lerp(0.25, -0.1, k), w.s * lerp(0.3, 1.25, k), w.s * lerp(0.2, -1.1 + beat, k)); w.fs.forEach((f, i) => { f.rotation.z = w.s * lerp(0.05 + i * 0.08, 0.1 + i * 0.22, k); }); });
  L.tf.forEach((s, i) => { if (!i) return; s.rotation.y = Math.sin(t * (lively ? 3 : 1.6) - i * 0.6) * (lively ? 0.2 : 0.11); s.rotation.x = -0.16 + Math.sin(t * 1.1 - i * 0.5) * 0.04; }); L.tl.rotation.x = 1.1 - k * 0.3;
}
const lerp = (a, b, k) => a + (b - a) * k;
