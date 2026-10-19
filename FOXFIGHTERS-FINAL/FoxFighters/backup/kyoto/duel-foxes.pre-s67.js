// 8 GATES — PEARL SAIL · ROOF DUEL: the cast fox (BEN) as a duel fighter + SUDS-9 · THE WINDOW CLEANER (roof boss robot).
// Used by sword-duel.js only when opts.pearl is set (Kyoto stays as it was).
//  · foxFighter(ctx)  → Ben from engine/cast.js (never restyled) with a POSE ADAPTER: the duel's human IK targets (hands / feet / hip / lean …,
//    root space, faces +z, left = +x) are turned into rotations of the fox-kit parts (arms, legs, body, head). The fox sword is lifted off the arm
//    so the duel can hold it like the katana (pos = the sword paw, rotation.x = P.blade). The laser gun stays on the near arm.
//  · makeSuds9(ctx)   → the dark-grey robot (box head, angry eyes pulsing deep red → red, red band, blue soap tank, long squeegee pole,
//    soap nozzle arm, yellow beacon) + sudsPoseOf(f, S) (pose from the fighter state) + upd(P, dt, f) (puts the pose on the model,
//    drives the roof car / gondola rig and the JUMP / DUCK warning strips).
import { castKit } from '../../engine/cast.js';
import { PLAYER_MALE, PLAYER_FEMALE, KING_MIGHT, HOPE_LOOK } from '../../fox-kit.js';
import { nobleWeaponKit } from '../../engine/noble-weapons.js';
import { BOSS_FOX, bossExtras, ironWarden, makerPrime, suds9 } from '../../engine/bosses.js';
import { creatureKit } from '../../engine/creature-kit.js';

// FOX FIGHTERS roster (s36e, Ben's picks). stats = 1..5 bars on the select screen; hp / speed / dmg are the fight numbers.
// Cast foxes come from engine/cast.js (never restyled); the royals use the same configs as their Meru NPCs (worlds/meru-interiors.js, meru-game.js) + a sword.
export const FOX_ROSTER = [
  // row 1
  { id: 'ben', name: 'BEN', sub: 'THE HERO · FOX BEAM', style: 'The all-rounder. FOX BEAM, WHIRLWIND KICK and the RISING FOX.', cast: 'player', hp: 172, speed: 1, dmg: 1.16, stats: [3, 3, 3], mv: { w: 0.95 }, ai: 'balanced', gloves: '#dc2626' },
  { id: 'hope', name: 'HOPE', sub: 'THE CANE · POLE VAULT', style: 'Her cane is a vaulting pole. VAULT DIVE from above and the CANE FLIP. Nobody trips her.', cast: 'hope', cane: true, hp: 178, speed: 1.1, dmg: 1.15, stats: [3, 5, 3], mv: { w: 0.9, r: 0.92, reach: 1.08, high: { reach: 1.18 } }, ai: 'rush', gloves: '#38bdf8' },
  { id: 'noble', name: 'NOBLE', sub: 'THE CHAIR · THUNDER WHEELS', style: 'Electric wheels. The ROLLING CHAIR charge, WHEELIE KICKS and the SHOEMERANG.', cast: 'noble', hp: 158, speed: 0.88, dmg: 0.98, stats: [4, 3, 4], mv: { reach: 1.05 }, ai: 'balanced', gloves: '#2563eb' },
  { id: 'might', name: 'KING MIGHT', sub: 'THE KING OF MERU', style: 'The old master. ROYAL CRUSHER flies at you, KNEE PRESS, and the CROWN STOMP from above.', boss: 'king', hp: 175, speed: 0.95, dmg: 1.08, stats: [5, 3, 4], mv: { w: 1.05, reach: 1.06, armor: ['spin'] }, ai: 'heavy', gloves: '#e6b45a' },
  { id: 'michelle', name: 'MICHELLE', sub: 'THE PRINCESS OF MERU', style: 'The fastest feet on the roof. Long, quick kicks, the SPINNING CRANE KICK and the PALM BLAST.', boss: 'michelle', hp: 162, speed: 1.2, dmg: 0.98, stats: [2, 5, 3], mv: { w: 0.85, r: 0.88, reach: 0.94, kick: { reach: 1.14, w: 0.78 }, sweep: { reach: 1.1 }, akick: { reach: 1.12 } }, ai: 'rush', gloves: '#3b82f6', kickFlurry: true },
  // row 2
  { id: 'sumo', name: 'OYAKATA', sub: 'THE SUMO · KYOTO', style: 'Huge and hard to move. The SUMO TORPEDO and the BELLY SPLASH.', boss: 'sumo', hp: 180, speed: 0.8, dmg: 1.11, stats: [5, 1, 3], mv: { w: 1.2, r: 1.12, reach: 1.1, punch: { reach: 1.18, dmg: 1.15 }, armor: ['spin', 'high'] }, ai: 'grappler' },
  { id: 'barnacle', name: 'BARNACLE', sub: 'BANDIT · SALT BUILDING', style: 'Forklift muscle. The FORKLIFT SLAM grab and the CRATE TOSS.', boss: 'barnacle', hp: 176, speed: 0.86, dmg: 1.12, stats: [5, 2, 3], mv: { w: 1.16, r: 1.1, reach: 1.06, armor: ['spin'] }, ai: 'grappler', gloves: '#1f2937' },
  { id: 'jack', name: 'JALAPEÑO JACK', sub: 'BANDIT · PEPPER BUILDING', style: 'Sits back and waits. The PEPPER BOOM projectile and the CHILLI FLIP kick.', boss: 'jack', hp: 160, speed: 1.02, dmg: 1.12, stats: [3, 3, 5], mv: { w: 0.86, r: 0.9, reach: 0.98, akick: { reach: 1.12, dmg: 1.1 } }, ai: 'zoner', gloves: '#16a34a' },
  { id: 'rook', name: 'ROOK', sub: 'BANDIT BOSS · RUINS CAVE', style: 'Long-range trouble. The SNIPER BEAM and the DUSTER DASH.', boss: 'rook', hp: 170, speed: 1.0, dmg: 1.17, stats: [3, 3, 5], mv: { reach: 1.04, kick: { reach: 1.08 } }, ai: 'zoner', gloves: '#92400e' },
  { id: 'lox', name: 'LOX', sub: 'LEADER OF LUXOR · BOXER', style: 'A heavyweight boxer: every button is a punch. DASH STRAIGHT, DASH UPPER and the TURN PUNCH.', boss: 'lox', hp: 170, speed: 0.98, dmg: 1.07, stats: [5, 3, 2], mv: { w: 0.95, punch: { w: 0.7, r: 0.8, reach: 1.06 }, kick: { w: 0.85 }, armor: ['spin'] }, ai: 'rush', noSword: true, boxer: true },
  // row 3
  { id: 'warden', name: 'IRON WARDEN', sub: 'ROBOT · MERU ARENA', style: 'A walking fortress. ROCKET PUNCH and the STOMP shockwave.', rig: 'warden', hp: 192, speed: 0.78, dmg: 1.16, stats: [5, 1, 4], mv: { w: 1.2, r: 1.15, reach: 1.14, armor: ['spin', 'high'] }, ai: 'heavy' },
  { id: 'prime', name: 'MAKER PRIME', sub: 'ROBOT · THE FACTORY', style: 'Claw, drill and a red laser eye. LASER EYE and the DRILL SPIN.', rig: 'prime', hp: 180, speed: 0.72, dmg: 1.18, stats: [5, 1, 5], mv: { w: 1.25, r: 1.2, reach: 1.16, armor: ['spin', 'high'] }, ai: 'zoner' },
  { id: 'suds', name: 'SUDS-9', sub: 'ROBOT · WINDOW CLEANER', style: 'The roof boss, now yours. RINSE CYCLE from the hose hand and the SPIN CYCLE.', rig: 'suds', vo: 'suds9', hp: 212, speed: 0.9, dmg: 1.27, stats: [4, 2, 4], mv: { w: 1.0, reach: 1.25, armor: ['spin', 'high', 'kick'] }, ai: 'heavy' },
  { id: 'slag', name: 'SLAGBACK', sub: 'LAVA BEAST · LUXOR', style: 'Molten under the crust. LAVA LOB and the MAGMA SLAM. Its crust cracks off as it gets hurt.', rig: 'slag', hp: 200, speed: 0.84, dmg: 1.2, stats: [4, 2, 3], mv: { w: 1.0, reach: 1.12, armor: ['spin', 'high'], crust: true }, ai: 'heavy' },
  { id: 'shadow', name: 'SHADOW BEN', sub: 'THE DARK TWIN', style: 'Everything Ben can do, darker and faster. The SHADOW BEAM fires in the air too.', cast: 'player', shadow: true, hp: 178, speed: 1.12, dmg: 1.0, stats: [4, 4, 4], mv: { w: 0.92, r: 0.92 }, ai: 'rush', gloves: '#7c3aed' },
];
// s37 (Ben): all 15 are on the select screen now; Shadow Ben still shows up as the arcade's secret challenger.
export const FOX_SECRET = [];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ss = t => t * t * (3 - 2 * t), lerp = (a, b, t) => a + (b - a) * t;
// a fake "human L" whose numbers land the duel's pose targets on the fox's joints (fox ≈ 2.0 m to the ear tips, shoulders 1.37 m, hips 0.75 m)
// s66 SWORD WORKSHOP: per-fighter fine-tuning of the sword on the back, on top of the built-in placement. BAKED = the tuned values in the game;
// the workshop saves to this device (localStorage 'ff.swordFit') and every fighter re-reads it live (SWORD_FIT.v bumps on each change).
// dx = across the back (+ = far shoulder) · dy = up · out = further off the back · tilt = lean across the back · lean = top tips away from the back · twist = turn round the blade (degrees)
export const SWORD_FIT_BAKED = {};
export const SWORD_FIT = (() => { let d = {}; try { d = JSON.parse(localStorage.getItem('ff.swordFit') || '{}') || {}; } catch (e) {} return { v: 1, d: { ...SWORD_FIT_BAKED, ...d },
  get(id) { return { dx: 0, dy: 0, out: 0, tilt: 0, lean: 0, twist: 0, ...(this.d[id] || {}) }; },
  set(id, fit) { if (fit) this.d[id] = { ...fit }; else if (SWORD_FIT_BAKED[id]) this.d[id] = { ...SWORD_FIT_BAKED[id] }; else delete this.d[id]; this.v++; try { localStorage.setItem('ff.swordFit', JSON.stringify(this.d)); } catch (e) {} } }; })();
export const FOX_L0 = { H: 2.0, hipY: 0.75, torsoL: 0.667, footH: 0.05, shW: 0.42, uaL: 0.28, faL: 0.26, thL: 0.35, snL: 0.35 };
// s46 (Ben: longer arms and legs so punches and kicks read): the foxes stand 0.16 taller on longer legs; the robots keep FOX_L0 (their rigs map to it)
export const LEG_UP = 0.16, FOX_L = { ...FOX_L0, H: FOX_L0.H + LEG_UP, hipY: FOX_L0.hipY + LEG_UP };
const FOX_MOOD = { angry: 'stern', happy: 'excited', sad: 'sad', surprised: 'surprised', determined: 'determined', stern: 'stern', neutral: 'determined' };

export function foxFighter({ THREE, kit, M, toon }, key = 'player', def = null) {
  const CK = castKit({ THREE, M, toon, makeFox: kit.makeFox }); let g, sc = 1;
  if (def && def.boss) { const BF = BOSS_FOX[def.boss]; g = kit.makeFox({ ...BF, gear: 'both' }); bossExtras(def.boss, g, { THREE, M, toon }); sc = BF.scale || 1; }
  else g = def && def.cfg ? kit.makeFox(def.cfg) : CK.make(key, key === 'noble' ? {} : { gear: 'both' });
  g.rotation.order = 'YXZ'; if (sc !== 1) g.scale.setScalar(sc);
  const chair = key === 'noble' && !(def && def.cfg), NWK = chair ? nobleWeaponKit({ THREE, M, toon }) : null;
  if (def && def.shadow) { const pc = new THREE.Color(0x3a1050), tint = c => { c = c.clone(); if (c.color) c.color.multiplyScalar(0.3).lerp(pc, 0.3); if (c.emissive) c.emissive.setHex(0x1a0628); return c; }; g.traverse(m => { if (!m.material || !(m.isMesh || m.isSprite)) return; m.material = Array.isArray(m.material) ? m.material.map(tint) : tint(m.material); }); }
  const LU = chair ? 0 : def && def.boss === 'sumo' ? 0.06 : LEG_UP;   // Oyakata stays low and squat
  const u = g.userData, FP = u.P, HY = FOX_L0.hipY, DOWN = new THREE.Vector3(0, -1, 0);
  // s38 (Ben): longer, looser arms for Fox Fighters (they looked like T-rex arms). The arm stretches 1.35× (a little wider for a looser sleeve);
  // the paw / glove / laser at the end are counter-scaled so they keep their size. Only the duel does this; the rest of the game keeps the kit arms.
  const ARM_L = 1.46, ARM_W = 1.08; for (const A of FP.arms || []) { A.scale.y *= ARM_L; A.scale.x *= ARM_W; A.scale.z *= ARM_W; for (const c of A.children) if (c.position.y <= -0.33) { c.scale.y /= ARM_L; c.scale.x /= ARM_W; c.scale.z /= ARM_W; } }
  // s46: arms can REACH. A punch target beyond the arm's length stretches the arm (up to 1.32×) so a jab snaps out instead of only swinging up; the paw /
  // glove keeps its size. Legs: the feet keep their shape however far the leg stretches, and the legs are a touch thicker for the longer length.
  const ARMS = (FP.arms || []).map(A => ({ A, sy: A.scale.y, len: 0.42 * A.scale.y, paws: A.children.filter(c => c.position.y <= -0.33).map(c => ({ c, y: c.scale.y })) }));
  const LEGS = (FP.legs || []).map(Lg => { Lg.scale.x *= 1.1; Lg.scale.z *= 1.1; return { Lg, feet: Lg.children.filter(c => c.position.y <= -0.38).map(c => ({ c, y: c.scale.y })) }; });
  // s41 (Ben): small BOXING GLOVES on the foxes (about half the size of Lox's), in each fox's colour. Not on Lox (his own), Oyakata, the robots or
  // Slagback. Hope wears one on her free paw only (her cane paw stays as it is). The fist inside the paw is hidden; the laser pistol still appears for LASER.
  if (def && def.gloves) { const gm = toon(def.gloves), cuff = toon('#f7f1e6'), lace = toon('#141312');
    FP.arms.forEach((A, i) => { if (def.cane && i === 0) return; const paw = A.children.find(c => c.isGroup && c !== FP.gun && c.position.y <= -0.33 && c.children.some(m => m.isMesh)); if (!paw) return;
      paw.children.forEach(m => { if (m.isMesh) m.visible = false; }); const G = new THREE.Group(); G.position.set(0, -0.02, 0.02); paw.add(G);
      M(new THREE.SphereGeometry(0.105, 16, 12), gm, 0, -0.01, 0.01, G, 0.016, 0.105).scale.set(1, 1.08, 1.2);
      M(new THREE.SphereGeometry(0.045, 10, 8), gm, (A.position.x > 0 ? -1 : 1) * 0.08, 0.0, 0.05, G, 0.01, 0.045);
      M(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 14), cuff, 0, 0.085, 0, G, 0.008, 0.075);
      M(new THREE.TorusGeometry(0.072, 0.008, 5, 14), lace, 0, 0.085, 0, G, 0).rotation.x = Math.PI / 2; }); }
  // the fox sword comes off the arm: the duel places it in the paw every frame (like the katana in the human fighters)
  let sw; const NW = chair ? NWK.attach(g) : null;
  if (chair) { sw = new THREE.Object3D(); sw.position.set(0, 1.05, 0.55); g.add(sw); const tp = new THREE.Object3D(); tp.position.set(0, 0, 0.45); sw.add(tp); sw.userData.tip = tp; }   // Noble: no sword, the 'blade tip' is the front of his chair
  else { sw = FP.sword; sw.parent.remove(sw); g.add(sw); sw.scale.setScalar(1.0); const tip = new THREE.Object3D(); tip.position.y = def && def.cane ? 1.2 : 1.3; sw.add(tip); sw.userData.tip = tip;
    if (def && def.cane) { sw.visible = false; sw.children.forEach(c => { if (c !== tip) c.visible = false; }); const wh = toon('#f8fafc'), rd = toon('#dc2626'), bk = toon('#1f2937'); M(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 10), bk, 0, 0.0, 0, sw, 0.01); M(new THREE.CylinderGeometry(0.022, 0.022, 0.86, 10), wh, 0, 0.53, 0, sw, 0.01); M(new THREE.CylinderGeometry(0.023, 0.023, 0.2, 10), rd, 0, 1.06, 0, sw, 0.01); M(new THREE.SphereGeometry(0.04, 10, 8), toon('#e5e7eb'), 0, 1.18, 0, sw, 0.01); }
    if (def && def.shadow) sw.traverse(m => { if (m.isMesh && m.material && !Array.isArray(m.material)) { m.material = m.material.clone(); if (m.material.color) m.material.color.setHex(0x8b5cf6); if (m.material.emissive) m.material.emissive.setHex(0x5b21b6); } }); }
  // s36b (Ben): no laser in this duel: the gun is hidden and the near paw is a free fist again (punches)
  if (FP.gun) { FP.gun.visible = false; FP.arms[0].children.forEach(c => { if (c.isMesh && c.geometry.type === 'SphereGeometry' && Math.abs(c.position.y + 0.4) < 0.02) c.scale.setScalar(1); }); }
  const gunTip = new THREE.Object3D(); if (FP.tipGlow) FP.tipGlow.parent.add(gunTip), gunTip.position.copy(FP.tipGlow.position);
  // s47 (Ben): the SWORD lives on the fox's BACK in a scabbard (hilt over the far shoulder) and the LASER in a HOLSTER on the near hip. They are drawn
  // only while a hold is charging (sword: reach over the shoulder; gun: down to the hip) and put back after. Not on Noble (chair), Hope (cane) or Lox.
  const TAIL_SIDE = 1, TAIL_B = 0.22, hasBack = !chair && !(def && (def.cane || def.noSword)), hasHol = !chair && !!FP.gun && !(def && def.noSword);
  // s49 (Ben: the tail was sweeping through the sword): the scabbard runs down the FAR side of the back, angled out and away from the tail, and while
  // the sword is sheathed the tail curls to the NEAR side with a narrower swing (see the end of upd), so the two never brush. Drawn = tail free again.
  const SUMO = def && def.boss === 'sumo', BA = new THREE.Object3D(); BA.position.set(SUMO ? 0.4 : 0.22, SUMO ? 1.78 : 1.84, SUMO ? -0.46 : -0.4); BA.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(SUMO ? 0.42 : 0.17, -1.17, SUMO ? -0.24 : -0.46).normalize()); FP.body.add(BA);
  const BA0p = BA.position.clone(), BA0q = BA.quaternion.clone(), fitId = (def && def.id) || key; let fitV = -1;
  const fitApply = () => { const F = SWORD_FIT.get(fitId), D2R = Math.PI / 180; BA.position.copy(BA0p).add(new THREE.Vector3(F.dx, F.dy, -F.out)); BA.quaternion.copy(BA0q).premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-F.lean * D2R, 0, F.tilt * D2R))).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), F.twist * D2R)); fitV = SWORD_FIT.v; };
  if (hasBack) { const lea = toon(def && def.shadow ? '#2a0f3d' : '#3b2416'), brass = toon('#d4a73a'); M(new THREE.CylinderGeometry(0.06, 0.045, 1.12, 10), lea, 0, 0.72, 0, BA, 0.012);
    M(new THREE.CylinderGeometry(0.068, 0.068, 0.07, 10), brass, 0, 0.18, 0, BA, 0.008); M(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10), brass, 0, 1.27, 0, BA, 0.008); }
  const HA = new THREE.Object3D(); if (def && def.boss === 'sumo') HA.position.set(-0.62, 1.0, 0.1); else HA.position.set(-0.36, 0.66, 0.05); HA.rotation.set(Math.PI / 2, 0, 0.12); FP.body.add(HA); let HG = null;
  if (hasHol) { HG = FP.gun.clone(true); HG.visible = true; HG.position.set(0, 0, 0); HG.quaternion.identity(); HG.scale.copy(FP.gun.scale); HA.add(HG);
    M(new THREE.BoxGeometry(0.13, 0.1, 0.26), toon(def && def.shadow ? '#2a0f3d' : '#3b2416'), 0, -0.02, -0.02, HA, 0.01); M(new THREE.BoxGeometry(0.42, 0.04, 0.06), toon('#2b1a10'), 0.18, 0.02, 0.1, HA, 0.006); }
  // s53 (Ben: a Street Fighter breathing guard, like the workshop robots): the fox arms get ELBOWS. Each one-piece kit arm is split at its elbow band
  // into the upper arm (the kit arm group, rotates at the shoulder) and a FOREARM group (a sibling on the body, placed at the elbow every frame) that
  // carries the sleeve cuff, paw / glove, gun and cane. Two-bone IK puts the paw on the pose target with the elbow bending down / back / out, so
  // the fists can sit up by the chin in a real guard. Targets past full reach straighten the arm and stretch it (the punch reach from s46).
  const FORE = (FP.arms || []).map((A, i) => { const sleeve = A.children.find(c => c.isMesh && c.geometry.type === 'CylinderGeometry' && c.geometry.parameters.openEnded && c.geometry.parameters.height > 0.3), boss = !!sleeve;
    const ELB = boss ? 0.26 : 0.2, PAWY = boss ? 0.48 : 0.42, F = new THREE.Group(); F.scale.copy(A.scale); A.parent.add(F);
    [...A.children].forEach(c => { if (c === sleeve || (c.isMesh && c.geometry.type === 'CapsuleGeometry')) return; if (c.position.y < -ELB - 0.005) { F.add(c); c.position.y += ELB; } });
    if (boss) { sleeve.scale.y = 0.24 / 0.34; sleeve.position.y = -0.15; M(new THREE.CylinderGeometry(0.12, 0.095, 0.17, 14, 1, true), sleeve.material, 0, -0.07, 0, F, 0.012); }
    else { const cap = A.children.find(c => c.isMesh && c.geometry.type === 'CapsuleGeometry'); if (cap) { cap.visible = false; const mat = cap.material; M(new THREE.CapsuleGeometry(0.07, 0.05, 4, 10), mat, 0, -0.115, 0, A, 0.012); M(new THREE.CapsuleGeometry(0.066, 0.07, 4, 10), mat, 0, -0.07, 0, F, 0.012); } }
    return { A, F, ELB, PAWY, side: Math.sign(A.position.x) || (i ? 1 : -1) }; });
  ARMS.forEach(R => { const Fo = FORE.find(q => q.A === R.A); R.Fo = Fo; R.paws = Fo.F.children.filter(c => c.position.y <= -0.33 + Fo.ELB).map(c => ({ c, y: c.scale.y })); });
  // s54 (Ben: legs that move when they walk): KNEES. Each kit leg is split at the boot top into the thigh (the kit leg group, rotates at the hip) and
  // a SHIN group (sibling on the body, placed at the knee) carrying the boot, cuff and foot. Two-bone IK puts the foot on its target with the knee
  // bending forward; a target past full length straightens and stretches the leg (high kicks, as before). Legs are a fixed length now (SY0) so
  // the stance has a little knee bend, and walking really steps.
  const SHIN = (FP.legs || []).map((Lg, i) => { const big = Lg.children.some(c => c.isMesh && c.geometry.type === 'SphereGeometry' && Math.abs(c.position.y + 0.32) < 0.01), KN = big ? 0.21 : 0.17, Sg = new THREE.Group(); Lg.parent.add(Sg);
    [...Lg.children].forEach(c => { if (c.isMesh && c.geometry.type === 'CapsuleGeometry') return; if (c.position.y < -KN - 0.005) { Sg.add(c); c.position.y += KN; } });
    const cap = Lg.children.find(c => c.isMesh && c.geometry.type === 'CapsuleGeometry'); if (cap) { cap.visible = false; M(new THREE.CapsuleGeometry(0.095, 0.04, 4, 10), cap.material, 0, -0.09, 0, Lg, 0.012); M(new THREE.CapsuleGeometry(0.088, 0.1, 4, 10), cap.material, 0, -0.11, 0, Sg, 0.012); }
    const R = LEGS.find(r => r.Lg === Lg); R.Sg = Sg; R.KN = KN; R.sy0 = 1.62 * (big ? 1.02 : 1.035); R.feet = Sg.children.filter(c => c.position.y <= -0.38 + KN).map(c => ({ c, y: c.scale.y })); R.side = Math.sign(Lg.position.x) || (i ? 1 : -1); return R; });
  const pawOf = i => { const Fo = FORE[i]; return Fo ? Fo.F.localToWorld(_l2.set(0, -(Fo.PAWY - Fo.ELB), 0.06)) : FP.arms[i].localToWorld(_l2.set(0, -0.42, 0.06)); };
  const _bq = new THREE.Quaternion(), _gq = new THREE.Quaternion();
  const R0 = { hip: [0, 0, 0], lean: 0, twist: 0, side: 0, yaw: 0, pitch: 0, hL: [0.42, 0.8, 0.1], hR: [-0.42, 0.8, 0.1], eL: [1, 1, 0], eR: [-1, 1, 0], fL: [0.14, 0.05, 0], fR: [-0.14, 0.05, 0], kL: [0.5, 0.4, 1], kR: [-0.5, 0.4, 1], fYawL: 0, fYawR: 0, blade: 0.95, mood: 'determined', mouth: 0, vis: 'a', gun: 0 };
  const _l2 = new THREE.Vector3(), _t = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _e = new THREE.Euler(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _hp = new THREE.Vector3(); let lastX = null;
  const toBody = a => _t.set(a[0], a[1], a[2]).applyMatrix4(_m);
  const _E = new THREE.Vector3(), _pl = new THREE.Vector3(), _u = new THREE.Vector3();
  function aimArm(arm, a) { toBody(a); _s.copy(_t).sub(arm.position); const d = _s.length(); if (d < 1e-3) return; const R = ARMS.find(r => r.A === arm), Fo = R && R.Fo; _s.multiplyScalar(1 / d);
    if (!Fo) { arm.quaternion.setFromUnitVectors(DOWN, _s); return; } const a1 = Fo.ELB * R.sy, b1 = (Fo.PAWY - Fo.ELB) * R.sy, F = Fo.F; let st = 1;
    if (d >= (a1 + b1) * 0.995) { st = clamp(d / (a1 + b1), 1, 1.32); arm.quaternion.setFromUnitVectors(DOWN, _s); _E.copy(arm.position).addScaledVector(_s, a1 * st); F.quaternion.copy(arm.quaternion); }
    else { const ca = clamp((a1 * a1 + d * d - b1 * b1) / (2 * a1 * d), -1, 1), sa = Math.sqrt(1 - ca * ca); _pl.set(Fo.side * 0.35, -1, -0.5); _pl.addScaledVector(_s, -_pl.dot(_s)); if (_pl.lengthSq() < 1e-5) _pl.set(0, 0, -1); _pl.normalize();
      _E.copy(arm.position).addScaledVector(_s, a1 * ca).addScaledVector(_pl, a1 * sa); _u.copy(_E).sub(arm.position).normalize(); arm.quaternion.setFromUnitVectors(DOWN, _u); _u.copy(_t).sub(_E).normalize(); F.quaternion.setFromUnitVectors(DOWN, _u); }
    F.position.copy(_E); arm.scale.y = R.sy * st; F.scale.set(arm.scale.x, R.sy * st, arm.scale.z); R.paws.forEach(p => { p.c.scale.y = p.y / st; }); }
  const _K = new THREE.Vector3();
  function aimLeg(leg, a) { toBody([a[0], a[1] + 0.08, a[2]]); _s.copy(_t).sub(leg.position); const d = _s.length(); if (d < 1e-4) return; _s.multiplyScalar(1 / d); const R = LEGS.find(r => r.Lg === leg);
    if (!R || !R.Sg) { leg.quaternion.setFromUnitVectors(DOWN, _s); leg.scale.y = clamp(d / 0.42, 1.0, 2.3); return; } const a1 = R.KN * R.sy0, b1 = (0.42 - R.KN) * R.sy0, Sg = R.Sg; let st = 1;
    if (d >= (a1 + b1) * 0.995) { st = clamp(d / (a1 + b1), 1, 1.9); leg.quaternion.setFromUnitVectors(DOWN, _s); _K.copy(leg.position).addScaledVector(_s, a1 * st); Sg.quaternion.copy(leg.quaternion); }
    else { const ca = clamp((a1 * a1 + d * d - b1 * b1) / (2 * a1 * d), -1, 1), sa = Math.sqrt(1 - ca * ca); _pl.set(R.side * 0.2, 0, 1); _pl.addScaledVector(_s, -_pl.dot(_s)); if (_pl.lengthSq() < 1e-5) _pl.set(0, 0, 1); _pl.normalize();
      _K.copy(leg.position).addScaledVector(_s, a1 * ca).addScaledVector(_pl, a1 * sa); _u.copy(_K).sub(leg.position).normalize(); leg.quaternion.setFromUnitVectors(DOWN, _u); _u.copy(_t).sub(_K).normalize(); Sg.quaternion.setFromUnitVectors(DOWN, _u); }
    Sg.position.copy(_K); leg.scale.y = R.sy0 * st; Sg.scale.set(leg.scale.x, R.sy0 * st, leg.scale.z); R.feet.forEach(p => { p.c.scale.y = p.y * 1.31 / (R.sy0 * st); }); }
  function upd(P, dt, f) { // P = a duel pose (human IK targets), already blended by the engine; f.cart = the cartoon layer (foxCartoonOf)
    const ak = f && f.act && f.act.kind, swOut = !!f && (f.swordOut || ak === 'high' || ak === 'low' || ak === 'power' || (ak === 'shoe' && !f.shoe)), gOut = !!f && (f.gunOut || ak === 'laser');
    if (!chair && !(def && def.cane)) sw.visible = hasBack; if (FP.gun) FP.gun.visible = hasHol && gOut; if (HG) HG.visible = !gOut;
    const x = g.position.x, sp = lastX == null ? 0 : Math.abs(x - lastX) / Math.max(dt, 1e-3); lastX = x;
    u.mood = FOX_MOOD[P.mood] || 'determined'; if ((P.mouth || 0) > (u.mouth || 0)) u.mouth = P.mouth;
    kit.animFox(g, dt, sp > 0.3 ? sp : 0, false);   // tail, ears, blink, face, sword glow (arms / legs / body are overwritten below)
    const B = FP.body, lean = (P.lean || 0) * (chair ? 0.3 : 1), tw = (P.twist || 0) * (chair ? 0.4 : 1), hip = chair ? [0, 0, 0] : P.hip || [0, 0, 0];
    B.rotation.set(lean, tw * 0.5, -(P.side || 0) * 0.6); _hp.set(0, HY, 0).applyEuler(B.rotation);   // lean pivots at the hips, not the feet
    B.position.set(hip[0] - _hp.x, hip[1] + HY - _hp.y + LU, hip[2] - _hp.z); B.updateMatrix(); _m.copy(B.matrix).invert();
    // sword paw = arms[1] (far side), gun paw = arms[0] (near the camera); targets mirrored in x so each arm keeps its own side
    if (!chair) { aimArm(FP.arms[1], [-P.hR[0], P.hR[1], P.hR[2]]); aimArm(FP.arms[0], [-P.hL[0], P.hL[1], P.hL[2]]); aimLeg(FP.legs[0], P.fR); aimLeg(FP.legs[1], P.fL); }
    FP.head.rotation.x = (P.pitch || 0) * 0.8 - lean * 0.4; FP.head.rotation.y = (P.yaw || 0) - tw * 0.5;
    if (FP.gun) { FP.gun.quaternion.copy(FORE[0] ? FORE[0].F.quaternion : FP.arms[0].quaternion).invert(); if (P.gun) FP.gun.quaternion.multiply(_q.setFromEuler(_e.set(-P.gun, 0, 0))); }
    if (hasBack && fitV !== SWORD_FIT.v) fitApply();
    if (!chair) { g.updateMatrixWorld(true); if (swOut || !hasBack) { const paw = _t.copy(pawOf(1)); g.worldToLocal(paw); sw.position.copy(paw); sw.rotation.set(P.blade ?? 0.95, 0, 0); }
      else { BA.getWorldPosition(_t); g.worldToLocal(sw.position.copy(_t)); BA.getWorldQuaternion(_bq); g.getWorldQuaternion(_gq); sw.quaternion.copy(_gq.invert().multiply(_bq)); } }
    if (chair) { const rig = u.rig; if (rig) { if (rig.throwT > 0) rig.throwT = Math.max(0, rig.throwT - dt); const bt = rig.boots && rig.boots[0]; if (bt) bt.visible = !(f && f.shoeOut); } NW.hover(f && f.y > 0.05 ? 1 : 0); const NP = NW.update(dt, sp); g.rotation.y += NP.yaw; g.rotation.x += NP.tilt; g.position.y += NP.lift; }
    // CARTOON LAYER (s36c): hops, spins, squash + stretch, ear / tail flop — un-blended so it stays snappy
    const C = f && f.cart; if (C) { g.position.y += C.hop; g.rotation.y += C.spinY; g.rotation.z += C.spinZ; const q = clamp(C.sq, -0.6, 0.7);
      B.scale.set(1 + q * 0.2, 1 - q * 0.3, 1 + q * 0.2); FP.tail.rotation.y += C.tail; FP.tail.rotation.x -= C.hop * 0.5; FP.ears.forEach(e => { e.rotation.x += C.ear; }); FP.head.scale.setScalar(1 + Math.max(0, -q) * 0.06); }
    if (hasBack && !swOut && FP.tail) { const ry = FP.tail.rotation.y; FP.tail.rotation.y = TAIL_SIDE * (TAIL_B + Math.abs(ry) * 0.3) + ry * 0.25; } }
  const _l = new THREE.Vector3();
  function limb(kind, n) { if (chair) return sw.userData.tip.getWorldPosition(new THREE.Vector3()); if (kind === 'punch' || kind === 'slaps') return pawOf(n === 2 ? 1 : 0).clone(); const li = kind === 'kick' && n === 2 ? 1 : 0, Rl = LEGS[li]; if (Rl && Rl.Sg) return Rl.Sg.localToWorld(_l.set(0, -(0.42 - Rl.KN), 0.06)).clone(); return FP.legs[li].localToWorld(_l.set(0, -0.42, 0.06)).clone(); }
  return { g, U: { J: { heavy: false, head: FP.head } }, L: { ...FOX_L0, H: (FOX_L0.H + LU) * sc, hipY: FOX_L0.hipY + LU }, k: 1.0, R0, P: R0, sw, upd, fox: true, hw: (chair ? 0.48 : 0.34) * sc, gunTip, parts: FP, limb, noble: chair, nw: NW, makeShoe: chair ? () => NWK.makeShoe('shoe') : null, head: FP.head };
}

// ---------------- s37: RIG FIGHTERS · Iron Warden, Maker Prime, SUDS-9 (engine/bosses.js) + Slagback (engine/creature-kit.js) ----------------
// Same record as foxFighter, so every fox move, special and the cartoon layer just works. The duel's pose (fox-space hand / foot targets) is
// mapped onto the robot: targets are taken relative to the fox shoulder / hip and scaled by the robot's own arm / leg length, then a two-bone
// IK puts the upper arm + elbow (thigh + knee) on them. The robots keep everything built onto their arms. For their signature moves the
// model plays its own workshop pose instead (Warden's rocket fist really flies, Prime's laser eye, SUDS-9's spray and cyclone).
const RIGS = {
  warden: { sc: 0.84, H: 2.6, hw: 0.62, hand: 0.62, own: { beam: 'rocket', quake: 'stomp', taunt: 'taunt' }, ownT: { beam: 0.12, quake: 0.45 } },
  prime: { sc: 0.8, H: 2.72, hw: 0.7, hand: 0.85, own: { beam: 'laser', tatsu: 'combo', taunt: 'taunt' }, ownT: { beam: 0.0, tatsu: 0.2 } },
  suds: { sc: 0.9, H: 2.6, hw: 0.6, hand: 0.62, own: { spray: 'spray', tatsu: 'cyclone', taunt: 'taunt' }, ownT: { spray: 0.0, tatsu: 0.0 }, win: 'victory' },
  slag: { sc: 1.12, H: 2.35, hw: 0.55, hand: 0.42 },
};
export function rigFighter({ THREE, M, toon }, def) {
  const RD = RIGS[def.rig], grad = toon('#ffffff').gradientMap, g = new THREE.Group(); g.rotation.order = 'YXZ';
  let model, R, CRK = null; const slag = def.rig === 'slag';
  if (slag) { CRK = creatureKit({ THREE, toon, M }); model = CRK.build('Slagback'); const J = model.userData.joints; R = { hips: J.hips, chest: J.torso, head: J.head, arms: J.arms.map(a => ({ up: a.sh, el: a.el, s: a.s })), legs: J.legs.map(l => ({ th: l.p, s: l.s, one: true })) }; }
  else { model = (def.rig === 'warden' ? ironWarden : def.rig === 'prime' ? makerPrime : suds9)({ THREE, M, toon, grad }); R = model.userData.R; }
  model.scale.setScalar(RD.sc); g.add(model); model.updateMatrixWorld(true);
  const V = () => new THREE.Vector3(), wp = o => o.getWorldPosition(V());
  // rest measurements (g-space = world while g sits at the origin)
  const hip0 = R.hips.position.clone(), chest0 = R.chest.rotation.clone();
  const arms = R.arms.map(a => ({ ...a, a: a.el.position.length() * RD.sc, b: RD.hand * RD.sc, sh0: wp(a.up) }));
  const legs = R.legs.map(l => l.one ? { ...l, a: 0.8 * RD.sc, sh0: wp(l.th) } : { ...l, a: l.kn.position.length() * RD.sc, b: l.ft.position.length() * RD.sc, sh0: wp(l.th) });
  const armLen = arms[0].a + arms[0].b, legLen = legs[0].one ? legs[0].a : legs[0].a + legs[0].b, kA = armLen / 0.5, kL = (legs[0].sh0.y - 0.02) / 0.72;
  // the duel holds a 'sword' in the far paw: robots have none, so it's an empty holder at that hand (its tip = the reach point)
  const sw = new THREE.Object3D(); g.add(sw); const tip = new THREE.Object3D(); tip.position.y = 0.35; sw.add(tip); sw.userData.tip = tip;
  const gunTip = new THREE.Object3D(); if (def.rig === 'suds' && R.arms[0].noz) R.arms[0].noz.add(gunTip); else { R.head.add(gunTip); gunTip.position.set(0, 0.1, 0.4); }   // SUDS-9 fires from his hose hand
  const R0 = { hip: [0, 0, 0], lean: 0, twist: 0, side: 0, yaw: 0, pitch: 0, hL: [0.42, 0.8, 0.1], hR: [-0.42, 0.8, 0.1], eL: [1, 1, 0], eR: [-1, 1, 0], fL: [0.14, 0.05, 0], fR: [-0.14, 0.05, 0], kL: [0.5, 0.4, 1], kR: [-0.5, 0.4, 1], fYawL: 0, fYawR: 0, blade: 0.95, mood: 'determined', mouth: 0, vis: 'a', gun: 0 };
  const _a = V(), _b = V(), _c = V(), _d = V(), _h = V(), _u = V(), _e2 = V(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qg = new THREE.Quaternion();
  // aim a bone group so its local −y points along dir (world) with its local x on hinge (world)
  function orient(o, dir, hinge) { _e2.copy(dir).negate(); const X = _h.copy(hinge).addScaledVector(dir, -hinge.dot(dir)); if (X.lengthSq() < 1e-6) X.set(1, 0, 0).addScaledVector(dir, -dir.x); X.normalize(); const Z = _d.crossVectors(X, _e2).normalize(); _m.makeBasis(X, _e2, Z); _q.setFromRotationMatrix(_m); o.parent.getWorldQuaternion(_qp); o.quaternion.copy(_qp.invert().multiply(_q)); }
  function ik2(up, el, a, b, Tw, hinge, leg) { const S0 = wp(up); _a.copy(Tw).sub(S0); let d = _a.length(); const e1 = _a.normalize(); d = clamp(d, Math.abs(a - b) + 0.02, (a + b) * 0.995);
    const al = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)), ga = Math.acos(clamp((a * a + b * b - d * d) / (2 * a * b), -1, 1)), bend = Math.PI - ga;
    const h = _c.copy(hinge).addScaledVector(e1, -hinge.dot(e1)).normalize(), e2 = _b.crossVectors(h, e1), u = _u.copy(e1).multiplyScalar(Math.cos(al)).addScaledVector(e2, (leg ? -1 : 1) * Math.sin(al));
    orient(up, u, h); el.rotation.set(leg ? bend : -bend, 0, 0); }
  const hingeArm = V(), hingeLeg = V(), T = V(); let lastX = null, t = 0, pose0 = null, lastAct = null, lastHit = -9, crust = 0;
  const SH_F = s => [s * 0.21, 1.37, 0.0], HIP_F = s => [s * 0.14, 0.75, 0];
  function setPose(p, pt) { const U = model.userData; if (U.pose !== p) { U.pose = p; U.pt = pt || 0; } }
  function upd(P, dt, f) { t += dt; const U = model.userData, a = f && f.act, ak = a && a.kind;
    // which pose the model plays itself: a signature move, taunt, hurt, stunned, the win
    let own = null; if (a && RD.own && RD.own[ak] && !slag) { own = RD.own[ak]; if (a !== lastAct) { lastAct = a; U.pose = own; U.pt = (RD.ownT && RD.ownT[ak]) || 0; } }
    else lastAct = null;
    if (!slag) { if (own) {} else if (f && (f.daze > 0 || (f.stun > 0.3 && !a))) setPose('stunned'); else if (f && f.hitT != null && (f.hitAge ?? 9) < 0.35 && !a) { if (f.hitT !== lastHit) { lastHit = f.hitT; U.pose = 'hurt'; U.pt = 0; } }
      else if (RD.win && P.mood === 'happy' && f && f.winOn) setPose(RD.win); else setPose('stance'); U.idle(t, dt); }
    else { const st = a && (ak === 'quake') ? (a.fired ? 'attack' : 'windup') : f && f.daze > 0 ? 'stagger' : 'idle'; if (st !== pose0) { pose0 = st; U.st0 = t; } CRK.animate(model, st, t - (U.st0 || 0), dt); U.events.length = 0;
      const want = f && f.hpMax ? (f.hp < f.hpMax * 0.34 ? 2 : f.hp < f.hpMax * 0.67 ? 1 : 0) : 0; if (f && f.hp >= f.hpMax) { U.crustLvl = 0; crust = 0; } while (crust < want) { crust++; CRK.enter(model, 'armorBreak'); U.events.length = 0; } }
    if (own) { applyCart(f); return; }
    // body: hips (crouch), chest lean / twist, head look
    const hip = P.hip || [0, 0, 0]; R.hips.position.set(hip0.x + hip[0] * kL / RD.sc, hip0.y + hip[1] * kL / RD.sc, hip0.z + hip[2] * kL / RD.sc);
    R.chest.rotation.set(chest0.x + (P.lean || 0) * 0.85, (P.twist || 0) * 0.5, -(P.side || 0) * 0.6); R.head.rotation.set((P.pitch || 0) * 0.8 - (P.lean || 0) * 0.3, (P.yaw || 0) - (P.twist || 0) * 0.5, 0);
    g.updateMatrixWorld(true);
    hingeArm.set(1, 0, 0).transformDirection(R.chest.matrixWorld); hingeLeg.set(1, 0, 0).transformDirection(R.hips.matrixWorld);
    // arms: +x arm gets the (mirrored) far-paw target hR, −x arm the near-paw target hL (same rule as the fox)
    for (const A of arms) { const src = A.s > 0 ? P.hR : P.hL, sF = SH_F(A.s); T.set(A.sh0.x + (-src[0] - sF[0]) * kA, A.sh0.y + (src[1] - sF[1]) * kA, A.sh0.z + (src[2] - sF[2]) * kA); g.localToWorld(T); ik2(A.up, A.el, A.a, A.b, T, hingeArm, false); }
    for (const Lg of legs) { const src = Lg.s < 0 ? P.fR : P.fL, hF = HIP_F(Lg.s); T.set(Lg.sh0.x + (src[0] - hF[0]) * kL, Math.max(0.02, Lg.sh0.y + (src[1] - hF[1]) * kL), Lg.sh0.z + (src[2] - hF[2]) * kL); g.localToWorld(T);
      if (Lg.one) { const S0 = wp(Lg.th); _a.copy(T).sub(S0); const d = _a.length(); orient(Lg.th, _a.normalize(), hingeLeg); Lg.th.scale.y = clamp(d / Lg.a, 0.75, 1.2); }
      else { ik2(Lg.th, Lg.kn, Lg.a, Lg.b, T, hingeLeg, true); g.getWorldQuaternion(_qg); Lg.kn.updateMatrixWorld(true); Lg.kn.getWorldQuaternion(_qp); Lg.ft.quaternion.copy(_qp.invert().multiply(_qg)); if (Lg.rod) Lg.rod.scale.y = 1 + Lg.kn.rotation.x * 0.25; } }
    // the holder 'sword' sits in the far (+x) hand
    g.updateMatrixWorld(true); const fa = arms.find(A => A.s > 0); fa.el.localToWorld(_b.set(0, -RD.hand, 0)); g.worldToLocal(_b); sw.position.copy(_b); sw.rotation.set(P.blade ?? 0.95, 0, 0);
    applyCart(f); }
  function applyCart(f) { const C = f && f.cart; model.scale.setScalar(RD.sc); if (!C) return; g.position.y += C.hop * 0.7; g.rotation.y += C.spinY; g.rotation.z += C.spinZ * 0.6; const q = clamp(C.sq, -0.6, 0.7) * 0.6; model.scale.set(RD.sc * (1 + q * 0.2), RD.sc * (1 - q * 0.3), RD.sc * (1 + q * 0.2)); }
  const _l = V();
  function limb(kind) { const A = arms.find(x => x.s < 0), Lg = legs[0]; if (kind === 'punch' || kind === 'slaps') return A.el.localToWorld(_l.set(0, -RD.hand, 0)).clone(); return Lg.one ? Lg.th.localToWorld(_l.set(0, -0.8, 0)).clone() : Lg.ft.getWorldPosition(_l).clone(); }
  model.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return { g, U: { J: { heavy: true, head: R.head } }, L: { ...FOX_L0, H: RD.H }, k: 1.0, R0, P: R0, sw, upd, fox: true, rig: def.rig, hw: RD.hw, gunTip, nozTip: gunTip, parts: null, limb, head: R.head, model, R };
}

// ---------------- SUDS-9 · THE WINDOW CLEANER ----------------
// Local frame like every duel fighter: faces +z, its +x side faces the camera once the duel turns it to face Ben (rotation.y = −π/2).
export const SUDS_L = { H: 2.75, hipY: 0.95, torsoL: 1.2, footH: 0.06 };
export function makeSuds9({ THREE, M, toon, glowTex, canvasTex, scene, touch }) {
  const B = toon('#4a4e55'), D = toon('#1f2226'), R = toon('#ec3013'), Y = toon('#ffd23a'), ST = toon('#9aa3ad'), TK = toon('#2e7fb8'), GL = toon('#9fe8ff', { emissive: 0x2a7fa8, emissiveIntensity: 0.6 });
  const E = new THREE.MeshBasicMaterial({ color: 0xff2a1a }); E.userData.noFl = true;
  const Bx = (w, h, d) => new THREE.BoxGeometry(w, h, d), Cy = (r, h, n = 14, r2 = r) => new THREE.CylinderGeometry(r2, r, h, n);
  const g = new THREE.Group(); g.rotation.order = 'YXZ'; const root = new THREE.Group(); g.add(root); let plate = null; const eyes = [];
  const hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips);
  const legs = [-1, 1].map(s => { const lg = new THREE.Group(); lg.position.set(s * 0.4, 0.95, 0); root.add(lg); M(new THREE.CapsuleGeometry(0.17, 0.46, 4, 10), D, 0, -0.42, 0, lg, 0.025);
    M(new THREE.SphereGeometry(0.2, 12, 8), B, 0, -0.42, 0.05, lg, 0.02, 0.2).scale.set(1, 0.8, 1); const ft = M(Bx(0.46, 0.2, 0.7), B, 0, -0.86, 0.1, lg, 0.025); M(Bx(0.48, 0.06, 0.72), Y, 0, -0.95, 0.1, lg, 0); return lg; });
  M(Bx(1.0, 0.32, 0.66), D, 0, 0.05, 0, hips, 0.02);
  const torso = new THREE.Group(); torso.position.y = 0.18; hips.add(torso);
  M(Bx(1.5, 1.25, 1.0), B, 0, 0.72, 0, torso, 0.04); M(Bx(1.53, 0.17, 1.03), R, 0, 1.12, 0, torso, 0); M(Bx(1.53, 0.07, 1.03), D, 0, 0.18, 0, torso, 0);
  { const t = canvasTex(256, 96, c => { c.fillStyle = '#1f2226'; c.fillRect(0, 0, 256, 96); c.strokeStyle = '#ffd23a'; c.lineWidth = 6; c.strokeRect(5, 5, 246, 86); c.fillStyle = '#f3f2f2'; c.font = '900 54px Archivo, Arial Black, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SUDS-9', 128, 52); });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.36), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })); pl.position.set(0, 0.62, 0.505); torso.add(pl); plate = pl; }
  for (const s of [-1, 1]) { M(new THREE.SphereGeometry(0.3, 14, 10), D, s * 0.86, 1.15, 0, torso, 0.025, 0.3); for (let i = 0; i < 3; i++) M(Bx(0.04, 0.5, 0.8), D, s * 0.765, 0.55 + i * 0.001, 0, torso, 0).position.y = 0.5 + i * 0.18; }
  // soap tank on the back + its glowing level window + pipe to the nozzle shoulder
  M(Cy(0.32, 1.05, 16), TK, 0, 0.78, -0.7, torso, 0.025, 0.32); for (const y of [0.4, 1.15]) M(new THREE.TorusGeometry(0.33, 0.03, 6, 20), ST, 0, y, -0.7, torso, 0).rotation.x = Math.PI / 2;
  M(Bx(0.1, 0.6, 0.06), GL, 0, 0.78, -1.02, torso, 0); M(Cy(0.08, 0.2, 10), D, 0, 1.37, -0.7, torso, 0.01);
  { const p = M(Cy(0.05, 1.0, 8), D, -0.55, 1.25, -0.45, torso, 0.008); p.rotation.set(0.6, 0, 1.1); }
  // head: box, angry eyes (slanted bars, inner ends low) under slanted brows, mouth grille, visor strip, beacon
  const head = new THREE.Group(); head.position.y = 1.38; torso.add(head); M(Cy(0.16, 0.16, 10), D, 0, 0.04, 0, head, 0.01);
  M(Bx(0.82, 0.62, 0.72), B, 0, 0.42, 0, head, 0.035); M(Bx(0.72, 0.09, 0.06), R, 0, 0.7, 0.34, head, 0.01);
  for (const s of [-1, 1]) { const e = M(Bx(0.22, 0.075, 0.04), E, s * 0.16, 0.46, 0.37, head, 0); e.rotation.z = s * 0.42; eyes.push(e); const br = M(Bx(0.26, 0.06, 0.05), D, s * 0.16, 0.57, 0.375, head, 0); br.rotation.z = s * 0.55; M(Bx(0.08, 0.2, 0.3), D, s * 0.44, 0.42, 0, head, 0.012); }
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
    // hit jolt: every landed hit snaps him back (torso + head whip, eyes flare white-red), then he settles (f.hitAge is set by the duel each frame)
    const j = f.hitT != null && down <= 0 ? clamp(1 - (f.hitAge ?? 9) / 0.22, 0, 1) * (f.hitK || 1) : 0;
    if (j > 0) { torso.rotation.x -= 0.34 * j; head.rotation.x -= 0.5 * j; head.rotation.z = Math.sin(t * 70) * 0.1 * j; root.position.z -= 0.25 * j; E.color.setRGB(1, 0.75 * j, 0.6 * j); eyeGlow.material.opacity = 0.95; }
    if (rig) { const gx = clamp(down > 0 ? rig.x : f.x, rig.x0, rig.x1); rig.x = down > 0 ? rig.x : lerp(rig.x, gx, Math.min(1, dt * 1.6)); if (P.rise < 1 || down > 0) rig.x = clamp(f.x, rig.x0, rig.x1);
      rig.set(rig.x, gY, gTilt, gZ, fall > 0.45); }
    // warnings: a strip on the floor (JUMP) and a bar at head height (DUCK), both in front of him
    const fx = f.x - 0.6, L = 3.2; warnL.position.set(fx - L / 2, 0.025, 0); warnL.scale.set(L, 1, 1); warnL.material.opacity = P.warnL * (0.6 + 0.3 * Math.sin(t * 30)); warnL.visible = P.warnL > 0.01; warnL.material.map.offset.x = -t * 2;
    warnH.position.set(fx - L / 2, 2.25, 0.3); warnH.scale.set(L, 1, 1); warnH.material.opacity = P.warnH * (0.6 + 0.3 * Math.sin(t * 30)); warnH.visible = P.warnH > 0.01; warnH.material.map.offset.x = -t * 2; }
  // ---- BRAWL FX (s36c): bolts / nuts / panels fly off on hits, the head spins round, the head squashes on a BONK, damage per phase (plate hanging, wire, cracked eye, smoke) ----
  const tankTip = new THREE.Object3D(); tankTip.position.set(0, 1.4, -0.7); torso.add(tankTip); const sparkAt = new THREE.Object3D(); sparkAt.position.set(0.86, 1.2, 0.2); torso.add(sparkAt);
  const DB = [], dbM = [toon('#9aa3ad'), toon('#ffd23a'), B, D], dbG = [new THREE.CylinderGeometry(0.06, 0.06, 0.04, 6), new THREE.BoxGeometry(0.03, 0.14, 0.03), new THREE.BoxGeometry(0.22, 0.03, 0.16), new THREE.TorusGeometry(0.05, 0.015, 4, 8)];
  for (let i = 0; i < (touch ? 14 : 24); i++) { const m = new THREE.Mesh(dbG[i % 4], dbM[i % 4]); m.visible = false; scene.add(m); DB.push({ m, v: new THREE.Vector3(), w: new THREE.Vector3(), life: 0 }); } let dbI = 0;
  const smM = new THREE.SpriteMaterial({ map: glowTex, color: 0x3a3a40, transparent: true, depthWrite: false, opacity: 0 }), SM = Array.from({ length: 10 }, () => { const s = new THREE.Sprite(smM.clone()); s.visible = false; scene.add(s); return { s, life: 0, v: 0 }; }); let smI = 0, smT = 0;
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, c => { c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.beginPath(); c.moveTo(6, 8); c.lineTo(26, 30); c.lineTo(18, 40); c.lineTo(40, 58); c.moveTo(26, 30); c.lineTo(50, 22); c.stroke(); }), transparent: true, depthWrite: false })); crack.position.set(0.16, 0.46, 0.4); crack.visible = false; head.add(crack);
  const wire = M(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 5), toon('#ffd23a'), 0.95, 0.85, 0.3, torso, 0); wire.visible = false;
  let spinT = -9, bonkT = -9, dmg = 0, clock = 0;
  function debris(n, k = 1, dir = 1) { const p = new THREE.Vector3(); torso.getWorldPosition(p); p.y += 0.7; for (let i = 0; i < n; i++) { const q = DB[dbI = (dbI + 1) % DB.length]; q.m.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.8, (Math.random() - 0.5) * 0.5)); q.v.set(dir * (1.5 + Math.random() * 3) * k, (3 + Math.random() * 4) * k, (Math.random() - 0.2) * 3); q.w.set(Math.random() * 20, Math.random() * 20, Math.random() * 20); q.life = 1.6; q.m.visible = true; } }
  function setDamage(n) { dmg = n; if (plate) { plate.rotation.z = n >= 2 ? 0.45 : 0; plate.position.set(n >= 2 ? 0.12 : 0, n >= 2 ? 0.5 : 0.62, 0.505); } wire.visible = n >= 2; crack.visible = n >= 3; if (eyes[1]) eyes[1].scale.x = n >= 3 ? 0.55 : 1; }
  function fx(dt) { clock += dt;
    for (const q of DB) { if (q.life <= 0) continue; q.life -= dt; q.v.y -= 14 * dt; q.m.position.addScaledVector(q.v, dt); if (q.m.position.y < 0.03) { q.m.position.y = 0.03; q.v.y *= -0.35; q.v.x *= 0.6; q.v.z *= 0.6; q.w.multiplyScalar(0.6); } q.m.rotation.x += q.w.x * dt; q.m.rotation.y += q.w.y * dt; q.m.rotation.z += q.w.z * dt; if (q.life <= 0) q.m.visible = false; }
    if (dmg >= 3) { smT -= dt; if (smT <= 0) { smT = 0.14; const q = SM[smI = (smI + 1) % SM.length], p = new THREE.Vector3(); head.getWorldPosition(p); q.s.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.75, (Math.random() - 0.5) * 0.3)); q.life = 1.2; q.s.visible = true; } }
    for (const q of SM) { if (q.life <= 0) continue; q.life -= dt; q.s.position.y += dt * 0.9; q.s.position.x += dt * 0.5; q.s.scale.setScalar(0.3 + (1.2 - q.life) * 0.7); q.s.material.opacity = Math.min(0.6, q.life * 0.6); if (q.life <= 0) q.s.visible = false; }
    const sa = clock - spinT; if (sa < 0.6) head.rotation.y += ss(sa / 0.6) * Math.PI * 2;
    const ba = clock - bonkT; head.scale.set(1, 1, 1); if (ba < 0.25) { const k = Math.sin(ba / 0.25 * Math.PI); head.scale.set(1 + 0.25 * k, 1 - 0.4 * k, 1 + 0.25 * k); }
    if (dmg >= 2) wire.rotation.z = Math.sin(clock * 9) * 0.4; }
  // s37 (Ben): the boss wears his NEW workshop body (engine/bosses.js suds9). The old rig above still runs the boss (poses, gondola, warnings,
  // debris) but is hidden; every frame the new body copies its crouch, lean, head and legs, the squeegee hand points where the old pole pointed and
  // the hose hand where the old nozzle pointed. The bubbles leave from the hose hand, the sweeps reach from the squeegee.
  const NB = suds9({ THREE, M, toon, grad: toon('#ffffff').gradientMap }), NR = NB.userData.R, NSC = 0.95; NB.scale.setScalar(NSC);
  g.traverse(o => { if ((o.isMesh || o.isSprite) && o !== warnL && o !== warnH) o.visible = false; }); root.add(NB); NB.traverse(m => { if (m.isMesh) m.castShadow = !touch; });
  const nh0 = NR.hips.position.y, DN = new THREE.Vector3(0, -1, 0), _dir = new THREE.Vector3(), _eu = new THREE.Euler(0, 0, 0, 'YXZ');
  if (NR.arms[0].noz) { NR.arms[0].noz.add(nozTip); nozTip.position.set(0, 0, 0); } if (NR.arms[1].sqTip) { NR.arms[1].sqTip.add(tip); tip.position.set(0, 0, 0); }
  let nt = 0, lastHitT = null;
  function skin(P, dt, f) { nt += dt; const U = NB.userData, down = (P.down || 0) > 0;
    const want = down ? 'hurt' : f.daze > 0 || f.stun > 0.3 ? 'stunned' : P.mood === 'happy' ? 'victory' : 'stance'; if (f.hitT != null && f.hitT !== lastHitT && !down) { lastHitT = f.hitT; U.pose = 'hurt'; U.pt = 0; } else if (U.pose !== want && !(U.pose === 'hurt' && U.pt < 0.5)) { U.pose = want; U.pt = 0; }
    U.idle(nt, dt);
    NR.hips.position.y = nh0 + (hips.position.y - 0.95) / NSC; NR.chest.rotation.set(torso.rotation.x, torso.rotation.y, torso.rotation.z); NR.head.rotation.set(head.rotation.x, head.rotation.y, head.rotation.z); NR.head.scale.copy(head.scale);
    NR.legs.forEach((l, i) => { const lr = legs[i].rotation.x, c = clamp(0.95 - hips.position.y, 0, 0.5); l.th.rotation.set(lr - c * 0.9, 0, l.s * 0.12); l.kn.rotation.x = c * 1.8; l.ft.rotation.x = -(lr - c * 0.9) - c * 1.8; });
    const aim = (A, o) => { _eu.set(o.rotation.x, o.rotation.y, o.rotation.z || 0, 'YXZ'); _dir.set(0, 0, 1).applyEuler(_eu).normalize(); A.up.quaternion.setFromUnitVectors(DN, _dir); A.el.rotation.set(-0.25, 0, 0); };
    aim(NR.arms[1], shR); aim(NR.arms[0], shL); }
  const upd0 = upd; function updB(P, dt, f) { upd0(P, dt, f); fx(dt); skin(P, dt, f); }
  return { g, U: { J: { heavy: false, head } }, L: SUDS_L, k: 1.45, R0, P: R0, sw, upd: updB, robot: true, hw: 0.82, nozTip, sqTip: tip, setRig(r) { rig = r; }, eyeMat: E,
    debris, setDamage, headSpin() { spinT = clock; }, bonked() { bonkT = clock; }, tankTip, sparkAt };
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
  if (f.stun > 0 && S.t - (f.trip ?? -9) < 1.0) { const w = Math.sin(S.t * 14); return { ...B, crouch: 0.32, lean: 0.38 + w * 0.05, lgL: 0.7, lgR: -0.55, aP: 0.95, aY: 1.0, nP: 1.1, hP: 0.35, hY: w * 0.25, eye: Math.random() < 0.3 ? 0.3 : 1.2 }; }
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

// ---------------- CARTOON LAYER for the fox (s36c) ----------------
// Little arms and legs, so the whole body sells every move: hop-punches (jab · hook · big uppercut), a speed-bag FLURRY,
// spin kick with a tail whip, spinning low sweep, drill AIR KICK, jump-spin SWORD slash, squash before / stretch on impact, wobble on landing.
// Pure: reads the fighter + duel state, returns { hop, spinY, spinZ, sq, tail, ear }. Not recorded in the KO replay (that shows the plain pose).
const wob = (age, amp, f = 26, k = 7) => age < 0 || age > 0.6 ? 0 : amp * Math.exp(-age * k) * Math.cos(age * f);
export function foxCartoonOf(f, S) {
  const o = { hop: 0, spinY: 0, spinZ: 0, spinX: 0, sq: 0, tail: 0, ear: 0 }, a = f.act, t = S.t, TAU = Math.PI * 2;
  const id = f.R && f.R.id;
  // s36g: held / thrown (flail), taunts, win poses, throws
  if (f.held || f.tossed) { o.sq = Math.sin(t * 34) * 0.12; o.ear = 0.7; o.tail = Math.sin(t * 22) * 1.1; return o; }
  if (f.winOn && f.winAt != null) { const g = t - f.winAt;
    if (id === 'ben') { o.hop = Math.abs(Math.sin(g * 5)) * (g < 3 ? 0.22 : 0.1); o.tail = Math.sin(g * 10) * 0.9; o.ear = o.hop; }
    else if (id === 'michelle') { const u = clamp(g / 0.9, 0, 1); o.spinY = -ss(u) * TAU; o.hop = Math.sin(u * Math.PI) * 0.35; o.tail = Math.sin(g * 6) * 0.6; }
    else if (id === 'max') { o.hop = g < 0.5 ? Math.sin(g / 0.5 * Math.PI) * 0.55 : 0; o.sq = wob(g - 0.5, 0.45); o.tail = Math.sin(g * 9) * 0.7; }
    else if (id === 'might') { o.sq = wob(g - 0.15, 0.5, 18, 5) - 0.12; o.tail = Math.sin(g * 3) * 0.4; }
    else if (id === 'noble') { o.hop = Math.abs(Math.sin(g * 4)) * 0.12; }
    return o; }
  if (a && a.kind === 'roll') { const u = clamp(a.t / a.dur, 0, 1); o.sq = 0.35; o.ear = -0.4; return o; }
  if (a && a.kind === 'taunt') { const u = a.t;
    if (id === 'michelle') { o.spinY = -ss(clamp(u / 0.6, 0, 1)) * TAU; o.ear = 0.3; }
    else if (id === 'max') o.hop = Math.abs(Math.sin(u * 16)) * 0.16;
    else if (id === 'might') o.sq = -0.3 * Math.sin(clamp(u / 0.5, 0, 1) * Math.PI);
    else if (id === 'noble') o.hop = Math.abs(Math.sin(u * 14)) * 0.1;
    else { o.tail = Math.sin(u * 14) * 1.0; o.hop = Math.abs(Math.sin(u * 7)) * 0.08; }
    return o; }
  if (a && a.kind === 'throw') { const u = a.t;
    if (a.heavy) { o.sq = 0.32 + Math.sin(t * 46) * 0.08; o.ear = -0.4; return o; }
    if (a.mode === 'slam') { o.sq = u < 0.5 ? 0.25 : u < 0.66 ? -0.35 : wob(u - 0.66, 0.45); o.hop = u > 0.45 && u < 0.62 ? Math.sin((u - 0.45) / 0.17 * Math.PI) * 0.45 : 0; }
    else { o.sq = u < 0.22 ? 0.3 : u < 0.62 ? -0.15 : wob(u - 0.62, 0.35); o.tail = u > 0.22 && u < 0.7 ? 1.0 : 0; }
    return o; }
  if (f.noble) { o.sq = wob(t - (f.landT ?? -9), 0.3) + wob(t - (f.hitT ?? -9), -0.2, 30, 9); if (a && a.kind === 'ram') o.sq -= 0.2; if (a && a.kind === 'slaps') o.hop = Math.abs(Math.sin(a.t * 28)) * 0.08; return o; }
  o.sq += wob(t - (f.landT ?? -9), 0.55); o.sq += wob(t - (f.hitT ?? -9), -0.35, 30, 9);
  if (!a && Math.abs(f.vx) > 0.3 && f.y < 0.05) o.hop = Math.abs(Math.sin(t * 11)) * 0.07;
  if (!a && f.y < 0.05 && !f.down) o.sq += Math.sin(t * 3.1) * 0.03;
  if (a && a.kind === 'slaps') { if (a.t < 0.6) { const ph = (a.t % 0.11) / 0.11; o.hop = Math.sin(ph * Math.PI) * 0.34; o.sq = ph < 0.2 ? 0.3 : -0.15; }
    else { const r = clamp((a.t - 0.6) / 0.24, 0, 1), s2 = clamp((a.t - 0.84) / 0.1, 0, 1); o.hop = Math.sin(r * Math.PI * 0.5) * 1.1 * (1 - s2); o.spinY = -ss(r) * TAU; o.sq = s2 > 0 ? 0.6 * Math.sin(s2 * Math.PI) : -0.3 * r; } o.ear = o.hop * 0.8; return o; }
  if (a && a.d) { const d = a.d, w = d.w * (a.slow || 1), tot = w + d.a + d.r * (a.slow || 1), u = a.t, pr = clamp(u / Math.max(w, 0.01), 0, 1), after = u - w, strike = u >= w;
    if (a.kind === 'punch') { const n = a.n || 1, H = [0.03, 0.05, 0.7][n - 1]; o.hop = n === 3 ? (strike ? Math.sin(clamp((u - w) / (tot - w), 0, 1) * Math.PI) * H : 0) : Math.sin(clamp(u / tot, 0, 1) * Math.PI) * H; o.sq = strike ? (n === 3 ? -0.5 : -0.18) : 0.22 * pr; if (n === 3) o.spinZ = 0; }   // s46: jab / cross stay planted (the arm does the work); the uppercut still launches
    else if (a.kind === 'kick' && a.n === 3) { o.spinY = -ss(clamp(u / (w + d.a * 0.6), 0, 1)) * TAU; o.hop = Math.sin(clamp(u / tot, 0, 1) * Math.PI) * 0.12; o.sq = strike ? -0.15 : 0.2 * pr; o.tail = Math.sin(clamp(u / tot, 0, 1) * Math.PI) * 1.4; o.ear = 0.3; }   // s48 spinning ROUNDHOUSE
    else if (a.kind === 'kick') { o.hop = Math.sin(clamp(u / tot, 0, 1) * Math.PI) * 0.04; o.sq = strike ? -0.12 : 0.15 * pr; o.tail = Math.sin(clamp(after / 0.3, 0, 1) * Math.PI) * 1.0; }   // s46: no spin, so the side kick reads in profile
    else if (a.kind === 'sweep') { o.spinY = -ss(clamp((u - w * 0.3) / (d.a + 0.15), 0, 1)) * TAU; o.sq = 0.45; o.tail = 0.9 * Math.sin(clamp(after / 0.3, 0, 1) * Math.PI); }
    else if (a.kind === 'akick') { const st = a.style || 'drill'; if (st === 'drill' && a.ph === 'a') o.spinZ = after * 26; o.sq = st === 'splash' ? 0.3 : st === 'stomp' ? -0.2 : -0.1; }   // s61: only Noble's drill spins
    else if (a.kind === 'spin' || a.kind === 'spinR') { const k2 = strike ? ss(clamp(after / (d.a + 0.12), 0, 1)) : 0; o.spinY = strike ? lerp(TAU * 0.12, -TAU, k2) : TAU * 0.12 * pr; o.hop = strike ? Math.max(0, 0.3 - after) * (a.kind === 'spin' ? 1.4 : 1) : 0; o.sq = strike ? -0.25 : 0.35 * pr; o.tail = strike ? 0.9 * (1 - k2) : 0; o.ear = o.hop; }
    else if (a.kind === 'lspin') { o.spinY = strike ? -ss(clamp(after / 0.3, 0, 1)) * TAU : 0; o.sq = 0.45; }
    else if (a.kind === 'high' || a.kind === 'power') { const big = a.kind === 'power' ? 1.35 : 1; o.hop = (strike ? Math.max(0, 1 - after / (d.a * 0.7)) : Math.sin(pr * Math.PI * 0.5)) * 0.8 * big; o.spinY = -ss(pr) * TAU * (a.kind === 'power' ? 2 : 1); o.sq = strike ? (after < d.a ? -0.4 : 0.6 * Math.max(0, 1 - (after - d.a) / 0.2)) : 0.35 * (1 - pr) - 0.2 * pr; o.ear = o.hop; }
    else if (a.kind === 'low') { o.spinY = -ss(pr) * Math.PI; o.sq = 0.45; if (strike) o.spinY = -Math.PI - ss(clamp(after / 0.2, 0, 1)) * Math.PI; } }
  if (a && a.kind === 'tatsu') { o.spinY = -a.t * 30; o.sq = -0.15; o.tail = 0.8; o.ear = 0.3; return o; }
  if (a && a.kind === 'beam') { o.sq = a.t < 0.24 ? 0.4 * ss(clamp(a.t / 0.2, 0, 1)) : -0.35 * Math.max(0, 1 - (a.t - 0.24) / 0.3); return o; }
  if (a && a.kind === 'bonk') o.sq = a.t > 0.2 && a.t < 0.6 ? 0.35 * Math.abs(Math.sin(a.t * 18)) : -0.2;
  if (f.stun > 0 && !a) o.sq += Math.sin(t * 30) * 0.06;
  o.ear += o.hop * 0.6; return o;
}

// ---------------- s36g: what each fox says (taunt · win quote · arcade ending) ----------------
export const FOX_LINES = {
  ben: { taunt: 'COME ON!', win: "PEARL SAIL'S SAFE!", end: ['SUDS-9 went over the edge with his gondola. The Pearl Sail has never been this clean.', 'Down below, Meru switched its lights on, one street at a time.', 'Ben kept the squeegee. Just in case.'] },
  hope: { taunt: 'TOO LOUD!', win: 'I HEARD THAT COMING.', end: ['Hope heard the last gear in SUDS-9 grind a full second before anyone saw it fall.', 'She planted her cane on the helipad and vaulted onto the railing, just to feel the wind.', 'Now she narrates the Pearl Sail sky tour. It is the best one in Meru.'] },
  noble: { taunt: 'HONK HONK!', win: 'WHEELS UP!', end: ['Noble rolled to the edge and watched the gondola sink into the clouds.', 'His wheels were still crackling with sparks. He honked twice. For luck.', 'The Shoemerang got a new lace and a spot on the trophy shelf.'] },
  might: { taunt: 'IS THAT ALL?', win: 'THE CROWN STAYS ON.', end: ['The King straightened his crown on the helipad. "This roof is under the crown\'s protection."', 'All of Meru cheered from forty floors below.', 'That night he washed the palace windows himself. By hand. He insisted.'] },
  michelle: { taunt: 'TOO SLOW!', win: 'TRY TO KEEP UP!', end: ['Michelle fixed her tiara and took one last look at the sunset.', '"Too slow," she told the empty gondola rails.', 'The Pearl Sail named its new skylight after her.'] },
  sumo: { taunt: 'COME, LITTLE ONE!', win: 'THE RING IS MINE!', end: ['Oyakata threw a handful of salt over the helipad to clean the ring.', 'Then he sat down. The whole roof shook. SUDS-9 never stood a chance.', 'Kyoto sent him a new mawashi, in Pearl Sail blue.'] },
  barnacle: { taunt: 'COME AND GET IT!', win: 'HEAVY LIFTING!', end: ['Barnacle picked up what was left of SUDS-9 like a crate on a pallet.', 'He sold the scrap to the Salt Building. Twice.', 'The bandits still sing a song about it. It is not a good song.'] },
  jack: { taunt: 'TOO HOT FOR YOU?', win: 'SPICY!', end: ['Jalapeño Jack tipped his hat to the empty gondola.', 'He left one red pepper on the helipad, so they would know who did it.', 'Nobody on the Pearl Sail has dared to eat it.'] },
  rook: { taunt: 'STAY RIGHT THERE.', win: 'NEVER MISSED.', end: ['Rook blew the smoke off his laser and looked out over Meru.', '"Good view," he said. "Good place for a hideout."', 'The Pearl Sail changed every lock on the building that night.'] },
  lox: { taunt: 'HIT ME. I DARE YOU.', win: 'KNOCKOUT!', end: ['Lox stood over the gondola rails, gloves up, breathing hard.', 'Luxor will hear about this. Every word.', 'He hung SUDS-9\'s squeegee on the wall of his throne room. It is still there.'] },
  warden: { taunt: 'INTRUDER DETECTED.', win: 'ARENA SECURED.', end: ['The Iron Warden stomped once on the helipad. Every window in the Pearl Sail rattled.', 'It scanned the horizon for the next challenger. None came.', 'The Meru Arena put it back on guard duty. It now waves at the crowd.'] },
  prime: { taunt: 'YOU WILL BE REBUILT.', win: 'PRODUCTION COMPLETE.', end: ['Maker Prime lifted SUDS-9 in its claw and carried it home to the factory.', 'Three days later a new window cleaner rolled out. It was very polite.', 'The Pearl Sail has never been cleaner. Or more nervous.'] },
  suds: { taunt: 'PLEASE HOLD STILL FOR CLEANING.', win: 'SURFACE CLEAN. HAVE A NICE DAY.', end: ['SUDS-9 cleaned the helipad until it shone like a mirror.', 'Then he cleaned the gondola. Then the moon, as far as his pole would reach.', 'The Pearl Sail gave him a raise: one extra bucket.'] },
  slag: { taunt: 'BURN.', win: 'MELT.', end: ['Slagback stood on the helipad, glowing in the dark like a sunset that never ended.', 'Where it walked, the roof tiles turned to glass.', 'Meru calls the Pearl Sail the Lava Tower now. Nobody argues.'] },
  shadow: { taunt: 'YOU CANNOT BEAT YOURSELF.', win: 'I AM YOUR SHADOW.', end: ['Shadow Ben stood alone on the roof.', 'Below, the city lights went out one by one.', 'Somewhere, the real Ben woke up and decided to train harder.'] },
};

// ---------------- s36g: BONUS STAGE · the SUDS CO. cleaning cart (smash it before the timer runs out) ----------------
// Same record as a duel fighter (g, U, L, k, R0, P, sw, upd, hw) so every move, beam and comic word just works on it. prop: true = no brain, no moving.
// Local frame like the fighters: front = +z (turned to face Ben), +x side faces the camera. Parts pop off as it loses health.
export function makeBonusCar({ THREE, M, toon, glowTex, canvasTex }) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ'; const body = new THREE.Group(); g.add(body);
  const blue = toon('#2b6fd6', {}), white = toon('#eef2f6', {}), dark = toon('#23272f', {}), glass = toon('#9fd8ff', { emissive: 0x1a3a5a }), amber = toon('#ffb020', { emissive: 0x8a4a00 }), rub = toon('#18181c', {}), chrome = toon('#cfd6de', {}), red = toon('#ec3013', {});
  M(new THREE.BoxGeometry(1.3, 0.55, 2.3), blue, 0, 0.62, 0, body, 0.02);
  M(new THREE.BoxGeometry(1.33, 0.1, 2.33), white, 0, 0.92, 0, body, 0.008);
  const cab = M(new THREE.BoxGeometry(1.18, 0.62, 1.15), white, 0, 1.28, -0.38, body, 0.02);
  M(new THREE.BoxGeometry(1.22, 0.06, 1.2), dark, 0, 1.62, -0.38, body, 0.008);
  const ws = M(new THREE.BoxGeometry(1.0, 0.4, 0.04), glass, 0, 1.3, 0.21, body, 0); ws.rotation.x = -0.2;
  for (const z of [-0.65, -0.12]) M(new THREE.BoxGeometry(0.04, 0.34, 0.42), glass, 0.6, 1.3, z, body, 0);
  // the face: big headlight eyes + a grille grin
  const eyes = [], pupils = [];
  for (const sx of [-1, 1]) { const e = M(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 20), white, sx * 0.36, 0.72, 1.16, body, 0.012); e.rotation.x = Math.PI / 2; eyes.push(e); const pp = M(new THREE.CylinderGeometry(0.08, 0.08, 0.07, 14), dark, sx * 0.36, 0.72, 1.19, body, 0); pp.rotation.x = Math.PI / 2; pupils.push(pp); }
  M(new THREE.BoxGeometry(0.62, 0.12, 0.05), dark, 0, 0.47, 1.16, body, 0.006);
  for (let i = -2; i <= 2; i++) M(new THREE.BoxGeometry(0.03, 0.1, 0.06), chrome, i * 0.11, 0.47, 1.17, body, 0);
  // the door sign
  const signT = canvasTex(256, 96, c => { c.fillStyle = '#eef2f6'; c.fillRect(0, 0, 256, 96); c.fillStyle = '#ec3013'; c.fillRect(0, 70, 256, 26); c.fillStyle = '#201e1d'; c.font = '900 44px Archivo, Arial Black, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SUDS CO.', 128, 36); c.fillStyle = '#fff'; c.font = '800 16px Archivo, Arial, sans-serif'; c.fillText('WE CLEAN · YOU SHINE', 128, 84); });
  const P = {};   // breakable parts, popped in this order as the cart takes damage
  const part = (k, o) => { body.add(o); o.userData.home = { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }; P[k] = o; return o; };
  { const d = new THREE.Group(); d.position.set(0.665, 0.66, 0.3); const pnl = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.42), new THREE.MeshToonMaterial({ map: signT, color: 0xffffff })); pnl.rotation.y = Math.PI / 2; d.add(pnl); part('door', d); }
  { const m = new THREE.Group(); m.position.set(0.66, 1.25, 0.15); M(new THREE.BoxGeometry(0.16, 0.12, 0.04), chrome, 0.08, 0, 0, m, 0.006); M(new THREE.BoxGeometry(0.1, 0.03, 0.03), dark, 0.0, -0.02, 0, m, 0); part('mirror', m); }
  { const l = new THREE.Group(); l.position.set(0, 1.72, -0.38); M(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 12), dark, 0, -0.04, 0, l, 0.006); M(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 12), amber, 0, 0.06, 0, l, 0.006); const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa020, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 })); gl.scale.setScalar(0.7); gl.position.y = 0.06; l.add(gl); l.userData.glow = gl; part('light', l); }
  { const b = new THREE.Group(); b.position.set(0, 0.38, 1.22); M(new THREE.BoxGeometry(1.42, 0.16, 0.14), chrome, 0, 0, 0, b, 0.008); part('bumper', b); }
  { const r = new THREE.Group(); r.position.set(0, 1.68, -0.38); for (const sx of [-1, 1]) M(new THREE.BoxGeometry(0.05, 0.05, 1.0), dark, sx * 0.45, 0, 0, r, 0.004); const sq = M(new THREE.BoxGeometry(0.9, 0.06, 0.08), red, 0, 0.07, 0.1, r, 0.006); M(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), chrome, 0, 0.07, -0.3, r, 0).rotation.x = Math.PI / 2; part('rack', r); }
  { const t = new THREE.Group(); t.position.set(0, 1.0, -1.32); const cy = M(new THREE.CylinderGeometry(0.26, 0.26, 0.9, 16), toon('#9fe8ff', { emissive: 0x2a5a6a }), 0, 0, 0, t, 0.012); cy.rotation.z = Math.PI / 2; part('tank', t); }
  const wheel = (k, x, z) => { const w = new THREE.Group(); w.position.set(x, 0.3, z); const ty = M(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 18), rub, 0, 0, 0, w, 0.012); ty.rotation.z = Math.PI / 2; const hb = M(new THREE.CylinderGeometry(0.14, 0.14, 0.24, 12), chrome, 0, 0, 0, w, 0); hb.rotation.z = Math.PI / 2; part(k, w); };
  wheel('wheelFN', 0.64, 0.75); wheel('wheelBN', 0.64, -0.75); wheel('wheelFF', -0.64, 0.75); wheel('wheelBF', -0.64, -0.75);
  const ORDER = ['mirror', 'light', 'bumper', 'rack', 'door', 'wheelFN', 'tank', 'wheelBN'];
  const sw = new THREE.Object3D(); sw.position.set(0, 1.0, 1.2); g.add(sw); const tip = new THREE.Object3D(); sw.add(tip); sw.userData.tip = tip;
  // smoke + loose parts
  const smokeM = new THREE.SpriteMaterial({ map: glowTex, color: 0x3a3836, transparent: true, depthWrite: false, opacity: 0 }), smokes = Array.from({ length: 10 }, () => { const s = new THREE.Sprite(smokeM.clone()); s.visible = false; return { s, life: 0, v: new THREE.Vector3() }; }); let smI = 0, smAcc = 0;
  const loose = []; let popped = 0, clock = 0, smashed = false; const _w = new THREE.Vector3();
  function pop(k, power = 1) { const o = P[k]; if (!o || o.userData.off) return; const sc = g.parent; if (!sc) return; o.userData.off = true; sc.attach(o); o.userData.v = new THREE.Vector3((Math.random() - 0.3) * 4 * power, (3.5 + Math.random() * 2.5) * power, (Math.random() - 0.65) * 1.6); o.userData.spin = new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14); o.userData.rest = false; loose.push(o); }
  function reset() { for (const k in P) { const o = P[k], h = o.userData.home; if (o.userData.off) { body.add(o); o.userData.off = false; } o.position.copy(h.p); o.quaternion.copy(h.q); o.scale.copy(h.s); } loose.length = 0; popped = 0; smashed = false; body.scale.set(1, 1, 1); body.rotation.set(0, 0, 0); body.position.set(0, 0, 0); for (const q of smokes) { q.life = 0; q.s.visible = false; } }
  function smash() { smashed = true; for (const k of [...ORDER, 'wheelFF', 'wheelBF']) pop(k, 1.5); }
  function upd(_P, dt, f) { clock += dt; const sc = g.parent; if (sc && !smokes[0].s.parent) smokes.forEach(q => sc.add(q.s));
    const frac = f ? Math.max(0, f.hp / f.hpMax) : 1, want = smashed ? ORDER.length : Math.min(ORDER.length, Math.floor((1 - frac) / 0.125)); while (popped < want) pop(ORDER[popped++]);
    // jolt on every hit, dents + a lean as wheels come off
    const age = f ? f.hitAge ?? 9 : 9, j = age < 0.5 ? Math.exp(-age * 9) * Math.cos(age * 40) : 0, lostN = (P.wheelFN.userData.off ? 1 : 0) + (P.wheelBN.userData.off ? 1 : 0);
    if (smashed) { body.scale.set(1.12, 0.5, 1.06); body.position.y = -0.12; body.rotation.set(0.04, 0, lostN * 0.09); }
    else { const dent = 1 - (1 - frac) * 0.16; body.scale.set(1 + j * 0.05, dent - j * 0.08, 1); body.position.y = Math.abs(j) * 0.12 - (1 - frac) * 0.05; body.rotation.set(j * 0.05, 0, lostN * 0.09 + j * 0.06); }
    if (P.light && !P.light.userData.off) P.light.rotation.y = clock * 8;
    const dz = frac < 0.35 || smashed; pupils.forEach((pp, i) => { const a2 = clock * 9 + i * Math.PI; pp.position.x = eyes[i].position.x + (dz ? Math.cos(a2) * 0.06 : 0); pp.position.y = 0.72 + (dz ? Math.sin(a2) * 0.06 : 0); pp.scale.setScalar(age < 0.25 ? 0.5 : 1); });
    for (const o of loose) { if (o.userData.rest) continue; const v = o.userData.v; v.y -= 12 * dt; o.position.addScaledVector(v, dt); o.rotation.x += o.userData.spin.x * dt; o.rotation.y += o.userData.spin.y * dt; o.rotation.z += o.userData.spin.z * dt; if (o.position.y < 0.12 && v.y < 0) { o.position.y = 0.12; v.y *= -0.38; v.x *= 0.6; v.z *= 0.6; o.userData.spin.multiplyScalar(0.5); if (Math.abs(v.y) < 0.6) o.userData.rest = true; } if (o.position.z > 0.9) { o.position.z = 0.9; v.z = -Math.abs(v.z) * 0.3; } if (o.position.z < -3) { o.position.z = -3; v.z = Math.abs(v.z) * 0.3; } }
    if (sc && (frac < 0.5 || smashed)) { smAcc += dt * (smashed ? 14 : 6); while (smAcc > 1) { smAcc -= 1; const q = smokes[smI = (smI + 1) % smokes.length]; g.localToWorld(_w.set(0, 1.0, 0.7)); q.s.position.copy(_w); q.v.set((Math.random() - 0.5) * 0.4, 0.9 + Math.random() * 0.6, (Math.random() - 0.5) * 0.3); q.life = 1.4; q.s.visible = true; } }
    for (const q of smokes) { if (q.life <= 0) { q.s.visible = false; continue; } q.life -= dt; q.s.position.addScaledVector(q.v, dt); q.s.scale.setScalar(0.4 + (1.4 - q.life) * 0.8); q.s.material.opacity = Math.min(0.55, q.life * 0.5); } }
  const R0 = {};
  return { g, U: { J: { heavy: false, head: cab } }, L: { H: 1.7, hipY: 0.6, torsoL: 0.8, footH: 0.05 }, k: 1.25, R0, P: R0, sw, upd, prop: true, hw: 1.05, reset, smash, debris() {} };
}

// ---------------- s36m: rival banter on the VS screen ----------------
export const FOX_VS = { ben: "Let's do this!", hope: 'I heard you coming.', noble: 'Wheels up!', might: 'Kneel, or fight.', michelle: 'Try to keep up.', sumo: 'Step into my ring.', barnacle: 'I lift heavier things than you.', jack: 'Hope you like it hot.', rook: 'Nowhere to hide up here.', lox: 'Gloves up.', warden: 'Halt. You will not pass.', prime: 'Scanning. Weak. Rebuild.', suds: 'PLEASE HOLD STILL FOR CLEANING.', slag: 'Hssssss.', shadow: '...', suds9: 'PLEASE HOLD STILL FOR CLEANING.' };
const RIVAL = { 'michelle|might': ["Don't go easy on me, Dad.", 'I never do.'], 'ben|noble': ['Ready, partner?', "Wheels are warm. Let's go!"], 'ben|hope': ['No holding back, Hope.', 'I can hear you smiling.'], 'hope|noble': ['I hear your wheels squeak.', "That's my warning honk!"], 'ben|might': ['Your Majesty.', 'Bow after I win.'], 'ben|shadow': ['Who... are you?', "I'm everything you're not."], 'hope|michelle': ['Your feet are so quiet.', "Then you'll never hear me coming."],
  'barnacle|jack': ['You owe me a forklift, Jack.', 'Put it on my tab.'], 'barnacle|rook': ['The Salt crew stays out of your cave.', 'And my crew stays off your roof.'], 'jack|rook': ['Bet I draw faster.', 'Bet you miss.'], 'lox|rook': ['Luxor does not take orders from a cave bandit.', 'Then Luxor can take a laser.'], 'lox|slag': ['Back to the lava with you.', 'Hssss... home.'], 'lox|sumo': ['Gloves against palms. Let us see.', 'Come, little boxer.'], 'might|sumo': ['Old friend.', 'Old king. The ring remembers you.'], 'prime|warden': ['Unit Warden. Report for upgrade.', 'Negative. I guard the arena.'], 'prime|suds': ['You are a defective unit.', 'I PREFER THE TERM SPARKLING.'], 'suds|warden': ['YOUR ARMOUR IS FILTHY.', 'Halt.'], 'ben|lox': ['Luxor is a long way from home.', 'So is your luck.'], 'ben|rook': ['Let Prince Max go, Rook.', 'Beat me first.'], 'jack|michelle': ['Pretty quick for a princess.', 'Pretty slow for a bandit.'], 'ben|slag': ['Is it... smiling?', 'Hsssss.'], 'barnacle|sumo': ['I lift crates bigger than you.', 'Crates do not push back.'] };
export function rivalLines(a, b) { if (a === b) return ["There's only room for one of us.", 'Agreed.']; const k = [a, b].sort().join('|'), L = RIVAL[k]; if (L) return [a, b].sort()[0] === a ? L : [L[1], L[0]]; return [FOX_VS[a] || '', FOX_VS[b] || '']; }

// ---------------- s36n: BONUS STAGE 2 · a stack of SUDS CO. supply crates (same fighter record as the car) ----------------
export function makeCrateStack({ THREE, M, toon, glowTex, canvasTex }) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ'; const body = new THREE.Group(); g.add(body);
  const wood = toon('#b9814a', {}), dark = toon('#6b4423', {}), lbl = canvasTex(128, 128, c => { c.fillStyle = '#b9814a'; c.fillRect(0, 0, 128, 128); c.strokeStyle = '#6b4423'; c.lineWidth = 10; c.strokeRect(5, 5, 118, 118); c.beginPath(); c.moveTo(5, 5); c.lineTo(123, 123); c.stroke(); c.fillStyle = '#201e1d'; c.font = '900 22px Archivo, Arial Black, sans-serif'; c.textAlign = 'center'; c.fillText('SUDS', 64, 58); c.fillText('CO.', 64, 84); });
  const fm = new THREE.MeshToonMaterial({ map: lbl, color: 0xffffff });
  const P = [], spots = [[-0.62, 0.36, 0], [0.62, 0.36, 0], [0, 0.36, 0.62], [0, 0.36, -0.62], [-0.32, 1.08, 0.3], [0.32, 1.08, -0.3], [0, 1.8, 0]];
  spots.forEach(([x, y, z], i) => { const c = new THREE.Group(); c.position.set(x, y, z); c.rotation.y = (i * 0.37) % 0.6 - 0.3; const b = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.72), [wood, wood, wood, wood, fm, fm]); b.castShadow = true; c.add(b); M(new THREE.BoxGeometry(0.76, 0.08, 0.76), dark, 0, 0.32, 0, c, 0.006); M(new THREE.BoxGeometry(0.76, 0.08, 0.76), dark, 0, -0.32, 0, c, 0.006); body.add(c); c.userData.home = { p: c.position.clone(), q: c.quaternion.clone() }; P.push(c); });
  const ORDER = [6, 5, 4, 3, 2, 1, 0];
  const sw = new THREE.Object3D(); sw.position.set(0, 1.0, 0.8); g.add(sw); const tip = new THREE.Object3D(); sw.add(tip); sw.userData.tip = tip;
  const loose = []; let popped = 0, smashed = false;
  function pop(c, power = 1) { if (!c || c.userData.off || !g.parent) return; c.userData.off = true; g.parent.attach(c); c.userData.v = new THREE.Vector3((Math.random() - 0.3) * 4 * power, (3 + Math.random() * 3) * power, (Math.random() - 0.65) * 1.6); c.userData.spin = new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12); c.userData.rest = false; loose.push(c); }
  function reset() { for (const c of P) { if (c.userData.off) { body.add(c); c.userData.off = false; } c.position.copy(c.userData.home.p); c.quaternion.copy(c.userData.home.q); c.scale.setScalar(1); } loose.length = 0; popped = 0; smashed = false; body.position.set(0, 0, 0); body.rotation.set(0, 0, 0); }
  function smash() { smashed = true; for (const c of P) pop(c, 1.5); }
  function upd(_P, dt, f) { const frac = f ? Math.max(0, f.hp / f.hpMax) : 1, want = smashed ? P.length : Math.min(P.length - 1, Math.floor((1 - frac) * P.length)); while (popped < want) pop(P[ORDER[popped++]]);
    const age = f ? f.hitAge ?? 9 : 9, j = age < 0.4 ? Math.exp(-age * 10) * Math.cos(age * 44) : 0; body.position.x = j * 0.06; body.rotation.z = j * 0.05;
    for (const c of loose) { if (c.userData.rest) continue; const v = c.userData.v; v.y -= 12 * dt; c.position.addScaledVector(v, dt); c.rotation.x += c.userData.spin.x * dt; c.rotation.z += c.userData.spin.z * dt; if (c.position.y < 0.36 && v.y < 0) { c.position.y = 0.36; v.y *= -0.3; v.x *= 0.6; v.z *= 0.6; if (Math.abs(v.y) < 0.6) c.userData.rest = true; } if (c.position.z > 0.9) { c.position.z = 0.9; v.z = -Math.abs(v.z) * 0.3; } } }
  return { g, U: { J: { heavy: false, head: P[6] } }, L: { H: 2.2, hipY: 0.6, torsoL: 0.8, footH: 0.05 }, k: 1.25, R0: {}, P: {}, sw, upd, prop: true, hw: 1.0, reset, smash, debris() {} };
}

// ---------------- s50 (Ben): BREAKAWAY WALLS + BARRELS at the two ends of the fighting line ----------------
// One breakable on each side of every stage: a themed WALL PANEL on the left and a BARREL on the right. While it stands it is the edge of the fight;
// a big knock-back (roundhouse, power spin, super, throw) sends the fighter CRASHING THROUGH it: every piece flies off with its own spin and bounces
// on the floor. The stage's own wall behind it is the real, unbreakable wall. reset() rebuilds it for the next round.
export function breakable({ THREE, M, toon }, kind, theme) {
  const g = new THREE.Group(), pieces = [], add = (geo, mat, x, y, z, ry = 0, rz = 0) => { const m = M(geo, mat, x, y, z, g, 0.012); m.rotation.set(0, ry, rz); pieces.push(m); return m; };
  const W = { shoji: ['#5a3a22', '#f3ead7'], fence: ['#4a3324', '#6b4a33'], bamboo: ['#7a9a3a', '#b9c96a'], gate: ['#3a2a20', '#5b5f66'], board: ['#e9dfcf', '#ef4444'],
    sake: ['#9a6a3a', '#3a3a3a'], rain: ['#4a3a30', '#2b2b2b'], iron: ['#5a4030', '#6b7280'], drum: ['#2563eb', '#dbeafe'] }[theme] || ['#6b4a33', '#3a3a3a'];
  const A = toon(W[0]), Bm = toon(W[1]);
  if (kind === 'wall') { const H = 1.95, D = 1.3;
    if (theme === 'shoji') { add(new THREE.BoxGeometry(0.1, H, 0.1), A, 0, H / 2, -D / 2); add(new THREE.BoxGeometry(0.1, H, 0.1), A, 0, H / 2, D / 2); add(new THREE.BoxGeometry(0.1, 0.1, D), A, 0, H - 0.05, 0); add(new THREE.BoxGeometry(0.1, 0.12, D), A, 0, 0.06, 0);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { add(new THREE.BoxGeometry(0.03, H / 3 - 0.1, D / 2 - 0.1), Bm, 0, 0.15 + (r + 0.5) * (H - 0.25) / 3, (c - 0.5) * D / 2); add(new THREE.BoxGeometry(0.06, 0.04, D / 2), A, 0.01, 0.15 + (r + 1) * (H - 0.25) / 3, (c - 0.5) * D / 2); } }
    else if (theme === 'bamboo') { for (let i = 0; i < 7; i++) add(new THREE.CylinderGeometry(0.065, 0.07, H - (i % 2) * 0.12, 9), i % 3 ? A : Bm, 0, (H - (i % 2) * 0.12) / 2, (i - 3) * 0.19); for (const y of [0.55, 1.4]) add(new THREE.BoxGeometry(0.16, 0.06, D + 0.1), toon('#6b4a2b'), 0, y, 0); }
    else if (theme === 'board') { for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.08, H / 2 - 0.02, D / 2 - 0.02), i === 1 || i === 2 ? Bm : A, 0, (Math.floor(i / 2) + 0.5) * H / 2, (i % 2 - 0.5) * D / 2); for (const z of [-D / 2, D / 2]) add(new THREE.BoxGeometry(0.12, H + 0.1, 0.1), toon('#9ca3af'), 0.05, (H + 0.1) / 2, z); }
    else { const n = theme === 'gate' ? 5 : 6; for (let i = 0; i < n; i++) add(new THREE.BoxGeometry(theme === 'gate' ? 0.12 : 0.08, H - (theme === 'fence' ? (i % 2) * 0.15 : 0), D / n - 0.03), i % 2 ? A : toon(W[0]).clone(), 0, (H - (theme === 'fence' ? (i % 2) * 0.15 : 0)) / 2, (i - (n - 1) / 2) * D / n);
      for (const y of [0.4, 1.5]) add(new THREE.BoxGeometry(0.16, 0.1, D + 0.06), Bm, 0, y, 0); } }
  else { const R = theme === 'drum' ? 0.4 : 0.44, H = theme === 'drum' ? 1.15 : 1.05, n = 12;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, bulge = theme === 'drum' ? 0 : 0.03; const m = add(new THREE.BoxGeometry(0.07, H, 2 * Math.PI * R / n + 0.01), theme === 'drum' && i % 3 === 0 ? Bm : A, Math.cos(a) * (R + bulge), H / 2, Math.sin(a) * (R + bulge), -a); m.userData.ring = 1; }
    for (const y of [0.18, H - 0.18]) { const t = add(new THREE.TorusGeometry(R + 0.05, 0.03, 6, 18), Bm, 0, y, 0); t.rotation.x = Math.PI / 2; }
    add(new THREE.CylinderGeometry(R, R, 0.05, 16), theme === 'drum' ? Bm : A, 0, H, 0); if (theme === 'sake') { const rope = add(new THREE.TorusGeometry(R + 0.07, 0.035, 6, 18), toon('#d9c7a0'), 0, H * 0.5, 0); rope.rotation.x = Math.PI / 2; } }
  pieces.forEach(m => { m.userData.home = { p: m.position.clone(), r: m.rotation.clone() }; m.userData.v = new THREE.Vector3(); m.userData.w = new THREE.Vector3(); });
  let broken = false, fade = 0, shk = 0, cracks = 0;
  function shake(k = 1) { if (broken) return; shk = Math.min(1, shk + 0.7 * k); cracks++; }   // a hit that didn't break it: shudder (and it looks a little more battered)
  function reset() { broken = false; fade = 0; shk = 0; cracks = 0; g.rotation.set(0, 0, 0); g.position.y = 0; pieces.forEach(m => { m.position.copy(m.userData.home.p); m.rotation.copy(m.userData.home.r); m.visible = true; m.userData.rest = false; }); }
  // dir = +1 / -1 (the way the fighter is flying), spd = how hard
  function smash(dir, spd = 8, fy = 1.0) { if (broken) return; broken = true; fade = 0; const k = Math.min(1.6, spd / 8);
    pieces.forEach(m => { const v = m.userData.v, w = m.userData.w; v.set(dir * (2.5 + Math.random() * 5) * k, (1.5 + Math.random() * 4.5) * (0.6 + m.position.y / 2 * fy), (Math.random() - 0.5) * 5); w.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 14); m.userData.rest = false; }); }
  function tick(dt) { if (!broken) { if (shk > 0) { shk = Math.max(0, shk - dt * 3.5); const T = performance.now() * 0.06; g.rotation.z = Math.sin(T) * 0.06 * shk + Math.min(3, cracks) * 0.012 * (kind === 'wall' ? 1 : 0); g.rotation.x = Math.cos(T * 1.3) * 0.03 * shk; } return; } g.rotation.set(0, 0, 0); fade += dt; pieces.forEach(m => { if (m.userData.rest) return; const v = m.userData.v, w = m.userData.w; v.y -= 15 * dt; m.position.addScaledVector(v, dt); m.rotation.x += w.x * dt; m.rotation.y += w.y * dt; m.rotation.z += w.z * dt;
      if (m.position.y < 0.05) { m.position.y = 0.05; if (Math.abs(v.y) < 1.2) { v.set(v.x * 0.5, 0, v.z * 0.5); w.multiplyScalar(0.4); if (v.lengthSq() < 0.05) { m.userData.rest = true; m.rotation.x = Math.round(m.rotation.x / (Math.PI / 2)) * Math.PI / 2; m.rotation.z = Math.round(m.rotation.z / (Math.PI / 2)) * Math.PI / 2; } } else { v.y = -v.y * 0.32; v.x *= 0.6; v.z *= 0.6; w.multiplyScalar(0.6); } } }); }
  return { g, reset, smash, shake, tick, get broken() { return broken; }, kind };
}
