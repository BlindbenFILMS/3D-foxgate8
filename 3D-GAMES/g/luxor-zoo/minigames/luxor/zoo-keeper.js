// 8 GATES — HESSA'S MENAGERIE [luxorZoo]. Luxor's zoo, built as an INTERIOR (a hall of ten cages) that drops into any building.
// Two ways to be inside: WALK (the Meru HUD: stick, CALL / TREAT / JUMP, TALK to Hessa) and WORK (a keeper's shift, 9 AM to 5 PM).
// Keeper Hessa (2D: luxorHessa, Zoo Path) runs it. Ten cages from the 2D Zoo Path: LION WOLF BOAR BEAR RAM CROC STAG APE PANTHER SERPENT.
// Four are home on day 1 ("six of ten" are out on the Red Plains); one more comes home after every good day.
// Each animal has needs: HUNGRY (feed the right food) · THIRSTY (fill the trough) · MESSY (rake the mess) · BORED (brush a friendly one, toss a toy to a wild one).
// TOUCH: drag a food/toy chip and FLICK it into the cage (or drag-and-drop it, or just tap it) · HOLD the hose, let go in the green · SWIPE the mess ·
// RUB a friendly animal · SWIPE sideways on the floor to go to the next cage · tap a cage in the overview to go there.
// Save keys luxor.zoo.*, flag zooUniform. Built on engine/restaurant-kit.js (stage, camera fit, hint rings, uniform).
// MERGE: buildZoo(ctx) builds the hall at an origin; createZoo({ container, onState }) runs stand-alone (walk + work + demo).
import * as THREE from '../../vendor/three/three.module.js';
import { rr, clamp, damp, smooth, pick } from '../../village-game.js';
import { canvasTex } from '../../meru-game.js';
import { CAST } from '../../engine/cast.js';
import { PLAYER_FEMALE, PLAYER_MALE } from '../../fox-kit.js';
import { save } from '../../engine/save.js';
import { createStage, cameraFit, hintRings, dinerUniform } from '../../engine/restaurant-kit.js';

export const ZOO = { name: "HESSA'S MENAGERIE", room: 'luxorZoo', world: 'Luxor', open: 9, close: 17, hourSec: 22 };
export const FOODS = { meat: { name: 'MEAT', col: '#c2453a' }, fish: { name: 'FISH', col: '#5aa6d6' }, fruit: { name: 'FRUIT', col: '#e2722e' }, hay: { name: 'HAY', col: '#e3c35a' }, eggs: { name: 'EGGS', col: '#efe6d0' } };
export const FK = Object.keys(FOODS);
export const BEASTS = {
  wolf: { name: 'WOLF', pet: 'ASH', diet: 'meat', wild: true, kind: 'quad', col: '#8e949c', dark: '#4b5058', belly: '#d9dde2', len: 0.75, r: 0.27, leg: 0.42, legR: 0.075, hr: 0.24, snout: 0.22, ear: 'point', tail: 'bushy', eye: '#f2c94c', voice: 'howl', floor: 'dirt' },
  boar: { name: 'BOAR', pet: 'TRUFFLE', diet: 'fruit', wild: false, kind: 'quad', col: '#6b4a34', dark: '#3f2a1d', belly: '#8a6a50', len: 0.62, r: 0.3, leg: 0.24, legR: 0.075, hr: 0.25, snout: 0.2, snoutCol: '#e0a0a0', ear: 'point', tail: 'curl', tusks: true, bristle: true, voice: 'grunt', floor: 'mud' },
  lion: { name: 'LION', pet: 'SOL', diet: 'meat', wild: true, kind: 'quad', col: '#d9a24a', dark: '#9a5a22', belly: '#f2d39a', len: 0.85, r: 0.32, leg: 0.46, legR: 0.09, hr: 0.27, snout: 0.16, ear: 'round', tail: 'tuft', mane: '#8a3e14', eye: '#e6b45a', voice: 'roar', floor: 'sand' },
  ram: { name: 'RAM', pet: 'CURL', diet: 'hay', wild: false, kind: 'quad', col: '#f1e8d4', dark: '#6b5a48', belly: '#e2d6bc', face: '#5a4a3c', len: 0.6, r: 0.33, leg: 0.36, legR: 0.06, hr: 0.2, snout: 0.14, ear: 'flop', tail: 'stub', horns: true, wool: true, voice: 'baa', floor: 'rock' },
  croc: { name: 'CROC', pet: 'GRIN', diet: 'fish', wild: true, kind: 'croc', col: '#4f7a3a', dark: '#2f4a22', belly: '#c9d48a', voice: 'hiss', floor: 'pool' },
  stag: { name: 'STAG', pet: 'ASPEN', diet: 'hay', wild: false, kind: 'quad', col: '#a8683a', dark: '#6b3e1e', belly: '#f4ece0', len: 0.75, r: 0.27, leg: 0.62, legR: 0.06, hr: 0.2, snout: 0.2, ear: 'point', tail: 'stub', antlers: true, spots: true, voice: 'bellow', floor: 'grass' },
  bear: { name: 'BEAR', pet: 'BRAM', diet: 'fish', wild: true, kind: 'quad', col: '#6a4426', dark: '#3e2614', belly: '#8a6040', len: 0.8, r: 0.42, leg: 0.36, legR: 0.12, hr: 0.3, snout: 0.16, snoutCol: '#c9a070', ear: 'round', tail: 'stub', voice: 'growl', floor: 'meadow' },
  ape: { name: 'APE', pet: 'MOSS', diet: 'fruit', wild: false, kind: 'ape', col: '#4a4440', dark: '#2a2624', belly: '#8a7a6a', face: '#c9a88a', voice: 'hoot', floor: 'jungle' },
  panther: { name: 'PANTHER', pet: 'INK', diet: 'meat', wild: true, kind: 'quad', col: '#2e2c36', dark: '#16141c', belly: '#3e3c46', len: 0.85, r: 0.25, leg: 0.42, legR: 0.07, hr: 0.22, snout: 0.12, ear: 'round', tail: 'long', eye: '#a6e04a', voice: 'snarl', floor: 'dark' },
  serpent: { name: 'SERPENT', pet: 'SASH', diet: 'eggs', wild: true, kind: 'snake', col: '#c2963f', dark: '#6b4a1a', belly: '#f2d98a', voice: 'hiss', floor: 'dune' },
};
// who comes home first: day 1 = the four Hessa still has, then one more after every good day
export const HOMECOMING = ['ram', 'stag', 'boar', 'bear', 'wolf', 'lion', 'croc', 'panther', 'ape', 'serpent'];
export const residentsFor = day => HOMECOMING.slice(0, clamp(3 + day, 4, 10));
// the ten cages: 2 on the west wall, 6 along the back, 2 on the east wall. side = which wall; th = rotation (local +z = the bars, facing the hall)
const CW = 4.2, CD = 4.4, HX = 17.2, BZ = -9.3, FZ = 6.9, WALL_H = 5.2;
export const CAGES = [
  { key: 'wolf', x: -14.8, z: -2.2, th: Math.PI / 2 }, { key: 'boar', x: -14.8, z: 2.2, th: Math.PI / 2 },
  { key: 'lion', x: -10.5, z: -7.0, th: 0 }, { key: 'ram', x: -6.3, z: -7.0, th: 0 }, { key: 'croc', x: -2.1, z: -7.0, th: 0 },
  { key: 'stag', x: 2.1, z: -7.0, th: 0 }, { key: 'bear', x: 6.3, z: -7.0, th: 0 }, { key: 'ape', x: 10.5, z: -7.0, th: 0 },
  { key: 'panther', x: 14.8, z: -2.2, th: -Math.PI / 2 }, { key: 'serpent', x: 14.8, z: 2.2, th: -Math.PI / 2 }];
export const UPGRADES = [
  { id: 'bucket', name: 'BIG FEED BUCKET', cost: 35, line: 'Every helping fills a tummy 50% more.' },
  { id: 'float', name: 'TROUGH FLOAT', cost: 30, line: 'The green band on the hose is twice as wide.' },
  { id: 'rake', name: 'WIDE RAKE', cost: 30, line: 'Each swipe rakes a much wider path.' },
  { id: 'squeak', name: 'SQUEAKY TOYS', cost: 35, line: 'Toys and brushing cheer animals twice as much.' },
  { id: 'stall', name: 'GIFT STALL', cost: 60, line: 'Visitors tip 25% more.' }];
const SAVE = { day: 'luxor.zoo.day', best: 'luxor.zoo.best', upg: 'luxor.zoo.upg.', stars: 'luxor.zoo.stars', shifts: 'luxor.zoo.shifts' };
const NEED = { food: { label: 'HUNGRY', col: '#e6b45a' }, water: { label: 'THIRSTY', col: '#7dd3fc' }, clean: { label: 'MESSY', col: '#d39a6a' }, fun: { label: 'BORED', col: '#f9a8d4' } };
export const HESSA = { key: 'luxorHessa', name: 'HESSA', role: 'ZOO KEEPER', torso: ['#9fb0c8', '#5c718f', '#232c3c'],
  look: { ...PLAYER_FEMALE, fur: '#f8ab52', furDark: '#d9822b', muzzle: '#fdd9a4', snout: '#fdd9a4', chin: '#fdd9a4', paw: '#cf7a24', tailBase: '#cf7a24', tailMid: '#fbcd93', tailTip: '#ffffff' } };
const toLocal = (C, x, z) => { const c = Math.cos(C.th), s = Math.sin(C.th), dx = x - C.x, dz = z - C.z; return { x: dx * c - dz * s, z: dx * s + dz * c }; };
const toWorld = (C, lx, lz) => { const c = Math.cos(C.th), s = Math.sin(C.th); return { x: C.x + lx * c + lz * s, z: C.z - lx * s + lz * c }; };
const SPOT = { bowl: [-1.25, 1.3], trough: [1.15, 1.42], ben: [-1.45, CD / 2 + 0.75], view: [0, CD / 2 + 1.7] };

// ---------------- the hall ----------------
export function buildZoo(ctx) {
  const { THREE: T3, M, toon, canvasTex: CTX, scene, origin = { x: 0, z: 0 } } = ctx, root = new T3.Group(); root.position.set(origin.x, 0, origin.z); scene.add(root);
  const Z = { root, cages: [], colliders: [], lights: [] }, iron = toon('#2a2826'), brass = toon('#c2963f'), brick = toon('#9a3f2c'), stone = toon('#d8c4a4'), wood = toon('#8a5a34'), woodD = toon('#5a3a22');
  const grad = ctx.grad, TM = (map, rep) => { if (rep) { map.wrapS = map.wrapT = T3.RepeatWrapping; map.repeat.set(rep[0], rep[1]); } return new T3.MeshToonMaterial({ map, gradientMap: grad }); };
  // floor: terracotta tiles (Luxor red), a sand-coloured walkway loop
  const floorT = CTX(256, 256, c => { c.fillStyle = '#b4543a'; c.fillRect(0, 0, 256, 256); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = (x + y) % 2 ? '#a84a32' : '#bc5c40'; c.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); } c.fillStyle = '#7a2e1e'; for (let i = 0; i <= 4; i++) { c.fillRect(i * 64 - 2, 0, 4, 256); c.fillRect(0, i * 64 - 2, 256, 4); } });
  const floor = new T3.Mesh(new T3.PlaneGeometry(HX * 2, FZ - BZ), TM(floorT, [HX / 1.6, (FZ - BZ) / 1.6])); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (FZ + BZ) / 2); floor.receiveShadow = true; root.add(floor); Z.floor = floor;
  { const ring = new T3.Mesh(new T3.RingGeometry(2.0, 3.0, 40).rotateX(-Math.PI / 2), toon('#e2c48a')); ring.position.set(0, 0.006, 0.6); ring.receiveShadow = true; root.add(ring); }
  // walls: brick with arched windows, brass trim, a mural band above the cages
  const brickT = CTX(256, 256, c => { c.fillStyle = '#9a3f2c'; c.fillRect(0, 0, 256, 256); for (let y = 0; y < 16; y++) for (let x = 0; x < 5; x++) { c.fillStyle = ['#a8462f', '#93392a', '#a04230', '#8a3426'][(x * 3 + y * 7) % 4]; c.fillRect(x * 56 - (y % 2) * 28 + 2, y * 16 + 2, 52, 12); } });
  const wallM = TM(brickT, [8, 2]), sideM = TM(brickT.clone(), [4, 2]); sideM.map.needsUpdate = true;
  const wall = (w, x, z, ry, m) => { const p = new T3.Mesh(new T3.PlaneGeometry(w, WALL_H), m); p.position.set(x, WALL_H / 2, z); p.rotation.y = ry; root.add(p); return p; };
  wall(HX * 2, 0, BZ, 0, wallM); wall(FZ - BZ, -HX, (FZ + BZ) / 2, Math.PI / 2, sideM); wall(FZ - BZ, HX, (FZ + BZ) / 2, -Math.PI / 2, sideM);
  // front wall with a door gap (centre) — kept low-ish so high shots see in
  for (const s of [-1, 1]) { const w = HX - 1.7, p = new T3.Mesh(new T3.PlaneGeometry(w, WALL_H), TM(brickT.clone(), [4, 2])); p.material.map.needsUpdate = true; p.position.set(s * (1.7 + w / 2), WALL_H / 2, FZ); p.rotation.y = Math.PI; root.add(p); Z.front = (Z.front || []).concat(p); }
  { const lintel = M(new T3.BoxGeometry(3.6, 0.5, 0.3), brass, 0, 3.2, FZ, root, 0.02); Z.front.push(lintel); const door = new T3.Mesh(new T3.PlaneGeometry(3.4, 3.0), new T3.MeshBasicMaterial({ color: 0xffe0a8 })); door.position.set(0, 1.5, FZ + 0.05); door.rotation.y = Math.PI; root.add(door); }
  // trim: brass cornice + skirting
  for (const [w, x, z, ry] of [[HX * 2, 0, BZ + 0.08, 0], [FZ - BZ, -HX + 0.08, (FZ + BZ) / 2, Math.PI / 2], [FZ - BZ, HX - 0.08, (FZ + BZ) / 2, Math.PI / 2]]) { const t = M(new T3.BoxGeometry(w, 0.22, 0.16), brass, x, WALL_H - 0.1, z, root, 0.01); t.rotation.y = ry; const k = M(new T3.BoxGeometry(w, 0.3, 0.14), toon('#4a1e14'), x, 0.15, z, root, 0); k.rotation.y = ry; }
  // the big sign over the back cages
  const signT = CTX(1024, 160, c => { c.fillStyle = '#201e1d'; c.fillRect(0, 0, 1024, 160); c.fillStyle = '#c2963f'; c.fillRect(0, 0, 1024, 10); c.fillRect(0, 150, 1024, 10); c.fillStyle = '#fbf3e0'; c.font = '900 76px Archivo, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText("HESSA'S MENAGERIE", 512, 70); c.fillStyle = '#e6b45a'; c.font = '800 30px Archivo, Arial'; c.fillText('LUXOR ZOO · TEN CAGES · MIND HOW YOU GO', 512, 124); });
  { const s = new T3.Mesh(new T3.PlaneGeometry(9, 1.4), new T3.MeshBasicMaterial({ map: signT })); s.position.set(0, 4.25, BZ + 0.1); root.add(s); }
  // arched windows high on the back + side walls (warm sky)
  const winT = CTX(128, 192, c => { const g = c.createLinearGradient(0, 0, 0, 192); g.addColorStop(0, '#ffb26a'); g.addColorStop(1, '#ffe0a8'); c.fillStyle = '#5a2418'; c.fillRect(0, 0, 128, 192); c.fillStyle = g; c.beginPath(); c.moveTo(10, 190); c.lineTo(10, 64); c.arc(64, 64, 54, Math.PI, 0); c.lineTo(118, 190); c.fill(); c.fillStyle = '#5a2418'; c.fillRect(61, 10, 6, 182); c.fillRect(10, 110, 108, 6); });
  const winM = new T3.MeshBasicMaterial({ map: winT, transparent: false });
  for (const x of [-14, -8.4, 8.4, 14]) { const w = new T3.Mesh(new T3.PlaneGeometry(1.1, 1.65), winM); w.position.set(x, 4.1, BZ + 0.06); root.add(w); }
  for (const s of [-1, 1]) for (const z of [-6.8, 5.4]) { const w = new T3.Mesh(new T3.PlaneGeometry(1.1, 1.65), winM); w.position.set(s * (HX - 0.06), 4.1, z); w.rotation.y = -s * Math.PI / 2; root.add(w); }
  // roof beams + string lights (open roof: the camera can look in from above)
  Z.beams = []; for (const z of [-6, -1.5, 3]) Z.beams.push(M(new T3.BoxGeometry(HX * 2, 0.3, 0.3), woodD, 0, WALL_H + 0.15, z, root, 0.015));
  const bulbM = new T3.MeshBasicMaterial({ color: 0xffd98a }); for (const z of [-3.8, 1.0]) for (let i = 0; i < 18; i++) { const x = -HX + 1 + i * (HX * 2 - 2) / 17, y = WALL_H - 0.35 - Math.sin(i / 17 * Math.PI) * 0.8; const b = new T3.Mesh(new T3.SphereGeometry(0.07, 6, 5), bulbM); b.position.set(x, y, z); root.add(b); Z.lights.push(b); }
  // cages
  const mural = CTX(512, 256, c => { const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#f6b26b'); g.addColorStop(0.55, '#f9d9a0'); g.addColorStop(1, '#d9a070'); c.fillStyle = g; c.fillRect(0, 0, 512, 256); c.fillStyle = '#c0583a'; c.beginPath(); c.moveTo(0, 190); for (let x = 0; x <= 512; x += 32) c.lineTo(x, 160 + Math.sin(x * 0.02) * 26 + Math.sin(x * 0.05) * 10); c.lineTo(512, 256); c.lineTo(0, 256); c.fill(); c.fillStyle = '#8a3a26'; c.beginPath(); c.moveTo(0, 220); for (let x = 0; x <= 512; x += 32) c.lineTo(x, 205 + Math.sin(x * 0.03 + 2) * 14); c.lineTo(512, 256); c.lineTo(0, 256); c.fill(); c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(400, 70, 30, 0, 7); c.fill(); });
  const muralM = new T3.MeshBasicMaterial({ map: mural });
  const barGeo = new T3.CylinderGeometry(0.035, 0.035, 2.05, 6), barMat = toon('#2a2826');
  CAGES.forEach((C, ci) => {
    const g = new T3.Group(); g.position.set(C.x, 0, C.z); g.rotation.y = C.th; root.add(g); const D = BEASTS[C.key];
    const cage = { ...C, ci, g, D, w: CW, d: CD, props: [] };
    const fl = M(new T3.BoxGeometry(CW, 0.08, CD), TM(floorTex(CTX, D.floor)), 0, 0.04, 0, g, 0); fl.userData.ci = ci; cage.floor = fl;
    if (D.floor === 'pool') { const pool = M(new T3.BoxGeometry(CW - 0.5, 0.06, 1.9), new T3.MeshToonMaterial({ color: '#3f8fb0', gradientMap: grad, transparent: true, opacity: 0.92 }), 0, 0.085, -CD / 2 + 1.25, g, 0); cage.pool = pool; M(new T3.BoxGeometry(CW - 0.4, 0.1, 0.12), stone, 0, 0.09, -CD / 2 + 2.25, g, 0); }
    const back = new T3.Mesh(new T3.PlaneGeometry(CW, 2.8), muralM); back.position.set(0, 1.45, -CD / 2 + 0.03); g.add(back);
    // partitions (brick), low front wall, posts, top rail
    for (const s of [-1, 1]) { M(new T3.BoxGeometry(0.16, 1.3, CD), brick, s * CW / 2, 0.65, 0, g, 0.015); M(new T3.BoxGeometry(0.2, 0.08, CD), brass, s * CW / 2, 1.33, 0, g, 0); }
    M(new T3.BoxGeometry(CW, 0.5, 0.2), stone, 0, 0.25, CD / 2, g, 0.015); M(new T3.BoxGeometry(CW + 0.1, 0.1, 0.26), brass, 0, 0.52, CD / 2, g, 0.008);
    const rail = M(new T3.BoxGeometry(CW, 0.1, 0.12), iron, 0, 2.62, CD / 2, g, 0.008); for (const s of [-1, 1]) M(new T3.BoxGeometry(0.16, 2.7, 0.2), iron, s * (CW / 2 - 0.02), 1.35, CD / 2, g, 0.01);
    const n = Math.floor(CW / 0.3), bars = new T3.InstancedMesh(barGeo, barMat, n), m4 = new T3.Matrix4(); for (let i = 0; i < n; i++) { m4.makeTranslation(-CW / 2 + 0.3 * (i + 0.5) + (CW - n * 0.3) / 2, 1.55, CD / 2); bars.setMatrixAt(i, m4); } g.add(bars); cage.bars = [bars, rail];
    // bowl + trough
    const bowl = M(new T3.CylinderGeometry(0.34, 0.27, 0.16, 18), toon('#c2963f'), SPOT.bowl[0], 0.16, SPOT.bowl[1], g, 0.012, 0.34); M(new T3.CylinderGeometry(0.28, 0.28, 0.02, 18), toon('#4a2e1a'), 0, 0.075, 0, bowl, 0); cage.bowl = bowl;
    const pile = new T3.Group(); pile.position.set(0, 0.09, 0); bowl.add(pile); cage.bowlPile = pile;
    const tr = new T3.Group(); tr.position.set(SPOT.trough[0], 0.08, SPOT.trough[1]); g.add(tr); { const tm = toon('#5f8fa6'); M(new T3.BoxGeometry(1.05, 0.06, 0.5), toon('#2a3e4a'), 0, 0.03, 0, tr, 0.008); for (const z of [-0.225, 0.225]) M(new T3.BoxGeometry(1.05, 0.36, 0.05), tm, 0, 0.18, z, tr, 0.008); for (const x of [-0.5, 0.5]) M(new T3.BoxGeometry(0.05, 0.36, 0.5), tm, x, 0.18, 0, tr, 0.008); for (const z of [-0.25, 0.25]) M(new T3.BoxGeometry(1.12, 0.04, 0.06), toon('#c2963f'), 0, 0.37, z, tr, 0); }
    const wtr = new T3.Mesh(new T3.BoxGeometry(0.94, 0.28, 0.39), new T3.MeshToonMaterial({ color: '#4fb0d4', gradientMap: grad, transparent: true, opacity: 0.85 })); wtr.position.y = 0.2; tr.add(wtr); cage.trough = tr; cage.water = wtr;
    // habitat props (back half, out of the way of the bowl + trough)
    habitat(cage, D.floor, { T3, M, toon, wood, woodD, stone, grad });
    // plaque on the low wall
    cage.plaqueM = new T3.MeshBasicMaterial({ map: plaqueTex(CTX, D, true) }); const pl = new T3.Mesh(new T3.PlaneGeometry(1.5, 0.38), cage.plaqueM); pl.position.set(0, 0.27, CD / 2 + 0.105); g.add(pl);
    cage.setHome = home => { cage.plaqueM.map = plaqueTex(CTX, D, home); cage.plaqueM.needsUpdate = true; };
    Z.cages.push(cage);
  });
  // corners: the keeper's hut (west) and the feed store (east)
  { const hut = new T3.Group(); hut.position.set(-14.9, 0, -6.9); root.add(hut); M(new T3.BoxGeometry(4.2, 3.0, 4.4), toon('#d8c4a4'), 0, 1.5, 0, hut, 0.02); const rf = M(new T3.BoxGeometry(4.6, 0.2, 4.8), toon('#7a2e1e'), 0, 3.15, 0, hut, 0.02); rf.rotation.z = 0.08;
    const ht = CTX(512, 128, c => { c.fillStyle = '#3f5d47'; c.fillRect(0, 0, 512, 128); c.fillStyle = '#fbf3e0'; c.font = '900 64px Archivo, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('KEEPER', 256, 66); });
    const s = new T3.Mesh(new T3.PlaneGeometry(2.2, 0.55), new T3.MeshBasicMaterial({ map: ht })); s.position.set(1.0, 2.4, 2.21); hut.add(s); M(new T3.BoxGeometry(1.0, 2.0, 0.08), woodD, 1.2, 1.0, 2.22, hut, 0.01); M(new T3.BoxGeometry(0.9, 0.7, 0.06), toon('#ffe0a8'), -0.9, 1.6, 2.22, hut, 0.01); }
  { const st = new T3.Group(); st.position.set(14.9, 0, -6.9); root.add(st); for (let i = 0; i < 6; i++) M(new T3.BoxGeometry(1.1, 0.55, 0.7), toon('#e3c35a'), -1.1 + (i % 3) * 1.1, 0.28 + Math.floor(i / 3) * 0.56, 0.6, st, 0.015); for (let i = 0; i < 4; i++) M(new T3.CylinderGeometry(0.28, 0.32, 0.8, 10), toon('#c9b48a'), -1.3 + i * 0.85, 0.4, -1.2, st, 0.012, 0.3); M(new T3.CylinderGeometry(0.4, 0.4, 0.9, 12), toon('#5a8a9a'), 1.5, 0.45, 1.5, st, 0.015, 0.4); }
  // keeper desk (west front), feed cart (east front), donation box, benches, centre planter
  { const d = new T3.Group(); d.position.set(-11.5, 0, 5.0); root.add(d); M(new T3.BoxGeometry(2.6, 1.0, 0.8), wood, 0, 0.5, 0, d, 0.02); M(new T3.BoxGeometry(2.8, 0.08, 1.0), woodD, 0, 1.04, 0, d, 0.01); M(new T3.BoxGeometry(0.5, 0.06, 0.36), toon('#fbf3e0'), -0.6, 1.11, 0, d, 0.006); M(new T3.CylinderGeometry(0.12, 0.12, 0.2, 10), brass, 0.8, 1.18, 0, d, 0.006, 0.12);
    const dt = CTX(512, 96, c => { c.fillStyle = '#c2963f'; c.fillRect(0, 0, 512, 96); c.fillStyle = '#201e1d'; c.font = '900 50px Archivo, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ASK THE KEEPER', 256, 52); }); const s = new T3.Mesh(new T3.PlaneGeometry(1.9, 0.36), new T3.MeshBasicMaterial({ map: dt })); s.position.set(0, 0.62, -0.41); s.rotation.y = Math.PI; d.add(s); Z.desk = d; }
  { const c = new T3.Group(); c.position.set(11.2, 0, 5.0); root.add(c); M(new T3.BoxGeometry(2.0, 0.7, 1.0), toon('#3f5d47'), 0, 0.75, 0, c, 0.02); for (const [x, z] of [[-0.75, -0.5], [0.75, -0.5], [-0.75, 0.5], [0.75, 0.5]]) M(new T3.CylinderGeometry(0.2, 0.2, 0.08, 14), iron, x, 0.2, z, c, 0.01, 0.2).rotation.x = Math.PI / 2;
    FK.forEach((k, i) => { const b = M(new T3.CylinderGeometry(0.17, 0.15, 0.3, 12), toon('#8a8f96'), -0.72 + i * 0.36, 1.25, 0, c, 0.008, 0.17); M(new T3.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon(FOODS[k].col), 0, 0.13, 0, b, 0.006, 0.13); });
    const ct = CTX(512, 96, c2 => { c2.fillStyle = '#201e1d'; c2.fillRect(0, 0, 512, 96); c2.fillStyle = '#e6b45a'; c2.font = '900 52px Archivo, Arial'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('FEED CART', 256, 52); }); const s = new T3.Mesh(new T3.PlaneGeometry(1.6, 0.3), new T3.MeshBasicMaterial({ map: ct })); s.position.set(0, 0.75, -0.51); s.rotation.y = Math.PI; c.add(s); Z.cart = c; }
  { const b = new T3.Group(); b.position.set(2.6, 0, 6.2); root.add(b); M(new T3.BoxGeometry(0.6, 1.1, 0.5), toon('#c2963f'), 0, 0.55, 0, b, 0.012); M(new T3.BoxGeometry(0.3, 0.03, 0.06), iron, 0, 1.11, 0, b, 0); const bt = CTX(256, 128, c => { c.fillStyle = '#201e1d'; c.fillRect(0, 0, 256, 128); c.fillStyle = '#e6b45a'; c.font = '900 40px Archivo, Arial'; c.textAlign = 'center'; c.fillText('FOR THE', 128, 52); c.fillText('ANIMALS', 128, 100); }); const s = new T3.Mesh(new T3.PlaneGeometry(0.5, 0.25), new T3.MeshBasicMaterial({ map: bt })); s.position.set(0, 0.75, -0.26); s.rotation.y = Math.PI; b.add(s); Z.box = b; }
  for (const x of [-6, 6]) { M(new T3.BoxGeometry(2.2, 0.1, 0.5), wood, x, 0.48, 4.9, root, 0.01); M(new T3.BoxGeometry(2.2, 0.5, 0.1), wood, x, 0.78, 5.15, root, 0.01); for (const s of [-1, 1]) M(new T3.BoxGeometry(0.08, 0.48, 0.5), iron, x + s * 0.95, 0.24, 4.9, root, 0.006); }
  { M(new T3.CylinderGeometry(1.45, 1.55, 0.6, 24), stone, 0, 0.3, 0.6, root, 0.02, 1.45); M(new T3.CylinderGeometry(1.32, 1.32, 0.04, 24), toon('#5a3a22'), 0, 0.61, 0.6, root, 0); const tk = M(new T3.CylinderGeometry(0.13, 0.2, 2.8, 8), wood, 0, 2.0, 0.6, root, 0.012); tk.rotation.z = 0.08;
    for (let i = 0; i < 7; i++) { const lf = M(new T3.ConeGeometry(0.28, 1.7, 4), toon(i % 2 ? '#4f8a3a' : '#5f9a44'), 0.1 + Math.cos(i * 0.9) * 0.6, 3.3, 0.6 + Math.sin(i * 0.9) * 0.6, root, 0.01); lf.rotation.set(Math.sin(i * 0.9) * 1.2, 0, -Math.cos(i * 0.9) * 1.2); }
    for (let i = 0; i < 5; i++) M(new T3.SphereGeometry(0.25, 8, 6), toon(['#e2722e', '#f2c94c', '#c2453a'][i % 3]), Math.cos(i * 1.3) * 1.0, 0.72, 0.6 + Math.sin(i * 1.3) * 1.0, root, 0.008, 0.25); }
  // walk colliders (rects in hall space) + circles
  Z.rects = [[-HX, -12.6, -4.3, 4.3], [12.6, HX, -4.3, 4.3], [-12.7, 12.7, BZ, -4.65], [-HX, -12.6, BZ, -4.3], [12.6, HX, BZ, -4.3], [-12.9, -10.1, 4.55, 5.45], [10.1, 12.3, 4.45, 5.55], [2.25, 2.95, 5.9, 6.5], [-7.1, -4.9, 4.6, 5.3], [4.9, 7.1, 4.6, 5.3]];
  Z.circles = [[0, 0.6, 1.6]]; Z.bounds = [-HX + 0.4, HX - 0.4, BZ + 0.4, FZ - 0.4];
  Z.spots = { hessaDesk: { x: -11.5, z: 5.95, ry: Math.PI }, hessaIntro: { x: -5.4, z: -2.2, ry: 0.35 }, benIntro: { x: -3.9, z: -2.0, ry: -0.25 }, enter: { x: 0, z: 5.6, ry: Math.PI }, box: { x: 2.6, z: 5.7 } };
  return Z;
}
function floorTex(CTX, k) {
  const base = { sand: '#e2c48a', dirt: '#9a7a5a', mud: '#7a5a3c', rock: '#a49c90', grass: '#7aa04e', meadow: '#6f9a4a', dark: '#3f5a3a', jungle: '#4f7a3a', pool: '#d9c08a', dune: '#e8cf96' }[k] || '#a49c90';
  return CTX(128, 128, c => { c.fillStyle = base; c.fillRect(0, 0, 128, 128); for (let i = 0; i < 70; i++) { const x = (i * 53) % 128, y = (i * 97 + i * i) % 128; c.fillStyle = i % 3 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)'; if (k === 'grass' || k === 'meadow' || k === 'jungle' || k === 'dark') { c.fillRect(x, y, 2, 7); c.fillRect(x + 3, y + 2, 2, 5); } else c.fillRect(x, y, 4, 3); } });
}
function plaqueTex(CTX, D, home) {
  return CTX(512, 128, c => { c.fillStyle = home ? '#201e1d' : '#3a3836'; c.fillRect(0, 0, 512, 128); c.fillStyle = '#c2963f'; c.fillRect(0, 0, 512, 8); c.fillRect(0, 120, 512, 8);
    c.textBaseline = 'middle'; c.fillStyle = '#fbf3e0'; c.font = '900 52px Archivo, Arial'; c.fillText(D.name + (home ? ' · ' + D.pet : ''), 20, 46);
    c.font = '800 28px Archivo, Arial'; c.fillStyle = home ? '#e6b45a' : '#cfcac4'; c.fillText(home ? 'EATS ' + FOODS[D.diet].name + (D.wild ? ' · NO PETTING' : ' · LOVES A BRUSH') : 'AWAY ON THE RED PLAINS', 20, 96); });
}
function habitat(cage, k, { T3, M, toon, wood, woodD, stone }) {
  const g = cage.g, rock = toon('#8a847a'), leaf = toon('#4f8a3a'), y0 = 0.08, bz = -CD / 2 + 0.8;
  const log = (x, z, ry, l = 1.6) => { const m = M(new T3.CylinderGeometry(0.2, 0.22, l, 10), wood, x, y0 + 0.2, z, g, 0.012, 0.2); m.rotation.set(0, ry, Math.PI / 2); M(new T3.CircleGeometry(0.19, 10), toon('#d9b48a'), 0, l / 2 + 0.001, 0, m, 0).rotation.x = -Math.PI / 2; };
  const boulder = (x, z, s) => { const m = M(new T3.DodecahedronGeometry(s, 0), rock, x, y0 + s * 0.6, z, g, 0.015, s); m.rotation.y = x; };
  const tree = (x, z, h = 2.2) => { M(new T3.CylinderGeometry(0.11, 0.16, h, 8), woodD, x, y0 + h / 2, z, g, 0.01); for (let i = 0; i < 3; i++) M(new T3.SphereGeometry(0.55 - i * 0.1, 10, 8), leaf, x + (i - 1) * 0.25, y0 + h + i * 0.15, z + (i % 2) * 0.2, g, 0.012, 0.5); };
  if (k === 'sand') { const s = M(new T3.BoxGeometry(1.6, 0.5, 1.1), stone, -0.9, y0 + 0.25, bz, g, 0.015); s.rotation.y = 0.2; boulder(1.3, bz - 0.1, 0.4); }
  else if (k === 'dirt') { log(-0.6, bz, 0.3); boulder(1.3, bz, 0.35); }
  else if (k === 'mud') { M(new T3.CylinderGeometry(0.9, 0.9, 0.02, 20), toon('#5a3e28'), 0.6, y0 + 0.01, bz + 0.2, g, 0); M(new T3.CylinderGeometry(0.32, 0.38, 0.5, 10), wood, -1.2, y0 + 0.25, bz, g, 0.012, 0.32); }
  else if (k === 'rock') { boulder(-1.0, bz, 0.55); boulder(-0.4, bz - 0.2, 0.4); boulder(1.2, bz, 0.45); M(new T3.BoxGeometry(1.0, 0.7, 0.8), rock, 0.3, y0 + 0.35, bz - 0.15, g, 0.015); }
  else if (k === 'grass') { tree(1.3, bz - 0.1, 2.0); boulder(-1.2, bz, 0.3); }
  else if (k === 'meadow') { boulder(-1.0, bz, 0.65); log(0.9, bz + 0.1, -0.4, 1.4); }
  else if (k === 'jungle') { tree(-1.4, bz - 0.2, 2.6); M(new T3.BoxGeometry(0.1, 2.4, 0.1), woodD, 1.0, y0 + 1.2, bz, g, 0.008); M(new T3.BoxGeometry(1.4, 0.1, 0.1), woodD, 0.35, y0 + 2.35, bz, g, 0.008); const tire = M(new T3.TorusGeometry(0.28, 0.09, 8, 16), toon('#201e1d'), 0.3, y0 + 0.9, bz, g, 0.008); cage.swing = tire; M(new T3.CylinderGeometry(0.012, 0.012, 1.25, 4), toon('#d9c08a'), 0.3, y0 + 1.75, bz, g, 0); }
  else if (k === 'dark') { const b = M(new T3.CylinderGeometry(0.14, 0.16, 2.2, 8), woodD, 0.8, y0 + 1.1, bz, g, 0.01); const br = M(new T3.CylinderGeometry(0.12, 0.12, 1.8, 8), woodD, 0.1, y0 + 1.5, bz + 0.1, g, 0.01); br.rotation.z = 1.2; M(new T3.SphereGeometry(0.6, 10, 8), toon('#2f5a2a'), 1.0, y0 + 2.4, bz, g, 0.012, 0.6); }
  else if (k === 'pool') { boulder(1.4, bz + 1.2, 0.3); }
  else if (k === 'dune') { boulder(-1.2, bz, 0.4); boulder(-0.7, bz - 0.2, 0.28); const lamp = M(new T3.CylinderGeometry(0.2, 0.3, 0.25, 12, 1, true), toon('#2a2826', { side: T3.DoubleSide }), 0.9, 2.3, bz + 0.3, g, 0.006); M(new T3.SphereGeometry(0.1, 8, 6), new T3.MeshBasicMaterial({ color: 0xff9a4a }), 0, -0.1, 0, lamp, 0); M(new T3.CylinderGeometry(0.015, 0.015, 0.5, 4), toon('#2a2826'), 0.9, 2.65, bz + 0.3, g, 0); }
}

// ---------------- the animals ----------------
export function makeBeast(ST, key) {
  const { M, toon } = ST, D = BEASTS[key], g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const col = toon(D.col), dark = toon(D.dark), belly = toon(D.belly), ink = toon('#16141c'), white = toon('#fbfbf7');
  const B = { key, D, g, body, legs: [], head: null, tail: null, ph: rr(0, 6), seed: rr(0, 9), hop: 0, kind: D.kind };
  const eyes = (head, r, x, y, z, iris = '#16141c') => { for (const s of [-1, 1]) { const e = M(new THREE.SphereGeometry(r, 10, 8), white, s * x, y, z, head, 0.012, r); M(new THREE.SphereGeometry(r * 0.58, 8, 6), toon(iris), 0, 0, r * 0.62, e, 0); if (iris !== '#16141c') M(new THREE.SphereGeometry(r * 0.3, 6, 5), ink, 0, 0, r * 0.88, e, 0); } };
  if (D.kind === 'quad' || D.kind === 'ape') {
    const ape = D.kind === 'ape', r = ape ? 0.3 : D.r, len = ape ? 0.36 : D.len, leg = ape ? 0.34 : D.leg, legR = ape ? 0.09 : D.legR, hr = ape ? 0.25 : D.hr, y0 = leg + r * 0.7;
    body.position.y = y0; if (ape) body.rotation.x = -0.75;
    const torso = M(new THREE.CapsuleGeometry(r, len, 6, 14), D.wool ? toon('#f6efe0') : col, 0, 0, 0, body, 0.03); torso.rotation.x = Math.PI / 2;
    if (D.wool) for (let i = 0; i < 10; i++) M(new THREE.SphereGeometry(r * 0.45, 8, 6), toon('#f6efe0'), Math.cos(i * 1.9) * r * 0.75, Math.sin(i * 2.7) * r * 0.5 + r * 0.25, -len / 2 + (i / 9) * len, body, 0.012, r * 0.45);
    const bel = M(new THREE.CapsuleGeometry(r * 0.78, len * 0.8, 4, 10), belly, 0, -r * 0.28, 0, body, 0); bel.rotation.x = Math.PI / 2;
    if (D.bristle) for (let i = 0; i < 6; i++) M(new THREE.ConeGeometry(0.05, 0.16, 4), dark, 0, r * 0.95, len / 2 - i * len / 5, body, 0.005);
    if (D.spots) for (let i = 0; i < 8; i++) M(new THREE.SphereGeometry(0.045, 6, 5), white, (i % 2 ? 1 : -1) * r * 0.55, r * 0.7, len / 2 - 0.1 - i * len / 8, body, 0);
    // legs [FL, FR, BL, BR]; ape: front = long arms
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const front = sz > 0, p = new THREE.Group(); p.position.set(sx * r * 0.6, -r * 0.35, sz * len * 0.45 + (ape && front ? 0.1 : 0)); body.add(p);
      let L = leg + r * 0.35; if (ape) { L = front ? 1.0 : 0.42; p.position.set(sx * (front ? r * 1.05 : r * 0.55), front ? r * 0.6 : -r * 0.4, sz * len * 0.45); }
      const lm = M(new THREE.CapsuleGeometry(legR, Math.max(0.02, L - legR * 2), 4, 8), D.wool || D.key === 'stag' ? dark : col, 0, -L / 2, 0, p, 0.02); if (ape && front) lm.material = col;
      M(new THREE.SphereGeometry(legR * 1.15, 8, 6), dark, 0, -L + legR * 0.4, legR * 0.3, p, 0.012, legR * 1.15).scale.set(1, 0.7, 1.3);
      if (ape) p.rotation.x = front ? 0.75 + 0.1 : 0.75; B.legs.push(p); }
    // head
    const nk = new THREE.Group(); nk.position.set(0, ape ? r + len / 2 + 0.05 : r * 0.45, ape ? 0.05 : len / 2 + r * 0.55); body.add(nk); const hd = new THREE.Group(); nk.add(hd); B.head = nk; if (ape) nk.rotation.x = 0.75;
    if (D.mane) { const mn = M(new THREE.SphereGeometry(hr * 1.6, 14, 10), toon(D.mane), 0, hr * 0.2, -hr * 0.25, hd, 0.03, hr * 1.6); mn.scale.set(1, 1, 0.72); for (let i = 0; i < 9; i++) M(new THREE.SphereGeometry(hr * 0.42, 8, 6), toon(D.mane), Math.cos(i * 0.7 + 0.1) * hr * 1.45, hr * 0.2 + Math.sin(i * 0.7 + 0.1) * hr * 1.45, -hr * 0.1, hd, 0.012, hr * 0.42); }
    M(new THREE.SphereGeometry(hr, 14, 12), D.face ? toon(D.face) : col, 0, hr * 0.3, hr * 0.45, hd, 0.025, hr);
    if (ape) { M(new THREE.SphereGeometry(hr * 1.02, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2.1), col, 0, hr * 0.38, hr * 0.38, hd, 0.012, hr); M(new THREE.SphereGeometry(hr * 0.62, 10, 8), toon(D.face), 0, hr * 0.05, hr * 0.98, hd, 0.012, hr * 0.62).scale.set(1.2, 0.85, 0.7); M(new THREE.SphereGeometry(hr * 0.3, 8, 6), toon(D.face), -hr * 1.0, hr * 0.35, hr * 0.4, hd, 0.01); M(new THREE.SphereGeometry(hr * 0.3, 8, 6), toon(D.face), hr * 1.0, hr * 0.35, hr * 0.4, hd, 0.01); eyes(hd, hr * 0.17, hr * 0.33, hr * 0.48, hr * 1.25); M(new THREE.SphereGeometry(0.035, 6, 5), ink, 0, hr * 0.08, hr * 1.42, hd, 0); }
    else {
      const sn = D.snout, snc = D.snoutCol ? toon(D.snoutCol) : belly, smu = M(new THREE.CapsuleGeometry(hr * 0.42, sn, 4, 10), D.wool ? toon(D.face) : snc, 0, hr * 0.05, hr * 0.9 + sn * 0.4, hd, 0.015); smu.rotation.x = Math.PI / 2;
      M(new THREE.SphereGeometry(hr * (D.key === 'boar' ? 0.32 : 0.18), 8, 6), D.key === 'boar' ? toon('#e8a0a0') : ink, 0, hr * 0.12, hr * 0.92 + sn * 0.95, hd, 0.008).scale.set(1, D.key === 'boar' ? 0.75 : 1, D.key === 'boar' ? 0.4 : 1);
      eyes(hd, hr * 0.2, hr * 0.45, hr * 0.58, hr * 1.05, D.eye || '#16141c');
      if (D.tusks) for (const s of [-1, 1]) M(new THREE.ConeGeometry(0.035, 0.16, 6), white, s * hr * 0.42, hr * -0.05, hr * 0.95 + sn * 0.7, hd, 0.006).rotation.x = -0.6;
      if (D.horns) for (const s of [-1, 1]) { const h = M(new THREE.TorusGeometry(hr * 0.5, hr * 0.17, 8, 16, Math.PI * 1.6), toon('#c9b48a'), s * hr * 0.8, hr * 0.55, hr * 0.2, hd, 0.012); h.rotation.set(0, s * Math.PI / 2, 0.6); }
      if (D.antlers) for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(s * hr * 0.4, hr * 1.1, hr * 0.25); a.rotation.z = -s * 0.35; hd.add(a); const am = toon('#e8dcc4'); M(new THREE.CylinderGeometry(0.025, 0.035, 0.6, 6), am, 0, 0.3, 0, a, 0.006); for (const [y, l, rz] of [[0.25, 0.25, s * 0.9], [0.45, 0.22, -s * 0.8], [0.58, 0.18, s * 0.7]]) { const t = M(new THREE.CylinderGeometry(0.018, 0.025, l, 5), am, 0, y, 0, a, 0.005); t.rotation.z = rz; t.position.x = Math.sin(rz) * -l / 2; t.position.y += Math.cos(rz) * l / 2; } }
    }
    // ears
    for (const s of [-1, 1]) { const ex = s * hr * 0.62, ey = hr * 1.05, ez = hr * 0.3; if (ape) break;
      if (D.ear === 'point') { const e = M(new THREE.ConeGeometry(hr * 0.3, hr * 0.7, 4), dark, ex, ey, ez, hd, 0.01); e.rotation.z = -s * 0.25; }
      else if (D.ear === 'round') M(new THREE.SphereGeometry(hr * 0.28, 8, 6), dark, ex, ey - hr * 0.05, ez, hd, 0.01, hr * 0.28).scale.set(1, 1, 0.5);
      else if (D.ear === 'flop') { const e = M(new THREE.CapsuleGeometry(hr * 0.13, hr * 0.4, 4, 6), toon(D.face), s * hr * 0.95, hr * 0.5, hr * 0.3, hd, 0.008); e.rotation.z = s * 1.2; } }
    // tail
    if (!ape) { const tp = new THREE.Group(); tp.position.set(0, r * 0.3, -len / 2 - r * 0.75); body.add(tp); B.tail = tp; const t = D.tail;
      if (t === 'bushy') { const m = M(new THREE.CapsuleGeometry(0.11, 0.42, 4, 8), col, 0, -0.1, -0.25, tp, 0.012); m.rotation.x = -0.9; M(new THREE.SphereGeometry(0.1, 8, 6), white, 0, -0.27, -0.45, tp, 0.008, 0.1); }
      else if (t === 'tuft' || t === 'long') { const m = M(new THREE.CylinderGeometry(0.03, 0.045, t === 'long' ? 0.9 : 0.7, 6), col, 0, -0.2, -0.28, tp, 0.006); m.rotation.x = -0.7; if (t === 'tuft') M(new THREE.SphereGeometry(0.08, 8, 6), toon(D.mane), 0, -0.45, -0.52, tp, 0.008, 0.08); }
      else if (t === 'curl') M(new THREE.TorusGeometry(0.07, 0.025, 6, 12, Math.PI * 1.5), col, 0, 0, -0.06, tp, 0.005);
      else M(new THREE.SphereGeometry(0.09, 8, 6), D.key === 'stag' ? white : col, 0, 0, -0.04, tp, 0.008, 0.09); }
  } else if (D.kind === 'croc') {
    const y0 = 0.2; body.position.y = y0; const tor = M(new THREE.CapsuleGeometry(0.24, 0.8, 4, 12), col, 0, 0, 0, body, 0.025); tor.rotation.x = Math.PI / 2; tor.scale.set(1.25, 1, 0.62); M(new THREE.BoxGeometry(0.42, 0.04, 0.9), belly, 0, -0.13, 0, body, 0);
    for (let i = 0; i < 7; i++) M(new THREE.ConeGeometry(0.045, 0.1, 4), dark, (i % 2 ? 0.08 : -0.08), 0.16, 0.45 - i * 0.16, body, 0.005);
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const p = new THREE.Group(); p.position.set(sx * 0.27, -0.05, sz * 0.32); body.add(p); const l = M(new THREE.CapsuleGeometry(0.06, 0.12, 4, 6), col, sx * 0.07, -0.08, 0, p, 0.01); l.rotation.z = sx * 0.9; M(new THREE.SphereGeometry(0.07, 6, 5), dark, sx * 0.14, -0.16, 0.03, p, 0.006).scale.set(1.2, 0.5, 1.4); B.legs.push(p); }
    const nk = new THREE.Group(); nk.position.set(0, 0.02, 0.62); body.add(nk); B.head = nk; const hd = M(new THREE.BoxGeometry(0.34, 0.16, 0.3), col, 0, 0, 0.12, nk, 0.015); M(new THREE.BoxGeometry(0.26, 0.1, 0.5), col, 0, -0.02, 0.48, nk, 0.012); M(new THREE.BoxGeometry(0.24, 0.05, 0.48), belly, 0, -0.08, 0.47, nk, 0.008); B.jaw = nk.children[nk.children.length - 1];
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) M(new THREE.ConeGeometry(0.018, 0.05, 4), white, s * 0.12, -0.065, 0.3 + i * 0.07, nk, 0).rotation.x = Math.PI;
    for (const s of [-1, 1]) { const bump = M(new THREE.SphereGeometry(0.07, 8, 6), col, s * 0.1, 0.08, 0.14, nk, 0.008, 0.07); M(new THREE.SphereGeometry(0.045, 8, 6), toon('#e6c84a'), 0, 0.02, 0.04, bump, 0); M(new THREE.BoxGeometry(0.015, 0.05, 0.02), ink, 0, 0.02, 0.085, bump, 0); }
    M(new THREE.SphereGeometry(0.02, 5, 4), ink, 0.05, 0.04, 0.72, nk, 0); M(new THREE.SphereGeometry(0.02, 5, 4), ink, -0.05, 0.04, 0.72, nk, 0);
    const tp = new THREE.Group(); tp.position.set(0, 0, -0.6); body.add(tp); B.tail = tp; const t1 = M(new THREE.ConeGeometry(0.2, 1.1, 8), col, 0, 0, -0.5, tp, 0.015); t1.rotation.x = -Math.PI / 2; t1.scale.set(1, 0.6, 1); for (let i = 0; i < 5; i++) M(new THREE.ConeGeometry(0.035, 0.08, 4), dark, 0, 0.1 - i * 0.015, -0.15 - i * 0.18, tp, 0);
  } else if (D.kind === 'snake') {
    B.segs = []; const n = 18; for (let i = 0; i < n; i++) { const r = 0.19 * (1 - i / n * 0.7); const s = M(new THREE.SphereGeometry(r, 10, 8), i % 3 === 1 ? dark : col, 0, r, 0, g, 0.012, r); s.scale.set(1, 0.85, 1); B.segs.push(s); }
    const hd = new THREE.Group(); g.add(hd); B.head = hd; M(new THREE.SphereGeometry(0.24, 12, 10), col, 0, 0, 0, hd, 0.015, 0.24).scale.set(1, 0.75, 1.3); eyes(hd, 0.07, 0.13, 0.1, 0.18, '#e6c84a'); const tg = M(new THREE.BoxGeometry(0.03, 0.01, 0.22), toon('#ec3013'), 0, -0.04, 0.38, hd, 0); B.tongue = tg; B.trail = [];
  }
  B.anchor = D.kind === 'snake' ? B.head : g;
  B.r = D.kind === 'snake' ? 0.5 : D.kind === 'croc' ? 0.7 : D.kind === 'ape' ? 0.6 : (D.len + D.r * 2) * 0.6; B.h = D.kind === 'snake' ? 0.3 : D.kind === 'croc' ? 0.3 : D.kind === 'ape' ? 1.0 : D.leg + D.r * 1.8;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return B;
}
export function animBeast(B, dt, sp, t, st = {}) {
  B.ph += dt * (sp > 0.05 ? 3 + sp * 6 : 1.2); const a = Math.min(1, sp * 2.2), D = B.D;
  if (B.kind === 'snake') { const h = B.head.position, tr = B.trail; if (!tr.length || Math.hypot(h.x - tr[0].x, h.z - tr[0].z) > 0.04) { tr.unshift({ x: h.x, z: h.z }); if (tr.length > 120) tr.pop(); }
    B.segs.forEach((s, i) => { const p = tr[Math.min(tr.length - 1, (i + 1) * 4)] || { x: h.x, z: h.z - (i + 1) * 0.16 }; s.position.x = p.x + Math.sin(t * 2 + i) * 0.01; s.position.z = p.z; });
    B.head.position.y = 0.2 + (st.up ? 0.35 + Math.sin(t * 3) * 0.05 : 0) + (st.eat ? Math.abs(Math.sin(t * 8)) * 0.06 : 0); B.tongue.visible = Math.sin(t * 5 + B.seed) > 0.6; B.head.rotation.y = B.yaw || 0; return; }
  B.legs.forEach((l, i) => { const off = (i === 0 || i === 3) ? 0 : Math.PI; if (B.kind === 'ape') l.rotation.x = (i < 2 ? 0.85 : 0.75) + Math.sin(B.ph + off) * 0.5 * a; else if (B.kind === 'croc') l.rotation.y = Math.sin(B.ph + off) * 0.6 * a; else l.rotation.x = Math.sin(B.ph + off) * 0.6 * a; });
  const breathe = 1 + Math.sin(t * 2 + B.seed) * 0.015; B.body.scale.set(breathe, breathe, 1);
  if (B.tail) { if (B.kind === 'croc') B.tail.rotation.y = Math.sin(B.ph * 0.6) * (0.25 + a * 0.3); else { B.tail.rotation.y = Math.sin(t * (st.happy ? 10 : 2.5) + B.seed) * (st.happy ? 0.7 : 0.25); B.tail.rotation.x = st.sad ? 0.5 : 0; } }
  if (B.head) { const tx = st.eat ? 0.5 + Math.sin(t * 12) * 0.15 : st.sad ? 0.35 : st.up ? -0.35 : Math.sin(t * 0.7 + B.seed) * 0.08; B.head.rotation.x = damp(B.head.rotation.x, (B.kind === 'ape' ? 0.75 : 0) + tx, 8, dt); B.head.rotation.y = damp(B.head.rotation.y, st.look || 0, 4, dt); }
  if (B.jaw) B.jaw.rotation.x = st.eat || st.happy ? Math.max(0, Math.sin(t * 9)) * 0.35 : 0;
  if (B.hop > 0) { B.hop = Math.max(0, B.hop - dt * 2.4); } B.g.position.y = Math.sin((1 - B.hop) * Math.PI) * (B.hop > 0 ? 0.35 : 0);
}

// ---------------- icons for the need bubbles + food meshes ----------------
function bubbleTex(kind, col) {
  return canvasTex(128, 128, c => { c.fillStyle = '#201e1d'; c.beginPath(); c.arc(64, 58, 50, 0, 7); c.fill(); c.beginPath(); c.moveTo(52, 100); c.lineTo(64, 124); c.lineTo(76, 100); c.fill(); c.strokeStyle = col; c.lineWidth = 7; c.beginPath(); c.arc(64, 58, 46, 0, 7); c.stroke();
    c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 8; c.lineCap = 'round';
    if (kind === 'food') { c.beginPath(); c.ellipse(64, 66, 30, 12, 0, 0, Math.PI); c.fill(); c.fillRect(34, 60, 60, 6); c.beginPath(); c.arc(56, 44, 13, 0, 7); c.fill(); c.beginPath(); c.moveTo(64, 50); c.lineTo(80, 34); c.stroke(); }
    else if (kind === 'water') { c.beginPath(); c.moveTo(64, 22); c.quadraticCurveTo(94, 62, 84, 76); c.arc(64, 70, 22, 0.25, Math.PI - 0.25); c.quadraticCurveTo(34, 62, 64, 22); c.fill(); }
    else if (kind === 'clean') { c.beginPath(); c.ellipse(64, 82, 30, 9, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(64, 68, 22, 8, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(64, 55, 13, 7, 0, 0, 7); c.fill(); c.beginPath(); c.arc(64, 44, 6, 0, 7); c.fill(); }
    else { c.beginPath(); c.moveTo(64, 86); c.bezierCurveTo(20, 56, 40, 22, 64, 44); c.bezierCurveTo(88, 22, 108, 56, 64, 86); c.fill(); } });
}
function foodMesh(ST, kind) {
  const { toon, addOutline } = ST, g = new THREE.Group(), add = (geo, col, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, toon(col)); m.position.set(x, y, z); addOutline(m, 0.008); g.add(m); return m; };
  if (kind === 'meat') { add(new THREE.SphereGeometry(0.11, 10, 8), '#c2453a').scale.set(1.3, 0.9, 1); const b = add(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6), '#fbf3e0', 0.15, 0, 0); b.rotation.z = Math.PI / 2; add(new THREE.SphereGeometry(0.035, 6, 5), '#fbf3e0', 0.24, 0, 0); }
  else if (kind === 'fish') { add(new THREE.SphereGeometry(0.1, 10, 8), '#5aa6d6').scale.set(1.7, 0.8, 0.55); const t = add(new THREE.ConeGeometry(0.07, 0.1, 4), '#3f7fa8', -0.2, 0, 0); t.rotation.z = Math.PI / 2; }
  else if (kind === 'fruit') { add(new THREE.SphereGeometry(0.1, 10, 8), '#e2722e', -0.06, 0, 0); add(new THREE.SphereGeometry(0.09, 10, 8), '#c2453a', 0.08, 0, 0.03); add(new THREE.CylinderGeometry(0.01, 0.01, 0.06, 4), '#4f3a22', -0.06, 0.11, 0); }
  else if (kind === 'hay') { const b = add(new THREE.BoxGeometry(0.26, 0.14, 0.18), '#e3c35a'); add(new THREE.BoxGeometry(0.27, 0.02, 0.19), '#a8792e', 0, 0.02, 0); }
  else if (kind === 'eggs') { add(new THREE.SphereGeometry(0.07, 10, 8), '#efe6d0', -0.05, 0, 0).scale.set(1, 1.3, 1); add(new THREE.SphereGeometry(0.07, 10, 8), '#f6efe0', 0.06, 0, 0.02).scale.set(1, 1.3, 1); }
  else if (kind === 'toy') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), toon('#ec3013')); addOutline(m, 0.008, 0.14); g.add(m); const s = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 20), toon('#ffd23a')); s.rotation.x = Math.PI / 2; g.add(s); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
function pileMesh(ST, kind) {
  const { toon, addOutline } = ST, g = new THREE.Group();
  if (kind === 'dung') for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.11 - i * 0.025, 8, 6), toon('#5a3e22')); m.position.y = 0.05 + i * 0.07; m.scale.y = 0.65; addOutline(m, 0.006); g.add(m); }
  else if (kind === 'puddle') { const m = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshBasicMaterial({ color: 0x7cc8e0, transparent: true, opacity: 0.8 })); m.rotation.x = -Math.PI / 2; m.position.y = 0.092; g.add(m); }
  else { const f = foodMesh(ST, kind); f.position.y = 0.1; f.rotation.y = rr(0, 6); g.add(f); for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.05), toon(FOODS[kind] ? FOODS[kind].col : '#a8792e')); c.position.set(rr(-0.2, 0.2), 0.095, rr(-0.2, 0.2)); g.add(c); } }
  g.userData.kind = kind; return g;
}
const voiceOf = (tone, burst, v) => ({ roar: () => { tone(120, 0.7, 0.07, 'sawtooth', 0.55); tone(90, 0.8, 0.04, 'square', 0.6); }, howl: () => { tone(380, 1.1, 0.04, 'sine', 1.6); setTimeout(() => tone(600, 0.6, 0.03, 'sine', 0.8), 700); }, grunt: () => { tone(160, 0.12, 0.05, 'square', 0.7); setTimeout(() => tone(150, 0.14, 0.05, 'square', 0.7), 170); },
  growl: () => { tone(85, 0.7, 0.07, 'sawtooth', 0.8); }, baa: () => { for (let i = 0; i < 4; i++) setTimeout(() => tone(320 - i * 6, 0.1, 0.035, 'square'), i * 80); }, hiss: () => burst && burst(0.6, 5200, 0.12), bellow: () => tone(180, 0.8, 0.05, 'triangle', 1.5), hoot: () => { for (let i = 0; i < 4; i++) setTimeout(() => tone(420 + i * 120, 0.1, 0.04, 'sine'), i * 120); }, snarl: () => { tone(150, 0.45, 0.06, 'sawtooth', 0.7); burst && burst(0.3, 2600, 0.05); } }[v] || (() => {}));

// ---------------- the stand-alone game ----------------
export async function createZoo({ container, onState = () => {} }) {
  const ST = createStage(container, { bg: '#f2a86a' }), { CW: SW, CHh, renderer, scene, camera, glowTex, V3, toon, M, kit, audio, tone, puff, smokeS, sun } = ST;
  scene.background = canvasTex(4, 256, c => { const gr = c.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#6a8fc4'); gr.addColorStop(0.5, '#f2a86a'); gr.addColorStop(1, '#f9d9a0'); c.fillStyle = gr; c.fillRect(0, 0, 4, 256); });
  sun.position.set(6, 16, 10); Object.assign(sun.shadow.camera, { left: -19, right: 19, top: 14, bottom: -14, far: 50 }); sun.shadow.camera.updateProjectionMatrix(); if (sun.castShadow) sun.shadow.mapSize.set(2048, 2048); camera.far = 120; camera.updateProjectionMatrix();
  const Z = buildZoo({ THREE, M, toon, canvasTex, scene, grad: ST.grad, addOutline: ST.addOutline });
  const burst = (d, f, v) => { try { audio.burst(d, f, v); } catch (e) {} };
  const wp = o => o.getWorldPosition(new THREE.Vector3());
  // ---------- cast ----------
  const strip = f => { const P = f.userData.P; if (P.sword) P.sword.visible = false; if (P.gun) P.gun.visible = false; scene.add(f); return f; };
  const hessa = strip(kit.makeFox({ key: HESSA.key, look: HESSA.look, torso: HESSA.torso, outfit: 'coat', crest: '', gear: 'none', mood: 'warm' }));
  const benW = strip(kit.makeFox({ ...CAST.player, gear: 'none' }));   // walking around: Ben as he is (the Luxor law keeps weapons away inside)
  const ben = strip(kit.makeFox({ ...CAST.player, outfit: 'tee', torso: ['#3f5d47', '#3f5d47', '#c2963f'], crest: '', gear: 'none', mood: 'happy' })); const BP = ben.userData.P;
  const uniform = (() => { const print = canvasTex(256, 256, g => { g.clearRect(0, 0, 256, 256); g.fillStyle = '#c2963f'; g.beginPath(); g.ellipse(128, 104, 34, 28, 0, 0, 7); g.fill(); for (const [x, y] of [[84, 66], [108, 48], [148, 48], [172, 66]]) { g.beginPath(); g.ellipse(x, y, 13, 16, 0, 0, 7); g.fill(); }
      g.save(); g.translate(128, 190); g.rotate(-0.04); g.fillStyle = '#c2963f'; g.fillRect(-118, -26, 236, 52); g.font = 'italic 900 38px Archivo, "Arial Black", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#20301f'; g.fillText('LUXOR ZOO', 0, 2); g.restore(); });
    const U = dinerUniform(ST, ben, { print, printY: 1.17, stripe: '#3f5d47', towelCol: '#c2963f' }), hat = U.hat, hs = BP.head.scale.x || 1; while (hat.children.length) hat.remove(hat.children[0]); hat.scale.setScalar(hs); hat.position.y -= 0.06 * hs;
    M(new THREE.CylinderGeometry(0.46, 0.46, 0.03, 20), toon('#d8c08a'), 0, 0, -0.03, hat, 0.008, 0.46); M(new THREE.CylinderGeometry(0.26, 0.3, 0.22, 16), toon('#d8c08a'), 0, 0.12, -0.03, hat, 0.01, 0.3); M(new THREE.CylinderGeometry(0.305, 0.305, 0.06, 16), toon('#3f5d47'), 0, 0.06, -0.03, hat, 0, 0.3);
    return U.parts; })();
  const crestSlots = []; ben.traverse(m => { if (m.isMesh && Array.isArray(m.material) && m.material[1] && m.material[1].map) crestSlots.push(m); });
  const setUniform = on => { uniform.forEach(p => p.visible = on); crestSlots.forEach(m => m.visible = !on); };
  const VIS = [{ fur: '#d9733a', torso: ['#e2453f', '#fbf8ec', '#a82c26'], outfit: 'dress', base: PLAYER_FEMALE }, { fur: '#9a9a9e', furDark: '#6a6a70', torso: ['#2f9a8f', '#f2d970', '#1f6a62'], outfit: 'vest', base: PLAYER_MALE }, { fur: '#f0dcbe', furDark: '#c2a577', torso: ['#a78bfa', '#ede9fe', '#5b21b6'], outfit: 'robe', base: PLAYER_FEMALE }]
    .map((v, i) => { const f = strip(kit.makeFox({ key: 'zooVisitor' + i, look: { ...v.base, fur: v.fur, furDark: v.furDark || v.base.furDark }, torso: v.torso, outfit: v.outfit, crest: '', gear: 'none', mood: 'happy' })); const s = [[-4, 3.6], [5, 2.6], [8, -2.4]][i]; f.position.set(s[0], 0, s[1]); return { f, tgt: null, st: 'pick', t: rr(0, 3), ci: -1, cool: 0 }; });
  const place = (f, s) => { f.position.set(s.x, 0, s.z); f.rotation.y = s.ry || 0; };
  // ---------- residents ----------
  const ALL = Z.cages.map(c => { const B = makeBeast(ST, c.key); c.g.add(B.g); B.g.visible = false; const bub = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex('food', '#fff'), depthTest: false, transparent: true })); bub.renderOrder = 22; bub.scale.setScalar(0.62); bub.visible = false; c.g.add(bub);
    return { cage: c, B, key: c.key, D: c.D, home: false, x: 0, z: 0, yaw: 0, n: { food: 1, water: 1, fun: 1 }, piles: [], task: null, tgt: null, waitT: rr(1, 4), poopT: rr(25, 45), bub, bubK: '', mood: '', moodT: 0, level: 0.6, hearts: 0 }; });
  const RES = () => ALL.filter(r => r.home);
  const tex = {}; const bTex = (k, crit) => { const id = k + (crit ? '!' : ''); if (!tex[id]) tex[id] = bubbleTex(k, crit ? '#ec3013' : NEED[k].col); return tex[id]; };
  // ---------- state ----------
  const S = { mode: 'intro', day: Math.max(1, save.stat(SAVE.day, 1)), t: 0, sel: -1, earned: 0, tips: 0, hSum: 0, hT: 0, flash: null, flashT: 0, say: '', sayT: 0, done: null, pour: null, ptr: null, chip: null, fed: 0, bulls: 0, sayCd: 8, demo: false, react: null };
  const upg = id => !!save.stat(SAVE.upg + id, 0);
  const flash = (txt, col = '#ffd23a', t = 1.4) => { S.flash = { txt, col }; S.flashT = t; }, say = (s, t = 3.6) => { S.say = s; S.sayT = t; };
  const bandG = () => upg('float') ? [0.6, 0.97] : [0.72, 0.9];
  const cleanOf = r => Math.max(0, 1 - r.piles.length * 0.34);
  const H = r => (r.n.food + r.n.water + cleanOf(r) + r.n.fun) / 4;
  const needs = r => { const o = []; if (r.n.food < 0.45) o.push(['food', r.n.food]); if (r.n.water < 0.45) o.push(['water', r.n.water]); if (r.piles.length) o.push(['clean', cleanOf(r)]); if (r.n.fun < 0.45) o.push(['fun', r.n.fun]); return o.sort((a, b) => a[1] - b[1]); };
  const worst = r => needs(r)[0] || null;
  function setHome(day) { const set = residentsFor(day); ALL.forEach(r => { r.home = set.includes(r.key); r.B.g.visible = r.home; r.cage.setHome(r.home); r.bub.visible = false; }); }
  function resetAnimals(fresh) { RES().forEach(r => { r.piles.forEach(p => r.cage.g.remove(p)); r.piles = []; r.task = null; r.tgt = null; r.x = rr(-1.2, 1.2); r.z = rr(-1.2, 0.6); r.yaw = rr(-1, 1); r.B.g.position.set(r.x, 0, r.z); if (r.B.kind === 'snake') { r.B.g.position.set(0, 0, 0); r.B.head.position.set(r.x, 0.14, r.z); r.B.trail = []; }
      if (fresh) { r.n.food = rr(0.35, 0.95); r.n.water = rr(0.4, 0.95); r.n.fun = rr(0.45, 1); if (Math.random() < 0.5) addPile(r, 'dung'); } setWater(r, r.n.water * 0.8); r.cage.bowlPile.clear(); }); }
  setHome(S.day); resetAnimals(true); RES().forEach(r => { r.n.food = r.n.water = r.n.fun = 0.9; r.piles.forEach(p => r.cage.g.remove(p)); r.piles = []; });
  function addPile(r, kind, x, z) { if (r.piles.length >= 4) return; const p = pileMesh(ST, kind); const px = x != null ? x : clamp(r.x + rr(-0.4, 0.4), -1.6, 1.6), pz = z != null ? z : clamp(r.z + rr(-0.4, 0.2), -1.6, 0.9); p.position.set(px, 0, pz); r.cage.g.add(p); r.piles.push(p); }
  function setWater(r, v) { r.trough = clamp(v, 0, 1.15); const w = r.cage.water; w.scale.y = Math.max(0.02, Math.min(1, r.trough)); w.position.y = 0.06 + 0.14 * Math.min(1, r.trough); w.visible = r.trough > 0.02; }
  setUniform(!!save.flag('zooUniform') || true); place(hessa, Z.spots.hessaIntro); place(ben, Z.spots.benIntro); benW.visible = false;
  // ---------- beast brain ----------
  const lim = { x: CW / 2 - 0.6, z0: -CD / 2 + 0.55, z1: CD / 2 - 0.55 };
  function goTask(r, task) { r.task = task; r.tgt = { x: clamp(task.x, -lim.x, lim.x), z: clamp(task.z, lim.z0, lim.z1) }; }
  function stepBeast(r, dt, t) { const B = r.B, sp0 = r.D.kind === 'snake' ? 0.5 : r.D.kind === 'croc' ? 0.7 : 1.0; let sp = 0, st = {};
    if (!r.tgt && !r.task) { r.waitT -= dt; if (r.waitT <= 0) { r.waitT = rr(2.5, 6); if (Math.random() < 0.6) r.tgt = { x: rr(-lim.x, lim.x), z: rr(lim.z0, 0.55) }; } }
    if (r.tgt) { const dx = r.tgt.x - r.x, dz = r.tgt.z - r.z, d = Math.hypot(dx, dz), stop = r.task ? (r.task.reach || 0.45) : 0.1; if (d > stop) { const v = Math.min(d, sp0 * (r.task ? 1.6 : 0.7) * dt); r.x += dx / d * v; r.z += dz / d * v; r.yaw = Math.atan2(dx, dz); sp = v / dt; } else { r.tgt = null; if (r.task) { r.task.t = 0; r.task.at = true; if (r.task.face != null) r.yaw = r.task.face; else r.yaw = Math.atan2(r.task.x - r.x, r.task.z - r.z); } } }
    const T = r.task; if (T && T.at) { T.t += dt; if (T.kind === 'eat') { st.eat = true; if (T.t > 1.6) { finishEat(r, T); r.task = null; } } else if (T.kind === 'drink') { st.eat = true; const dv = Math.min(dt * 0.5, r.trough); setWater(r, r.trough - dv); r.n.water = Math.min(1, r.n.water + dv * 1.1); if (T.t > 2.2 || r.trough <= 0.02) r.task = null; } else if (T.kind === 'sniff') { st.sad = T.t > 0.8; if (T.t > 1.8) r.task = null; } else if (T.kind === 'chase') { st.happy = true; if (T.t < 0.1) { B.hop = 1; voice(r); } if (T.ball) { T.ball.position.set(r.x + Math.sin(r.yaw) * 0.4, 0.2, r.z + Math.cos(r.yaw) * 0.4); } if (T.t > 2.2) { if (T.ball) { r.cage.g.remove(T.ball); puff(...wp(r.B.anchor).toArray().map((v, i) => i === 1 ? v + 0.4 : v), 0xffd23a, 3); } r.task = null; } } else if (T.kind === 'call') { st.up = true; st.happy = true; if (T.t < 0.05) { B.hop = 1; voice(r); } if (T.t > 2.6) r.task = null; } else if (T.kind === 'catch') { r.task = null; } else r.task = null; }
    if (r.moodT > 0) { r.moodT -= dt; if (r.mood === 'happy') st.happy = true; if (r.mood === 'sad') st.sad = true; if (r.mood === 'up') st.up = true; }
    if (!st.happy && !st.sad && H(r) < 0.32) st.sad = true; if (!st.happy && H(r) > 0.85 && !r.tgt) st.happy = Math.sin(t * 0.5 + B.seed) > 0.6;
    if (B.kind === 'snake') { B.head.position.x = r.x; B.head.position.z = r.z; B.yaw = r.yaw; } else { B.g.position.x = r.x; B.g.position.z = r.z; B.g.rotation.y = damp(B.g.rotation.y, r.yaw, 8, dt); if (Math.abs(B.g.rotation.y - r.yaw) > Math.PI) B.g.rotation.y = r.yaw; }
    animBeast(B, dt, sp, t, st); }
  function voice(r) { voiceOf(tone, burst, r.D.voice)(); }
  // ---------- needs tick (work) ----------
  function tickNeeds(r, dt) { const m = Math.min(1.7, 1 + 0.1 * (S.day - 1)); r.n.food = Math.max(0, r.n.food - dt * m / 80); r.n.water = Math.max(0, r.n.water - dt * m / 95); r.n.fun = Math.max(0, r.n.fun - dt * m / 110);
    r.poopT -= dt * m; if (r.poopT <= 0) { r.poopT = rr(32, 52); addPile(r, 'dung'); }
    if (!r.task && r.trough > 0.15 && r.n.water < 0.7) goTask(r, { kind: 'drink', x: SPOT.trough[0], z: SPOT.trough[1] - 0.8, face: 0, reach: 0.3 }); }
  // ---------- actions: THROW (food / toy) ----------
  const flights = [];
  const handWorld = () => { const p = wp(ben); return p.add(V3(0, 1.25, 0)); };
  function throwInto(ci, kind, lx, lz, flick) { const r = ALL[ci], C = r.cage; if (!r.home) { flash('THIS CAGE IS EMPTY · AWAY ON THE RED PLAINS', '#cfcac4', 1.6); return; }
    const m = kind === 'toy' ? foodMesh(ST, 'toy') : foodMesh(ST, kind); C.g.add(m); const a = C.g.worldToLocal(handWorld()); m.position.copy(a);
    flights.push({ m, r, kind, a, b: V3(lx, 0.12, lz), t: 0, dur: 0.55 + Math.hypot(lx - a.x, lz - a.z) * 0.06, flick }); ben.userData.throwT = 0.45; tone(500, 0.08, 0.04, 'triangle', 1.8); S.lastInput = performance.now(); }
  function landed(F) { const { r, kind, b, flick } = F, C = r.cage; const bowl = V3(SPOT.bowl[0], 0, SPOT.bowl[1]), dB = Math.hypot(b.x - bowl.x, b.z - bowl.z), inside = Math.abs(b.x) < CW / 2 - 0.12 && b.z > -CD / 2 + 0.1 && b.z < CD / 2 - 0.15;
    if (!inside) { C.g.remove(F.m); flash('IT BOUNCED OFF THE BARS · AIM FOR THE ' + (kind === 'toy' ? 'CAGE' : 'BOWL'), '#ec3013', 1.4); tone(220, 0.15, 0.04, 'square'); return; }
    if (kind === 'toy') { const near = Math.hypot(b.x - r.x, b.z - r.z) < 0.9; tone(700, 0.05, 0.04, 'square'); if (!r.D.wild && r.n.fun > 0.6) flash(r.D.name + ' WOULD RATHER HAVE A BRUSH', '#e6b45a', 1.4);
      const gain = (r.D.wild ? 0.55 : 0.3) * (upg('squeak') ? 2 : 1); r.n.fun = Math.min(1, r.n.fun + gain); goTask(r, { kind: 'chase', x: b.x, z: b.z, reach: 0.35, ball: F.m }); flash(near && flick ? 'POUNCE! ' + r.D.name + ' LOVES IT' : r.D.name + ' CHASES THE TOY', '#22c55e', 1.3); if (flick) S.tips += 0; return; }
    const good = kind === r.D.diet, full = r.n.food > 0.9;
    if (!good) { const p = pileMesh(ST, kind); p.position.set(b.x, 0, b.z); C.g.remove(F.m); C.g.add(p); r.piles.push(p); goTask(r, { kind: 'sniff', x: b.x, z: b.z, reach: 0.55 }); flash(r.D.name + ' WON\'T EAT ' + FOODS[kind].name + ' · EATS ' + FOODS[r.D.diet].name, '#ec3013', 2); tone(180, 0.25, 0.05, 'sawtooth'); return; }
    if (full) { const p = pileMesh(ST, kind); p.position.set(b.x, 0, b.z); C.g.remove(F.m); C.g.add(p); r.piles.push(p); flash('NOT HUNGRY · NOW IT\'S MESS', '#e6b45a', 1.5); tone(260, 0.15, 0.04); return; }
    const catchIt = flick && Math.hypot(b.x - r.x, b.z - r.z) < 0.75 && r.B.kind !== 'snake';
    if (catchIt) { C.g.remove(F.m); r.B.hop = 1; r.n.food = Math.min(1, r.n.food + 0.55 * (upg('bucket') ? 1.5 : 1)); r.n.fun = Math.min(1, r.n.fun + 0.15); r.moodT = 1.2; r.mood = 'happy'; S.tips += 2; S.bulls++; flash('CAUGHT IT! +2g', '#22c55e', 1.4); tone(1175, 0.1, 0.05); setTimeout(() => tone(1568, 0.12, 0.05), 100); voice(r); return; }
    if (dB < 0.42) { C.g.remove(F.m); const pm = foodMesh(ST, kind); pm.scale.setScalar(0.8); pm.position.set(rr(-0.06, 0.06), 0.02, rr(-0.06, 0.06)); C.bowlPile.add(pm); goTask(r, { kind: 'eat', x: bowl.x, z: bowl.z - 0.1, reach: 0.55, inBowl: true, kind2: kind });
      if (flick && dB < 0.26) { S.tips += 1; S.bulls++; flash('BULLSEYE! +1g', '#22c55e', 1.2); tone(1320, 0.1, 0.05); } else flash('IN THE BOWL', '#22c55e', 1); tone(880, 0.08, 0.04); return; }
    F.m.position.set(b.x, 0.1, b.z); goTask(r, { kind: 'eat', x: b.x, z: b.z, reach: 0.5, mesh: F.m, messy: true }); flash('MISSED THE BOWL · IT\'LL MAKE A MESS', '#e6b45a', 1.3); tone(440, 0.1, 0.04); }
  function finishEat(r, T) { r.n.food = Math.min(1, r.n.food + 0.5 * (upg('bucket') ? 1.5 : 1)); if (T.mesh) r.cage.g.remove(T.mesh); if (T.inBowl) r.cage.bowlPile.clear(); if (T.messy) addPile(r, r.D.diet, T.x + 0.15, T.z); r.mood = 'happy'; r.moodT = 1.5; S.fed++; const p = wp(r.B.anchor); puff(p.x, p.y + 0.9, p.z, 0xffe7a0, 2); }
  // ---------- actions: HOSE (hold, let go in the green) ----------
  function pourStart(ci) { const r = ALL[ci]; if (!r || !r.home) return; S.pour = { r, v: r.trough || 0 }; tone(300, 0.3, 0.03, 'sine'); S.lastInput = performance.now(); }
  function pourEnd() { const P = S.pour; if (!P) return; S.pour = null; const r = P.r, v = P.v, [g0, g1] = bandG();
    if (v < 0.45) { flash('TOO LITTLE · HOLD THE HOSE LONGER', '#ffffff', 1.3); tone(300, 0.1, 0.04); return; }
    if (v > 1.0) { addPile(r, 'puddle', SPOT.trough[0] - 0.1, SPOT.trough[1] - 0.6); setWater(r, 1); flash('SPLASH! TOO FULL · RAKE THE PUDDLE', '#ec3013', 1.6); tone(200, 0.3, 0.05, 'sawtooth'); burst(0.5, 3000, 0.1); }
    else if (v >= g0 && v <= g1) { flash('PERFECT FILL!', '#22c55e', 1.2); tone(1175, 0.1, 0.05); setTimeout(() => tone(1568, 0.12, 0.05), 100); }
    else flash(v < g0 ? 'A BIT LOW · IT\'LL DO' : 'NEARLY OVER · CAREFUL', '#e6b45a', 1.2);
    if (r.n.water < 0.95) goTask(r, { kind: 'drink', x: SPOT.trough[0], z: SPOT.trough[1] - 0.8, face: 0, reach: 0.3 }); }
  // ---------- actions: RAKE (swipe) + BRUSH (rub) ----------
  const scr = p => { const v = p.clone().project(camera); return { x: (v.x + 1) / 2 * SW(), y: (1 - v.y) / 2 * CHh(), z: v.z }; };
  const scale = () => Math.min(1.6, Math.max(0.85, Math.min(SW(), CHh()) / 420));
  const near = (o, x, y, rad) => { const s = scr(wp(o)); return Math.hypot(s.x - x, s.y - y) < rad * scale(); };
  function rakeAt(r, x, y) { let n = 0; for (const p of r.piles.slice()) { if (!near(p, x, y, upg('rake') ? 60 : 38)) continue; const q = wp(p); r.cage.g.remove(p); r.piles.splice(r.piles.indexOf(p), 1); puff(q.x, q.y + 0.15, q.z, 0xe8dcc4, 3); tone(900 + Math.random() * 400, 0.05, 0.035, 'square'); burst(0.08, 1800, 0.06); n++; } if (n && !r.piles.length) { flash('ALL CLEAN ✓', '#22c55e', 1.2); tone(1320, 0.1, 0.04); } return n; }
  const beastScreen = r => { const p = wp(r.B.anchor).add(V3(0, r.B.h * 0.55, 0)); return { s: scr(p), rad: Math.max(46, Math.abs(scr(p.clone().add(V3(0, r.B.r, 0))).y - scr(p).y) * 1.3) }; };
  function onBeast(r, x, y) { if (!r.home) return false; const { s, rad } = beastScreen(r); return Math.hypot(s.x - x, s.y - y) < rad; }
  function brush(r, d) { if (r.D.wild) return; r.rub = (r.rub || 0) + d; if (r.rub > 110) { r.rub = 0; r.n.fun = Math.min(1, r.n.fun + 0.12 * (upg('squeak') ? 2 : 1)); r.mood = 'happy'; r.moodT = 1.2; const p = wp(r.B.anchor); puff(p.x + rr(-0.2, 0.2), p.y + r.B.h + 0.2, p.z, 0xff7ab8, 2); tone(660 + r.n.fun * 400, 0.09, 0.04, 'sine'); if (r.n.fun >= 1 && !r.fullT) { r.fullT = 1; flash(r.D.name + ' IS SO HAPPY ✓', '#22c55e', 1.3); voice(r); } } if (r.n.fun < 0.98) r.fullT = 0; }
  // ---------- input ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floorP = new THREE.Plane(V3(0, 1, 0), -0.08), local = e => { const rc = renderer.domElement.getBoundingClientRect(); return { x: e.clientX - rc.left, y: e.clientY - rc.top }; };
  function aimAt(ci, x, y) { const r = ALL[ci], C = r.cage; ndc.set(x / SW() * 2 - 1, -(y / CHh()) * 2 + 1); ray.setFromCamera(ndc, camera); const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(floorP, p)) return { x: 0, z: -CD / 2 + 0.5 }; const l = C.g.worldToLocal(p); return { x: clamp(l.x, -CW / 2 - 0.4, CW / 2 + 0.4), z: Math.max(l.z, -CD / 2 + 0.25) }; }
  // the drag ghost (food follows your finger) + the landing ring
  const ghost = new THREE.Group(); ghost.visible = false; scene.add(ghost); let ghostKind = '';
  const aimRing = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.28, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, depthTest: false })); aimRing.renderOrder = 28; aimRing.visible = false; scene.add(aimRing);
  function ghostAt(kind, x, y) { if (ghostKind !== kind) { ghost.clear(); ghost.add(foodMesh(ST, kind)); ghostKind = kind; } ndc.set(x / SW() * 2 - 1, -(y / CHh()) * 2 + 1); ray.setFromCamera(ndc, camera); ghost.position.copy(ray.ray.origin).addScaledVector(ray.ray.direction, 2.2); ghost.scale.setScalar(0.9); ghost.visible = true; }
  function aimPreview(x, y, vx, vy) { if (S.sel < 0) { aimRing.visible = false; return; } const spd = Math.hypot(vx, vy), kk = spd > 250 ? Math.min(0.16, 230 * scale() / spd) : 0, r = ALL[S.sel], a = aimAt(S.sel, x + vx * kk, y + vy * kk), w = r.cage.g.localToWorld(V3(a.x, 0.11, a.z)), inside = Math.abs(a.x) < CW / 2 - 0.12 && a.z < CD / 2 - 0.15, bowl = Math.hypot(a.x - SPOT.bowl[0], a.z - SPOT.bowl[1]) < 0.7;
    aimRing.position.copy(w); aimRing.visible = true; aimRing.material.color.set(!inside ? 0xec3013 : bowl || S.chip.kind === 'toy' ? 0x22c55e : 0xffd23a); }
  function chipDown(kind, cx, cy, id) { audio.init && audio.init(); if (S.mode !== 'work' || S.demo || S.sel < 0) return; const r = ALL[S.sel]; if (!r.home) { flash('THIS CAGE IS EMPTY', '#cfcac4'); return; }
    const rc = renderer.domElement.getBoundingClientRect(), x = cx - rc.left, y = cy - rc.top; S.lastInput = performance.now();
    if (kind === 'hose') { S.chip = { kind, id }; pourStart(S.sel); return; }
    S.chip = { kind, id, x0: x, y0: y, x, y, t0: performance.now(), hist: [{ x, y, t: performance.now() }], moved: 0 }; }
  function chipMove(e) { const C = S.chip; if (!C || C.kind === 'hose') return; const { x, y } = local(e); C.moved = Math.max(C.moved, Math.hypot(x - C.x0, y - C.y0)); C.x = x; C.y = y; C.hist.push({ x, y, t: performance.now() }); if (C.hist.length > 8) C.hist.shift(); if (C.moved > 14) { ghostAt(C.kind, x, y); const v = vel(C); aimPreview(x, y, v.x, v.y); } }
  const vel = C => { const h = C.hist, a = h[0], b = h[h.length - 1], dt = Math.max(16, b.t - a.t) / 1000; return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt }; };
  function chipUp() { const C = S.chip; S.chip = null; ghost.visible = false; aimRing.visible = false; if (!C) return; if (C.kind === 'hose') { pourEnd(); return; } if (S.sel < 0) return;
    const r = ALL[S.sel]; if (C.moved < 14) { // TAP: an easy lob straight into the bowl (or the toy to the middle)
      const tgt = C.kind === 'toy' ? { x: clamp(r.x + 0.3, -1.2, 1.2), z: clamp(r.z + 0.4, -1, 0.8) } : { x: SPOT.bowl[0] + rr(-0.12, 0.12), z: SPOT.bowl[1] + rr(-0.12, 0.12) }; throwInto(S.sel, C.kind, tgt.x, tgt.z, false); return; }
    const v = vel(C), fresh = performance.now() - C.hist[C.hist.length - 1].t < 120, sp = Math.hypot(v.x, v.y), k = fresh && sp > 250 ? Math.min(0.16, 230 * scale() / sp) : 0; const a = aimAt(S.sel, C.x + v.x * k, C.y + v.y * k);
    if (C.kind !== 'toy') { const db = Math.hypot(a.x - SPOT.bowl[0], a.z - SPOT.bowl[1]); if (db < 0.7) { const f = 0.55; a.x += (SPOT.bowl[0] - a.x) * f; a.z += (SPOT.bowl[1] - a.z) * f; } }
    if (!k && C.y > CHh() - SAFE.bottom + 6) { flash('DRAG IT UP INTO THE CAGE · OR FLICK IT', '#ffffff', 1.3); return; } throwInto(S.sel, C.kind, a.x + rr(-0.04, 0.04), a.z + rr(-0.04, 0.04), true); }
  function onDown(e) { audio.init && audio.init(); S.lastInput = performance.now(); if (S.mode === 'walk') { onWalkDown(e); return; } if (S.mode !== 'work' || S.demo) return; const { x, y } = local(e); e.preventDefault();
    if (S.sel < 0) { ndc.set(x / SW() * 2 - 1, -(y / CHh()) * 2 + 1); ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(Z.cages.map(c => c.floor), false)[0]; if (hit) selectCage(hit.object.userData.ci); else { const near2 = RES().map(r => ({ r, d: Math.hypot(beastScreen(r).s.x - x, beastScreen(r).s.y - y) })).sort((a, b) => a.d - b.d)[0]; if (near2 && near2.d < 80) selectCage(near2.r.cage.ci); } return; }
    const r = ALL[S.sel]; S.ptr = { x, y, x0: x, y0: y, kind: 'swipe', raked: 0, id: e.pointerId };
    if (r.home && onBeast(r, x, y) && !r.piles.some(p => near(p, x, y, 40))) { if (r.D.wild) { S.ptr.kind = 'snarl'; r.mood = 'sad'; r.moodT = 1; voice(r); flash('WHOA · ' + r.D.name + ' IS NOT A PETTING ANIMAL · TOSS IT A TOY', '#ec3013', 1.8); r.B.hop = 0.6; } else { S.ptr.kind = 'rub'; } return; }
    const tw = wp(r.cage.trough), ts = scr(tw); if (r.home && Math.hypot(ts.x - x, ts.y - y) < 60 * scale() && !r.piles.some(p => near(p, x, y, 40))) { S.ptr.kind = 'pour'; pourStart(S.sel); return; }
    if (r.home) S.ptr.raked += rakeAt(r, x, y); }
  function onMove(e) { if (S.chip) { chipMove(e); return; } if (S.mode === 'walk') { onWalkMove(e); return; } const P = S.ptr; if (!P || S.sel < 0) return; const { x, y } = local(e), d = Math.hypot(x - P.x, y - P.y); if (d < 1) return; const r = ALL[S.sel];
    if (P.kind === 'swipe' && r.home) { const n = Math.ceil(d / 12); for (let i = 1; i <= n; i++) P.raked += rakeAt(r, P.x + (x - P.x) * i / n, P.y + (y - P.y) * i / n); }
    else if (P.kind === 'rub') { if (onBeast(r, x, y)) brush(r, d); }
    P.x = x; P.y = y; }
  function onUp(e) { if (S.chip) { chipUp(); return; } if (S.mode === 'walk') { onWalkUp(e); return; } const P = S.ptr; S.ptr = null; if (!P) return; if (P.kind === 'pour') { pourEnd(); return; }
    if (P.kind === 'swipe' && !P.raked) { const dx = P.x - P.x0, dy = P.y - P.y0; if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 2) cycle(dx < 0 ? 1 : -1); } }
  renderer.domElement.addEventListener('pointerdown', onDown); addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
  const cycle = dir => { const L = RES().map(r => r.cage.ci).sort((a, b) => a - b); if (!L.length) return; let i = L.indexOf(S.sel); i = (i + dir + L.length) % L.length; selectCage(L[i]); tone(700, 0.05, 0.03); };
  function selectCage(ci) { if (S.mode !== 'work') return; S.sel = ci; S.ptr = null; S.selT = performance.now(); if (ci >= 0) { const r = ALL[ci]; if (r.home && Math.random() < 0.5) voice(r); } }

  // ---------- flow ----------
  function startDay() { if (S.mode === 'work') return; audio.init && audio.init(); S.dlg = null; Object.assign(S, { mode: 'work', t: 0, sel: -1, earned: 0, tips: 0, hSum: 0, hT: 0, done: null, fed: 0, bulls: 0, sayCd: 6, flash: null, react: null, visTip: 0 });
    setHome(S.day); resetAnimals(true); setUniform(!!save.flag('zooUniform') || S.demo); benW.visible = false; ben.visible = true; place(ben, { x: 0, z: 2.5, ry: Math.PI }); place(hessa, Z.spots.hessaDesk); hessa.visible = true;
    const n = RES().length; say('HESSA: "' + (n >= 10 ? 'Ten of ten. Keep them that way.' : n + ' at home. The cages do not fill themselves. Tap an animal at the bottom to go to its cage.') + '"', 5.5); }
  const HESSA_LINES = ['Read the plaque before you feed anything. It is there for a reason.', 'Wild ones get a toy. Do not put your paw through the bars.', 'A clean cage is a quiet cage.', 'The visitors can tell. Happy animals, full donation box.', 'Every one of them knew that road before we put a road on it.', 'Mind how you go. It is the whole job.'];
  function endDay() { const avg = S.hT ? S.hSum / S.hT : 0, stars = avg >= 0.8 ? 3 : avg >= 0.62 ? 2 : 1, eod = stars === 3, n = RES().length, wage = 10 + S.day * 2, care = Math.round(avg * n * 3), total = wage + care + S.tips; let newDay = false; const unlock = [];
    S.mode = 'done'; S.sel = -1; S.pour = null; S.chip = null; S.ptr = null; flights.forEach(F => F.r.cage.g.remove(F.m)); flights.length = 0;
    if (!S.demo) try { save.addGold(total); save.best(SAVE.best, total); save.setStat(SAVE.shifts, save.stat(SAVE.shifts, 0) + 1); if (stars >= 2 && n < 10) { const nx = HOMECOMING[n]; save.setStat(SAVE.day, S.day + 1); newDay = true; unlock.push('THE ' + BEASTS[nx].name + ' CAME HOME FROM THE RED PLAINS'); } else if (stars >= 2) { save.setStat(SAVE.day, S.day + 1); newDay = true; }
      if (!save.flag('zooUniform')) { save.setFlag('zooUniform'); unlock.push('KEEPER UNIFORM (bush hat, towel + zoo tee)'); } if (eod) save.setStat(SAVE.stars, save.stat(SAVE.stars, 0) + 1); } catch (e) {}
    S.done = { day: S.day, n, avg: Math.round(avg * 100), stars, wage, care, tips: S.tips, total, eod, newDay, unlock, fed: S.fed, bulls: S.bulls, empStars: save.stat(SAVE.stars, 0) }; if (newDay) S.day += 1;
    place(ben, Z.spots.benIntro); place(hessa, Z.spots.hessaIntro); say(eod ? 'HESSA: "Employee of the day. Do not let it go to your head."' : stars >= 2 ? 'HESSA: "Good day. Same again tomorrow."' : 'HESSA: "They noticed. Slower, and read the plaques."', 6); tone(stars >= 2 ? 880 : 300, 0.2, 0.05); }
  function buyUpgrade(id) { const u = UPGRADES.find(q => q.id === id); if (!u || upg(id)) return false; if (!save.spend(u.cost)) { flash('NOT ENOUGH GOLD', '#ec3013'); return false; } save.setStat(SAVE.upg + id, 1); flash(u.name + ' · BOUGHT', '#22c55e', 1.6); tone(1320, 0.1, 0.05); return true; }
  function toIntro() { if (S.demo) demoStop(); S.mode = 'intro'; S.done = null; S.dlg = null; benW.visible = false; ben.visible = true; setUniform(true); place(ben, Z.spots.benIntro); place(hessa, Z.spots.hessaIntro); setHome(S.day); resetAnimals(false); }

  // ---------- WALK MODE: Ben walks the hall (Meru HUD) ----------
  const P = { x: 0, z: 5.2, y: 0, vy: 0, yaw: Math.PI, sp: 0 }, keys = new Set(), stick = { x: 0, y: 0 }; const WC = { yaw: Math.PI, dist: 6.4, pitch: 0.42, oy: 0, op: 0, look: false, pov: false };
  let hudPad = false, walkPrompt = null;
  function walk() { if (S.demo) demoStop(); S.mode = 'walk'; S.done = null; S.dlg = null; S.sel = -1; ben.visible = false; benW.visible = true; P.x = 0; P.z = 5.2; P.yaw = Math.PI; WC.yaw = Math.PI; place(hessa, Z.spots.hessaDesk); setHome(S.day); RES().forEach(r => { r.n.food = Math.max(r.n.food, 0.8); r.n.water = Math.max(r.n.water, 0.8); r.n.fun = Math.max(r.n.fun, 0.8); }); S.toast = null; }
  function collide() { const R = 0.36, [x0, x1, z0, z1] = Z.bounds; P.x = clamp(P.x, x0, x1); P.z = clamp(P.z, z0, z1);
    for (const [a, b, c, d] of Z.rects) { if (P.x > a - R && P.x < b + R && P.z > c - R && P.z < d + R) { const pen = [P.x - (a - R), (b + R) - P.x, P.z - (c - R), (d + R) - P.z], m = Math.min(...pen), i = pen.indexOf(m); if (i === 0) P.x = a - R; else if (i === 1) P.x = b + R; else if (i === 2) P.z = c - R; else P.z = d + R; } }
    for (const [cx, cz, cr] of Z.circles) { const dx = P.x - cx, dz = P.z - cz, d = Math.hypot(dx, dz); if (d < cr + R) { P.x = cx + dx / d * (cr + R); P.z = cz + dz / d * (cr + R); } }
    const hd = Math.hypot(P.x - hessa.position.x, P.z - hessa.position.z); if (hd < 0.7) { P.x = hessa.position.x + (P.x - hessa.position.x) / hd * 0.7; P.z = hessa.position.z + (P.z - hessa.position.z) / hd * 0.7; } }
  function walkStep(dt, t) { let sx = stick.x, sy = stick.y; if (keys.has('KeyA') || keys.has('ArrowLeft')) sx = -1; if (keys.has('KeyD') || keys.has('ArrowRight')) sx = 1; if (keys.has('KeyW') || keys.has('ArrowUp')) sy = 1; if (keys.has('KeyS') || keys.has('ArrowDown')) sy = -1;
    const mag = Math.min(1, Math.hypot(sx, sy)), run = keys.has('ShiftLeft') || keys.has('ShiftRight'); let sp = 0;
    if (S.dlg) { sx = sy = 0; } else if (mag > 0.12) { const fy = WC.yaw, fx = Math.sin(fy), fz = Math.cos(fy), rx = -Math.cos(fy), rz = Math.sin(fy), dx = fx * sy + rx * sx, dz = fz * sy + rz * sx, l = Math.hypot(dx, dz) || 1; sp = (run ? 5.2 : 3.2) * mag; P.x += dx / l * sp * dt; P.z += dz / l * sp * dt; const ty = Math.atan2(dx, dz); let dy = ty - P.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; P.yaw += dy * Math.min(1, dt * 10); collide(); if (Math.random() < dt * sp * 0.7) audio.step && audio.step(); }
    P.vy -= 18 * dt; P.y = Math.max(0, P.y + P.vy * dt); if (P.y <= 0) P.vy = 0;
    benW.position.set(P.x, P.y, P.z); benW.rotation.y = P.yaw; kit.animFox(benW, dt, sp, P.y > 0.02); benW.visible = !WC.pov; P.sp = sp;
    // the camera follows from behind; the eye drags it round and it eases back
    if (!WC.look) { WC.oy = damp(WC.oy, 0, 3, dt); WC.op = damp(WC.op, 0, 3, dt); } if (sp > 0.5 && !WC.look) { let dy = P.yaw - WC.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; WC.yaw += dy * Math.min(1, dt * 1.6); }
    // prompt: Hessa or the nearest cage
    walkPrompt = null; const hd = Math.hypot(P.x - hessa.position.x, P.z - hessa.position.z); if (hd < 2.6) walkPrompt = { kind: 'hessa', text: 'Talk to HESSA · Zoo Keeper' };
    else { let best = null; for (const r of ALL) { const v = toWorld(r.cage, SPOT.view[0], SPOT.view[1] - 0.8), d = Math.hypot(P.x - v.x, P.z - v.z); if (d < 2.4 && (!best || d < best.d)) best = { r, d }; } if (best) walkPrompt = { kind: 'cage', r: best.r, text: best.r.home ? best.r.D.name + ' · ' + best.r.D.pet + ' · say hello' : best.r.D.name + ' · away on the Red Plains' }; }
    hessa.userData.lookAt = null; if (hd < 4) { const a = Math.atan2(P.x - hessa.position.x, P.z - hessa.position.z); hessa.rotation.y = damp(hessa.rotation.y, a, 4, dt); } else hessa.rotation.y = damp(hessa.rotation.y, Math.PI, 2, dt);
    if (S.toastT > 0) { S.toastT -= dt; if (S.toastT <= 0) S.toast = null; } }
  function walkCam(dt) { const yaw = WC.yaw + WC.oy, fx = Math.sin(yaw), fz = Math.cos(yaw);
    if (WC.pov) { const e = V3(P.x + fx * 0.15, P.y + 1.55, P.z + fz * 0.15); camera.position.copy(e); camera.lookAt(e.x + fx * 4, e.y - 0.3 + WC.op * 3, e.z + fz * 4); return; }
    const port = SW() < CHh(), d = WC.dist * (port ? 1.25 : 1), pitch = clamp(WC.pitch + WC.op, 0.08, 1.2), [x0, x1, z0, z1] = Z.bounds;
    const want = V3(clamp(P.x - fx * d * Math.cos(pitch), -HX - 6, HX + 6), P.y + 1.3 + d * Math.sin(pitch), clamp(P.z - fz * d * Math.cos(pitch), BZ + 0.6, FZ + 8));
    camera.position.lerp(want, Math.min(1, dt * 5)); CAM.look.lerp(V3(P.x + fx * 1.2, P.y + 1.15, P.z + fz * 1.2), Math.min(1, dt * 6)); camera.lookAt(CAM.look); }
  let pinch = null; const touches = new Map();
  function onWalkDown(e) { touches.set(e.pointerId, local(e)); if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: WC.dist }; } }
  function onWalkMove(e) { if (!touches.has(e.pointerId)) return; touches.set(e.pointerId, local(e)); if (pinch && touches.size === 2) { const [a, b] = [...touches.values()]; WC.dist = clamp(pinch.dist * pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), 3, 11); } }
  function onWalkUp(e) { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; }
  // dialogue with Hessa (lines from surface_luxor: luxorHessa; the * ones are new for the zoo job)
  const TOPICS = () => [{ text: 'Put me to work.', go: () => { S.dlg = null; startDay(); } }, { text: 'What lives here?', lines: ['Lion, wolf, boar, ram, stag, panther, croc down by the water. Ape and serpent if you go far enough west, which nobody does.', 'Every one of them knew that road before we put a road on it.'] },
    ...(RES().length < 10 ? [{ text: 'Why are some cages empty?', lines: ['They are not dead. They are out on the red plains where they have always been, and I am here, where it is safe, being no use to anybody.', 'Keep the ones I have happy. Animals talk. The rest will hear about it.'] }] : []), { text: 'Mind how you go.', lines: ['I always do. It is the whole job.'], bye: true }];
  function openHessa() { const n = RES().length; P.yaw = Math.atan2(hessa.position.x - P.x, hessa.position.z - P.z); WC.yaw = P.yaw + 0.5; S.dlg = { name: 'HESSA', role: 'ZOO KEEPER', lines: [n >= 10 ? 'Ten of ten. I did not think I would say that again this year.' : 'Still here. The cages do not fill themselves and neither, apparently, does anything else.', n + ' of 10 at home. Want a shift? Wage, tips from the box, and a hat if you last the day.'], i: 0, menu: false, asked: {} }; hessa.userData.talking = true; tone(660, 0.06, 0.03); }
  function talk() { if (S.mode !== 'walk') return; if (S.dlg) { nextLine(); return; } if (!walkPrompt) return; if (walkPrompt.kind === 'hessa') openHessa(); else if (walkPrompt.r.home) callBeast(walkPrompt.r); else { S.toast = 'The ' + walkPrompt.r.D.name + ' is away on the Red Plains. Work good shifts and it will come home.'; S.toastT = 3.5; } }
  function nextLine() { const d = S.dlg; if (!d) return; if (d.menu) return; d.i++; if (d.i >= d.lines.length) { if (d.bye) { closeDialog(); return; } d.menu = true; } }
  function choose(i) { const d = S.dlg; if (!d || !d.menu) return; const tp = TOPICS()[i]; if (!tp) return; if (tp.go) { hessa.userData.talking = false; tp.go(); return; } d.asked[tp.text] = 1; d.lines = tp.lines; d.i = 0; d.menu = false; d.bye = !!tp.bye; }
  function closeDialog() { S.dlg = null; hessa.userData.talking = false; }
  function nearestRes(maxD = 7) { let best = null; for (const r of RES()) { const v = toWorld(r.cage, 0, CD / 2), d = Math.hypot(P.x - v.x, P.z - v.z); if (d < maxD && (!best || d < best.d)) best = { r, d }; } return best && best.r; }
  function callBeast(r) { goTask(r, { kind: 'call', x: 0, z: CD / 2 - 0.75, face: 0, reach: 0.3 }); S.toast = r.D.name + ' · ' + r.D.pet + ' comes to say hello'; S.toastT = 2.2; }
  function treat() { const r = nearestRes(); if (!r) { S.toast = 'Get closer to a cage to toss a treat'; S.toastT = 2; return; } const C = r.cage, m = foodMesh(ST, r.D.diet); m.scale.setScalar(0.7); C.g.add(m); const a = C.g.worldToLocal(wp(benW).add(V3(0, 1.3, 0))); m.position.copy(a); const tx = clamp(r.x, -1.4, 1.4), tz = clamp(r.z, -1.5, 1.2); flights.push({ m, r, kind: 'treat', a, b: V3(tx, 0.5, tz), t: 0, dur: 0.6 }); tone(520, 0.08, 0.04, 'triangle', 1.6); }

  // ---------- camera (work + intro) ----------
  const { SAFE, shotFor } = cameraFit(ST), CAM = { look: V3(0, 1.2, 0) };
  camera.position.set(0, 3, 8); camera.lookAt(CAM.look);
  function shot() { const port = SW() < CHh(), k = port ? 'P' : 'L';
    if (S.mode === 'intro' || S.mode === 'done') return shotFor('intro' + k, () => { const o = []; for (const s of [Z.spots.hessaIntro, Z.spots.benIntro]) o.push(V3(s.x - 0.5, 0, s.z), V3(s.x + 0.5, 0, s.z), V3(s.x, 2.3, s.z)); o.push(V3(-8.2, 2.7, -4.8), V3(-6.3, 0.5, -4.8)); return o; }, 0.16, Math.PI - 0.3, port ? 0.08 : 0.05);
    if (S.sel < 0) return shotFor('all' + k, () => [V3(-HX + 0.5, 0, -2.2), V3(HX - 0.5, 0, -2.2), V3(-12.6, 0, -9), V3(12.6, 0, -9), V3(-12.6, 2.6, -4.8), V3(12.6, 2.6, -4.8), V3(-HX + 1, 0, 4.4), V3(HX - 1, 0, 4.4)], 0.85, Math.PI, 0.03);
    const r = ALL[S.sel], C = r.cage; return shotFor('cage' + k + S.sel, () => { const o = []; for (const [lx, lz, y] of [[-CW / 2 + 0.1, -CD / 2 + 0.3, 0], [CW / 2 - 0.1, -CD / 2 + 0.3, 0], [-CW / 2 + 0.1, CD / 2 + 0.25, 0.1], [CW / 2 - 0.1, CD / 2 + 0.25, 0.1], [0, -CD / 2 + 0.4, 1.3]]) { const w = toWorld(C, lx, lz); o.push(V3(w.x, y, w.z)); } return o; }, port ? 0.88 : 0.68, Math.PI - C.th, 0.02); }

  // ---------- DEMO: the autopilot shows every gesture once, nothing is saved ----------
  const DM = { on: false, i: 0, cd: 0, cap: '', key: '', sub: 0 };
  const hand = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd23a, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })); hand.scale.setScalar(0.5); hand.visible = false; hand.renderOrder = 40; scene.add(hand);
  const handAt = p => { hand.visible = true; hand.position.copy(p); hand.scale.setScalar(0.8); };
  const ci = k => CAGES.findIndex(c => c.key === k);
  const SCRIPT = [
    () => { DM.cap = 'WELCOME TO HESSA\'S MENAGERIE. KEEP EVERY ANIMAL HAPPY TILL 5 PM'; DM.key = ''; return 3; },
    () => { DM.cap = 'THE BAR AT THE BOTTOM SHOWS WHO NEEDS WHAT. TAP ONE TO GO TO ITS CAGE'; DM.key = 'TAP'; selectCage(ci('ram')); return 2.6; },
    () => { DM.cap = 'THE PLAQUE SAYS RAMS EAT HAY. FLICK HAY UP INTO THE BOWL'; DM.key = 'FLICK'; return 2.4; },
    () => { const C = ALL[ci('ram')].cage, w = C.g.localToWorld(V3(SPOT.bowl[0], 0.3, SPOT.bowl[1])); handAt(w); throwInto(ci('ram'), 'hay', SPOT.bowl[0] + 0.05, SPOT.bowl[1], true); return 2.4; },
    () => { DM.cap = 'THIRSTY? HOLD THE HOSE AND LET GO WHEN THE WATER IS IN THE GREEN'; DM.key = 'HOLD'; const C = ALL[ci('ram')].cage; handAt(wp(C.trough).add(V3(0, 0.4, 0))); pourStart(ci('ram')); DM.holdTo = 0.8; return 0.2; },
    () => { DM.cap = 'MESSY? SWIPE OVER THE MESS TO RAKE IT UP'; DM.key = 'SWIPE'; selectCage(ci('stag')); return 2.2; },
    () => { const r = ALL[ci('stag')], p = r.piles[0]; if (!p) return 0.4; handAt(wp(p).add(V3(0, 0.2, 0))); const s = scr(wp(p)); rakeAt(r, s.x, s.y); DM.i--; return 0.5; },
    () => { DM.cap = 'FRIENDLY ANIMALS GET BORED TOO. RUB THEM BACK AND FORTH TO BRUSH THEM'; DM.key = 'RUB'; return 2.4; },
    () => { const r = ALL[ci('stag')]; if (r.n.fun >= 0.98) return 0.6; handAt(wp(r.B.anchor).add(V3(rr(-0.3, 0.3), r.B.h, 0))); brush(r, 60); DM.i--; return 0.12; },
    () => { DM.cap = 'WILD ONES ARE NOT FOR PETTING. FLICK THEM A TOY INSTEAD'; DM.key = 'FLICK'; selectCage(ci('bear')); return 2.4; },
    () => { const r = ALL[ci('bear')]; handAt(r.cage.g.localToWorld(V3(r.x, 0.4, r.z))); throwInto(ci('bear'), 'toy', r.x + 0.2, r.z + 0.3, true); return 2.8; },
    () => { DM.cap = 'SWIPE SIDEWAYS TO GO TO THE NEXT CAGE, OR TAP ALL TO SEE THE HALL'; DM.key = 'SWIPE'; selectCage(-1); return 3; },
    () => { DM.cap = 'HAPPY ANIMALS MAKE HAPPY VISITORS. THEY TIP THE BOX'; DM.key = '★'; return 3; },
    () => { DM.cap = 'YOUR TURN! TAP PUT ME TO WORK'; DM.key = 'GO'; return 2.6; },
    () => { demoStop(); return 0; }];
  function demoStart() { if (DM.on || S.mode === 'work') return; audio.init && audio.init(); DM.on = true; S.demo = true; DM.i = 0; DM.cd = 0.5; DM.day0 = S.day; S.day = 4; S.mode = 'intro'; startDay(); S.say = '';
    const g = k => ALL[ci(k)]; g('ram').n.food = 0.2; g('ram').n.water = 0.25; g('stag').n.fun = 0.2; g('stag').piles.forEach(p => g('stag').cage.g.remove(p)); g('stag').piles = []; addPile(g('stag'), 'dung', -0.6, 0.2); addPile(g('stag'), 'dung', 0.5, 0.5); g('bear').n.fun = 0.15; setWater(g('ram'), 0); }
  function demoStop() { if (!DM.on) return; DM.on = false; S.demo = false; hand.visible = false; S.pour = null; S.chip = null; S.day = DM.day0; S.mode = 'intro'; S.sel = -1; S.done = null; S.flash = null; flights.forEach(F => F.r.cage.g.remove(F.m)); flights.length = 0; toIntro(); }
  function demoStep(dt) { hand.scale.setScalar(Math.max(0.4, hand.scale.x - dt)); if (S.pour && DM.holdTo != null) { if (S.pour.v >= DM.holdTo) { DM.holdTo = null; pourEnd(); DM.cd = 2.2; } return; } DM.cd -= dt; if (DM.cd > 0) return; const f = SCRIPT[DM.i++]; if (!f) { demoStop(); return; } DM.cd = f(); }

  // ---------- hint ----------
  const RINGS = hintRings(ST);
  function urgent() { let best = null; for (const r of RES()) { const w = worst(r); if (w && (!best || w[1] < best.v)) best = { r, v: w[1], k: w[0] }; } return best; }
  function nextHint() { if (S.mode !== 'work' || S.demo) return null; const U = urgent();
    if (S.sel < 0) return U ? { text: U.r.D.name + ' IS ' + NEED[U.k].label + ' · TAP ' + U.r.D.name + ' BELOW', cage: U.r.cage.ci } : { text: 'EVERYONE IS HAPPY · KEEP AN EYE ON THE BAR', cage: -2 };
    const r = ALL[S.sel]; if (!r.home) return { text: 'EMPTY CAGE · PICK AN ANIMAL BELOW', cage: U ? U.r.cage.ci : -2 }; const w = worst(r), C = r.cage, L = (lx, lz, y = 0.12) => C.g.localToWorld(V3(lx, y, lz));
    if (S.pour) return { p: L(SPOT.trough[0], SPOT.trough[1]), r: 0.6, text: 'LET GO IN THE GREEN' };
    if (!w) return { text: r.D.name + ' IS HAPPY ✓' + (U ? ' · NEXT: ' + U.r.D.name + ' (' + NEED[U.k].label + ')' : ''), cage: U ? U.r.cage.ci : -2 };
    if (w[0] === 'food') return { p: L(SPOT.bowl[0], SPOT.bowl[1]), r: 0.5, text: 'FLICK ' + FOODS[r.D.diet].name + ' INTO THE BOWL · OR TAP IT', chip: r.D.diet };
    if (w[0] === 'water') return { p: L(SPOT.trough[0], SPOT.trough[1]), r: 0.65, text: 'HOLD HOSE · LET GO IN THE GREEN', chip: 'hose' };
    if (w[0] === 'clean') { const p = r.piles[0]; return { p: wp(p).setY(0.12), r: 0.4, text: 'SWIPE OVER THE MESS TO RAKE IT · ' + r.piles.length + ' LEFT' }; }
    return r.D.wild ? { text: 'FLICK THE TOY TO ' + r.D.name, chip: 'toy', p: L(r.x, r.z), r: 0.7 } : { p: L(r.x, r.z), r: 0.7, text: 'RUB ' + r.D.name + ' BACK AND FORTH TO BRUSH' }; }
  let HINT = null, hintT = 0;

  // ---------- per-frame ----------
  const clock = new THREE.Clock(); let raf = 0, hudT = 0, PAUSE = false;
  function step(dt) { const t = clock.elapsedTime; S.flashT -= dt; if (S.flashT <= 0) S.flash = null; S.sayT -= dt; if (S.sayT <= 0) S.say = '';
    for (const p of smokeS) { if (p.life <= 0) { p.s.material.opacity = 0; continue; } p.life -= dt * 0.8; p.s.position.addScaledVector(p.v, dt); p.s.material.opacity = 0.5 * p.life; p.s.scale.setScalar(0.18 + (1 - p.life) * 0.3); }
    Z.lights.forEach((b, i) => b.material.color.setHSL(0.11, 1, 0.72 + Math.sin(t * 2 + i) * 0.04));
    const work = S.mode === 'work';
    if (work) { if (!S.demo) { S.t += dt; for (const r of RES()) tickNeeds(r, dt); const res = RES(); if (res.length) { S.hSum += res.reduce((a, r) => a + H(r), 0) / res.length * dt; S.hT += dt; } S.sayCd -= dt; if (S.sayCd <= 0) { S.sayCd = rr(18, 28); const U = urgent(); say('HESSA: "' + (U && U.v < 0.2 ? 'The ' + U.r.D.name.toLowerCase() + ' is ' + NEED[U.k].label.toLowerCase() + '. I can hear it from here.' : pick(HESSA_LINES)) + '"', 4.5); } }
      if (S.t >= (ZOO.close - ZOO.open) * ZOO.hourSec) endDay(); }
    for (const r of RES()) stepBeast(r, dt, t);
    // bubbles over the animals (work mode)
    for (const r of ALL) { const w = work && r.home ? worst(r) : null; r.bub.visible = !!w && !(S.sel >= 0 && S.sel !== r.cage.ci && false); if (w) { const k = w[0], crit = w[1] < 0.18, id = k + crit; if (r.bubK !== id) { r.bubK = id; r.bub.material.map = bTex(k, crit); r.bub.material.needsUpdate = true; } r.bub.position.set(r.x, r.B.h + 0.75 + Math.sin(t * 3 + r.B.seed) * 0.06, r.z); r.bub.scale.setScalar((S.sel === r.cage.ci ? 0.55 : 0.95) * (crit ? 1 + Math.sin(t * 8) * 0.08 : 1)); } }
    // flights
    for (let i = flights.length - 1; i >= 0; i--) { const F = flights[i]; F.t += dt / F.dur; const k = Math.min(1, F.t); F.m.position.lerpVectors(F.a, F.b, k); F.m.position.y += Math.sin(k * Math.PI) * (1.0 + F.a.distanceTo(F.b) * 0.18); F.m.rotation.x += dt * 8; if (k >= 1) { flights.splice(i, 1); F.m.rotation.set(0, rr(0, 6), 0); if (F.kind === 'treat') { F.r.cage.g.remove(F.m); F.r.B.hop = 1; F.r.mood = 'happy'; F.r.moodT = 1.5; voice(F.r); const p = wp(F.r.B.anchor); puff(p.x, p.y + 1, p.z, 0xff7ab8, 3); S.toast = F.r.D.name + ' caught it!'; S.toastT = 1.6; } else landed(F); } }
    // hose stream + pour level
    if (S.pour) { const [g0, g1] = bandG(); S.pour.v = Math.min(1.15, S.pour.v + dt * (S.pour.v < g0 ? 0.42 : 0.3)); setWater(S.pour.r, S.pour.v); if (Math.random() < dt * 30) { const a = handWorld(), b = wp(S.pour.r.cage.trough).add(V3(0, 0.3, 0)), k2 = Math.random(); puff(a.x + (b.x - a.x) * k2, a.y + (b.y - a.y) * k2 + Math.sin(k2 * Math.PI) * 0.5, a.z + (b.z - a.z) * k2, 0x7cc8e0, 1); } if (Math.random() < dt * 8) tone(400 + S.pour.v * 500, 0.05, 0.015, 'sine'); if (S.pour.v >= 1.15) pourEnd(); }
    // Ben (keeper) walks to the cage he is working at
    if (work || S.mode === 'done' || S.mode === 'intro') { let tx = ben.position.x, tz = ben.position.z, ty = ben.rotation.y; if (work) { if (S.sel >= 0) { const C = ALL[S.sel].cage, w = toWorld(C, SPOT.ben[0], SPOT.ben[1]); tx = w.x; tz = w.z; ty = C.th + Math.PI; } else { tx = 0; tz = 2.6; ty = Math.PI; } }
      const dx = tx - ben.position.x, dz = tz - ben.position.z, d = Math.hypot(dx, dz); let sp = 0; if (d > 0.05) { const v = Math.min(d, 7 * dt); ben.position.x += dx / d * v; ben.position.z += dz / d * v; sp = v / dt; ben.rotation.y = Math.atan2(dx, dz); } else if (work) ben.rotation.y = damp(ben.rotation.y, ty, 8, dt);
      kit.animFox(ben, dt, sp); if (ben.userData.throwT > 0) { ben.userData.throwT -= dt; BP.arms[1].rotation.x = -2.6 + (0.45 - ben.userData.throwT) * 6; } if (S.pour && BP.arms[1]) BP.arms[1].rotation.x = -1.2;
      const greet = S.mode === 'intro' || S.mode === 'done'; ben.userData.mood = greet ? 'excited' : 'happy'; if (greet && BP.arms && BP.arms[0]) BP.arms[0].rotation.set(-0.25, 0, -2.55 + Math.sin(t * 7) * 0.32); }
    kit.animFox(hessa, dt, 0); hessa.userData.mood = 'warm';
    // visitors stroll, watch, tip
    for (const v of VIS) stepVisitor(v, dt, work);
    if (S.mode === 'walk') { walkStep(dt, t); walkCam(dt); } else { const sh = shot(), k = Math.min(1, dt * (work ? 3.2 : 2.2)); camera.position.lerp(sh.pos, k); CAM.look.lerp(sh.look, k); camera.lookAt(CAM.look); }
    // the cage you work on loses its bars; so does any cage the walk camera ends up inside
    Z.cages.forEach(C => { const l = toLocal(C, camera.position.x, camera.position.z), inside = Math.abs(l.x) < CW / 2 + 0.1 && l.z < CD / 2 + 0.3 && l.z > -CD / 2; const hide = (work && S.sel >= 0 && (S.sel === C.ci || Math.hypot(C.x - CAGES[S.sel].x, C.z - CAGES[S.sel].z) < 9)) || (S.mode === 'walk' && inside); C.bars.forEach(b => b.visible = !hide); });
    Z.front.forEach(m => m.visible = camera.position.z < FZ - 0.3); { const hi = camera.position.y > WALL_H - 0.6; Z.beams.forEach(m => m.visible = !hi); Z.lights.forEach(m => m.visible = !hi); }
    { const focus = work && S.sel >= 0 ? camera.position.distanceTo(V3(CAGES[S.sel].x, 0.5, CAGES[S.sel].z)) * 0.8 : 0, near = f => { const dd = camera.position.distanceTo(V3(f.position.x, 1.4, f.position.z)); return dd < 2.6 || dd < focus; }; if (S.mode !== 'walk') ben.visible = !near(ben) && !(work && S.sel >= 0); VIS.forEach(v => v.f.visible = !near(v.f)); hessa.visible = !near(hessa); }
    if (DM.on) demoStep(dt); hintT += dt; HINT = nextHint(); RINGS.place(HINT && HINT.p ? HINT : null, hintT, dt); }
  function stepVisitor(v, dt, work) { const f = v.f; v.cool -= dt; if (v.st === 'pick') { const opts = RES(); const r = opts.length && Math.random() < 0.8 ? pick(opts) : null; if (r) { const w = toWorld(r.cage, rr(-1.2, 1.2), SPOT.view[1] + 0.2); v.tgt = { x: w.x, z: w.z }; v.ci = r.cage.ci; } else { v.tgt = { x: rr(-9, 9), z: rr(2.6, 4.2) }; v.ci = -1; } v.st = 'walk'; }
    if (v.st === 'walk') { const dx = v.tgt.x - f.position.x, dz = v.tgt.z - f.position.z, d = Math.hypot(dx, dz); let mx = dx / d, mz = dz / d; const pc = Math.hypot(f.position.x, f.position.z - 0.6); if (pc < 2.3) { mx += f.position.x / pc * 0.9; mz += (f.position.z - 0.6) / pc * 0.9; const l = Math.hypot(mx, mz); mx /= l; mz /= l; }
      if (d > 0.15) { const s = 1.15 * dt; f.position.x += mx * s; f.position.z += mz * s; f.rotation.y = Math.atan2(mx, mz); kit.animFox(f, dt, 1.15); } else { v.st = 'watch'; v.t = rr(3, 5); v.react = false; if (v.ci >= 0) f.rotation.y = CAGES[v.ci].th + Math.PI; } }
    else if (v.st === 'watch') { v.t -= dt; kit.animFox(f, dt, 0); const r = v.ci >= 0 ? ALL[v.ci] : null;
      if (r && !v.react && v.t < 2.5) { v.react = true; const h = H(r); if (h > 0.66) { f.userData.mood = 'excited'; f.userData.hop = 1; if (work && !S.demo && v.cool <= 0) { v.cool = 6; const tip = Math.max(1, Math.round((h > 0.85 ? 2 : 1) * (upg('stall') ? 1.25 : 1) + (Math.random() < 0.3 ? 1 : 0))); S.tips += tip; S.visTip = (S.visTip || 0) + tip; const p = wp(f); puff(p.x, 2.0, p.z, 0xffd23a, 3); tone(1568, 0.06, 0.03); setTimeout(() => tone(2093, 0.08, 0.03), 80); } } else if (h < 0.4) { f.userData.mood = 'sad'; if (work && Math.random() < 0.5 && !S.say) say('VISITOR: "Is the ' + r.D.name.toLowerCase() + ' all right? It looks ' + (worst(r) ? NEED[worst(r)[0]].label.toLowerCase() : 'sad') + '."', 3.2); } else f.userData.mood = 'happy'; }
      if (v.t <= 0) { v.st = 'pick'; f.userData.mood = 'happy'; } } }
  function frame() { raf = requestAnimationFrame(frame); const dt = Math.min(0.05, clock.getDelta()); if (!PAUSE) step(dt); renderer.render(scene, camera); hudT -= dt; if (hudT <= 0) { hudT = 0.1; onState(hud()); } }
  function onRs() { renderer.setSize(SW(), CHh()); camera.aspect = SW() / CHh(); camera.updateProjectionMatrix(); } addEventListener('resize', onRs); const ro = new ResizeObserver(onRs); ro.observe(container);
  const onKD = e => { if (S.mode === 'walk') { if (S.dlg && /^Digit[1-9]$/.test(e.code)) { choose(+e.code.slice(5) - 1); return; } if (e.code === 'KeyE' || e.code === 'Enter') { talk(); return; } if (e.code === 'Space') { e.preventDefault(); api.jump(); return; } if (e.code === 'Digit1') { api.melee(); return; } if (e.code === 'Digit2') { api.range(); return; } if (e.code === 'Escape' && S.dlg) { closeDialog(); return; } keys.add(e.code); return; }
    if (S.mode === 'work' && !S.demo) { if (e.code === 'ArrowRight' || e.code === 'KeyD') cycle(1); else if (e.code === 'ArrowLeft' || e.code === 'KeyA') cycle(-1); else if (e.code === 'Escape' || e.code === 'Digit0') selectCage(-1); } };
  const onKU = e => keys.delete(e.code), onBlur = () => keys.clear(); addEventListener('keydown', onKD); addEventListener('keyup', onKU); addEventListener('blur', onBlur);
  const clockTxt = () => { const hr = ZOO.open + Math.min(S.t, (ZOO.close - ZOO.open) * ZOO.hourSec) / ZOO.hourSec, h = Math.floor(hr), m = Math.floor((hr - h) * 60 / 5) * 5, h12 = ((h + 11) % 12) + 1; return h12 + ':' + String(m).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); };
  function hud() { const res = RES(), hn = res.length ? res.reduce((a, r) => a + H(r), 0) / res.length : 1, sel = S.sel >= 0 ? ALL[S.sel] : null, d = S.dlg;
    return { mode: S.mode, day: S.day, clock: clockTxt(), left: Math.max(0, (ZOO.close - ZOO.open) * ZOO.hourSec - S.t), lateDay: S.t > (ZOO.close - ZOO.open - 1) * ZOO.hourSec, earned: S.earned, tips: S.tips, happy: Math.round(hn * 100), sel: S.sel,
      animals: ALL.filter(r => r.home).map(r => { const w = worst(r); return { ci: r.cage.ci, name: r.D.name, pet: r.D.pet, need: w ? NEED[w[0]].label : 'HAPPY', needK: w ? w[0] : 'ok', crit: !!w && w[1] < 0.18, col: w ? (w[1] < 0.18 ? '#ff6a5a' : NEED[w[0]].col) : '#22c55e', h: Math.round(H(r) * 100) }; }).sort((a, b) => a.ci - b.ci),
      cage: sel ? { ci: S.sel, name: sel.D.name, pet: sel.D.pet, home: sel.home, diet: sel.D.diet, dietName: FOODS[sel.D.diet].name, wild: sel.D.wild, bars: sel.home ? [['food', 'FOOD', sel.n.food], ['water', 'WATER', sel.n.water], ['clean', 'CLEAN', cleanOf(sel)], ['fun', 'FUN', sel.n.fun]].map(([k, l, v]) => ({ k, l, v: Math.round(v * 100), low: v < 0.45 })) : [] } : null,
      pour: S.pour ? { v: S.pour.v / 1.15, band: bandG().map(x => x / 1.15), zone: S.pour.v < bandG()[0] ? (S.pour.v < 0.45 ? 'TOO LITTLE' : 'A BIT LOW') : S.pour.v <= bandG()[1] ? 'JUST RIGHT' : S.pour.v <= 1 ? 'NEARLY OVER' : 'SPLASH!' } : null, chip: S.chip ? S.chip.kind : null,
      flash: S.flash, say: S.say, done: S.done, gold: save.data.gold, uniform: !!save.flag('zooUniform'), upgrades: UPGRADES.map(u => ({ ...u, owned: upg(u.id) })), hint: HINT ? { text: HINT.text, cage: HINT.cage, chip: HINT.chip } : null, demo: DM.on ? { cap: DM.cap, key: DM.key } : null,
      residents: res.length, homeList: res.map(r => r.D.name), awayList: ALL.filter(r => !r.home).map(r => r.D.name), nextHome: res.length < 10 ? BEASTS[HOMECOMING[res.length]].name : null,
      walk: S.mode === 'walk' ? { prompt: !d && walkPrompt ? walkPrompt.text : null, toast: S.toast || null, dialog: d ? { name: d.name, role: d.role, text: d.menu ? 'What can I do for you?' : d.lines[d.i], step: Math.min(d.i + 1, d.lines.length), total: d.lines.length, choices: d.menu ? TOPICS().map(tp => ({ text: tp.text, asked: !!d.asked[tp.text], bye: !!tp.bye })) : null, required: false } : null, quest: 'HESSA\'S MENAGERIE · ' + res.length + ' OF 10 AT HOME · TALK TO HESSA FOR A SHIFT' } : null }; }
  frame();
  const api = { setSafe(top, bottom, left = 0) { if (Math.abs(SAFE.top - top) > 3 || Math.abs(SAFE.bottom - bottom) > 3 || Math.abs(SAFE.left - left) > 3) { SAFE.top = top; SAFE.bottom = bottom; SAFE.left = left; } }, selectCage, cycle, chipDown, startDay, toIntro, walk, demoStart, demoStop, buyUpgrade, hud,
    // ENGINE CONTRACT for the Meru HUD (walk mode): 1 CALL · 2 TREAT · 3 JUMP · TALK
    start() {}, talk, choose, closeDialog, nextLine, clearToast() { S.toast = null; },
    melee() { if (S.mode !== 'walk' || S.dlg) return; const r = nearestRes(); if (r) callBeast(r); else { S.toast = 'Get closer to a cage to call an animal'; S.toastT = 2; } }, range() { if (S.mode !== 'walk' || S.dlg) return; treat(); }, jump() { if (S.mode !== 'walk' || P.y > 0.01 || S.dlg) return; P.vy = 6.2; benW.userData.hop = 1; tone(520, 0.06, 0.03); }, meleeUp() {},
    useItem() { S.toast = 'Save your items for the road. No snacking in front of the animals.'; S.toastT = 2.4; }, closeWheel() {}, skipTime() {}, setPaused(v) { PAUSE = !!v; }, setHudPad(v) { hudPad = !!v; }, setStick(x, y) { stick.x = x; stick.y = y; },
    eyeLook(dx = 0, dy = 0) { WC.look = true; WC.oy -= dx * 0.006; WC.op = clamp(WC.op + dy * 0.004, -0.3, 0.7); }, eyeRelease() { WC.look = false; }, togglePov() { WC.pov = !WC.pov; return WC.pov; },
    lookBy(dx = 0, dy = 0) { WC.look = true; WC.oy -= dx * 0.006; WC.op = clamp(WC.op + dy * 0.004, -0.3, 0.7); clearTimeout(api._lt); api._lt = setTimeout(() => WC.look = false, 400); }, zoomBy(f) { WC.dist = clamp(WC.dist * f, 3, 11); }, getCam() { return { dist: WC.dist, pitch: WC.pitch }; }, setCam(d, p) { if (d != null) WC.dist = clamp(d, 3, 11); if (p != null) WC.pitch = clamp(p, 0.1, 1.1); },
    mapData() { return { p: [P.x, P.z, P.yaw], b: CAGES.map((c, i) => [ALL[i].home ? c.key.toUpperCase() : c.key.toUpperCase() + ' (AWAY)', c.x, c.z]).concat([['KEEPER DESK', -11.5, 5], ['FEED CART', 11.2, 5]]), f: [[hessa.position.x, hessa.position.z], ...VIS.map(v => [v.f.position.x, v.f.position.z])], e: [], q: [hessa.position.x, hessa.position.z, 'HESSA'] }; },
    setMinimap(cv) { api._mm = cv; drawMini(); }, toggleSound() { audio.setMuted && audio.setMuted(!audio.muted); }, cycleWeather() {},
    _setDay(d) { S.day = d; setHome(d); resetAnimals(false); }, _pump(n = 1, dt = 1 / 30) { for (let i = 0; i < n; i++) step(dt); renderer.render(scene, camera); onState(hud()); }, _state: () => S, _all: () => ALL, _scr: scr, _wp: wp, _P: P, _throw: throwInto, _pour: [pourStart, pourEnd], _rake: rakeAt, _brush: brush, _endDay: endDay,
    destroy() { cancelAnimationFrame(raf); removeEventListener('resize', onRs); ro.disconnect(); removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp); removeEventListener('keydown', onKD); removeEventListener('keyup', onKU); removeEventListener('blur', onBlur); renderer.dispose(); renderer.domElement.remove(); try { audio.ctx && audio.ctx.close(); } catch (e) {} } };
  function drawMini() { const cv = api._mm; if (!cv) return; const c = cv.getContext('2d'), w = cv.width, h = cv.height, sx = w / (HX * 2 + 2), sz = h / (FZ - BZ + 2), X = x => (x + HX + 1) * sx, Y = z => (z - BZ + 1) * sz; c.fillStyle = '#b4543a'; c.fillRect(0, 0, w, h); CAGES.forEach((C, i) => { const a = toWorld(C, -CW / 2, -CD / 2), b = toWorld(C, CW / 2, CD / 2); c.fillStyle = ALL[i].home ? '#3f5d47' : '#3a3836'; c.fillRect(X(Math.min(a.x, b.x)), Y(Math.min(a.z, b.z)), Math.abs(b.x - a.x) * sx, Math.abs(b.z - a.z) * sz); }); c.fillStyle = '#ffd23a'; c.beginPath(); c.arc(X(P.x), Y(P.z), 5, 0, 7); c.fill(); }
  setInterval(drawMini, 500);
  return api;
}
