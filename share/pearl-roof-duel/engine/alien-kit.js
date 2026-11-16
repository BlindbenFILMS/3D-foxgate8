// s728do GREY ALIEN AVATAR (Ben). Built ON the fox rig like the other species (outfit, gear + anims kept; fox head / ears / tail hidden).
// Fur → smooth grey skin, paws → grey with 3 long thin fingers. HEAD: a big bulb skull (wide dome, narrow chin, vertex shaded: lighter dome,
// darker under the cheeks, a faint vein pattern on the dome), HUGE black almond eyes slanted up at the outer corners with a soft sheen + shine,
// lids that blink / squint / widen with mood, soft brow ridges, two tiny nostril slits. TALKING MOUTH: a small thin lip line that curves with
// mood + a dark oval mouth with a grey tongue that opens with the speech engine (u.mouth / u.mp). The head tilts with curiosity + a slow bob.
export const ALIEN_LOOK = { skin: '#a9b0b5', skinDark: '#7c858c', skinLight: '#c9cfd3', eye: '#0b0c10', mouth: '#2a1e22', tongue: '#8d7f86' };
export function alienize({ THREE, M, toon }, fox, look = {}) {
  const A = { ...ALIEN_LOOK, ...look }, u = fox.userData, P = u.P, Lf = (u.face && u.face.L) || {};
  const SK = toon(A.skin, { emissive: new THREE.Color('#1a2026'), emissiveIntensity: 0.15 }), SD = toon(A.skinDark), INK = new THREE.MeshBasicMaterial({ color: 0x111111 }), WH = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const S = (r, w = 24, h = 16) => new THREE.SphereGeometry(r, w, h), V = (x, y, z) => new THREE.Vector3(x, y, z), sm = (e0, e1, x) => { const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
  const furC = [Lf.fur, Lf.furDark, Lf.chinPatchCol, Lf.muzzle].filter(Boolean).map(c => new THREE.Color(c).getHex()), pawC = Lf.paw ? new THREE.Color(Lf.paw).getHex() : -1;
  fox.traverse(o => { if (!o.isMesh || !o.material || Array.isArray(o.material) || !o.material.color) return; const h = o.material.color.getHex(); if (h === pawC || furC.includes(h)) o.material = SK; });
  P.head.children.forEach(c => c.visible = false); P.tail.children.forEach(c => c.visible = false); if (P.ears) P.ears.forEach(e => e.visible = false);
  // long thin fingers on each hand
  (P.hands || []).forEach((h0, i) => { const h = h0 && (h0.isObject3D ? h0 : h0.g); if (!h) return; for (let k = -1; k <= 1; k++) { const f = M(new THREE.CapsuleGeometry(0.018, 0.13, 4, 8), SK, k * 0.035, -0.1, 0.02, h, 0.008); f.rotation.x = 0.25; f.rotation.z = k * 0.12; M(S(0.024, 10, 8), SK, k * 0.04, -0.18, 0.04, h, 0.006); } });
  // ---- HEAD: bulb skull, vertex shaded ----
  const H = new THREE.Group(); H.position.set(0, 0.06, 0); P.head.add(H);
  const VC = toon('#ffffff', { vertexColors: true }), cS = new THREE.Color(A.skin), cD = new THREE.Color(A.skinDark), cL = new THREE.Color(A.skinLight);
  const sg = S(0.42, 44, 32); { const p = sg.attributes.position, col = [], c = new THREE.Color(); for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const yn = y / 0.42;
      const taper = 1 - 0.42 * sm(0.1, -1, yn); x *= taper; z *= taper * 0.92; if (yn < -0.2) z += 0.05 * sm(-0.2, -0.9, yn); y *= yn > 0 ? 1.08 : 1.05; p.setXYZ(i, x, y, z);   // wide dome → narrow chin
      const vein = Math.max(0, Math.sin(x * 34 + Math.sin(z * 18) * 2) * Math.sin(z * 9 + y * 6)) ; c.copy(cS).lerp(cL, sm(0.1, 0.9, yn) * 0.7).lerp(cD, sm(-0.05, -0.6, yn) * sm(0.05, 0.3, Math.abs(x)) * 0.6);
      void vein; const zn = z / 0.42, ax = Math.abs(x) / 0.42;
      const sock = Math.exp(-(((ax - 0.42) / 0.26) ** 2 + ((yn + 0.02) / 0.2) ** 2)) * sm(0.3, 0.8, zn);   // eye sockets
      const cheek = Math.exp(-(((ax - 0.36) / 0.16) ** 2 + ((yn + 0.42) / 0.14) ** 2)) * sm(0.2, 0.7, zn);   // hollow under the cheekbone
      const brow = Math.exp(-((ax / 0.5) ** 2 + ((yn - 0.42) / 0.22) ** 2)) * sm(0.3, 0.9, zn);   // light forehead
      c.lerp(cD, sock * 0.55 + cheek * 0.35).lerp(cL, brow * 0.5); col.push(c.r, c.g, c.b); }
    sg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); sg.computeVertexNormals(); }
  const sk = M(sg, VC, 0, 0.08, 0, H, 0.016, 0.42);
  // soft brow ridges + tiny nostrils
  const brows = [-1, 1].map(s => { const b = M(new THREE.CapsuleGeometry(0.025, 0.12, 4, 10), SK, s * 0.14, 0.15, 0.33, H, 0.006); b.rotation.z = Math.PI / 2 - s * 0.35; b.rotation.y = s * 0.35; return b; });
  for (const s of [-1, 1]) M(new THREE.CapsuleGeometry(0.006, 0.014, 3, 6), INK, s * 0.022, -0.12, 0.345, H, 0).rotation.z = s * 0.4;
  // ---- EYES: huge black almonds, slanted ----
  const eyes = [-1, 1].map(s => { const e = new THREE.Group(); e.position.set(s * 0.17, 0.03, 0.285); e.rotation.set(0, s * 0.55, s * 0.45); H.add(e);
    const ball = M(S(0.13, 28, 20), toon(A.eye, { emissive: new THREE.Color('#141a26'), emissiveIntensity: 0.4 }), 0, 0, 0, e, 0.012, 0.13); ball.scale.set(1.35, 0.8, 0.55);
    const sheen = M(S(0.05, 14, 10), new THREE.MeshBasicMaterial({ color: 0x3a4a66, transparent: true, opacity: 0.55 }), -s * 0.04, 0.02, 0.06, e, 0); sheen.scale.set(2.2, 0.6, 0.4);
    M(S(0.02, 8, 6), WH, -s * 0.07, 0.035, 0.068, e, 0); { const gl = M(S(0.04, 12, 8), new THREE.MeshBasicMaterial({ color: 0x2fd6c8, transparent: true, opacity: 0.22, depthWrite: false }), s * 0.03, -0.02, 0.06, e, 0); gl.scale.set(2, 0.6, 0.3); } M(S(0.009, 6, 4), WH, s * 0.06, -0.03, 0.07, e, 0);
    const lid = M(new THREE.SphereGeometry(0.136, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), SK, 0, 0, 0, e, 0); lid.scale.set(1.35, 0.8, 0.58); lid.rotation.x = -2.2;
    const lo = M(new THREE.SphereGeometry(0.134, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), SK, 0, 0, 0, e, 0); lo.scale.set(1.35, 0.8, 0.58); lo.rotation.x = 1.5; lo.visible = false;
    return { e, lid, lo, s }; });
  // ---- MOUTH: thin lip line + dark oval + tongue ----
  const up = new THREE.Group(); up.position.set(0, -0.215, 0.3); up.rotation.x = -0.15; H.add(up);
  const cav = new THREE.Group(); up.add(cav); const cm = M(S(0.04, 16, 10), toon(A.mouth), 0, 0, 0, cav, 0); cm.scale.set(1.3, 1, 0.4);
  const tg = M(S(0.026, 12, 8), toon(A.tongue), 0, -0.018, 0.01, cav, 0); tg.scale.set(1.1, 0.45, 0.8); cav.visible = false;
  const lip = new THREE.Mesh(new THREE.BufferGeometry(), INK); up.add(lip);
  const buildLip = (smile, op) => { const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10 * 2 - 1, a = Math.abs(t), sO = smile * Math.max(0, 1 - op * 2.2); pts.push(V(t * 0.055, 0.004 + sO * 0.03 * Math.pow(a, 2.2), 0.012 - a * a * 0.02)); }
    lip.geometry.dispose(); lip.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.005, 5); };
  // thin neck
  const body = P.head.parent; const nk = M(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 12), SK, 0, -0.18, -0.02, P.head, 0.012);
  const L = { H, eyes, brows, up, cav, tg, lip, buildLip, mo: 0, key: '', t: 0 }; buildLip(0.2, 0); void sk; void body; void nk;
  u.alien = L; u.isAlien = true; fox.updateMatrixWorld(true); return L;
}
export function tickAlien(fox, dt) {
  const u = fox.userData, L = u.alien; if (!L) return; L.t += dt; const t = L.t, mood = u.lineMood || u.mood, mp = u.mp || {};
  // MOUTH: the oval hangs from the lip line and grows down; the smile flattens into its top edge
  const op = Math.min(1, (u.mouth || 0) * 1.3) * (1 - (mp.press || 0) * 0.9); L.mo += (op - L.mo) * Math.min(1, dt * 20); const m = L.mo;
  L.cav.visible = m > 0.04; const hy = Math.max(0.01, m * 1.2); L.cav.scale.set(0.75 + (mp.wide ?? 0.5) * 0.5 - (mp.round || 0) * 0.35, hy, 1); L.cav.position.y = 0.004 - hy * 0.04 * 0.92; L.tg.position.y = -0.018 + (mp.tongue || 0) * 0.02;
  const E = { neutral: [0.15, 0, 0, 0], happy: [0.7, 0.15, 0, 0], excited: [0.9, 0.3, -0.1, 0], warm: [0.5, 0.1, 0.1, 0], surprised: [0, 0.4, -0.25, 0], curious: [0.1, 0.2, -0.1, 0.25], sad: [-0.6, -0.1, 0.2, 0.3], stern: [-0.3, -0.25, 0.4, 0], determined: [-0.15, -0.2, 0.3, 0], smug: [0.5, -0.1, 0.45, 0.15], nervous: [-0.2, 0.2, 0, 0.3] }[mood] || [0.15, 0, 0, 0];   // [smile, brow up, squint, worry]
  const smile = (mp.smile ?? 0) * 0.5 + E[0], key = Math.round(smile * 20) + ',' + Math.round(m * 20); if (key !== L.key) { L.key = key; L.buildLip(Math.max(-0.9, Math.min(0.9, smile)), m); }
  // EYES: blink, squint (lids down + lower lid up), widen; brows lift / frown
  const bl = (u.blinkT || 0) > 0, sq = bl ? 1 : Math.max(0, E[2]), wide = Math.max(0, -E[2]);
  L.eyes.forEach(e => { e.lid.rotation.x += ((bl ? 0.05 : -2.2 + sq * 1.5) - e.lid.rotation.x) * Math.min(1, dt * 16); e.lid.visible = bl || sq > 0.05 || e.lid.rotation.x > -2.1; e.lo.visible = sq > 0.1; e.lo.rotation.x += ((bl ? 0 : 1.5 - sq * 0.5) - e.lo.rotation.x) * Math.min(1, dt * 16);
    e.e.scale.setScalar(1 + wide * 0.12); });
  L.brows.forEach((b, i) => { const s = i ? 1 : -1; b.position.y = 0.15 + E[1] * 0.04 + (m > 0.55 ? 0.01 : 0); b.rotation.z = Math.PI / 2 - s * (0.35 + E[3] * 0.4 - Math.min(0, E[1]) * 0.6); });
  // HEAD: curious tilt + slow bob
  L.H.rotation.z = Math.sin(t * 0.5) * 0.05 + (mood === 'curious' ? 0.22 : 0); L.H.position.y = 0.06 + Math.sin(t * 1.4) * 0.006;
}
