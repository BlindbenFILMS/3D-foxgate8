// s728l FLY AVATAR (Ben: an avatar that is a FLY, same body, fly wings + fly head). Built ON the fox rig like lizard-kit.js:
// body / outfit / gear kept, fur → dark chitin, fox head parts + ears + tail hidden; a fly head on P.head, wings on the back.
// Head: big red COMPOUND eyes (faceted), a fuzzy black face, two short antennae (aristae), a sponge-tipped PROBOSCIS that dabs down
// on the fox ear-twitch timer (same rhythm as the lizard tongue). Wings: two clear veined wings that buzz in bursts (a blur disc) + rest folded back.
export const FLY_LOOK = { chitin: '#2b2d33', chitinHi: '#4a5568', eye: '#c0261c', eyeHi: '#ff6a4a', wing: '#cfe6f5', vein: '#3b4352', mouth: '#5a4a3a', hair: '#111216' };
export function flyize({ THREE, M, toon }, fox, look = {}) {
  const F = { ...FLY_LOOK, ...look }, u = fox.userData, P = u.P, Lf = (u.face && u.face.L) || {};
  const CH = toon(F.chitin, { emissive: new THREE.Color('#123a44'), emissiveIntensity: 0.35 }), HI = toon(F.chitinHi), GLD = toon('#d8c48a', { emissive: new THREE.Color('#5a4a20'), emissiveIntensity: 0.3 }), MO = toon(F.mouth), HR = toon(F.hair);
  const S = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
  const furC = [Lf.fur, Lf.paw, Lf.furDark].filter(Boolean).map(c => new THREE.Color(c).getHex());
  fox.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.color && furC.includes(o.material.color.getHex())) o.material = CH; });
  P.head.children.forEach(c => c.visible = false); P.tail.children.forEach(c => c.visible = false); if (P.ears) P.ears.forEach(e => e.visible = false);
  // COMPOUND EYE texture: a hex facet grid with a soft highlight
  const eyeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = F.eye; g.fillRect(0, 0, 256, 256);
    const rim = g.createRadialGradient(128, 128, 60, 128, 128, 140); rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, 'rgba(40,0,0,0.6)'); g.fillStyle = rim; g.fillRect(0, 0, 256, 256); const r = 6.5, h = r * Math.sqrt(3); for (let y = 0, row = 0; y < 270; y += h / 2 + r * 0.38, row++) for (let x = (row % 2) * r * 1.5; x < 270; x += r * 3) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.strokeStyle = 'rgba(40,0,0,0.55)'; g.lineWidth = 1.6; g.stroke(); g.fillStyle = 'rgba(255,120,90,0.18)'; g.fill(); }
    const hl = g.createRadialGradient(90, 80, 4, 90, 80, 70); hl.addColorStop(0, 'rgba(255,255,255,0.7)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hl; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const EYE = new THREE.MeshToonMaterial({ map: eyeTex, emissive: new THREE.Color(F.eye), emissiveIntensity: 0.15 });
  const H = new THREE.Group(); H.position.set(0, -0.04, 0.02); P.head.add(H);
  const sk = M(S(0.3, 24, 18), CH, 0, 0, 0, H, 0.035, 0.3); sk.scale.set(1.05, 0.95, 0.9);
  const eyes = [-1, 1].map(s => { const e = M(S(0.25, 28, 20), EYE, s * 0.24, 0.04, 0.1, H, 0.03, 0.25); e.scale.set(0.9, 1.05, 1); e.rotation.y = s * 0.5;
    const sp = new THREE.Mesh(new THREE.CircleGeometry(0.05, 14), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false })); sp.position.set(-s * 0.05, 0.13, 0.2); sp.scale.set(1.4, 0.8, 1); sp.lookAt(sp.position.clone().add(new THREE.Vector3(-s * 0.2, 0.6, 1))); e.add(sp);
    const sp2 = new THREE.Mesh(new THREE.CircleGeometry(0.018, 10), sp.material); sp2.position.set(-s * 0.1, 0.06, 0.225); e.add(sp2); return e; });
  // face plate between the eyes, three little ocelli on top, bristles
  const face = M(S(0.14, 16, 12), HI, 0, -0.06, 0.24, H, 0.02, 0.14); face.scale.set(0.9, 1.2, 0.7);
  { const st = M(S(0.1, 14, 10), GLD, 0, 0.05, 0.27, H, 0); st.scale.set(0.28, 1.1, 0.35); st.rotation.x = -0.3; } for (const s of [-1, 1]) M(S(0.05, 10, 8), GLD, s * 0.08, -0.12, 0.27, H, 0.006).scale.set(0.7, 1.3, 0.5);
  { const hair = toon(F.hair); for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2, b = M(new THREE.ConeGeometry(0.018, 0.11, 4), hair, Math.cos(a) * 0.2, -0.27, Math.sin(a) * 0.17, H, 0); b.rotation.set(Math.sin(a) * 1.9, 0, -Math.cos(a) * 1.9); } M(new THREE.TorusGeometry(0.19, 0.05, 8, 22), hair, 0, -0.27, 0, H, 0.006).rotation.x = Math.PI / 2;
    for (let k = 0; k < 7; k++) { const b = M(new THREE.CylinderGeometry(0.003, 0.009, 0.12, 4), hair, (k - 3) * 0.05, 0.14, -0.22, H, 0); b.rotation.x = -1.0 - Math.abs(k - 3) * 0.05; b.rotation.z = (k - 3) * 0.12; } }
  for (const [x, z] of [[0, 0.06], [-0.04, 0], [0.04, 0]]) M(S(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb08a }), x, 0.29, z, H, 0);
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, b = M(new THREE.CylinderGeometry(0.004, 0.008, 0.1, 4), HR, Math.cos(a) * 0.18, 0.24 + Math.sin(a) * 0.03, -0.05 + Math.sin(a) * 0.12, H, 0); b.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); }
  // antennae: a short club with a feathery arista
  const ants = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(s * 0.05, 0.06, 0.3); H.add(a); const c = M(new THREE.CapsuleGeometry(0.022, 0.07, 4, 8), CH, 0, 0.04, 0.02, a, 0.008); c.rotation.x = 0.6; const ar = M(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 4), HR, s * 0.03, 0.12, 0.06, a, 0); ar.rotation.z = -s * 0.7; a.rotation.z = -s * 0.25; return a; });
  // PROBOSCIS: a jointed tube under the face, sponge pad at the tip, dabs down + out
  const pb = new THREE.Group(); pb.position.set(0, -0.18, 0.2); H.add(pb); M(new THREE.CylinderGeometry(0.045, 0.06, 0.14, 10), HI, 0, -0.06, 0, pb, 0.012);
  const pb2 = new THREE.Group(); pb2.position.y = -0.13; pb.add(pb2); M(new THREE.CylinderGeometry(0.035, 0.045, 0.14, 10), MO, 0, -0.07, 0, pb2, 0.01);
  const pad = M(S(0.06, 12, 8), MO, 0, -0.15, 0.01, pb2, 0.01); pad.scale.set(1.3, 0.55, 1.1); for (const s of [-1, 1]) M(S(0.035, 8, 6), MO, s * 0.05, -0.15, 0.02, pb2, 0).scale.set(1, 0.6, 1);
  pb.rotation.x = 0.55; pb2.rotation.x = -1.1;
  const palps = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.07, -0.17, 0.24); H.add(p); M(new THREE.CapsuleGeometry(0.02, 0.09, 4, 8), HI, 0, -0.05, 0, p, 0.008); M(S(0.026, 8, 6), MO, 0, -0.11, 0, p, 0.006); p.rotation.z = s * 0.25; return p; });   /* s728ao palps beside the proboscis: they flap when he talks */
  // WINGS on the back of the body: clear membrane + veins, a bit of rainbow, a buzz blur disc
  const body = P.head.parent, wingTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 128, 256); gr.addColorStop(0, 'rgba(207,230,245,0.55)'); gr.addColorStop(0.5, 'rgba(220,200,255,0.4)'); gr.addColorStop(1, 'rgba(200,245,230,0.5)'); g.fillStyle = gr; g.beginPath(); g.ellipse(64, 128, 60, 124, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = F.vein; g.lineWidth = 3; g.beginPath(); g.ellipse(64, 128, 60, 124, 0, 0, Math.PI * 2); g.stroke(); g.lineWidth = 2.2; for (const [x0, x1] of [[60, 20], [62, 50], [64, 82], [66, 108]]) { g.beginPath(); g.moveTo(x0, 10); g.quadraticCurveTo((x0 + x1) / 2, 130, x1, 240); g.stroke(); } g.lineWidth = 1.5; for (const y of [90, 160]) { g.beginPath(); g.moveTo(20, y); g.lineTo(108, y + 12); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const WM = new THREE.MeshBasicMaterial({ map: wingTex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const BM = new THREE.MeshBasicMaterial({ color: F.wing, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const wings = [-1, 1].map(s => { const root = new THREE.Group(); root.position.set(s * 0.14, 1.45, -0.46); body.add(root);
    M(S(0.05, 8, 6), CH, 0, 0, 0, root, 0.01); const w = new THREE.Group(); root.add(w); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.1), WM); m.position.y = -0.5; m.renderOrder = 3; m.rotation.x = 0; w.add(m);
    const blur = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24, Math.PI * 0.95, Math.PI * 0.9), BM); blur.rotation.y = Math.PI / 2; root.add(blur);
    const hal = new THREE.Group(); hal.position.set(s * 0.1, 1.28, -0.4); body.add(hal); M(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 5), CH, 0, -0.05, 0, hal, 0); M(S(0.025, 8, 6), GLD, 0, -0.1, 0, hal, 0.005); hal.rotation.z = s * 0.4;
    return { root, w, s, blur, hal }; });
  const L = { H, eyes, ants, pb, pb2, pad, palps, wings, BM, dab: 0, buzz: 0, buzzT: 2, t: 0 }; u.fly = L; u.isFly = true; fox.updateMatrixWorld(true); return L;
}
export function tickFly(fox, dt) {
  const u = fox.userData, L = u.fly; if (!L) return; L.t += dt; const t = L.t, mood = u.lineMood || u.mood;
  // PROBOSCIS dab on the fox ear-twitch timer (rising edge of u.twK), like the lizard tongue
  const tw = u.twK || 0, rise = tw > (L.tw0 || 0) + 1e-4; L.tw0 = tw; if (rise && L.dab <= 0) L.dab = 0.55;
  let d = 0; if (L.dab > 0) { L.dab -= dt; d = Math.sin((1 - L.dab / 0.55) * Math.PI); }
  L.mo = (L.mo || 0) + (Math.min(1, (u.mouth || 0) * 1.2) - (L.mo || 0)) * Math.min(1, dt * 22); const tk = L.mo, mo = Math.max(d, tk * 0.8); L.pb.rotation.x = 0.55 - mo * 0.55; L.pb2.rotation.x = -1.1 + mo * 1.05; L.pad.scale.set(1.3 + tk * 0.5, 0.55 - tk * 0.2, 1.1 + tk * 0.3);
  const mp = u.mp || {}, sh = { wide: mp.wide ?? 0.5, round: mp.round || 0, tongue: mp.tongue || 0, press: mp.press || 0, smile: mp.smile || 0 };   /* s728ap viseme shape from the fox speech engine */
  L.palps.forEach((p, i) => { const s = i ? 1 : -1; p.rotation.z = s * (0.25 + tk * (0.4 + sh.wide * 0.6 - sh.round * 0.4)); p.rotation.x = -tk * 0.4 - sh.press * 0.3; }); L.pad.scale.y *= 1 - sh.press * 0.35;
  L.talkE = Math.max((L.talkE || 0) - dt * 3, tk > 0.55 ? 1 : 0);
  // head: little twitchy insect head turns
  L.twH = (L.twH ?? 1) - dt; if (L.twH < 0) { L.twH = 0.4 + Math.random() * 1.6; L.hy = (Math.random() - 0.5) * 0.5; L.hz = (Math.random() - 0.5) * 0.3; } L.H.rotation.y += ((L.hy || 0) - L.H.rotation.y) * Math.min(1, dt * 25); L.H.rotation.z += ((L.hz || 0) - L.H.rotation.z) * Math.min(1, dt * 25);
  const perk = mood === 'happy' || mood === 'excited' || mood === 'surprised' || mood === 'curious' ? -0.45 : mood === 'sad' ? 0.6 : mood === 'stern' || mood === 'determined' ? 0.15 : 0;
  L.ants.forEach((a, i) => { a.rotation.x += ((perk - (L.talkE || 0) * 0.3 + Math.sin(t * 3 + i * 1.7) * 0.15 + (L.mo || 0) * Math.sin(t * 16 + i) * 0.18) - a.rotation.x) * Math.min(1, dt * 8); a.rotation.y = Math.sin(t * 2.3 + i) * 0.12; });
  // WINGS: folded back at rest with a little shiver; buzz in bursts (faster + longer when lively)
  const lively = mood === 'happy' || mood === 'excited'; L.buzzT -= dt; if (L.buzzT < 0 && L.buzz <= 0) { L.buzz = lively ? 1.4 : 0.7; L.buzzT = lively ? 1.5 + Math.random() * 2 : 3 + Math.random() * 4; }
  const bz = L.buzz > 0; if (bz) L.buzz -= dt; L.BM.opacity += ((bz ? 0.28 : 0) - L.BM.opacity) * Math.min(1, dt * 14);
  L.lift = (L.lift || 0) + (((L.buzz > 0) ? 0.14 : 0) - (L.lift || 0)) * Math.min(1, dt * 5); fox.position.y = L.lift + (L.buzz > 0 ? Math.sin(t * 30) * 0.008 : 0);   /* hover while buzzing (the workshop stands him at y 0) */
  L.wings.forEach(w => { if (w.hal) w.hal.rotation.x = L.buzz > 0 ? Math.sin(t * 90 + 1.5) * 0.9 : 0; const flap = bz ? Math.sin(t * 90) * 0.9 : Math.sin(t * 6 + w.s) * 0.03; w.root.rotation.set(bz ? -0.25 : 0.25, w.s * (bz ? 0.9 + flap : 0.35), w.s * (bz ? 0.1 : 0.32)); w.w.visible = !bz || Math.random() < 0.5; });
}
