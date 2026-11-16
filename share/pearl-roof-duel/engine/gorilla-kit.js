// s728ds GORILLA AVATAR (Ben). Built ON the fox rig like the bear (outfit, gear + anims kept; fox head / ears / tail hidden).
// BIG like the bear (1.25×) with a broad barrel chest, wide shoulders + longer heavy arms. Fur → near-black with a SILVER back stripe
// (silverback). HEAD: a domed skull with a little crest peak, a dark leathery FACE (shaded: heavy BROW RIDGE shelf over deep-set amber
// eyes, a wide flat nose with big nostrils, a big rounded muzzle), small round ears low on the sides. TALKING MOUTH (bear system): the lower
// jaw hinges open with the speech engine (u.mouth / u.mp), dark mouth + pink tongue + a row of teeth + 2 canines (only shown when open),
// a lip line that smiles / frowns. Brows lower (stern) or lift (surprised / sad), lids squint, ears twitch on the fox ear timer.
export const GORILLA_LOOK = { fur: '#2b2827', furDark: '#1c1a19', silver: '#9a9694', face: '#5e524c', faceDark: '#3a312d', eye: '#c98a2e', mouth: '#2a0e12', scale: 1.25 };
export function gorillaize({ THREE, M, toon }, fox, look = {}) {
  const G = { ...GORILLA_LOOK, ...look }, u = fox.userData, P = u.P, Lf = (u.face && u.face.L) || {};
  const FUR = toon(G.fur), FC = toon(G.face), FD = toon(G.faceDark), INK = new THREE.MeshBasicMaterial({ color: 0x111111 }), WH = new THREE.MeshBasicMaterial({ color: 0xffffff }), TM = toon('#f1ead6');
  const S = (r, w = 24, h = 16) => new THREE.SphereGeometry(r, w, h), V = (x, y, z) => new THREE.Vector3(x, y, z), sm = (e0, e1, x) => { const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
  const furC = [Lf.fur, Lf.furDark, Lf.paw, Lf.chinPatchCol, Lf.muzzle].filter(Boolean).map(c => new THREE.Color(c).getHex());
  fox.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.color && furC.includes(o.material.color.getHex())) o.material = FUR; });
  P.head.children.forEach(c => c.visible = false); P.tail.children.forEach(c => c.visible = false); if (P.ears) P.ears.forEach(e => e.visible = false);
  // BIG + broad: whole avatar 1.25×, wide barrel chest, long heavy arms
  fox.scale.setScalar(G.scale); const body = P.head.parent; body.scale.x *= 1.2; body.scale.z *= 1.12; P.head.scale.multiplyScalar(1 / 1.1);
  (P.arms || []).forEach(a => { a.scale.y *= 1.12; a.scale.x *= 1.25; a.scale.z *= 1.25; });
  // silverback: a pale saddle across the back + shoulders
  { const VC = toon('#ffffff', { vertexColors: true }), g = S(0.4, 28, 18), p = g.attributes.position, col = [], c = new THREE.Color(), cF = new THREE.Color(G.fur), cS = new THREE.Color(G.silver);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 0.4, z = p.getZ(i) / 0.4; c.copy(cF).lerp(cS, sm(0.1, -0.6, z) * sm(-0.7, 0.1, y) * 0.85); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); const sb = M(g, VC, 0, 1.12, -0.06, body, 0.02, 0.4); sb.scale.set(1.05, 0.95, 0.8); }
  const L0 = {};
  { const SV = toon(G.silver); for (const s of [-1, 1]) { const sh = M(S(0.16, 18, 12), SV, s * 0.36, 1.38, -0.1, body, 0.014, 0.16); sh.scale.set(1.1, 0.55, 1.1); } const ruff = M(S(0.24, 22, 14), FUR, 0, 1.52, -0.04, body, 0.016, 0.24); ruff.scale.set(1.45, 0.5, 1.15); }
  // ---- HEAD ----
  const H = new THREE.Group(); H.position.set(0, 0.0, 0.02); P.head.add(H);
  const VCh = toon('#ffffff', { vertexColors: true }), skG = S(0.36, 32, 24); { const p = skG.attributes.position, col = [], c = new THREE.Color(), cF = new THREE.Color(G.fur), cS = new THREE.Color(G.silver); for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 0.36, z2 = p.getZ(i) / 0.36; c.copy(cF).lerp(cS, sm(-0.3, -0.85, z2) * sm(0.5, -0.4, y) * 0.55); col.push(c.r, c.g, c.b); } skG.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
  const sk = M(skG, VCh, 0, 0.06, -0.04, H, 0.02, 0.36); sk.scale.set(1.05, 1, 1);
  const crest = M(S(0.2, 18, 12), FUR, 0, 0.33, -0.1, H, 0.018, 0.2); crest.scale.set(0.55, 0.65, 1.15);
  // leathery face mask, vertex shaded (darker under the brow + round the nose)
  const fg = S(0.3, 32, 22); { const p = fg.attributes.position, col = [], c = new THREE.Color(), cF = new THREE.Color(G.face), cD = new THREE.Color(G.faceDark);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 0.3, y = p.getY(i) / 0.3; c.copy(cF).lerp(cD, sm(0.15, 0.45, y) * 0.7 + Math.exp(-((x / 0.35) ** 2 + ((y + 0.05) / 0.2) ** 2)) * 0.3); col.push(c.r, c.g, c.b); }
    fg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
  const face = M(fg, toon('#ffffff', { vertexColors: true }), 0, -0.02, 0.17, H, 0.02, 0.3); face.scale.set(1.0, 0.95, 0.75);
  // BROW RIDGE: one heavy shelf in two halves (they move with mood)
  const brows = [-1, 1].map(s => { const b = new THREE.Group(); b.position.set(s * 0.1, 0.14, 0.335); H.add(b); const m = M(new THREE.CapsuleGeometry(0.05, 0.12, 4, 10), FD, s * 0.02, 0, 0, b, 0.012); m.rotation.z = Math.PI / 2; m.scale.set(1, 1, 0.8); return b; });
  { const bc = M(new THREE.CapsuleGeometry(0.045, 0.05, 4, 10), FD, 0, 0.14, 0.34, H, 0.01); bc.rotation.z = Math.PI / 2; bc.scale.set(1, 1, 0.7); L0.bc = bc; }
  // deep-set eyes
  const eyes = [-1, 1].map(s => { const e = new THREE.Group(); e.position.set(s * 0.105, 0.055, 0.35); H.add(e); M(S(0.045, 14, 10), FD, 0, 0, -0.012, e, 0).scale.set(1.2, 1, 0.5);
    M(S(0.05, 14, 10), toon('#efe6d6'), 0, 0, -0.004, e, 0.006).scale.set(1.25, 0.85, 0.5); const ball = M(S(0.036, 14, 10), toon(G.eye, { emissive: new THREE.Color('#3a2006'), emissiveIntensity: 0.3 }), 0, 0, 0.012, e, 0); ball.scale.set(1, 1, 0.5); M(S(0.02, 10, 8), INK, 0, 0, 0.026, e, 0).scale.set(1, 1, 0.35); M(S(0.01, 6, 4), WH, -s * 0.012, 0.014, 0.032, e, 0);
    const lid = M(new THREE.SphereGeometry(0.054, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), FC, 0, 0, 0, e, 0); lid.scale.set(1.35, 0.9, 0.6); lid.rotation.x = -2.2; return { e, lid, s }; });
  // wide flat nose with big nostrils
  { const NS = toon(G.faceDark); const n = M(S(0.075, 20, 14), NS, 0, -0.05, 0.395, H, 0.01); n.scale.set(1.45, 0.6, 0.42);
    for (const s of [-1, 1]) { const w = M(S(0.035, 12, 10), NS, s * 0.06, -0.065, 0.385, H, 0.008); w.scale.set(1, 0.8, 0.7);   /* flared wings */ const ns = M(S(0.022, 12, 8), INK, s * 0.04, -0.072, 0.418, H, 0); ns.scale.set(1.3, 0.8, 0.35); ns.rotation.z = s * 0.5; }
    const br = M(new THREE.CapsuleGeometry(0.035, 0.08, 4, 10), FC, 0, 0.04, 0.375, H, 0.008); br.scale.set(1.2, 1, 0.6); br.rotation.x = 0.25; }
  // ears
  const ears = [-1, 1].map(s => { const e = M(S(0.06, 14, 10), FC, s * 0.36, 0.04, -0.02, H, 0.012); e.scale.set(0.5, 1, 0.8); M(S(0.035, 10, 8), FD, s * 0.02, 0, 0.0, e, 0).scale.set(0.6, 1, 0.8); return e; });
  // MUZZLE: upper lip (fixed) + lower jaw (hinged)
  const up = new THREE.Group(); up.position.set(0, -0.13, 0.33); H.add(up);
  M(S(0.14, 24, 16), FC, 0, 0.0, 0.02, up, 0.016, 0.14).scale.set(1.3, 0.62, 0.78);
  for (const s of [-1, 1]) { const pts = [V(s * 0.08, 0.06, 0.1), V(s * 0.13, 0.0, 0.08), V(s * 0.15, -0.05, 0.06)]; up.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.005, 4), new THREE.MeshBasicMaterial({ color: 0x1a1513 }))); }
  const cav = M(S(0.1, 18, 12), toon(G.mouth), 0, -0.06, 0.01, up, 0); cav.scale.set(1.15, 0.01, 0.6);
  const tth = new THREE.Group(); up.add(tth); for (let k = -3; k <= 3; k++) { const t = M(new THREE.BoxGeometry(0.026, 0.026, 0.012), TM, k * 0.027, -0.06, 0.085 - Math.abs(k) * 0.006, tth, 0); t.rotation.y = -k * 0.12; }
  for (const s of [-1, 1]) { const c = M(new THREE.ConeGeometry(0.014, 0.05, 6), TM, s * 0.095, -0.075, 0.06, tth, 0); c.rotation.x = Math.PI; } tth.visible = false;
  const jaw = new THREE.Group(); jaw.position.set(0, -0.07, -0.06); up.add(jaw);
  const jm = M(S(0.125, 22, 14), FC, 0, -0.045, 0.08, jaw, 0.016, 0.125); jm.scale.set(1.2, 0.48, 0.78);
  const tg = M(S(0.06, 14, 10), toon('#c8505a'), 0, -0.01, 0.07, jaw, 0); tg.scale.set(1.2, 0.35, 1); tg.visible = false;
  const lip = new THREE.Mesh(new THREE.BufferGeometry(), INK); up.add(lip);
  const buildLip = (smile, op) => { const pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12 * 2 - 1, a = Math.abs(t), sO = smile * Math.max(0, 1 - op * 2.2); pts.push(V(t * 0.15, -0.055 + sO * 0.04 * Math.pow(a, 2.2), 0.09 - a * a * 0.07)); }
    lip.geometry.dispose(); lip.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.008, 5); };
  // big hands: knuckles
  (P.hands || []).forEach(h0 => { const h = h0 && (h0.isObject3D ? h0 : h0.g); if (!h) return; M(S(0.09, 14, 10), FC, 0, -0.04, 0.02, h, 0.012).scale.set(1.1, 0.8, 0.9); });
  const L = { bc: L0.bc, H, brows, eyes, ears, up, cav, tth, jaw, tg, lip, buildLip, mo: 0, key: '', t: 0 }; buildLip(0.1, 0);
  u.gorilla = L; u.isGorilla = true; u.isBear = true;   // isBear: workshops frame + scale him like the bear
  u.frame = [1.25 * G.scale * 0.75, 4.2 * G.scale]; fox.updateMatrixWorld(true); return L;
}
export function tickGorilla(fox, dt) {
  const u = fox.userData, L = u.gorilla; if (!L) return; L.t += dt; const t = L.t, mood = u.lineMood || u.mood, mp = u.mp || {};
  const op = Math.min(1, (u.mouth || 0) * 1.25) * (1 - (mp.press || 0) * 0.9); L.mo += (op - L.mo) * Math.min(1, dt * 20); const m = L.mo;
  L.jaw.rotation.x = m * 0.5; L.cav.scale.y = Math.max(0.01, m * 1.3); L.cav.position.y = -0.06 - m * 0.04; L.tth.visible = m > 0.08; L.tg.visible = m > 0.1; L.tg.position.y = -0.01 + (mp.tongue || 0) * 0.03;
  const E = { neutral: [0, 0, 0.15], happy: [0.6, 0.02, 0.05], excited: [0.8, 0.04, 0], warm: [0.4, 0.01, 0.1], surprised: [0, 0.05, 0], curious: [0.1, 0.03, 0], sad: [-0.6, 0.01, 0.2], stern: [-0.3, -0.03, 0.45], determined: [-0.2, -0.025, 0.35], smug: [0.4, -0.01, 0.4], grumpy: [-0.4, -0.03, 0.4], nervous: [-0.2, 0.03, 0.05] }[mood] || [0, 0, 0.15];   // [smile, brow lift, squint]
  const smile = (mp.smile ?? 0) * 0.5 + E[0], key = Math.round(smile * 20) + ',' + Math.round(m * 20); if (key !== L.key) { L.key = key; L.buildLip(Math.max(-0.9, Math.min(0.9, smile)), m); }
  const bl = (u.blinkT || 0) > 0, sq = bl ? 1 : E[2], sad = mood === 'sad' || mood === 'nervous' ? 1 : 0;
  L.eyes.forEach(e => { e.lid.rotation.x += ((bl ? -0.1 : -2.2 + sq * 1.4) - e.lid.rotation.x) * Math.min(1, dt * 16); e.lid.visible = bl || sq > 0.05 || e.lid.rotation.x > -2.1; });
  L.brows.forEach((b, i) => { const s = i ? 1 : -1; b.position.y = 0.14 + E[1] + (m > 0.55 ? 0.01 : 0); b.rotation.z = s * (E[1] < 0 ? 0.25 : 0) - s * sad * 0.3; });
  const tw = (u.twK || 0) > 0 ? Math.sin((u.twK / 0.28) * Math.PI) : 0; L.ears.forEach((e, i) => { e.rotation.z = (u.twE === i ? tw * 0.3 : 0) * (i ? -1 : 1); });
  if (L.bc) L.bc.position.y = 0.14 + E[1]; L.H.position.y = Math.sin(t * 1.3) * 0.006;
}
