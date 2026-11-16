// s728i LIZARD AVATAR (Ben: a lizard avatar for PLAYER PLANET, fox avatar size, a very different look: lizard eyes + a long tongue
// that flicks out of a big mouth at the same rate the foxes' ears flick). Built ON the fox rig (fox-kit makeFox, unmerged): the body,
// arms, legs, outfits + gear stay; the fox head parts + tail are hidden and a lizard head + tail go on P.head / P.tail. Skin = scales.
// TONGUE RATE = the fox ear twitch: animFox's own timer (u.twT 1.8-5.5 s, u.twK 0.28 s) fires the flick, so it is literally the same rhythm.
export const LIZARD_LOOK = { skin: '#3f86d6', skinDark: '#24528f', belly: '#dfeaf5', crest: '#e0702a', iris: '#f2c230', tongue: '#e0457b', mouthIn: '#7a1f33', spots: '#1d4277' };   // s728cr Ben: blue theme (was green)
export function lizardize({ THREE, M, toon }, fox, look = {}) {
  const Lz = { ...LIZARD_LOOK, ...look }, u = fox.userData, P = u.P, Lf = (u.face && u.face.L) || {};
  const SK = toon(Lz.skin), SD = toon(Lz.skinDark), BL = toon(Lz.belly), CR = toon(Lz.crest), MI = toon(Lz.mouthIn), TG = toon(Lz.tongue), SP = toon(Lz.spots);
  const INK = new THREE.MeshBasicMaterial({ color: 0x111111 }), WH = new THREE.MeshBasicMaterial({ color: 0xffffff }), IR = new THREE.MeshBasicMaterial({ color: Lz.iris });
  const S = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
  // 1) fur → scales (legs, paws, any bare fur), fox head + tail parts hidden
  const furC = [Lf.fur, Lf.paw, Lf.furDark].filter(Boolean).map(c => new THREE.Color(c).getHex());
  fox.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.color && furC.includes(o.material.color.getHex())) o.material = SK; });
  P.head.children.forEach(c => c.visible = false); P.tail.children.forEach(c => c.visible = false); if (P.ears) P.ears.forEach(e => e.visible = false);
  // 2) HEAD (s728ad polish): a long tapered snout, skin painted with vertex colours (dark back stripe, spots, cream underside), a thin
  // upturned grin line instead of the black lip band, chameleon-style turret eyes (skin cone round a gold eye) with lids that close only on a blink.
  const H = new THREE.Group(); H.position.set(0, -0.06, 0.02); P.head.add(H);
  const sm = (e0, e1, x) => { const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
  const VC = toon('#ffffff', { vertexColors: true }), cS = new THREE.Color(Lz.skin), cD = new THREE.Color(Lz.skinDark), cB = new THREE.Color(Lz.belly), cP = new THREE.Color(Lz.spots);
  const paint = (geo, R, belly = 0.0) => { const p = geo.attributes.position, col = [], c = new THREE.Color(); for (let i = 0; i < p.count; i++) { const x = p.getX(i) / R, y = p.getY(i) / R, zz = p.getZ(i) / R;
      c.copy(cS).lerp(cD, sm(0.35, 0.85, y) * sm(0.55, 0.1, Math.abs(x)) * 0.9).lerp(cB, sm(belly + 0.05, belly - 0.3, y));
      const sp = Math.sin(x * 23 + zz * 7) * Math.sin(zz * 19 - y * 5) * Math.sin(y * 17 + x * 3); if (y > -0.1 && sp > 0.55) c.lerp(cP, 0.7);
      col.push(c.r, c.g, c.b); } geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return geo; };
  const skG = paint(S(0.36, 40, 28), 0.36, -0.25), sk = M(skG, VC, 0, 0.03, -0.02, H, 0.04, 0.36); sk.scale.set(1.08, 0.8, 1.05);
  const up = new THREE.Group(); up.position.set(0, -0.02, 0.12); H.add(up);
  const snG = S(0.3, 34, 22); { const p = snG.attributes.position; for (let i = 0; i < p.count; i++) { const zz = p.getZ(i) / 0.3, k = 1 - 0.38 * sm(-0.2, 1, zz); p.setX(i, p.getX(i) * k); p.setY(i, p.getY(i) * (1 - 0.25 * sm(0, 1, zz))); } snG.computeVertexNormals(); paint(snG, 0.3, -0.15); }
  const sn = M(snG, VC, 0, 0.03, 0.27, up, 0.018, 0.3); sn.scale.set(0.95, 0.5, 1.55);
  for (const s of [-1, 1]) { const n = M(S(0.022, 8, 6), INK, s * 0.07, 0.085, 0.69, up, 0); n.scale.set(1.3, 0.6, 1); }
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) M(S(0.028 - k * 0.003, 8, 6), toon(Lz.skinDark), s * (0.2 - k * 0.012), 0.04 + (k % 2) * 0.03, 0.1 + k * 0.1, up, 0);   // brow-to-nose bumps
  // the grin: a thin dark line along each side of the mouth that curls up at the corner
  for (const s of [-1, 1]) { const pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12, zz = 0.52 - t * 0.5, x = s * (0.19 + 0.07 * Math.sin(Math.min(1, t * 1.25) * Math.PI / 2)), y = -0.035 + Math.max(0, t - 0.78) * 0.45; pts.push(new THREE.Vector3(x, y, zz)); }
    up.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.008, 5), INK)); }
  // mouth inside + lower jaw (cream underside) + throat
  const jaw = new THREE.Group(); jaw.position.set(0, -0.08, 0.04); H.add(jaw);
  M(S(0.24, 20, 12), MI, 0, 0.045, 0.28, jaw, 0).scale.set(0.75, 0.08, 1.2);
  const ljG = S(0.28, 30, 18); { const p = ljG.attributes.position; for (let i = 0; i < p.count; i++) { const zz = p.getZ(i) / 0.28, k = 1 - 0.36 * sm(-0.2, 1, zz); p.setX(i, p.getX(i) * k); } ljG.computeVertexNormals(); paint(ljG, 0.28, 0.25); }
  M(ljG, VC, 0, -0.05, 0.29, jaw, 0.018, 0.28).scale.set(0.95, 0.32, 1.45);
  { const thG = paint(S(0.22, 20, 14), 0.22, 0.6); M(thG, VC, 0, -0.2, -0.04, H, 0.02, 0.22).scale.set(1.1, 0.55, 0.9); }
  const cav = new THREE.Group(); cav.position.set(0, -0.085, 0.34); H.add(cav); { const cm = M(S(0.12, 16, 12), toon('#3a1414'), 0, 0, 0, cav, 0); cm.scale.set(1.5, 1, 1.9); const tb = M(S(0.1, 14, 10), toon('#c8505a'), 0, -0.035, 0.08, cav, 0); tb.scale.set(1.2, 0.45, 1.6);   /* s728ca the bear's pink tongue */ cav.userData.tg = tb;
    for (const s of [-1, 1]) for (let k = 0; k < 5; k++) { const th = M(new THREE.ConeGeometry(0.012, 0.03, 4), WH, s * (0.15 - k * 0.012), 0.055, 0.17 - k * 0.07, cav, 0); th.rotation.x = Math.PI; } } cav.scale.set(1, 0.01, 1);   /* s728ao open-mouth cavity: gullet, tongue bed, two rows of little teeth */
  // s728by TEETH (Ben): a row of small pointed teeth along each side of the upper jaw (hang from under the grin line) + a lower row on the jaw
  // pointing up; bigger at the front, a pair of slightly longer front fangs. Hidden inside the jaw when the mouth is shut, they show when it opens.
  { const TC = toon('#f6f1e2'), TI = new THREE.MeshBasicMaterial({ color: 0x2a2418, side: THREE.BackSide }), tooth = (par, x, y, z0, r, l, dn) => { const g = new THREE.ConeGeometry(r, l, 6), m = new THREE.Mesh(g, TC); m.position.set(x, y + (dn ? -l / 2 : l / 2), z0); if (dn) m.rotation.x = Math.PI; par.add(m); const o = new THREE.Mesh(g, TI); o.scale.setScalar(1.18); m.add(o); return m; };
    for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { const t = k / 6, zz = 0.5 - t * 0.42, x = s * (0.17 + 0.07 * Math.sin(Math.min(1, t * 1.25) * Math.PI / 2)), big = k < 1 ? 1.15 : 0.9 - t * 0.3; tooth(up, x * 0.94, -0.045, zz, 0.015 * big, 0.045 * big, true); }
    for (const x of [-0.13, -0.065, 0.065, 0.13]) tooth(up, x, -0.05, 0.6 - Math.abs(x) * 0.5, 0.012, 0.034, true);   /* small front teeth across the snout tip */
    const taper = zz => { const q = (zz - 0.29) / 0.406, kk = Math.min(1, Math.max(0, (q + 0.2) / 1.2)); return 1 - 0.36 * kk * kk * (3 - 2 * kk); };
    for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const t = k / 5, zz = 0.6 - t * 0.38, x = s * 0.24 * taper(zz) * 0.92, big = k < 1 ? 1.1 : 0.9 - t * 0.3; tooth(jaw, x, 0.03, zz, 0.013 * big, 0.036 * big, false); }
    for (const x of [-0.1, -0.035, 0.035, 0.1]) tooth(jaw, x, 0.025, 0.66 - Math.abs(x) * 0.6, 0.011, 0.028, false); }
  // tongue: a pink strip that shoots out of the mouth, forked tip
  const tg = new THREE.Group(); tg.position.set(0, 0.0, 0.2); jaw.add(tg); const tgS = new THREE.Group(); tg.add(tgS);
  M(new THREE.BoxGeometry(0.07, 0.025, 1), TG, 0, 0, 0.5, tgS, 0); const tip = new THREE.Group(); tip.position.z = 1; tgS.add(tip);
  for (const s of [-1, 1]) { const f = M(new THREE.ConeGeometry(0.03, 0.16, 6), TG, s * 0.035, 0, 0.06, tip, 0); f.rotation.x = Math.PI / 2; f.rotation.y = s * 0.35; }
  tgS.scale.set(1, 1, 0.001); tg.visible = false;
  // TURRET EYES: a skin cone wraps each eye (open front), gold iris + vertical slit + shine; lids only show on a blink
  const eyes = [-1, 1].map(s => { const e = new THREE.Group(); e.position.set(s * 0.25, 0.17, 0.12); e.rotation.y = s * 0.55; H.add(e);
    const tur = M(new THREE.SphereGeometry(0.13, 18, 12, 0, Math.PI * 2, 0.55, Math.PI - 0.55), toon(Lz.skin), 0, 0, 0, e, 0.025, 0.13); tur.rotation.x = Math.PI / 2;
    M(new THREE.TorusGeometry(0.067, 0.012, 6, 22), toon(Lz.skinDark), 0, 0, 0.11, e, 0);   // turret rim
    const ball = new THREE.Group(); ball.position.set(0, 0, 0.055); e.add(ball); M(S(0.1, 18, 14), IR, 0, 0, 0, ball, 0.012, 0.1);
    const pu = M(new THREE.SphereGeometry(0.1, 16, 12, 0, Math.PI * 2, 0, 0.75).rotateX(Math.PI / 2), INK, 0, 0, 0.004, ball, 0); pu.scale.set(0.22, 1, 1.0); M(S(0.018, 8, 6), WH, s * -0.03, 0.045, 0.092, ball, 0);
    const lid = new THREE.Group(); e.add(lid); lid.position.copy(ball.position); const lt = M(new THREE.SphereGeometry(0.108, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(Lz.skin), 0, 0, 0, lid, 0), lb = M(new THREE.SphereGeometry(0.106, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(Lz.skin), 0, 0, 0, lid, 0);
    lid.rotation.x = Math.PI / 2; lid.visible = false;
    const ridge = M(S(0.1, 12, 8), toon(Lz.skinDark), -s * 0.02, 0.1, 0.0, e, 0.015, 0.1); ridge.scale.set(1.2, 0.35, 0.9); ridge.rotation.z = -s * 0.2;
    return { e, ball, lt, lb, lid, pu, ridge, s }; });
  // crest: a row of orange spikes from the brow down the back of the head
  const spikes = []; for (let k = 0; k < 6; k++) { if (Lz.fin !== false) break; const sp = M(new THREE.ConeGeometry(0.045 - k * 0.003, 0.14 - k * 0.008, 6), CR, 0, 0.3 - k * 0.025, 0.12 - k * 0.1, H, 0.012); sp.rotation.x = -0.5 - k * 0.12; spikes.push(sp); }
  // s728cb HEAD FIN (Ben): a tall webbed sail fin along the top of the head, from the brow back past the skull; orange webbing (vertex-shaded:
  // light at the edge, darker at the root) stretched between 5 dark spines that poke out a little past the scalloped edge. Ripples gently.
  // s728cd SAIL v2 (Ben): the same orange on BOTH sides (a closed solid, not a 2-sided sheet), THICK at the base tapering to a fine edge, and it
  // WAVES slowly like the player's hair (a travelling ripple, stronger toward the top edge). Geometry is rebuilt from the rest shape each frame.
  const fin = new THREE.Group(); H.add(fin); const finSp = [];
  { const N = 5, z0 = 0.16, len = 0.56, NX = 32, NY = 7, base = zz => 0.8 * Math.sqrt(Math.max(0, 0.1296 - (zz + 0.02) ** 2)), hgt = t => 0.1 + Math.sin(Math.min(1, t * 1.3) * Math.PI) * 0.16 - t * 0.03;
    const cE = new THREE.Color(Lz.crest).offsetHSL(0, 0.02, 0.08), cR = new THREE.Color(Lz.crest).multiplyScalar(0.8), rest = [], col = [], idx = [];
    for (const s of [1, -1]) for (let i = 0; i <= NX; i++) { const t = i / NX, zz = z0 - t * len, sc = 0.84 + 0.16 * Math.abs(Math.cos(t * N * Math.PI)), H0 = hgt(t) * sc, by = base(zz), endT = Math.min(1, Math.min(t, 1 - t) * 12);
      for (let j = 0; j <= NY; j++) { const v = j / NY, th = 0.034 * Math.pow(1 - v, 1.4) * (0.35 + 0.65 * endT) + 0.0015; let rg = 0; for (let k = 0; k < N; k++) { const zk = z0 - ((k + 0.3) / N) * len, dz = (zz - v * 0.05) - (zk - v * (H0 + 0.02) * 0.09); rg = Math.max(rg, Math.exp(-(dz * dz) / 0.00028)); } rest.push([s * (th + rg * 0.018 * (1 - v * 0.4)), by - 0.02 + v * (H0 + 0.02), zz - v * 0.05, v, zz]); const cRg = rg; col.push(...(() => { const c = cR.clone().lerp(cE, v).lerp(new THREE.Color(Lz.crest).multiplyScalar(0.42), cRg * 0.95); return [c.r, c.g, c.b]; })()); continue; const c = cR.clone().lerp(cE, v); col.push(c.r, c.g, c.b); } }
    const row = NY + 1, side = (NX + 1) * row;
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) { const a = i * row + j, d = a + row; idx.push(a, d, a + 1, a + 1, d, d + 1); const a2 = side + a, d2 = side + d; idx.push(a2, a2 + 1, d2, a2 + 1, d2 + 1, d2); }
    for (let i = 0; i < NX; i++) { const a = i * row + NY, d = a + row; idx.push(a, d, side + a, d, side + d, side + a); const b0 = i * row, b1 = b0 + row; idx.push(b0, side + b0, b1, b1, side + b0, side + b1); }   // top edge + base seam
    for (const i of [0, NX]) for (let j = 0; j < NY; j++) { const a = i * row + j; if (i) idx.push(a, a + 1, side + a, a + 1, side + a + 1, side + a); else idx.push(a, side + a, a + 1, a + 1, side + a, side + a + 1); }   // front + back ends
    const mk = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(rest.length * 3), 3)); g.setIndex(idx); return g; };
    const g = mk(), go = mk(); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const web = new THREE.Mesh(g, toon('#ffffff', { vertexColors: true })); fin.add(web); const ol = new THREE.Mesh(go, new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide })); fin.add(ol);
    fin.userData.wave = (t, amp) => { const p = g.attributes.position.array, q = go.attributes.position.array; for (let i = 0; i < rest.length; i++) { const [x, y, zz, v] = rest[i], wv = Math.sin(t * 2.2 + zz * 9) * 0.6 + Math.sin(t * 3.1 + zz * 15) * 0.4, dx = wv * amp * v * v; p[i * 3] = x + dx; p[i * 3 + 1] = y; p[i * 3 + 2] = zz - v * 0.05 + Math.cos(t * 2.2 + zz * 9) * amp * 0.3 * v * v; }
      g.attributes.position.needsUpdate = true; g.computeVertexNormals(); const nn = g.attributes.normal.array; for (let i = 0; i < p.length; i++) q[i] = p[i] + nn[i] * 0.007; go.attributes.position.needsUpdate = true; g.computeBoundingSphere(); go.boundingSphere = g.boundingSphere;
      finSp.forEach(sp => { const zz = sp.userData.z, wv = Math.sin(t * 2.2 + zz * 9) * 0.6 + Math.sin(t * 3.1 + zz * 15) * 0.4; sp.rotation.z = -wv * amp * 2.2; }); };
    const SPM = toon(new THREE.Color(Lz.crest).multiplyScalar(0.5).getStyle());
    for (let k = 0; k < N; k++) { const t = (k + 0.3) / N, zz = z0 - t * len, hh = hgt(t) * (0.84 + 0.16 * Math.abs(Math.cos(t * N * Math.PI))) + 0.03, pv = new THREE.Group(); pv.position.set(0, base(zz) - 0.02, zz); fin.add(pv); pv.userData.z = zz;
      const sp = M(new THREE.CylinderGeometry(0.004, 0.012, hh, 6), SPM, 0, hh / 2, -hh * 0.09, pv, 0); sp.rotation.x = -0.1; finSp.push(pv); }
    fin.userData.wave(0, 0.02); }
  // back crest down the spine (on the body, behind the outfit)
  const body = P.head.parent; for (let k = 0; k < 4; k++) { const sp = M(new THREE.ConeGeometry(0.04, 0.12, 6), CR, 0, 1.42 - k * 0.18, -0.3 + k * 0.01, body, 0.01); sp.rotation.x = -1.2; }
  // 3) TAIL: a long tapered tail, thick at the hip, curving down to drag near the floor, swaying in a wave
  const segs = [], N = 9; let par = P.tail; const tail0 = new THREE.Group(); tail0.rotation.x = 0.9; P.tail.add(tail0); par = tail0;
  for (let k = 0; k < N; k++) { const r = 0.15 * (1 - k / N) + 0.025, len = 0.17; const sg = new THREE.Group(); sg.position.z = k ? -len : 0; par.add(sg);
    const m = M(new THREE.CylinderGeometry(r * 0.88, r, len + 0.02, 12), k % 3 === 1 ? SD : SK, 0, 0, -len / 2, sg, 0.025); m.rotation.x = Math.PI / 2;
    M(S(r * 0.88, 10, 8), k % 2 ? SD : SK, 0, 0, -len, sg, 0); if (k % 2 === 0) M(new THREE.ConeGeometry(0.025 * (1 - k / N) + 0.01, 0.06, 5), CR, 0, r * 0.85, -len / 2, sg, 0);
    sg.rotation.x = k ? -0.12 : 0; segs.push(sg); par = sg; }
  fox.updateMatrixWorld(true);
  const L = { H, up, jaw, cav, tg, tgS, tip, eyes, segs, fin, flick: 0, t: 0 };
  u.lizard = L; u.isLizard = true; return L;
}
export function tickLizard(fox, dt) {
  const u = fox.userData, L = u.lizard; if (!L) return; L.t += dt; if (L.fin) { const mood = u.lineMood || u.mood, up2 = mood === 'stern' || mood === 'determined' || mood === 'surprised' || mood === 'excited' ? 1.12 : mood === 'sad' ? 0.82 : 1; L.fin.scale.y += (up2 - L.fin.scale.y) * Math.min(1, dt * 6); L.fin.userData.wave(L.t, mood === 'excited' ? 0.035 : 0.022); } ; const t = L.t;
  // TONGUE: fires on the fox ear-twitch timer (u.twK set to 0.28 when an ear would flick), plus a quick double-flick now and then
  const tw = u.twK || 0, rise = tw > (L.tw0 || 0) + 1e-4; L.tw0 = tw; if (rise && L.flick <= 0) { L.flick = 0.42; L.dbl = Math.random() < 0.35; }
  let ext = 0, open = 0; if (L.flick > 0) { L.flick -= dt; const k = 1 - L.flick / 0.42, w = Math.sin(Math.min(1, k) * Math.PI); ext = L.dbl ? Math.abs(Math.sin(k * Math.PI * 2)) : w; open = 0.25 * w; if (L.flick <= 0 && L.dbl) { L.dbl = false; } }
  L.tg.visible = ext > 0.02; L.tgS.scale.z = Math.max(0.001, ext * 0.75); L.tg.rotation.y = Math.sin(t * 40) * 0.08 * ext; L.tip.rotation.x = Math.sin(t * 55) * 0.25 * ext;
  // MOUTH: big jaw; talking opens it wide (u.mouth from the fox viseme engine), the flick opens it a little
  const mo = Math.max(open, (u.mouth || 0) * 0.7 + (u.mood === 'happy' || u.mood === 'excited' ? 0.06 : 0));
  L.mo = (L.mo || 0) + (Math.min(1, Math.max(open, (u.mouth || 0) * 1.15)) - (L.mo || 0)) * Math.min(1, dt * 20); const m2 = Math.max(mo, L.mo);
  const mp = u.mp || {}, sh = { wide: mp.wide ?? 0.5, round: mp.round || 0, tongue: mp.tongue || 0, press: mp.press || 0, smile: mp.smile || 0 };   /* s728ap viseme shape from the fox speech engine */
  const op = Math.max(mo, L.mo * (1 - sh.press * 0.9)); L.jaw.rotation.x = op * 0.62; L.jaw.position.y = -0.08 - op * 0.05; L.up.rotation.x = -op * 0.14; L.cav.scale.set(0.8 + sh.wide * 0.4 - sh.round * 0.3, Math.max(0.01, op * 1.4), 1); L.cav.position.y = -0.085 - op * 0.04;
  { const tg = L.cav.userData.tg; tg.position.y = -0.05 + sh.tongue * 0.05; } L.talkE = Math.max((L.talkE || 0) - dt * 3, op > 0.55 ? 1 : 0);
  // EYES: blink with the fox blink, look with the fox look, the slit narrows when stern + widens when surprised
  const bl = (u.blinkT || 0) > 0 ? 1 : 0, mood = u.lineMood || u.mood, slit = mood === 'surprised' || mood === 'curious' ? 1.8 : mood === 'stern' || mood === 'determined' || mood === 'smug' ? 0.6 : 1;
  for (const e of L.eyes) { e.lid.visible = !!bl; e.ridge.position.y = 0.1 + (L.talkE || 0) * 0.02; e.ridge.rotation.z = -e.s * (0.2 - (L.talkE || 0) * 0.12 + (mood === 'stern' || mood === 'determined' || mood === 'smug' ? 0.25 : mood === 'sad' ? -0.2 : 0));
    e.ball.rotation.y = (u.look || 0) * 0.5 + e.s * 0.25; e.ball.rotation.x = -(u.lookY || 0) * 0.3; e.pu.scale.x = 0.22 * slit; }
  // TAIL: a slow wave down its length, swings more when lively
  const lively = mood === 'happy' || mood === 'excited';
  L.segs.forEach((s, k) => { if (!k) return; s.rotation.y = Math.sin(t * (lively ? 3 : 1.6) - k * 0.55) * (lively ? 0.16 : 0.09); s.rotation.x = -0.12 + Math.sin(t * 1.1 - k * 0.4) * 0.02; });
}
