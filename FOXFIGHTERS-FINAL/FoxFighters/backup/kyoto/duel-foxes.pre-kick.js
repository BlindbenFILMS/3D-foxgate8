// 8 GATES — PEARL SAIL · ROOF DUEL: the cast fox (BEN) as a duel fighter + SUDS-9 · THE WINDOW CLEANER (roof boss robot).
// Used by sword-duel.js only when opts.pearl is set (Kyoto stays as it was).
//  · foxFighter(ctx)  → Ben from engine/cast.js (never restyled) with a POSE ADAPTER: the duel's human IK targets (hands / feet / hip / lean …,
//    root space, faces +z, left = +x) are turned into rotations of the fox-kit parts (arms, legs, body, head). The fox sword is lifted off the arm
//    so the duel can hold it like the katana (pos = the sword paw, rotation.x = P.blade). The laser gun stays on the near arm.
//  · makeSuds9(ctx)   → the dark-grey robot (box head, angry eyes pulsing deep red → red, red band, blue soap tank, long squeegee pole,
//    soap nozzle arm, yellow beacon) + sudsPoseOf(f, S) (pose from the fighter state) + upd(P, dt, f) (puts the pose on the model,
//    drives the roof car / gondola rig and the JUMP / DUCK warning strips).
import { castKit } from '../../engine/cast.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ss = t => t * t * (3 - 2 * t), lerp = (a, b, t) => a + (b - a) * t;
// a fake "human L" whose numbers land the duel's pose targets on the fox's joints (fox ≈ 2.0 m to the ear tips, shoulders 1.37 m, hips 0.75 m)
export const FOX_L = { H: 2.0, hipY: 0.75, torsoL: 0.667, footH: 0.05, shW: 0.42, uaL: 0.28, faL: 0.26, thL: 0.35, snL: 0.35 };
const FOX_MOOD = { angry: 'stern', happy: 'excited', sad: 'sad', surprised: 'surprised', determined: 'determined', stern: 'stern', neutral: 'determined' };

export function foxFighter({ THREE, kit, M, toon }, key = 'player') {
  const CK = castKit({ THREE, M, toon, makeFox: kit.makeFox }), g = CK.make(key); g.rotation.order = 'YXZ';
  const u = g.userData, FP = u.P, HY = FOX_L.hipY, DOWN = new THREE.Vector3(0, -1, 0);
  // the fox sword comes off the arm: the duel places it in the paw every frame (like the katana in the human fighters)
  const sw = FP.sword; sw.parent.remove(sw); g.add(sw); sw.scale.setScalar(0.85); const tip = new THREE.Object3D(); tip.position.y = 1.3; sw.add(tip); sw.userData.tip = tip;
  const gunTip = new THREE.Object3D(); if (FP.tipGlow) FP.tipGlow.parent.add(gunTip), gunTip.position.copy(FP.tipGlow.position);
  const R0 = { hip: [0, 0, 0], lean: 0, twist: 0, side: 0, yaw: 0, pitch: 0, hL: [0.42, 0.8, 0.1], hR: [-0.42, 0.8, 0.1], eL: [1, 1, 0], eR: [-1, 1, 0], fL: [0.14, 0.05, 0], fR: [-0.14, 0.05, 0], kL: [0.5, 0.4, 1], kR: [-0.5, 0.4, 1], fYawL: 0, fYawR: 0, blade: 0.95, mood: 'determined', mouth: 0, vis: 'a', gun: 0 };
  const _t = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _e = new THREE.Euler(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _hp = new THREE.Vector3(); let lastX = null;
  const toBody = a => _t.set(a[0], a[1], a[2]).applyMatrix4(_m);
  function aimArm(arm, a) { toBody(a); _s.copy(_t).sub(arm.position); if (_s.lengthSq() < 1e-6) return; arm.quaternion.setFromUnitVectors(DOWN, _s.normalize()); }
  function aimLeg(leg, a) { toBody([a[0], a[1] + 0.08, a[2]]); _s.copy(_t).sub(leg.position); const d = _s.length(); if (d < 1e-4) return; leg.quaternion.setFromUnitVectors(DOWN, _s.multiplyScalar(1 / d)); leg.scale.y = clamp(d / 0.42, 0.95, 1.62); }
  function upd(P, dt) { // P = a duel pose (human IK targets), already blended by the engine
    const x = g.position.x, sp = lastX == null ? 0 : Math.abs(x - lastX) / Math.max(dt, 1e-3); lastX = x;
    u.mood = FOX_MOOD[P.mood] || 'determined'; if ((P.mouth || 0) > (u.mouth || 0)) u.mouth = P.mouth;
    kit.animFox(g, dt, sp > 0.3 ? sp : 0, false);   // tail, ears, blink, face, sword glow (arms / legs / body are overwritten below)
    const B = FP.body, lean = P.lean || 0, tw = P.twist || 0, hip = P.hip || [0, 0, 0];
    B.rotation.set(lean, tw * 0.5, -(P.side || 0) * 0.6); _hp.set(0, HY, 0).applyEuler(B.rotation);   // lean pivots at the hips, not the feet
    B.position.set(hip[0] - _hp.x, hip[1] + HY - _hp.y, hip[2] - _hp.z); B.updateMatrix(); _m.copy(B.matrix).invert();
    // sword paw = arms[1] (far side), gun paw = arms[0] (near the camera); targets mirrored in x so each arm keeps its own side
    aimArm(FP.arms[1], [-P.hR[0], P.hR[1], P.hR[2]]); aimArm(FP.arms[0], [-P.hL[0], P.hL[1], P.hL[2]]);
    aimLeg(FP.legs[0], P.fR); aimLeg(FP.legs[1], P.fL);
    FP.head.rotation.x = (P.pitch || 0) * 0.8 - lean * 0.4; FP.head.rotation.y = (P.yaw || 0) - tw * 0.5;
    if (FP.gun) { FP.gun.quaternion.copy(FP.arms[0].quaternion).invert(); if (P.gun) FP.gun.quaternion.multiply(_q.setFromEuler(_e.set(-P.gun, 0, 0))); }
    g.updateMatrixWorld(true); const paw = FP.arms[1].localToWorld(_t.set(0, -0.42, 0.06)); g.worldToLocal(paw);
    sw.position.copy(paw); sw.rotation.set(P.blade ?? 0.95, 0, 0); }
  return { g, U: { J: { heavy: false, head: FP.head } }, L: FOX_L, k: 1.0, R0, P: R0, sw, upd, fox: true, hw: 0.34, gunTip, parts: FP };
}

// ---------------- SUDS-9 · THE WINDOW CLEANER ----------------
// Local frame like every duel fighter: faces +z, its +x side faces the camera once the duel turns it to face Ben (rotation.y = −π/2).
export const SUDS_L = { H: 2.75, hipY: 0.95, torsoL: 1.2, footH: 0.06 };
export function makeSuds9({ THREE, M, toon, glowTex, canvasTex, scene, touch }) {
  const B = toon('#4a4e55'), D = toon('#1f2226'), R = toon('#ec3013'), Y = toon('#ffd23a'), ST = toon('#9aa3ad'), TK = toon('#2e7fb8'), GL = toon('#9fe8ff', { emissive: 0x2a7fa8, emissiveIntensity: 0.6 });
  const E = new THREE.MeshBasicMaterial({ color: 0xff2a1a }); E.userData.noFl = true;
  const Bx = (w, h, d) => new THREE.BoxGeometry(w, h, d), Cy = (r, h, n = 14, r2 = r) => new THREE.CylinderGeometry(r2, r, h, n);
  const g = new THREE.Group(); g.rotation.order = 'YXZ'; const root = new THREE.Group(); g.add(root);
  const hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips);
  const legs = [-1, 1].map(s => { const lg = new THREE.Group(); lg.position.set(s * 0.4, 0.95, 0); root.add(lg); M(new THREE.CapsuleGeometry(0.17, 0.46, 4, 10), D, 0, -0.42, 0, lg, 0.025);
    M(new THREE.SphereGeometry(0.2, 12, 8), B, 0, -0.42, 0.05, lg, 0.02, 0.2).scale.set(1, 0.8, 1); const ft = M(Bx(0.46, 0.2, 0.7), B, 0, -0.86, 0.1, lg, 0.025); M(Bx(0.48, 0.06, 0.72), Y, 0, -0.95, 0.1, lg, 0); return lg; });
  M(Bx(1.0, 0.32, 0.66), D, 0, 0.05, 0, hips, 0.02);
  const torso = new THREE.Group(); torso.position.y = 0.18; hips.add(torso);
  M(Bx(1.5, 1.25, 1.0), B, 0, 0.72, 0, torso, 0.04); M(Bx(1.53, 0.17, 1.03), R, 0, 1.12, 0, torso, 0); M(Bx(1.53, 0.07, 1.03), D, 0, 0.18, 0, torso, 0);
  { const t = canvasTex(256, 96, c => { c.fillStyle = '#1f2226'; c.fillRect(0, 0, 256, 96); c.strokeStyle = '#ffd23a'; c.lineWidth = 6; c.strokeRect(5, 5, 246, 86); c.fillStyle = '#f3f2f2'; c.font = '900 54px Archivo, Arial Black, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SUDS-9', 128, 52); });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.36), new THREE.MeshBasicMaterial({ map: t })); pl.position.set(0, 0.62, 0.505); torso.add(pl); }
  for (const s of [-1, 1]) { M(new THREE.SphereGeometry(0.3, 14, 10), D, s * 0.86, 1.15, 0, torso, 0.025, 0.3); for (let i = 0; i < 3; i++) M(Bx(0.04, 0.5, 0.8), D, s * 0.765, 0.55 + i * 0.001, 0, torso, 0).position.y = 0.5 + i * 0.18; }
  // soap tank on the back + its glowing level window + pipe to the nozzle shoulder
  M(Cy(0.32, 1.05, 16), TK, 0, 0.78, -0.7, torso, 0.025, 0.32); for (const y of [0.4, 1.15]) M(new THREE.TorusGeometry(0.33, 0.03, 6, 20), ST, 0, y, -0.7, torso, 0).rotation.x = Math.PI / 2;
  M(Bx(0.1, 0.6, 0.06), GL, 0, 0.78, -1.02, torso, 0); M(Cy(0.08, 0.2, 10), D, 0, 1.37, -0.7, torso, 0.01);
  { const p = M(Cy(0.05, 1.0, 8), D, -0.55, 1.25, -0.45, torso, 0.008); p.rotation.set(0.6, 0, 1.1); }
  // head: box, angry eyes (slanted bars, inner ends low) under slanted brows, mouth grille, visor strip, beacon
  const head = new THREE.Group(); head.position.y = 1.38; torso.add(head); M(Cy(0.16, 0.16, 10), D, 0, 0.04, 0, head, 0.01);
  M(Bx(0.82, 0.62, 0.72), B, 0, 0.42, 0, head, 0.035); M(Bx(0.72, 0.09, 0.06), R, 0, 0.7, 0.34, head, 0.01);
  for (const s of [-1, 1]) { const e = M(Bx(0.22, 0.075, 0.04), E, s * 0.16, 0.46, 0.37, head, 0); e.rotation.z = s * 0.42; const br = M(Bx(0.26, 0.06, 0.05), D, s * 0.16, 0.57, 0.375, head, 0); br.rotation.z = s * 0.55; M(Bx(0.08, 0.2, 0.3), D, s * 0.44, 0.42, 0, head, 0.012); }
  for (let i = 0; i < 3; i++) M(Bx(0.34, 0.03, 0.03), D, 0, 0.2 + i * 0.05, 0.37, head, 0);
  const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff2a1a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 })); eyeGlow.position.set(0, 0.46, 0.45); eyeGlow.scale.set(0.9, 0.4, 1); head.add(eyeGlow);
  M(Cy(0.07, 0.14, 8), D, 0, 0.8, 0, head, 0.01); const bcM = toon('#ffb020', { emissive: 0xff8a00, emissiveIntensity: 0.9 }); M(new THREE.SphereGeometry(0.1, 10, 8), bcM, 0, 0.9, 0, head, 0.01, 0.1);
  const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa020, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 })); beacon.position.set(0, 0.92, 0); beacon.scale.setScalar(0.7); head.add(beacon);
  // squeegee arm (+x side = toward the camera): shoulder → short arm → hand → 2.6 m steel pole → squeegee head (dark blade, yellow rubber edge)
  const shR = new THREE.Group(); shR.rotation.order = 'YXZ'; shR.position.set(0.98, 1.12, 0.05); torso.add(shR);
  M(Bx(0.26, 0.26, 0.55), D, 0, 0, 0.25, shR, 0.02); M(new THREE.SphereGeometry(0.17, 10, 8), B, 0, 0, 0.55, shR, 0.02, 0.17);
  { const pl = M(Cy(0.055, 2.6, 10), ST, 0, 0, 1.6, shR, 0.012); pl.rotation.x = Math.PI / 2; for (const z of [0.8, 2.6]) M(Cy(0.075, 0.12, 10), Y, 0, 0, z, shR, 0.006).rotation.x = Math.PI / 2; }
  const sq = new THREE.Group(); sq.position.set(0, 0, 2.95); shR.add(sq); M(Bx(0.14, 0.18, 0.24), D, 0, 0, -0.08, sq, 0.012);
  M(Bx(0.16, 1.15, 0.13), D, 0, 0, 0.06, sq, 0.02); M(Bx(0.18, 1.17, 0.05), Y, 0, 0, 0.14, sq, 0);
  const tip = new THREE.Object3D(); tip.position.set(0, 0, 0.15); sq.add(tip); const sw = new THREE.Object3D(); sw.userData.tip = tip;
  // soap nozzle arm (−x, far side)
  const shL = new THREE.Group(); shL.rotation.order = 'YXZ'; shL.position.set(-0.98, 1.12, 0.05); torso.add(shL);
  M(Bx(0.24, 0.24, 0.5), D, 0, 0, 0.22, shL, 0.02); M(Cy(0.11, 0.42, 12), TK, 0, 0, 0.62, shL, 0.015).rotation.x = Math.PI / 2; M(Cy(0.05, 0.26, 10, 0.08), ST, 0, 0, 0.94, shL, 0.01).rotation.x = Math.PI / 2;
  const nozTip = new THREE.Object3D(); nozTip.position.set(0, 0, 1.1); shL.add(nozTip);
  // JUMP strip (red, on the floor) and DUCK bar (yellow, head height) in front of him while a squeegee sweep winds up
  const wm = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const warnL = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.6), wm(0xec3013)); warnL.rotation.x = -Math.PI / 2; warnL.renderOrder = 2; scene.add(warnL);
  const warnH = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.55), wm(0xffd23a)); warnH.renderOrder = 2; scene.add(warnH);
  const stripeT = canvasTex(128, 32, c => { for (let i = -2; i < 10; i++) { c.fillStyle = i % 2 ? '#ffffff' : 'rgba(255,255,255,0.15)'; c.beginPath(); c.moveTo(i * 16, 32); c.lineTo(i * 16 + 16, 0); c.lineTo(i * 16 + 32, 0); c.lineTo(i * 16 + 16, 32); c.fill(); } }); stripeT.wrapS = THREE.RepeatWrapping;
  warnL.material.map = stripeT; warnH.material.map = stripeT.clone(); warnH.material.map.wrapS = THREE.RepeatWrapping;
  scene.add(g); g.traverse(m => { if (m.isMesh) m.castShadow = !touch; });
  const R0 = { crouch: 0.06, lean: 0.04, twist: 0, aY: 0.3, aP: -1.25, aR: 0, nP: 0.5, nY: 0, lgL: 0, lgR: 0, hP: 0, hY: 0, eye: 1, eyeSp: 1, dock: 0, down: 0, fall: 0, rise: 1, warnL: 0, warnH: 0, beat: 0, mood: 'angry' };
  const _v = new THREE.Vector3(); let rig = null, t = 0;
  const GZ = () => rig ? rig.gz : -4.3;
  const off = (dx, dz) => { root.position.z = -dx; root.position.x = dz; };   // world offset (x, z) → this robot's local frame (it faces −x)
  function upd(P, dt, f) { t += dt;
    const fall = P.fall || 0, down = P.down || 0, c = clamp(P.crouch, -0.1, 0.5);
    hips.position.y = 0.95 - c; legs.forEach((lg, i) => { lg.position.y = 0.95 - c; lg.scale.y = Math.max(0.55, (0.95 - c) / 0.95); lg.rotation.x = i ? P.lgL : P.lgR; });
    torso.rotation.set(P.lean, P.twist, 0); head.rotation.set(P.hP, P.hY, 0); shR.rotation.set(P.aP, P.aY, P.aR || 0); shL.rotation.set(P.nP, P.nY, 0);
    const k = 0.5 + 0.5 * Math.sin(t * 6 * (P.eyeSp || 1)), eb = clamp(P.eye, 0, 1.6); E.color.setRGB(Math.min(1, (0.16 + 0.84 * k) * eb), 0.03 * k * eb, 0.02 * k * eb); eyeGlow.material.opacity = (0.15 + 0.45 * k) * eb;
    beacon.material.opacity = 0.25 + 0.6 * Math.max(0, Math.sin(t * (P.beat ? 14 : 5))); bcM.emissiveIntensity = 0.5 + beacon.material.opacity;
    // where he is: dock (back to the parapet), the KO stagger into the gondola and the fall, the round-1 rise from below the roof edge
    root.rotation.set(0, 0, 0); root.position.set(0, 0, 0); g.rotation.x = 0; let gY = 0, gTilt = 0, gZ = 0;
    if (P.dock > 0) { off(0, -1.5 * P.dock); root.rotation.x = 0; root.rotation.z = 0; torso.rotation.x -= 0.25 * P.dock; }
    if (P.rise < 1) { const r = P.rise, up = ss(clamp(r / 0.55, 0, 1)), hop = clamp((r - 0.55) / 0.35, 0, 1); gY = lerp(-5.5, 0, up); off(0, lerp(GZ(), 0, ss(hop))); root.position.y = gY * (hop > 0 ? 0 : 1) + Math.sin(hop * Math.PI) * 1.1; }
    if (down > 0) { const a = ss(clamp(down / 0.9, 0, 1)), b = clamp((down - 0.6) / 0.5, 0, 1); off(0, lerp(0, GZ(), a)); root.position.y = Math.sin(a * Math.PI) * 0.8; root.rotation.x = 0; root.rotation.z = lerp(0, 0.35, b) + Math.sin(down * 9) * 0.05 * (1 - b);
      if (fall > 0.45) { const ft = fall - 0.45, y = 0.5 * 9 * ft * ft; root.position.y -= y; root.rotation.z += ft * 1.4; root.rotation.y = ft * 0.8; gY = -y * 0.97; gTilt = ft * 0.7; gZ = -ft * 0.5; } else if (fall > 0) { root.rotation.z += Math.sin(fall * 40) * 0.04; } }
    if (rig) { const gx = clamp(down > 0 ? rig.x : f.x, rig.x0, rig.x1); rig.x = down > 0 ? rig.x : lerp(rig.x, gx, Math.min(1, dt * 1.6)); if (P.rise < 1 || down > 0) rig.x = clamp(f.x, rig.x0, rig.x1);
      rig.set(rig.x, gY, gTilt, gZ, fall > 0.45); }
    // warnings: a strip on the floor (JUMP) and a bar at head height (DUCK), both in front of him
    const fx = f.x - 0.6, L = 3.2; warnL.position.set(fx - L / 2, 0.025, 0); warnL.scale.set(L, 1, 1); warnL.material.opacity = P.warnL * (0.6 + 0.3 * Math.sin(t * 30)); warnL.visible = P.warnL > 0.01; warnL.material.map.offset.x = -t * 2;
    warnH.position.set(fx - L / 2, 2.25, 0.3); warnH.scale.set(L, 1, 1); warnH.material.opacity = P.warnH * (0.6 + 0.3 * Math.sin(t * 30)); warnH.visible = P.warnH > 0.01; warnH.material.map.offset.x = -t * 2; }
  return { g, U: { J: { heavy: false, head } }, L: SUDS_L, k: 1.45, R0, P: R0, sw, upd, robot: true, hw: 0.82, nozTip, sqTip: tip, setRig(r) { rig = r; }, eyeMat: E };
}

// SUDS-9 pose from his fighter state (pure, so the KO replay can play it back)
export function sudsPoseOf(f, S) {
  const B = { ...f.R0 }, a = f.act, br = Math.sin(S.t * 2 + 1) * 0.02, sp = Math.abs(f.vx), ph = S.t * 7;
  B.crouch = 0.06 + br; B.eyeSp = f.phase === 3 ? 2.2 : f.phase === 2 ? 1.5 : 1; B.beat = f.phase >= 2 ? 1 : 0;
  B.rise = S.mode === 'fight' && S.ph === 'intro' && S.round === 1 && !S.noRise ? clamp(S.phT / 1.9, 0, 1) : 1;
  if (sp > 0.15 && !a) { B.lgL = Math.sin(ph) * 0.35; B.lgR = -Math.sin(ph) * 0.35; B.crouch += Math.abs(Math.sin(ph)) * 0.04; B.aY = 0.3 + Math.sin(ph) * 0.05; }
  if (f.down) { return { ...B, down: f.down.t, fall: f.fallAt != null ? Math.max(0, S.t - f.fallAt) : 0, eye: 0.35 + (Math.random() < 0.2 ? 0.6 : 0), aP: 0.4, aY: 0.8, nP: 0.9, lean: -0.2, hP: 0.3 }; }
  if (S.ph === 'ko' && f.mood === 'happy' && S.phT > 0.6) return { ...B, aP: -2.5, aY: 0.1, nP: -2.3, lean: -0.12, hP: -0.25, eye: 1.5, beat: 1, crouch: 0.02 + Math.abs(Math.sin(S.t * 6)) * 0.06 };
  if (S.ph === 'lock' && S.lock) { const m = clamp(-S.lock.meter, -1, 1), j = Math.sin(S.t * 38) * 0.02; return { ...B, aP: 0.05 + j, aY: 0.05, lean: 0.3 + m * 0.12, crouch: 0.22, eye: 1.4, lgL: 0.3, lgR: -0.25 }; }
  if (f.daze > 0) { const w = Math.sin(S.t * 6); return { ...B, dock: f.weak ? 1 : 0, hY: w * 0.4, hP: 0.25, lean: -0.08 + w * 0.05, aP: 0.85, aY: 0.9, nP: 1.0, eye: Math.random() < 0.3 ? 0.2 : 0.9, crouch: 0.18 }; }
  if (f.stun > 0) return { ...B, lean: -0.22, hP: -0.25, aP: -0.6, aY: 0.9, nP: 0.2, eye: 0.6, crouch: 0.12 };
  if (a && (a.kind === 'sweepL' || a.kind === 'sweepH')) { const lo = a.kind === 'sweepL', tw = a.tw, u = a.t, aP = lo ? 0.62 : -0.16, cr = lo ? 0.38 : 0.04;
    if (u < tw) { const e = ss(clamp(u / (tw * 0.6), 0, 1)); return { ...B, aY: lerp(0.3, 2.35, e), aP: lerp(-1.25, aP, e), crouch: lerp(B.crouch, cr, e), lean: lerp(0.04, lo ? 0.05 : -0.08, e), twist: e * 0.35, warnL: lo ? 1 : 0, warnH: lo ? 0 : 1, eye: 1.3, hY: 0.3 * e }; }
    const v = clamp((u - tw) / 0.24, 0, 1); if (u < tw + 0.24) return { ...B, aY: lerp(2.35, -1.0, ss(v)), aP, crouch: cr + 0.04, lean: lo ? 0.28 : 0.12, twist: lerp(0.35, -0.4, v), warnL: lo ? 0.6 * (1 - v) : 0, warnH: lo ? 0 : 0.6 * (1 - v), eye: 1.5 };
    const r = clamp((u - tw - 0.24) / 0.35, 0, 1); return { ...B, aY: lerp(-1.0, 0.3, ss(r)), aP: lerp(aP, -1.25, ss(r)), crouch: lerp(cr, B.crouch, r), lean: lerp(0.2, 0.04, r), twist: lerp(-0.4, 0, r), eye: 1.2 }; }
  if (a && a.kind === 'spray') { const u = clamp(a.t / a.dur, 0, 1), up = ss(clamp(a.t / 0.3, 0, 1)) * (1 - ss(clamp((u - 0.85) / 0.15, 0, 1))), kick = a.kick ? Math.max(0, a.kick - S.t) * 6 : 0; return { ...B, nP: lerp(0.5, -0.75, up) - kick * 0.4, nY: 0.1 * up, lean: -0.08 * up, aY: 0.6, aP: -1.0, hP: -0.12 * up, eye: 1.2 }; }
  if (a && a.kind === 'dock') { const u = clamp(a.t / a.dur, 0, 1); return { ...B, dock: ss(u), aP: lerp(-1.25, 0.5, u), aY: lerp(0.3, 0.9, u), lean: -0.1 * u, eye: 1 - u * 0.3 }; }
  if (a && a.d) { const d = a.d, u = a.t, w = d.w * a.slow, pr = u < w ? ss(u / w) : u < w + d.a ? 1 : 1 - ss((u - w - d.a) / (d.r * a.slow)), strike = u >= w, se = strike ? Math.min(1, (u - w) / Math.max(0.05, d.a * 0.8)) : 0;
    if (a.kind === 'high' || a.kind === 'power') { const P0 = { aP: -1.25, aY: 0.3 }, up = { aP: -2.75, aY: 0.05 }, dn = { aP: 0.62, aY: 0 }, q = strike ? { aP: lerp(up.aP, dn.aP, ss(se)), aY: 0 } : { aP: lerp(P0.aP, up.aP, pr), aY: lerp(P0.aY, up.aY, pr) }; if (strike && u > w + d.a) { const r = 1 - pr; q.aP = lerp(dn.aP, P0.aP, r); q.aY = lerp(0, P0.aY, r); } return { ...B, ...q, lean: strike ? 0.3 : -0.1 * pr, crouch: strike ? 0.2 : 0.06, hP: strike ? 0.15 : -0.2, eye: 1.4 }; }
    if (a.kind === 'mid') { const q = strike ? { aP: lerp(-0.05, 0.08, se), aY: lerp(0.75, 0.0, ss(se)) } : { aP: lerp(-1.25, -0.05, pr), aY: lerp(0.3, 0.75, pr) }; if (strike && u > w + d.a) { const r = 1 - pr; q.aP = lerp(0.08, -1.25, r); q.aY = lerp(0, 0.3, r); } return { ...B, ...q, lean: strike ? 0.32 : 0.0, crouch: strike ? 0.16 : 0.06, lgL: strike ? 0.3 : 0, lgR: strike ? -0.2 : 0, eye: 1.3 }; }
    if (a.kind === 'low') { const q = strike ? { aP: lerp(0.15, 0.85, se), aY: lerp(1.1, -0.2, ss(se)) } : { aP: lerp(-1.25, 0.15, pr), aY: lerp(0.3, 1.1, pr) }; if (strike && u > w + d.a) { const r = 1 - pr; q.aP = lerp(0.85, -1.25, r); q.aY = lerp(-0.2, 0.3, r); } return { ...B, ...q, lean: strike ? 0.2 : 0.05, crouch: strike ? 0.3 : 0.1, eye: 1.3 }; } }
  if (f.guard > 0) return { ...B, aP: f.crouch ? 0.15 : -0.35, aY: -0.15, crouch: f.crouch ? 0.32 : 0.1, lean: 0.06, eye: 1.1 };
  return B;
}
