// MERU 2.0 — step 3: interiors, part 1. TAVERN [meruTavern] and CASINO [meruCasino], dressed inside the city shells.
// Every game spot opens the original 2D minigame (minigames/meru/*.html) full-screen in the job panel.
// Casino = three SOUND BAYS split by glass partitions (slots west, poker north, wheel south) + the cashier cage, so voices don't stack.
import { BACK_DOORS } from './meru2-layout.js';
import { buildTavern } from './meru-tavern.js';
import { buildCasino, CASINO_TALK } from './meru2-casino.js';
const G = 'minigames/meru/';
export function buildRooms({ THREE, scene, M, toon, kit, cast, cols, grad, save, audio, touch }) {
  const B = (w, h, d, col, x, y, z, ry = 0, o = 0.02) => { const m = M(new THREE.BoxGeometry(w, h, d), typeof col === 'string' ? toon(col) : col, x, y, z, null, o); m.rotation.y = ry; return m; };
  const C = (r, h, col, x, y, z, o = 0.02) => M(new THREE.CylinderGeometry(r, r, h, 20), typeof col === 'string' ? toon(col) : col, x, y, z, null, o);
  const box = (x0, x1, z0, z1) => cols.push({ f: [x0, x1, z0, z1] }), ring = (x, z, r) => cols.push({ c: [x, z, r] });
  const glow = c => new THREE.MeshBasicMaterial({ color: c });
  const fox = (key, opt, x, z, ry) => { const f = kit.makeFox({ key, ...opt }); f.position.set(x, 0, z); f.rotation.y = ry; scene.add(f); ring(x, z, 0.5); return f; };
  const tex = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const spots = [], npcs = [], flick = [], tavDancers = [];
  const play = (label, url, x, z, r = 1.8) => spots.push({ key: label, x, z, r, prompt: 'PLAY \u00b7 ' + label, play: { label, url: G + url } });

  // ================= TAVERN [meruTavern] (f 12..52 × -100..-60, door S at x 32): the old Meru tavern, worlds/meru-tavern.js =================
  // bar, fireplace, tables, the 3D JUKEBOX and DARTS on the real board (+ Flick); replaces the step-3 placeholder that opened darts.html / jukebox.html
  const tav = buildTavern({ THREE, scene, M, toon, grad, kit, cols, save, audio, touch, rect: { x0: 12, x1: 52, z0: -100, z1: -60 }, clear: BACK_DOORS.tavern && BACK_DOORS.tavern.clear && !/[?&]backdoors=0/.test(location.search) ? [BACK_DOORS.tavern.clear] : [] }); spots.push(...tav.spots);
  {
    const TP = Object.fromEntries((tav.layout.people || []).map(p => [p.key, p])), nb = TP.noble || { x: 26, z: -76, a: 153 }, br = TP.docBraun || { x: 39, z: -85, a: 225 };   // placed in Tavern Workshop
    const noble = cast.make('noble'); noble.position.set(nb.x, 0, nb.z); noble.rotation.y = nb.a * Math.PI / 180; scene.add(noble); ring(nb.x, nb.z, 0.6); npcs.push(noble);
    npcs.push(fox('docBraun', { torso: '#5c6670', outfit: 'coat' }, br.x, br.z, br.a * Math.PI / 180)); tavDancers.push(npcs[npcs.length - 1]); }

  // ================= CASINO (f -150..-105 × -32..32, door E at z 0): worlds/meru2-casino.js, laid out in Casino Workshop.dc.html =================
  const casArt = buildCasino({ THREE, scene, cols, touch, backDoor: BACK_DOORS.casino && !/[?&]backdoors=0/.test(location.search) ? BACK_DOORS.casino.door[1] : null }), casTalkers = [];
  { for (const s of casArt.spots) play(s.label, s.url, s.x, s.z, s.r);
    for (const p of casArt.people) { const f = fox(p.key, p.look, p.x, p.z, p.ry); npcs.push(f); if (CASINO_TALK[p.key]) casTalkers.push({ key: p.key, obj: f, ry: p.ry, r: 2.4 }); } }

  function tick(dt, t, P, pfox, cam) { for (const f of npcs) kit.animFox(f, dt, 0, false); tav.tick(dt, t, P, pfox, tavDancers); casArt.tick(dt, t, cam || P); for (const f of flick) { if (f.spin) f.spin.rotation.y += dt * 0.4; else f.scale.y = 0.85 + Math.sin(t * 13) * 0.1 + Math.sin(t * 7.1) * 0.08; } }
  return { spots, tick, tavern: tav, keys: new Set([...tav.keys, ...casTalkers.map(t => t.key)]), TALK: CASINO_TALK, talkers: casTalkers, toast: tav.toast, camFix: tav.camFix };
}
