// FOX FIGHTERS · THE 8 MOON PEOPLES (s119, 15 Nov 2026). The 8 moon leaders in their species armour, built by the MAIN PROJECT's kits
// (engine/species-leaders.js + engine/<species>-kit.js + engine/armor-sets.js) on the main project's newer fox rig (fox-kit-moon.js).
// The old fighters keep fox-kit.js: nothing here touches them. The shared kit files are imported AS THEY CAME (see KIT_CHANGES.md: none).
// initMoon(stage) once at load → leaderModel(id) gives a leader + the joint map rigFighter drives (shoulder → elbow → hand, hip → knee → foot).
import * as THREE from '../../vendor/three/three.module.js';
import { foxKit } from '../../fox-kit-moon.js?v=s119';
import { castKit, CAST } from '../../engine/cast.js';
import { LEADERS, makeLeader } from '../../engine/species-leaders.js?v=s119';
import { loadArmorSets, tickArmor } from '../../engine/armor-sets.js';
import { crestTex } from '../../meru-game.js';
import { rr, pick, clamp, smooth, damp } from '../../village-game.js';

export { LEADERS };
let MK = null;
export function initMoon({ scene, toon, M, grad, outlineMat }) {
  if (MK) return MK;
  const kit = foxKit({ THREE, scene, toon, M, grad, outlineMat, crestTex, rr, pick, clamp, smooth, damp, merge: false });
  const cast = castKit({ THREE, M, toon, makeFox: kit.makeFox });
  MK = { kit, ctx: { THREE, M, toon, cast, CAST }, sets: loadArmorSets(), toon, M };
  return MK;
}

// Each leader's OWN WEAPON stands in for the sword (Ben: "their own weapon"), and a themed shot stands in for the laser.
// The weapon is built along +y from the grip (y = 0), like the duel's sword, so the same draw / stow / swing system carries it.
export const LEADER_GEAR = {
  brannock: { weapon: 'BLACK-IRON RUNE STAFF', shot: 'RUNE BOLT', shotCol: 0x7cf2a0 },
  ossu: { weapon: 'LOG-CRYSTAL', shot: 'CRYSTAL BEAM', shotCol: 0x4ff0ff },
  irisa: { weapon: 'SCYTHE ARM', shot: 'LEAF BLADE', shotCol: 0x9be07a },
  ossa: { weapon: 'STORM STAFF', shot: 'STORM BOLT', shotCol: 0x9fe8ff },
  hobart: { weapon: 'KNUCKLE RAM', shot: 'PISTON BLAST', shotCol: 0xf2b705 },
  ambra: { weapon: 'STINGER SCEPTRE', shot: 'STING DART', shotCol: 0xffb020 },
  zayd: { weapon: 'BRASS TELESCOPE', shot: 'GLINT SHOT', shotCol: 0x3fe0d0 },
  tollan: { weapon: 'SANDSTONE STAFF', shot: 'SUN BOLT', shotCol: 0x2ec4b6 },
};
export function leaderWeapon(id) {
  const { M, toon } = MK, G = new THREE.Group(), glow = c => new THREE.MeshBasicMaterial({ color: c });
  const rod = (len, r, col, y0 = -0.35) => M(new THREE.CylinderGeometry(r, r * 1.08, len, 8), toon(col), 0, y0 + len / 2, 0, G, 0.012);
  if (id === 'brannock') { rod(1.7, 0.045, '#1c1a1e'); for (const y of [-0.1, 0.5, 1.0]) M(new THREE.CylinderGeometry(0.058, 0.058, 0.06, 8), toon('#8a6a3a'), 0, y, 0, G, 0); M(new THREE.DodecahedronGeometry(0.15, 0), toon('#3a3836'), 0, 1.45, 0, G, 0.014); M(new THREE.OctahedronGeometry(0.09, 0), glow(0x7cf2a0), 0, 1.45, 0.12, G, 0); }
  else if (id === 'ossu') { M(new THREE.CylinderGeometry(0.035, 0.04, 0.5, 8), toon('#8a8f96'), 0, 0.0, 0, G, 0.01); const c = M(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshToonMaterial({ color: '#9ff6ff', emissive: new THREE.Color('#1fb8d0'), emissiveIntensity: 0.7, transparent: true, opacity: 0.9 }), 0, 0.5, 0, G, 0.012); c.scale.set(0.8, 1.7, 0.8); M(new THREE.TorusGeometry(0.16, 0.02, 6, 20), glow(0x4ff0ff), 0, 0.5, 0, G, 0).rotation.x = Math.PI / 2; }
  else if (id === 'irisa') { M(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), toon('#6aa070'), 0, 0, 0, G, 0.01); const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.08, 0.5, 0.42, 0.95); sh.quadraticCurveTo(0.12, 0.62, 0.05, 0.0); const b = M(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }), toon('#c8e87a'), -0.02, 0.1, -0.015, G, 0.012); b.rotation.y = Math.PI / 2; }
  else if (id === 'ossa') { rod(1.6, 0.04, '#f4f1ea'); M(new THREE.TorusGeometry(0.11, 0.025, 6, 16), toon('#c9c4be'), 0, 1.32, 0, G, 0.01); const c = M(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshToonMaterial({ color: '#dff6ff', emissive: new THREE.Color('#5fc8ff'), emissiveIntensity: 0.8 }), 0, 1.32, 0, G, 0.01); c.scale.y = 1.6; }
  else if (id === 'hobart') { M(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), toon('#3a3836'), 0, 0, 0, G, 0.01); M(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 12), toon('#f2b705'), 0, 0.35, 0, G, 0.014); M(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 10), toon('#c8ccd2'), 0, 0.68, 0, G, 0.01); M(new THREE.BoxGeometry(0.34, 0.2, 0.3), toon('#2a2826'), 0, 0.88, 0, G, 0.014); for (const y of [0.2, 0.5]) M(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), toon('#141312'), 0, y, 0, G, 0); }
  else if (id === 'ambra') { rod(1.25, 0.035, '#a8650c'); for (const y of [0.1, 0.35, 0.6]) M(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8), toon('#2a1606'), 0, y, 0, G, 0); M(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshToonMaterial({ color: '#ffd76a', emissive: new THREE.Color('#e8a317'), emissiveIntensity: 0.5 }), 0, 0.98, 0, G, 0.01); M(new THREE.ConeGeometry(0.06, 0.32, 8), toon('#2a1606'), 0, 1.22, 0, G, 0.01); }
  else if (id === 'zayd') { const b = toon('#c9973e'), d = toon('#6a4a1e'); M(new THREE.CylinderGeometry(0.05, 0.05, 0.36, 10), d, 0, 0, 0, G, 0.01); M(new THREE.CylinderGeometry(0.07, 0.06, 0.4, 12), b, 0, 0.36, 0, G, 0.012); M(new THREE.CylinderGeometry(0.085, 0.075, 0.34, 12), b, 0, 0.72, 0, G, 0.012); M(new THREE.CylinderGeometry(0.1, 0.09, 0.08, 12), d, 0, 0.92, 0, G, 0.01); M(new THREE.CircleGeometry(0.08, 14), glow(0x9ff6ff), 0, 0.965, 0, G, 0).rotation.x = -Math.PI / 2; }
  else { rod(1.75, 0.05, '#c9a26a'); for (const y of [0.0, 0.45, 0.9]) M(new THREE.CylinderGeometry(0.062, 0.062, 0.07, 8), toon('#2ec4b6'), 0, y, 0, G, 0); M(new THREE.SphereGeometry(0.14, 10, 8), toon('#e0c08a'), 0, 1.45, 0, G, 0.014); M(new THREE.TorusGeometry(0.16, 0.025, 6, 18), toon('#2ec4b6'), 0, 1.45, 0, G, 0).rotation.x = Math.PI / 2; }
  return G;
}

// the leader model + the joints rigFighter drives. Lengths are measured in the world (the fox rig scales its limb groups), so the IK holds.
export function leaderModel(id, sc) {
  const L = LEADERS.find(q => q.id === id); if (!MK || !L) return null;
  const f = makeLeader(MK.ctx, id, MK.sets); if (!f) return null; f.scale.setScalar(sc); f.updateMatrixWorld(true);
  const P = f.userData.P, V = () => new THREE.Vector3(), wp = o => o.getWorldPosition(V());
  const handPt = i => { const h = P.hands && P.hands[i] && (P.hands[i].g || P.hands[i].hg); return h && h.isObject3D ? wp(h) : P.fore[i].localToWorld(V().set(0, -0.2, 0)); };
  const arms = P.arms.map((A, i) => { const sh = wp(A), el = wp(P.fore[i]), hp = handPt(i), loc = P.fore[i].worldToLocal(hp.clone()); return { up: A, el: P.fore[i], s: Math.sign(A.position.x) || (i ? 1 : -1), a0: sh.distanceTo(el), b0: el.distanceTo(hp) * 1.08, hand: loc.length() * 1.08 }; });
  const legs = P.legs.map((Lg, i) => { const hp = wp(Lg), kn = wp(P.shin[i]), ft = P.foot && P.foot[i] ? P.foot[i] : null, fp = ft ? wp(ft) : V().set(kn.x, 0.06 * sc, kn.z); return { th: Lg, kn: P.shin[i], ft: ft || P.shin[i], s: Math.sign(Lg.position.x) || (i ? 1 : -1), a0: hp.distanceTo(kn), b0: kn.distanceTo(fp) }; });
  const box = new THREE.Box3().setFromObject(P.head), top = box.max.y, hw = Math.max(0.5, (new THREE.Box3().setFromObject(P.body).getSize(V()).x) * 0.36);
  return { model: f, L, R: { hips: P.body, chest: P.body, head: P.head, arms, legs }, H: top * 0.92, hw, hand: arms[0].hand, tick: (t, dt) => { try { f.userData.tickSpecies && f.userData.tickSpecies(f, dt); } catch (e) {} try { tickArmor(f, t); } catch (e) {} } };
}
