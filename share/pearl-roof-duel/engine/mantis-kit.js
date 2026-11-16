// s728cg PRAYING MANTIS AVATAR (Ben: a mantis with a good talking mouth; arms + legs adjusted for a mantis). Built ON the fox rig like the
// other species (outfit + gear + all anims kept; fox head / ears / tail hidden, fur → green chitin).
// HEAD: a wide TRIANGLE head on a slim neck, two big round-ended compound eyes at the top corners (pseudo-pupil dot that follows the camera
// look), 2 tiny ocelli, long thin antennae. MOUTH: a pale face shield (clypeus), a LABRUM flap that lifts, two side MANDIBLES that swing
// apart, a dark mouth + pink tongue inside, two little palps that flick: all driven by the speech engine (u.mouth / u.mp).
// ARMS: RAPTORIAL forelegs: the paw is hidden and each forearm carries a spiked femur + a folding tibia blade with spines (snaps shut on a
// melee, rests folded in the "praying" pose). LEGS: slimmed, knobbly knee joints, a segmented tarsus foot with hooks + a pair of extra
// mid-legs on the body that step with the walk. Folded leathery wings + a long segmented abdomen (on P.tail).
export const MANTIS_LOOK = { chitin: '#6fb03a', dark: '#3f7a22', pale: '#d9e59a', eye: '#9ccc4a', pupil: '#1a2a10', wing: '#8cc45a', spine: '#2f4a1a' };
export function mantisize({ THREE, M, toon }, fox, look = {}) {
  const K = { ...MANTIS_LOOK, ...look }, u = fox.userData, P = u.P, Lf = (u.face && u.face.L) || {};
  const CH = toon(K.chitin), DK = toon(K.dark), PL = toon(K.pale), SP = toon(K.spine), INK = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const S = (r, w = 22, h = 16) => new THREE.SphereGeometry(r, w, h), V = (x, y, z) => new THREE.Vector3(x, y, z);
  const furC = [Lf.fur, Lf.paw, Lf.furDark].filter(Boolean).map(c => new THREE.Color(c).getHex());
  fox.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.color && furC.includes(o.material.color.getHex())) o.material = CH; });
  P.head.children.forEach(c => c.visible = false); P.tail.children.forEach(c => c.visible = false); if (P.ears) P.ears.forEach(e => e.visible = false);
  const seg = (a, b, r0, r1, mat, par, ol = 0.01) => { const d = b.clone().sub(a), l = d.length(), m = M(new THREE.CylinderGeometry(r1, r0, l, 10), mat, 0, 0, 0, par, ol); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m; };
  // ---- HEAD ----
  const H = new THREE.Group(); H.position.set(0, 0.04, 0.02); P.head.add(H);
  seg(V(0, -0.42, -0.08), V(0, -0.1, 0), 0.075, 0.06, CH, H);   // slim neck (prothorax)
  const triG = (() => { const g = S(0.3, 36, 24), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = (y + 0.3) / 0.6; p.setX(i, x * (0.35 + 1.15 * k)); p.setY(i, y * 0.95 + (y < 0 ? y * 0.25 : 0)); p.setZ(i, z * (0.55 + 0.1 * k)); } g.computeVertexNormals(); return g; })();
  M(triG, CH, 0, 0.02, 0, H, 0.025, 0.3);
  // s728cn EYES (Ben: more expressive + a little scary): bigger eyes, a dark slit PUPIL (thin when stern / mean, round + big when surprised / happy /
  // sad), a glowing yellow rim round the pupil, a slanted dark BROW PLATE over each eye that angles down hard (scary) or lifts / tilts with mood,
  // upper + lower LIDS that squint (stern, smug) or widen (surprised).
  const eyes = [-1, 1].map(s => { const e = new THREE.Group(); e.position.set(s * 0.37, 0.15, 0.03); H.add(e); const ball = M(S(0.15, 28, 20), toon(K.eye, { emissive: new THREE.Color('#3a5a10'), emissiveIntensity: 0.4 }), 0, 0, 0, e, 0.022, 0.15); ball.scale.set(1.05, 1.15, 1);
    const pu = new THREE.Group(); e.add(pu); const glow = M(S(0.058, 16, 10), new THREE.MeshBasicMaterial({ color: 0xf4e23a }), 0, 0, 0.158, pu, 0); glow.scale.set(1, 1.25, 0.25); const dot = M(S(0.045, 14, 10), new THREE.MeshBasicMaterial({ color: 0x0c1206 }), 0, 0, 0.168, pu, 0); dot.scale.set(0.5, 1.3, 0.25);
    M(S(0.016, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), -0.045, 0.08, 0.14, e, 0);
    const lid = M(new THREE.SphereGeometry(0.172, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), CH, 0, 0, 0, e, 0); lid.scale.set(1.05, 1.15, 1); lid.rotation.x = -1.5;
    const lo = M(new THREE.SphereGeometry(0.17, 22, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), CH, 0, 0, 0, e, 0); lo.scale.set(1.05, 1.15, 1); lo.rotation.x = 1.5;
    const brow = new THREE.Group(); brow.position.set(0, 0.13, 0.09); e.add(brow); { const pts = []; for (let k = 0; k <= 8; k++) { const a = (k / 8 - 0.5) * 1.7; pts.push(V(Math.sin(a) * 0.13, Math.cos(a) * 0.035 - 0.02, Math.cos(a) * 0.04)); } const cv = new THREE.CatmullRomCurve3(pts); brow.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 16, 0.024, 8), DK)); brow.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 16, 0.031, 8), new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide })));
      const sp = M(new THREE.ConeGeometry(0.018, 0.07, 5), SP, s * 0.12, 0.02, 0.0, brow, 0.004); sp.rotation.z = -s * 0.9; }   /* a curved ridge over the front of the eye, a spike off the outer end */
    return { e, pu, dot, glow, lid, lo, brow, s }; });
  for (const x of [-0.05, 0, 0.05]) M(S(0.016, 8, 6), toon('#f0e890'), x, 0.2 + (x ? 0 : 0.03), 0.16, H, 0.004);   // ocelli
  const ants = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(s * 0.07, 0.2, 0.15); H.add(a); const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(V(s * t * 0.25, t * 0.55, t * 0.25 - t * t * 0.18)); } a.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.008, 5), DK)); return a; });
  // s728cn MOUTH (Ben: bigger): a wider face plate + labrum, BIG serrated MANDIBLES (curved hooks with 3 teeth each) that swing wide apart,
  // a big dark mouth with the pink tongue + a row of small teeth across the top, longer palps.
  const mo = new THREE.Group(); mo.position.set(0, -0.22, 0.12); mo.scale.setScalar(1.4); H.add(mo);
  // s728dx CLYPEUS (upper oval): pale, shaded (darker toward the rim + a soft centre ridge), a seam groove under it; LABRUM (lower oval): a
  // warmer, slightly darker olive-cream, a lip notch at the bottom, so the two plates read as separate pieces.
  { const g = S(0.12, 28, 18), p = g.attributes.position, col = [], c = new THREE.Color(), cP = new THREE.Color(K.pale), cR = new THREE.Color(K.pale).lerp(new THREE.Color(K.chitin), 0.45);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 0.12, y = p.getY(i) / 0.12, zz = p.getZ(i) / 0.12; const rim = Math.min(1, Math.max(0, (Math.hypot(x, y * 1.2) - 0.45) / 0.55)), ridge = Math.exp(-((x / 0.12) ** 2)) * Math.max(0, zz) * 0.25;
      c.copy(cP).lerp(cR, rim * rim * 0.8).lerp(new THREE.Color('#ffffff'), ridge); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); M(g, toon('#ffffff', { vertexColors: true }), 0, 0.1, 0.03, mo, 0.012, 0.12).scale.set(1.25, 0.65, 0.55); }
  { const sp = []; for (let k = 0; k <= 12; k++) { const t = k / 12 * 2 - 1; sp.push(V(t * 0.12, 0.045 + t * t * 0.02, 0.085 - t * t * 0.045)); } mo.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), 16, 0.0045, 5), new THREE.MeshBasicMaterial({ color: 0x3a4a1c }))); }   // seam groove
  const cav = M(S(0.1, 18, 12), toon('#1e080c'), 0, -0.03, 0.03, mo, 0); cav.scale.set(1.2, 0.01, 0.7);
  const tng = M(S(0.055, 14, 10), toon('#c8505a'), 0, -0.06, 0.05, mo, 0); tng.scale.set(1, 0.4, 1); tng.visible = false;
  const tth = new THREE.Group(); mo.add(tth); for (let k = -3; k <= 3; k++) { const t = M(new THREE.ConeGeometry(0.011, 0.035, 5), toon('#f3eedc'), k * 0.027, 0.005, 0.085 - Math.abs(k) * 0.006, tth, 0); t.rotation.x = Math.PI; } tth.visible = false;
  const lab = new THREE.Group(); lab.position.set(0, 0.04, 0.07); mo.add(lab); M(S(0.08, 20, 14), toon('#c4c46a'), 0, -0.035, 0.0, lab, 0.012, 0.08).scale.set(1.2, 0.6, 0.5); { const n = M(new THREE.CapsuleGeometry(0.004, 0.022, 3, 6), new THREE.MeshBasicMaterial({ color: 0x4a4a1c }), 0, -0.07, 0.038, lab, 0); n.rotation.x = 0.4; }   /* labrum: warmer + darker, a lip notch */
  const mand = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.08, -0.02, 0.04); mo.add(g); const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(V(s * (0.02 - t * 0.09 * Math.sin(t * Math.PI * 0.9)), -t * 0.17, 0.02 + t * 0.05)); }
    const cv = new THREE.CatmullRomCurve3(pts); const tb = new THREE.Mesh(new THREE.TubeGeometry(cv, 16, 0.024, 8), DK); g.add(tb); const ti = new THREE.Mesh(new THREE.TubeGeometry(cv, 16, 0.03, 8), new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide })); g.add(ti);
    for (let k = 0; k < 3; k++) { const p = cv.getPointAt(0.35 + k * 0.2), t = M(new THREE.ConeGeometry(0.012, 0.04, 5), toon('#e8e2c8'), p.x - s * 0.02, p.y, p.z, g, 0); t.rotation.z = s * 1.4; }
    const tip = cv.getPointAt(1), hk = M(new THREE.ConeGeometry(0.02, 0.06, 6), SP, tip.x, tip.y - 0.01, tip.z, g, 0.004); hk.rotation.z = -s * 0.6; hk.rotation.x = Math.PI; return g; });
  const palps = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.14, -0.04, 0.02); mo.add(g); seg(V(0, 0, 0), V(s * 0.05, -0.09, 0.03), 0.013, 0.011, PL, g, 0.004); seg(V(s * 0.05, -0.09, 0.03), V(s * 0.04, -0.17, 0.06), 0.011, 0.008, PL, g, 0.004); return g; });
  // ---- RAPTORIAL ARMS: hide the paw, add a spiked femur + a folding tibia blade on each hand ----
  const claws = (P.hands || []).map((h0, i) => { const h = h0 && (h0.isObject3D ? h0 : h0.g); if (!h) return null; h.traverse(c => { if (c.isMesh) c.visible = false; }); if (h0.fingers) h0.fingers.forEach(f => [f.a, f.b].forEach(q => q && q.traverse(c => { if (c.isMesh) c.visible = false; }))); if (h0.th) h0.th.traverse(c => { if (c.isMesh) c.visible = false; }); const s = i ? -1 : 1, fo = (P.fore && P.fore[i]) || h, g = new THREE.Group(); fo.add(g); if (fo !== h) { const hp = new THREE.Vector3(); h.getWorldPosition(hp); fo.worldToLocal(hp); g.position.copy(hp); g.position.y += 0.06; } g.rotation.x = -2.45; g.scale.setScalar(1.6);   /* s728cj the femur points UP in front of the chest, the blade folds down onto it (the praying pose) */   /* s728ci on the FOREARM (the hand is hidden) */
    seg(V(0, 0.04, 0), V(0, -0.26, 0.06), 0.05, 0.035, CH, g, 0.012);   // femur
    for (let k = 0; k < 5; k++) { const sp = M(new THREE.ConeGeometry(0.012, 0.05 + (k % 2) * 0.02, 5), SP, 0, -0.03 - k * 0.05, 0.05 + k * 0.012, g, 0); sp.rotation.x = 1.2; }
    const tib = new THREE.Group(); tib.position.set(0, -0.26, 0.06); g.add(tib); seg(V(0, 0, 0), V(0, 0.18, 0.05), 0.03, 0.018, DK, tib, 0.01);
    for (let k = 0; k < 4; k++) { const sp = M(new THREE.ConeGeometry(0.009, 0.035, 5), SP, 0, 0.03 + k * 0.04, 0.0 + k * 0.012, tib, 0); sp.rotation.x = -1.1; }
    const hook = M(new THREE.ConeGeometry(0.015, 0.07, 6), SP, 0, 0.2, 0.07, tib, 0.004); hook.rotation.x = -0.6; tib.rotation.x = 2.75; return { g, tib, s }; });
  // ---- LEGS: slim + knobbly, a segmented tarsus with hooks; 2 extra mid-legs on the body ----
  (P.legs || []).forEach(lg => { lg.traverse(o => { if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.radius > 0.07 && o.material === CH) o.scale.x = o.scale.z = Math.min(o.scale.x, 0.7); });
    let foot = null; lg.traverse(o => { if (o.isMesh && (!foot || o.getWorldPosition(V(0, 0, 0)).y < foot.getWorldPosition(V(0, 0, 0)).y)) foot = o; });
    if (foot) { const par = foot.parent, y = foot.position.y - 0.02; for (let k = 0; k < 3; k++) M(S(0.028 - k * 0.004, 10, 8), DK, 0, y, foot.position.z + 0.1 + k * 0.055, par, 0.006); const hk = M(new THREE.ConeGeometry(0.012, 0.05, 5), SP, 0, y - 0.01, foot.position.z + 0.27, par, 0); hk.rotation.x = Math.PI / 2 + 0.6; } });
  const body = P.head.parent, mids = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.3, 0.95, -0.12); body.add(g);
    const kn = V(s * 0.38, 0.12, -0.05), ft = V(s * 0.55, -0.9, 0.05); seg(V(0, 0, 0), kn, 0.035, 0.028, CH, g); M(S(0.035, 10, 8), DK, kn.x, kn.y, kn.z, g, 0.006); seg(kn, ft, 0.026, 0.016, CH, g); M(S(0.022, 8, 6), DK, ft.x, ft.y, ft.z, g, 0.004); return { g, s }; });
  // ---- WINGS folded on the back + long segmented ABDOMEN ----
  const wings = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.06, 1.35, -0.26); g.rotation.set(0.25, 0, -s * 0.06); body.add(g); const w = M(S(0.16, 18, 12), toon(K.wing, { transparent: true, opacity: 0.92 }), 0, -0.38, -0.02, g, 0.008); w.scale.set(0.9, 2.6, 0.12); return g; });
  const ab = new THREE.Group(); ab.rotation.x = 0.35; ab.scale.setScalar(0.85); P.tail.add(ab); const abSeg = []; { let par = ab; for (let k = 0; k < 6; k++) { const g = new THREE.Group(); g.position.z = k ? -0.12 : 0; par.add(g); const r = 0.12 - Math.abs(k - 2) * 0.012; M(S(r, 16, 12), k % 2 ? DK : CH, 0, 0, -0.06, g, 0.012, r).scale.set(1.15, 0.85, 1); g.rotation.x = 0.08; abSeg.push(g); par = g; } }
  const L = { H, eyes, ants, mo, cav, tng, tth, lab, mand, palps, claws, mids, wings, abSeg, t: 0, snap: 0 }; L.THREE = THREE; L.grad = CH.gradientMap; u.mantis = L; u.isMantis = true; fox.updateMatrixWorld(true); return L;
}
// s728da MANTIS WEAPONS (Ben): no sword or laser (his arms can't hold them). 1 MELEE = SCYTHE ARMS: armoured blades on his own claws;
// tap = a snap strike (claws alternate, the punch-combo arm swing underneath), hold = the blades UNFOLD forward + glow (the "draw"), the power
// swing snaps both. 2 RANGE = WRIST DART LAUNCHER on his right forearm: a strapped tube + venom vial, fires green stinger darts.
// Installs itself on the fighter rig (u.rig) the first frame it exists; the rig's sword, laser, sheath, strap + holster are hidden.
let SFXm = null; import('./fighter-sfx.js?v=s695c').then(m => { SFXm = m.SFX; }).catch(() => {});
function mantisGear(fox, L) {
  const u = fox.userData, G = u.rig, P = u.P, THREE = L.THREE; if (!G || !THREE) return; if (typeof window !== 'undefined') window.__mantis = fox; L.gear = { out: 0, want: false, chg: 0, alt: 0, darts: [], snaps: [0, 0] };
  const T = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: L.grad, ...o }), ARM = T('#f3f4f6'), ACC = T('#38bdf8', { emissive: new THREE.Color('#38bdf8'), emissiveIntensity: 0.4 });
  const BL = T('#dfe7ef', { emissive: new THREE.Color('#5ff0ff'), emissiveIntensity: 0 }); L.gear.bl = BL; const INK = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide });
  const ink = (m, k = 0.006) => { const o = new THREE.Mesh(m.geometry, INK); o.scale.setScalar(1 + k / 0.03); m.add(o); return m; };
  // scythe blade: a crescent, edge toward the spines (+z), lying in the tibia's YZ plane
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(-0.035, 0.17, 0.03, 0.34); sh.quadraticCurveTo(0.1, 0.17, 0.035, 0); sh.lineTo(0, 0);
  const bg = new THREE.ExtrudeGeometry(sh, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 14 }); bg.translate(0, 0, -0.007);
  L.claws.forEach((c, i) => { if (!c) return; const b = new THREE.Mesh(bg, BL); b.rotation.y = -Math.PI / 2; b.position.set(0, 0.02, 0.03); c.tib.add(ink(b)); c.blade = b;
    const pl = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.18, 4, 10), ARM); pl.position.set(0, -0.12, -0.012); pl.rotation.x = 0.19; pl.scale.set(1.25, 1, 0.7); c.g.add(ink(pl));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.011, 6, 18), ACC); band.position.set(0, -0.05, 0.0); band.rotation.x = Math.PI / 2 + 0.19; c.g.add(band); });
  // wrist dart launcher on the right forearm (arms[0] = right)
  const fo = (P.fore && P.fore[0]) || (P.arms && P.arms[0]); if (fo) { const hp = new THREE.Vector3(); const h0 = P.hands && P.hands[0]; const h = h0 && (h0.isObject3D ? h0 : h0.g); if (h) { fox.updateMatrixWorld(true); h.getWorldPosition(hp); fo.worldToLocal(hp); } else hp.set(0, -0.35, 0);
    const W = new THREE.Group(); W.position.copy(hp).multiplyScalar(0.55); W.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hp.clone().normalize()); fo.add(W); L.gear.W = W;
    const off = new THREE.Group(); off.position.set(-0.085, 0, 0.02); W.add(off);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.26, 12), T('#3b4250')); off.add(ink(tube));
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.05, 12), ARM); tip.position.y = 0.14; off.add(ink(tip));
    const vial = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.08, 4, 10), new THREE.MeshToonMaterial({ color: '#7cf04a', gradientMap: L.grad, emissive: new THREE.Color('#3fa010'), emissiveIntensity: 0.6 })); vial.position.set(-0.04, -0.02, 0.0); off.add(ink(vial)); L.gear.vial = vial;
    for (const y of [-0.08, 0.06]) { const st = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 18), T('#4a2f1c')); st.position.set(0.075, y, -0.02); st.rotation.x = Math.PI / 2; st.scale.set(1.1, 1, 0.8); off.add(st); }
    for (let k = 0; k < 3; k++) { const d = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.05, 6), T('#2f4a1a')); d.position.set(0.012 * (k - 1), 0.18, 0.0); off.add(d); }
    const muz = new THREE.Object3D(); muz.position.y = 0.2; off.add(muz); L.gear.muz = muz; }
  const DM = T('#2f4a1a'), GM = new THREE.MeshBasicMaterial({ color: 0x9cff5a, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  const oStrike = G.strike, oCharge = G.charge, oRelease = G.release, oShoot = G.shoot, oBolt = G.bolt;
  G.toggle = () => { L.gear.want = !L.gear.want; SFXm && SFXm.play(L.gear.want ? 'draw' : 'sheath'); return L.gear.want; };
  G.draw = on => { L.gear.want = on == null ? !L.gear.want : !!on; return L.gear.want; };
  G.strike = (...a) => { const r = oStrike.apply(G, a); const i = L.gear.alt++ % 2; L.gear.snaps[i] = 1; SFXm && SFXm.play('cut'); if (r && L.gear.out > 0.5) { r.reach = (r.reach || 1.9) * 1.25; r.k = (r.k || 0.45) * 1.4; r.kind = 'scythe'; } return r; };
  G.charge = () => { L.gear.want = true; L.gear.chg = 0.001; return true; };
  G.release = () => { const k = 1.6 + Math.min(1, L.gear.chg) * 1.4; L.gear.chg = 0; L.gear.snaps = [1, 1]; SFXm && SFXm.play('power'); return { k, reach: 2.6, kind: 'scythe' }; };
  G.shoot = (...a) => { const r = oShoot.apply(G, a); L.gear.gunT = 3; if (!L.gear.muz) return r; fox.updateMatrixWorld(true); L.gear.kick = 1; return L.gear.muz.getWorldPosition(new THREE.Vector3()); };
  G.bolt = (from, to, hit) => { const sc = fox.parent; if (!sc || !from) return; const d = to ? to.clone().sub(from) : new THREE.Vector3(Math.sin(fox.rotation.y), 0, Math.cos(fox.rotation.y)).multiplyScalar(16), len = d.length() || 1;
    const m = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.22, 6), DM); c.rotation.x = Math.PI / 2; m.add(c); const gl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), GM); gl.scale.set(1, 1, 2.6); gl.position.z = -0.08; m.add(gl);
    m.position.copy(from); m.lookAt(from.clone().add(d)); sc.add(m); L.gear.darts.push({ m, v: d.multiplyScalar(22 / len), life: Math.max(0.05, len / 22), sc }); };
}
function tickMantisGear(fox, L, dt) {
  const u = fox.userData, G = u.rig, P = u.P, Q = L.gear; if (!Q) return;
  [P.sword, P.gun, ...(G.parts || [])].forEach(o => { if (o) o.visible = false; });
  if (Q.chg > 0) Q.chg += dt; Q.out += ((Q.want ? 1 : 0) - Q.out) * Math.min(1, dt * 9); Q.snaps = Q.snaps.map(s => Math.max(0, s - dt * 3.2)); Q.kick = Math.max(0, (Q.kick || 0) - dt * 6);
  const glow = Q.out * (0.55 + 0.25 * Math.sin(L.t * 6)) + Math.min(1, Q.chg) * 1.2; Q.bl.emissiveIntensity = glow;
  if (Q.vial) Q.vial.material.emissiveIntensity = 0.5 + Q.kick * 1.5; if (Q.W) Q.W.position.y += 0;
  Q.gunT = Math.max(0, (Q.gunT || 0) - dt);
  for (let k = Q.darts.length - 1; k >= 0; k--) { const d = Q.darts[k]; d.m.position.addScaledVector(d.v, dt); d.m.rotateZ(dt * 14); d.life -= dt; if (d.life <= 0) { d.sc.remove(d.m); Q.darts.splice(k, 1); } }
}
export function tickMantis(fox, dt) {
  const u = fox.userData, L = u.mantis; if (!L) return; L.t += dt; if (u.rig && !L.gear) mantisGear(fox, L); if (L.gear) tickMantisGear(fox, L, dt); const t = L.t, mood = u.lineMood || u.mood, mp = u.mp || {};
  // MOUTH: mandibles swing apart, labrum lifts, cavity opens; M B P presses shut; wide / round change the gape
  const op = Math.min(1, (u.mouth || 0) * 1.3) * (1 - (mp.press || 0) * 0.85); L.m = (L.m || 0) + (op - (L.m || 0)) * Math.min(1, dt * 20); const m = L.m;
  const rest = mood === 'stern' || mood === 'determined' || mood === 'grumpy' ? 0.08 : 0, chomp = Math.max(0, Math.sin(t * 0.5) - 0.97) * 20;   /* scary: mandibles twitch apart now and then */
  L.mand.forEach((g, i) => { const s = i ? 1 : -1; g.rotation.z = s * (m * (0.7 + (mp.wide ?? 0.5) * 0.4 - (mp.round || 0) * 0.3) + rest + chomp * 0.25 + Math.sin(t * 7) * 0.02); g.rotation.x = -m * 0.2; });
  L.lab.rotation.x = -m * 0.8; L.cav.scale.set(1 + (mp.wide ?? 0.5) * 0.5, Math.max(0.01, m * 1.6), 0.7); L.cav.position.y = -0.03 - m * 0.05; L.tth.position.y = -m * 0.01; L.tng.visible = m > 0.1; L.tng.position.y = -0.06 + (mp.tongue || 0) * 0.04; L.tth.visible = m > 0.15;
  L.palps.forEach((g, i) => { g.rotation.z = (i ? 1 : -1) * (Math.sin(t * 9 + i) * 0.12 * (m > 0.1 ? 1 : 0.3) + m * 0.3); g.rotation.x = Math.sin(t * 6 + i * 2) * 0.15; });
  // EYES: pseudo-pupil follows the look; lids blink; antennae sweep + perk with mood + flick on the ear timer
  const bl = (u.blinkT || 0) > 0, E = { neutral: [0.55, -0.35, 0.15, 0], happy: [1, 0.1, 0.05, 0.1], excited: [1.15, 0.25, 0, 0], surprised: [1.4, 0.45, 0, -0.1], shock: [1.5, 0.5, 0, -0.1], sad: [1.1, -0.1, 0.25, 0.45], stern: [0.35, -0.6, 0.45, 0], determined: [0.4, -0.55, 0.35, 0], grumpy: [0.35, -0.6, 0.5, 0], smug: [0.4, -0.3, 0.55, 0.15], curious: [0.9, 0.1, 0.05, -0.2], nervous: [1.1, 0.2, 0.1, 0.35] }[mood] || [0.55, -0.35, 0.15, 0];   /* [pupil width, brow (+ up / - angry), lid squint, brow tilt] */
  L.eyes.forEach(e => { e.pu.rotation.y = (u.look || 0) * 0.35 + e.s * 0.05; e.pu.rotation.x = -(u.lookY || 0) * 0.3; const pw = E[0] * (m > 0.3 ? 1.1 : 1); e.dot.scale.x += (0.5 * pw - e.dot.scale.x) * Math.min(1, dt * 8); e.glow.scale.x = 0.7 + pw * 0.35;
    const sq = bl ? 1 : E[2]; e.lid.rotation.x += ((bl ? 0 : -1.5 + sq * 0.9) - e.lid.rotation.x) * Math.min(1, dt * 14); e.lo.rotation.x += ((bl ? 0 : 1.5 - sq * 0.5) - e.lo.rotation.x) * Math.min(1, dt * 14); e.lo.visible = bl || sq > 0.1; e.lid.visible = bl || sq > 0.02 || e.lid.rotation.x > -1.45;   /* s728cq hidden when not squinting (no z-fight on the eye) */
    const by = E[1] + (m > 0.55 ? 0.15 : 0); e.brow.position.y += (0.13 + by * 0.05 - e.brow.position.y) * Math.min(1, dt * 10); e.brow.rotation.z += ((e.s * (by * 0.6) + e.s * E[3] * 0.6) - e.brow.rotation.z) * Math.min(1, dt * 10);   /* inner end DOWN = angry (scary), up = worried */ });
  const tw = (u.twK || 0) > 0 ? Math.sin((u.twK / 0.28) * Math.PI) : 0, perk = mood === 'surprised' || mood === 'curious' || mood === 'excited' ? -0.35 : mood === 'sad' ? 0.5 : 0;
  L.ants.forEach((a, i) => { a.rotation.x = perk + Math.sin(t * 1.3 + i) * 0.12 - (u.twE === i ? tw * 0.5 : 0); a.rotation.z = (i ? -1 : 1) * (Math.sin(t * 0.9 + i * 2) * 0.1 + m * 0.1); });
  // HEAD: the mantis head tilt (curious tilt + a slow swivel)
  L.H.rotation.z = Math.sin(t * 0.6) * 0.08 + (mood === 'curious' ? 0.28 : 0); L.H.rotation.y = Math.sin(t * 0.37) * 0.1;
  // CLAWS: rest folded ("praying"), snap open-shut on a melee strike (u.atk / arm swing), a little twitch now and then
  const atk = u.attackT > 0 || u.swing > 0 || (u.melee && u.melee > 0); L.snap = Math.max(0, L.snap - dt * 4); if (atk) L.snap = 1;
  L.claws.forEach((c, i) => { if (!c) return; const tw2 = Math.max(0, Math.sin(t * 0.8 + i * 2.4) - 0.96) * 6; const Q = L.gear, out = Q ? Q.out : 0, ph = Q ? Math.min(1, Q.snaps[i]) : 0, k = 1 - ph, sn = Q ? Math.sin(ph * Math.PI) : L.snap;
    /* s728de measured: tib 0.3 = FOLDED back onto the femur, 2.9 = fully OPEN. Idle = folded (praying); drawn = half open; strike = OPEN, SNAP shut, back */
    const rest = 0.55 + out * 1.2 + (Q ? Math.min(1, Q.chg) * 0.3 : 0) + tw2 * 0.3 * (1 - out) + m * 0.1, lerp = (p, q, e) => p + (q - p) * e;
    c.tib.rotation.x = !Q || ph <= 0 ? (Q ? rest : 0.55 + L.snap * 2.2 + tw2 * 0.3) : k < 0.45 ? lerp(rest, 2.9, k / 0.45) : k < 0.7 ? lerp(2.9, 0.55, (k - 0.45) / 0.25) : lerp(0.55, rest, (k - 0.7) / 0.3); c.g.rotation.x = -1.15 + out * 0.4 + sn * 1.15;   /* s728de measured: -1.4 = femur stands UP from the forward forearm (praying); a strike swings it to 0 = straight along the arm */   /* s728de idle: femur stands UP in front of the chest, blade folded down (praying) */   /* s728dc on a strike the femur swings to point ALONG the punching arm (blade leads, not trailing back at the mantis) */ });
  // s728de ARMS (Ben: more natural idle + swing further): IDLE = the praying pose (upper arms a little forward + tucked in, forearms bent up,
  // claws held in front of the chest, a slow breathe + sway). STRIKE = a big 3-beat lash: COCK back high, WHIP forward fully extended
  // (shoulder rolls in, body leans), RECOIL back to praying. Laser arm is left to the rig while aiming.
  const P = u.P; if (P && P.arms && P.fore) { L.armS = L.armS || [0, 1].map(() => ({ ux: -0.5, uz: 0, fx: -1.7 })); const Q2 = L.gear, ph0 = u.P; void ph0;
    let lean = 0;
    for (let i = 0; i < 2; i++) { const a = P.arms[i], f = P.fore[i]; if (!a || !f) continue; if (i === 0 && Q2 && Q2.gunT > 0) continue; const s = i ? -1 : 1, A = L.armS[i];
      const br = Math.sin(t * 1.3 + i * 0.6) * 0.05, out = Q2 ? Q2.out : 0;
      let ux = -0.7 - out * 0.25 + br, uz = s * 0.3, fx = -0.55 - out * 0.15 - br * 0.6, rate = 14;   /* s728dg idle: arms further forward + wider so the folded blades clear the chest */   /* forearm reaches forward-low like a mantis coxa; the claw's femur stands up from it */
      const sp = Q2 ? Math.min(1, Q2.snaps[i]) : 0, k = 1 - sp;   // k: 0 → 1 over the strike
      if (sp > 0) { if (k < 0.18) { const e = k / 0.18; ux = -0.7 - e * 1.2; uz = s * (0.3 - e * 0.2); fx = -0.55 - e * 1.5; rate = 26; }   // cock back high
        else if (k < 0.45) { const e = Math.min(1, (k - 0.18) / 0.2); ux = -1.9 + e * 0.95; uz = s * (0.1 + e * 0.05); fx = -2.05 + e * 2.05; rate = 40; lean = Math.max(lean, e); }   // whip forward, arm straight
        else { const e = (k - 0.45) / 0.55; ux = -0.95 + e * 0.25; uz = s * (0.15 + e * 0.15); fx = 0 - e * 0.55; rate = 12; lean = Math.max(lean, 1 - e); } }   // recoil
      const r = Math.min(1, dt * rate); A.ux += (ux - A.ux) * r; A.uz += (uz - A.uz) * r; A.fx += (fx - A.fx) * r;
      a.rotation.set(A.ux, 0, A.uz); f.rotation.set(A.fx, 0, 0); }
    }
  // MID LEGS step with the walk (the fox's own leg swing)
  const lp = P0(u); L.mids.forEach((g, i) => { g.g.rotation.x = -lp * (i ? 1 : -1) * 0.8; g.g.rotation.z = g.s * 0.05 * Math.sin(t * 1.5); });
  // ABDOMEN sways, wings breathe
  L.abSeg.forEach((g, k) => { if (k) g.rotation.y = Math.sin(t * 1.2 - k * 0.5) * 0.06; }); L.wings.forEach((g, i) => { g.rotation.z = (i ? 1 : -1) * (-0.06 + Math.sin(t * 1.1) * 0.015); });
}
function P0(u) { const lg = u.P && u.P.legs && u.P.legs[0]; return lg ? lg.rotation.x : 0; }
