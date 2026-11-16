// s728ag BEAR AVATAR (Ben: a bear, BIGGER than the fox + the others). Built ON the fox rig like lizard / fly / gryphon kits:
// body, outfit + gear kept, fur → brown, fox head parts + ears + tail hidden; a big round bear head, round ears (they twitch on the
// fox ear-twitch timer), a tan muzzle with a big black nose, small dark eyes + heavy brows, a stubby tail. The whole avatar is 1.3×
// and the torso a bit wider, so he stands a head taller + broader than the foxes.
export const BEAR_LOOK = { fur: '#6b4326', furDark: '#4a2c17', muzzle: '#c89a6a', inner: '#a8785a', nose: '#1b1410', eye: '#2a1a10', scale: 1.3 };
export function bearize({ THREE, M, toon }, fox, look = {}) {
  const B = { ...BEAR_LOOK, ...look }, u = fox.userData, P = u.P, Lf = (u.face && u.face.L) || {};
  const FUR = toon(B.fur), FD = toon(B.furDark), MZ = toon(B.muzzle), IN = toon(B.inner), NS = toon(B.nose, { emissive: new THREE.Color('#000000') });
  const INK = new THREE.MeshBasicMaterial({ color: 0x111111 }), SH = new THREE.MeshBasicMaterial({ color: 0xffffff }), EY = new THREE.MeshBasicMaterial({ color: B.eye });
  const S = (r, w = 22, h = 16) => new THREE.SphereGeometry(r, w, h), sm = (e0, e1, x) => { const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
  const furC = [Lf.fur, Lf.paw, Lf.furDark].filter(Boolean).map(c => new THREE.Color(c).getHex());
  fox.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.color && furC.includes(o.material.color.getHex())) o.material = FUR; });
  P.head.children.forEach(c => c.visible = false); P.tail.children.forEach(c => c.visible = false); if (P.ears) P.ears.forEach(e => e.visible = false);
  // BIG: the whole bear 1.3×, torso a little broader
  fox.scale.setScalar(B.scale); const body = P.head.parent; body.scale.x *= 1.12; body.scale.z *= 1.08; P.head.scale.multiplyScalar(1 / 1.06);
  // HEAD: a big round skull (fur painted: a lighter face, darker crown), cheeks, a tan muzzle + big nose, a hinged lower jaw
  const VC = toon('#ffffff', { vertexColors: true }), cF = new THREE.Color(B.fur), cD = new THREE.Color(B.furDark), cM = new THREE.Color(B.muzzle);
  const H = new THREE.Group(); H.position.set(0, -0.02, 0); P.head.add(H);
  const skG = S(0.4, 44, 30); { const p = skG.attributes.position, col = [], c = new THREE.Color(); for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 0.4, z = p.getZ(i) / 0.4; const x = p.getX(i) / 0.4, ang = Math.atan2(x, z); c.copy(cF).lerp(cD, sm(0.3, 0.95, y) * 0.7 + sm(0, -0.8, z) * 0.3).lerp(cM, sm(0.55, 0.95, z) * sm(0.25, -0.2, y) * 0.35); c.multiplyScalar(1 - 0.07 * (0.5 + 0.5 * Math.sin(ang * 30 + y * 18)) * (0.5 + 0.5 * Math.sin(y * 40 + ang * 5))); col.push(c.r, c.g, c.b); } skG.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
  const sk = M(skG, VC, 0, 0.02, 0, H, 0.045, 0.4); sk.scale.set(1.12, 0.98, 1.0);
  for (const s of [-1, 1]) M(S(0.2), FUR, s * 0.24, -0.14, 0.12, H, 0.03, 0.2).scale.set(1, 0.85, 0.9);   // jowls / cheeks
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) { const t = M(new THREE.ConeGeometry(0.035, 0.1, 6), FUR, s * (0.4 - k * 0.012), -0.08 - k * 0.05, 0.12 - k * 0.035, H, 0); t.rotation.set(0.2, 0, s * (2.1 + k * 0.12)); }   // s728ak cheek fur tufts (no ink: soft)
  for (let k = 0; k < 4; k++) { const t = M(new THREE.ConeGeometry(0.05, 0.13, 5), FD, (k - 1.5) * 0.06, 0.4, 0.02 - Math.abs(k - 1.5) * 0.03, H, 0.012); t.rotation.set(-0.5, 0, (k - 1.5) * 0.35); }   // s728ak tuft on the crown
  for (let k = 0; k < 7; k++) { const a = (k - 3) * 0.35, t = M(new THREE.ConeGeometry(0.05, 0.12, 5), FUR, Math.sin(a) * 0.36, -0.3, Math.cos(a) * 0.2 - 0.02, H, 0); t.rotation.set(Math.PI - 0.4, 0, Math.sin(a) * 0.7); }   // shaggy fur under the chin
  const up = new THREE.Group(); up.position.set(0, -0.08, 0.3); H.add(up);
  const mz = M(S(0.19, 22, 16), MZ, 0, 0, 0.07, up, 0.03, 0.19); mz.scale.set(1.1, 0.72, 1.3);
  const nose = M(S(0.075, 16, 12), NS, 0, 0.07, 0.25, up, 0.012, 0.075); nose.scale.set(1.35, 0.85, 0.9);
  for (const s of [-1, 1]) { const n = M(S(0.016, 8, 6), INK, s * 0.04, 0.05, 0.315, up, 0); n.scale.set(1.3, 0.7, 0.6); M(S(0.07, 12, 10), MZ, s * 0.06, -0.035, 0.22, up, 0.012, 0.07).scale.set(1, 0.7, 0.85); for (let k = 0; k < 3; k++) M(S(0.007, 4, 4), toon(B.furDark), s * (0.07 + k * 0.025), -0.02 - (k % 2) * 0.02, 0.27 - k * 0.01, up, 0); }   // nostrils, lip lobes, whisker dots
  { const br = M(S(0.09, 14, 10), toon(B.furDark), 0, 0.11, 0.0, up, 0); br.scale.set(0.75, 0.3, 1.4); }   // darker bridge up to the brow
  M(S(0.02, 8, 6), SH, -0.03, 0.105, 0.305, up, 0);   // nose shine
  M(new THREE.BoxGeometry(0.012, 0.07, 0.012), INK, 0, 0.0, 0.29, up, 0);   // philtrum
  const jaw = new THREE.Group(); jaw.position.set(0, -0.1, 0.0); up.add(jaw);
  const cav = new THREE.Group(); cav.position.set(0, -0.09, 0.25); up.add(cav); { const cm = M(S(0.1, 16, 12), toon('#3a1414'), 0, 0, 0, cav, 0); cm.scale.set(1.25, 1, 0.5); const tg = M(S(0.07, 12, 8), toon('#c8505a'), 0, -0.04, 0.02, cav, 0); tg.scale.set(1.1, 0.45, 0.9); cav.userData.tg = tg; for (const s of [-1, 1]) { const f = M(new THREE.ConeGeometry(0.014, 0.04, 5), toon('#f4efe4'), s * 0.07, 0.045, 0.03, cav, 0); f.rotation.x = Math.PI; } } cav.scale.set(1, 0.01, 1);   /* s728am open-mouth cavity, tongue + two little fangs */
  M(S(0.15, 18, 12), IN, 0, 0.03, 0.05, jaw, 0).scale.set(0.95, 0.3, 0.9);   // mouth inside
  const lj = M(S(0.15, 18, 12), MZ, 0, -0.02, 0.1, jaw, 0.022, 0.15); lj.scale.set(1.0, 0.4, 1.2);
  for (const s of [-1, 1]) { const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new THREE.Vector3(s * (0.02 + t * 0.15), -0.02 - Math.sin(t * Math.PI) * 0.015 + t * t * 0.03, 0.26 - t * t * 0.14)); } up.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.008, 5), INK)); }   // smile line
  // EYES: small dark eyes with a shine, heavy fur brows that move with mood, lids blink
  const eyes = [-1, 1].map(s => { const e = new THREE.Group(); e.position.set(s * 0.15, 0.08, 0.34); e.rotation.y = s * 0.3; H.add(e);
    M(S(0.06, 12, 10), toon(B.furDark), 0, 0, -0.012, e, 0); const ball = M(S(0.048, 14, 10), toon('#7a4a22'), 0, 0, 0, e, 0.008, 0.048); M(S(0.03, 10, 8), EY, 0, 0, 0.026, ball, 0); M(S(0.014, 6, 4), SH, s * -0.012, 0.017, 0.043, ball, 0); M(S(0.006, 4, 4), SH, s * 0.014, -0.012, 0.045, ball, 0);
    const lid = M(new THREE.SphereGeometry(0.052, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), FUR, 0, 0, 0, e, 0); lid.rotation.x = -1.35;
    const brow = M(S(0.06, 12, 8), FD, 0, 0.065, 0.01, e, 0.01, 0.06); brow.scale.set(1.5, 0.45, 0.8);
    return { e, ball, lid, brow, s }; });
  // ROUND EARS on top (darker back, tan inner), they twitch on the fox ear timer
  const ears = [-1, 1].map(s => { const e = new THREE.Group(); e.position.set(s * 0.29, 0.3, -0.04); e.rotation.z = -s * 0.35; H.add(e);
    const o = M(S(0.12, 16, 12), FUR, 0, 0.04, 0, e, 0.02, 0.12); o.scale.set(1, 1, 0.5); const i = M(S(0.075, 12, 10), IN, 0, 0.035, 0.04, e, 0); i.scale.set(1, 1, 0.35);
    e.userData.b = [e.rotation.x, e.rotation.z]; return e; });
  // STUBBY TAIL
  const tl = M(S(0.11, 14, 10), FUR, 0, 0, 0, P.tail, 0.02, 0.11); tl.scale.set(1, 0.9, 1.1); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, t = M(new THREE.ConeGeometry(0.035, 0.08, 4), FUR, Math.cos(a) * 0.07, Math.sin(a) * 0.07, -0.06, P.tail, 0); t.rotation.x = -Math.PI / 2; }
  // CLAWS on the paws (three pale claws on each hand, if the rig exposes them)
  const clawM = toon('#efe4cc'); (P.hands || []).forEach((h, hi) => { if (!h || !h.isObject3D) return; for (let k = 0; k < 4; k++) { const c = M(new THREE.ConeGeometry(0.012, 0.055, 5), clawM, (k - 1.5) * 0.026, -0.13, 0.045, h, 0.004); c.rotation.x = Math.PI - 0.35; } });
  (P.legs || []).forEach(lg => { let foot = null; lg.traverse(o => { if (o.isMesh && (!foot || o.getWorldPosition(new THREE.Vector3()).y < foot.getWorldPosition(new THREE.Vector3()).y)) foot = o; }); if (foot) for (let k = 0; k < 4; k++) { const c = M(new THREE.ConeGeometry(0.014, 0.06, 5), clawM, (k - 1.5) * 0.04, 0.0, 0.17, foot.parent, 0.004); c.rotation.x = Math.PI / 2 + 0.25; c.position.y = foot.position.y - 0.02; } });   /* s728ak claws on hands + boots */
  const L = { H, up, jaw, cav, eyes, ears, tl, t: 0 }; u.bear = L; u.isBear = true;
  u.frame = [1.25 * B.scale * 0.75, 4.2 * B.scale]; fox.updateMatrixWorld(true); return L;
}
export function tickBear(fox, dt) {
  const u = fox.userData, L = u.bear; if (!L) return; L.t += dt; const t = L.t, mood = u.lineMood || u.mood;
  // EAR TWITCH on the fox ear timer (u.twE = which ear, u.twK counts down from 0.28)
  L.ears.forEach((e, i) => { const tw = u.twE === i && (u.twK || 0) > 0 ? Math.sin((u.twK / 0.28) * Math.PI) : 0, [bx, bz] = e.userData.b, s = i ? 1 : -1, back = mood === 'sad' ? 0.35 : 0;
    e.rotation.x = bx - tw * 0.5 + back - (L.talkE || 0) * 0.15; e.rotation.z = bz - s * tw * 0.25; });
  // MOUTH: the jaw opens with talk; a big yawn-roar now and then when idle + happy
  L.roar = (L.roar ?? 8) - dt; if (L.roar < 0) { L.roar = 9 + Math.random() * 9; L.rk = 1.1; } let rr = 0; if (L.rk > 0) { L.rk -= dt; rr = Math.sin((1 - L.rk / 1.1) * Math.PI); }
  const mo = Math.min(1, Math.max((u.mouth || 0) * 1.1, rr)); L.mo = (L.mo || 0) + (mo - (L.mo || 0)) * Math.min(1, dt * 20); const m2 = L.mo;
  const mp = u.mp || {}, sh = { wide: mp.wide ?? 0.5, round: mp.round || 0, tongue: mp.tongue || 0, press: mp.press || 0, smile: mp.smile || 0 };   /* s728ap viseme shape from the fox speech engine */
  const op = m2 * (1 - sh.press * 0.9); L.jaw.rotation.x = op * 0.6; L.jaw.position.y = -0.1 - op * 0.09; L.cav.scale.set(0.75 + sh.wide * 0.5 - sh.round * 0.35, Math.max(0.01, op * 1.3), 1); L.cav.position.y = -0.09 - op * 0.06; L.up.rotation.x = -op * 0.08;
  { const tg = L.cav.userData.tg; tg.position.y = -0.04 + sh.tongue * 0.05; tg.position.z = 0.02 + sh.tongue * 0.04; } L.talkE = Math.max((L.talkE || 0) - dt * 3, op > 0.55 ? 1 : 0);
  // EYES: blink, look; brows lower when stern, lift when happy / surprised; squint during the roar
  const bl = (u.blinkT || 0) > 0 || rr > 0.4, by = mood === 'stern' || mood === 'determined' || mood === 'smug' ? -0.015 : mood === 'happy' || mood === 'excited' || mood === 'surprised' ? 0.02 : 0, bz = mood === 'stern' || mood === 'determined' ? 0.3 : mood === 'sad' ? -0.3 : 0;
  for (const e of L.eyes) { e.lid.rotation.x = bl ? 0.15 : -1.35; e.ball.rotation.y = (u.look || 0) * 0.4; e.brow.position.y = 0.065 + by + (L.talkE || 0) * 0.018; e.brow.rotation.z = e.s * bz; }
  // big slow breathing + a little sniff of the nose
  L.H.position.y = -0.02 + Math.sin(t * 1.2) * 0.01; L.H.rotation.x = -rr * 0.25; L.H.rotation.z = Math.sin(t * 0.4) * 0.05; L.up.position.z = 0.3 + Math.max(0, Math.sin(t * 7)) * 0.006 * (Math.sin(t * 0.5) > 0.6 ? 1 : 0);
  L.tl.rotation.y = Math.sin(t * 2.2) * 0.25;
}
