/* 8 GATES 3D: DODGEBALL minigame module.
   Standalone: makes its own renderer inside `container`.
   World mode: opts.world = { renderer, camera, parent } puts the court into the town. */
import * as THREE from '../../vendor/three/three.module.js';
import {
  COURT, BALL, FOX, ROUND_TIME, ROUNDS_TO_WIN, LEVELS, MATE, METER, meterAt, isPerfect, throwSpeed, aimError,
  rnd, clamp, clampToSide, approach, reactChoice, pickTarget, roundWinner, POINTS, stars, rewards, DEMO_TIPS, RULES_TEXT,
} from './dodgeball-rules.js';
import { createAudio } from './dodgeball-audio.js';

export const GAME = { key: 'dodgeballCourt', name: 'DODGEBALL', maxPlayers: 4 };
const KEY = GAME.key;
const INK = 0x1a1626;
const RED = 0xec3013, YELLOW = 0xffd23a, BLUE = 0x2f6bff, CYAN = 0x3ad7ff;
const TEAM_COL = [RED, BLUE];
const PLAYER_COL = [YELLOW, CYAN];

/* ---------- shared toon kit ---------- */
function makeToonKit() {
  const grad = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  const cache = new Map();
  const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  function toon(color) {
    if (!cache.has(color)) cache.set(color, new THREE.MeshToonMaterial({ color, gradientMap: grad }));
    return cache.get(color);
  }
  function part(geo, color, parent, x = 0, y = 0, z = 0, ink = 0.07) {
    const m = new THREE.Mesh(geo, typeof color === 'number' ? toon(color) : color);
    m.position.set(x, y, z); parent.add(m);
    if (ink) { const o = new THREE.Mesh(geo, inkMat); o.scale.setScalar(1 + ink); m.add(o); }
    return m;
  }
  function dispose() { grad.dispose(); inkMat.dispose(); cache.forEach((m) => m.dispose()); }
  return { toon, part, inkMat, dispose };
}

/* merge a list of boxes into one geometry (one draw call per colour) */
function mergeBoxes(list) {
  const pos = [], nor = [];
  for (const b of list) {
    const g = new THREE.BoxGeometry(b.w, b.h, b.d).toNonIndexed();
    if (b.ry) g.rotateY(b.ry);
    g.translate(b.x, b.y, b.z);
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

/* ---------- fox adapter: world kit when given, else a simple placeholder ---------- */
function makeFoxFactory(K, kit) {
  const G = {
    torso: new THREE.CapsuleGeometry(0.42, 0.5, 4, 12),
    head: new THREE.SphereGeometry(0.5, 18, 14),
    snout: new THREE.ConeGeometry(0.2, 0.5, 12).rotateX(Math.PI / 2),
    nose: new THREE.SphereGeometry(0.08, 8, 6),
    ear: new THREE.ConeGeometry(0.18, 0.45, 8),
    eye: new THREE.SphereGeometry(0.075, 8, 6),
    cheek: new THREE.SphereGeometry(0.3, 12, 10),
    arm: new THREE.CapsuleGeometry(0.13, 0.5, 3, 8).translate(0, -0.38, 0),
    leg: new THREE.CapsuleGeometry(0.15, 0.42, 3, 8).translate(0, -0.38, 0),
    foot: new THREE.SphereGeometry(0.17, 10, 8),
    tail: new THREE.CapsuleGeometry(0.2, 0.62, 4, 10),
    glasses: new THREE.BoxGeometry(0.64, 0.14, 0.1),
    cane: new THREE.CylinderGeometry(0.035, 0.035, 1.5, 6),
    seat: new THREE.CylinderGeometry(0.66, 0.6, 0.24, 18),
    back: new THREE.BoxGeometry(1.0, 1.1, 0.16),
    ring: new THREE.TorusGeometry(0.62, 0.07, 6, 24),
  };
  const red = new THREE.MeshBasicMaterial({ color: 0xff2020 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xff3b3b });

  function placeholder({ torso = [0xf07a2a, RED, 0x3a3836], outfit = 'tee', eyes = INK }) {
    const [fur, cloth, legs] = torso;
    const g = new THREE.Group();
    const body = new THREE.Group(); body.position.y = 1.22; g.add(body);
    K.part(G.torso, cloth, body);
    if (outfit === 'dress') { const s = K.part(new THREE.ConeGeometry(0.62, 0.7, 14), cloth, body, 0, -0.45, 0); s.rotation.y = 0.2; }
    if (outfit === 'vest') K.part(G.cheek, 0xffffff, body, 0, 0.1, 0.24, 0).scale.set(0.9, 1.2, 0.6);
    const head = new THREE.Group(); head.position.y = 1.02; body.add(head);
    K.part(G.head, fur, head);
    K.part(G.snout, fur, head, 0, -0.08, 0.5);
    K.part(G.nose, INK, head, 0, -0.04, 0.76, 0);
    K.part(G.cheek, 0xffffff, head, 0, -0.18, 0.22, 0).scale.set(1.15, 0.7, 0.9);
    for (const s of [-1, 1]) {
      const e = K.part(G.ear, fur, head, s * 0.28, 0.48, -0.02, 0); e.rotation.z = -s * 0.28;
      if (eyes === INK) K.part(G.eye, INK, head, s * 0.18, 0.1, 0.44, 0);
      else { const m = new THREE.Mesh(G.eye, red); m.position.set(s * 0.18, 0.1, 0.44); head.add(m); }
    }
    const arms = [-1, 1].map((s) => {
      const a = new THREE.Group(); a.position.set(s * 0.52, 0.4, 0); body.add(a);
      K.part(G.arm, fur, a); return a;
    });
    const legsP = [-1, 1].map((s) => {
      const l = new THREE.Group(); l.position.set(s * 0.21, 0.92, 0); g.add(l);
      K.part(G.leg, legs, l);
      const f = K.part(G.foot, INK, l, 0, -0.8, 0.08, 0); f.scale.set(1, 0.7, 1.45);
      return l;
    });
    const tail = K.part(G.tail, fur, body, 0, -0.45, -0.5); tail.rotation.x = -0.9;
    g.userData.P = { body, head, arms, legs: legsP, tail };
    g.userData.own = true;
    return g;
  }

  function addExtras(fox, ex) {
    const P = fox.userData.P;
    if (ex.glasses) K.part(G.glasses, INK, P.head, 0, 0.1, 0.46, 0);
    if (ex.cane) {
      const c = K.part(G.cane, 0xffffff, P.arms[0], 0, -0.95, 0.22, 0.12); c.rotation.x = 0.35;
      K.part(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6), RED, c, 0, -0.62, 0, 0);
    }
    if (ex.redEyes && !fox.userData.own) for (const s of [-1, 1]) { const m = new THREE.Mesh(G.eye, red); m.position.set(s * 0.18, 0.1, 0.45); P.head.add(m); }
    if (ex.chair) {
      const ch = new THREE.Group(); fox.add(ch);
      K.part(G.seat, 0x2a2d3a, ch, 0, 0.72, 0);
      K.part(G.back, 0x2a2d3a, ch, 0, 1.3, -0.52);
      const r = new THREE.Mesh(G.ring, glow); r.rotation.x = Math.PI / 2; r.position.y = 0.42; ch.add(r);
      fox.userData.chair = ch;
    }
  }

  function makeFox(o) {
    let fox = null;
    if (kit && kit.makeFox) {
      try { fox = kit.makeFox({ torso: o.torso, outfit: o.outfit, mood: o.mood || 'happy' }); } catch (e) { fox = null; }
      if (fox && !(fox.userData && fox.userData.P)) fox = null;
    }
    if (!fox) fox = placeholder(o);
    addExtras(fox, o);
    return fox;
  }

  function animFox(fox, dt, speed) {
    if (!fox.userData.own && kit && kit.animFox) { kit.animFox(fox, dt, speed); return; }
    const P = fox.userData.P, u = fox.userData;
    u.ph = (u.ph || 0) + dt * (2 + speed * 9);
    const k = Math.min(1, speed);
    const s = Math.sin(u.ph);
    P.legs[0].rotation.x = s * 0.8 * k; P.legs[1].rotation.x = -s * 0.8 * k;
    P.arms[0].rotation.set(-s * 0.7 * k, 0, 0.12); P.arms[1].rotation.set(s * 0.7 * k, 0, -0.12);
    P.body.position.y = 1.22 + Math.abs(Math.cos(u.ph)) * 0.08 * k + Math.sin(u.ph * 0.35) * 0.02 * (1 - k);
    P.body.rotation.set(0.08 * k, 0, 0);
    P.head.rotation.set(0, 0, 0);
    if (P.tail) P.tail.rotation.set(-0.9 + Math.sin(u.ph * 0.7) * 0.1, Math.sin(u.ph * 0.5) * 0.3, 0);
  }

  function dispose() { Object.values(G).forEach((g) => g.dispose()); red.dispose(); glow.dispose(); }
  return { makeFox, animFox, dispose };
}

/* ---------- the game ---------- */
export async function createDodgeball({ container, onState = () => {}, opts = {} }) {
  const world = opts.world || null;
  const touch = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);
  const K = makeToonKit();
  const FX = makeFoxFactory(K, opts.kit);
  const audio = createAudio({ music: world ? false : opts.music !== false });

  /* storage */
  const save = opts.save || null;
  const ls = {
    get(k, d) { try { if (save) return save.stat(KEY + '.' + k, d); const v = localStorage.getItem(KEY + '.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { if (save) save.setStat(KEY + '.' + k, v); else localStorage.setItem(KEY + '.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
    gold(n) { try { if (save) save.addGold(n); else localStorage.setItem(KEY + '.gold', String((+localStorage.getItem(KEY + '.gold') || 0) + n)); } catch (e) { /* ignore */ } },
  };
  const prefSound = ls.get('sound', true), prefMusic = world ? false : ls.get('music', true);
  audio.setSound(prefSound); audio.setMusic(prefMusic);

  /* renderer / scene */
  let renderer, root;
  const envScene = new THREE.Scene();
  if (world) {
    renderer = world.renderer;
    root = new THREE.Group(); root.name = 'dodgeballCourt'; world.parent.add(root);
  } else {
    renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.6 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
    container.appendChild(renderer.domElement);
    root = new THREE.Scene(); root.background = new THREE.Color(0x2b2547);
  }
  const room = world ? envScene : root; /* lights, room, crowd */

  /* lights (world mode: the throw-away scene) */
  room.add(new THREE.HemisphereLight(0xfff4e6, 0x5b4a7a, 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(6, 16, 9); room.add(sun);

  /* court: the playable object, always in root */
  const court = new THREE.Group(); root.add(court);
  {
    const W = COURT.w, L = COURT.l;
    const floorA = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, L / 2), K.toon(0xf2c27a)); floorA.position.set(0, -0.04, L / 4); court.add(floorA);
    const floorB = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, L / 2), K.toon(0xe8b06a)); floorB.position.set(0, -0.04, -L / 4); court.add(floorB);
    const lw = 0.14, y = 0.025;
    const white = [
      { w: lw, h: 0.02, d: L, x: -W / 2, y, z: 0 }, { w: lw, h: 0.02, d: L, x: W / 2, y, z: 0 },
      { w: W, h: 0.02, d: lw, x: 0, y, z: -L / 2 }, { w: W, h: 0.02, d: lw, x: 0, y, z: L / 2 },
      { w: W, h: 0.02, d: lw * 0.7, x: 0, y, z: 4 }, { w: W, h: 0.02, d: lw * 0.7, x: 0, y, z: -4 },
    ];
    court.add(new THREE.Mesh(mergeBoxes(white), K.toon(0xffffff)));
    court.add(new THREE.Mesh(mergeBoxes([{ w: W + 0.3, h: 0.03, d: 0.3, x: 0, y: 0.03, z: 0 }]), K.toon(RED)));
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.75, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: RED }));
    ring.position.y = 0.035; court.add(ring);
    /* low pads around the court (balls bounce off them) */
    const bx = COURT.boundX, bz = COURT.boundZ, ph = 0.55;
    const pads = [
      { w: 0.4, h: ph, d: bz * 2, x: -bx - 0.2, y: ph / 2, z: 0 }, { w: 0.4, h: ph, d: bz * 2, x: bx + 0.2, y: ph / 2, z: 0 },
      { w: bx * 2 + 0.8, h: ph, d: 0.4, x: 0, y: ph / 2, z: -bz - 0.2 }, { w: bx * 2 + 0.8, h: ph, d: 0.4, x: 0, y: ph / 2, z: bz + 0.2 },
    ];
    const padMesh = new THREE.Mesh(mergeBoxes(pads), K.toon(0x2f3a8f));
    padMesh.add(new THREE.Mesh(padMesh.geometry, K.inkMat)); padMesh.children[0].scale.set(1.01, 1.06, 1.01);
    court.add(padMesh);
    /* benches */
    const benches = [
      { w: 0.9, h: 0.5, d: 7, x: -8.5, y: 0.25, z: 5.5 }, { w: 0.9, h: 0.5, d: 7, x: 8.5, y: 0.25, z: -5.5 },
    ];
    court.add(new THREE.Mesh(mergeBoxes(benches), K.toon(0x6b4a2f)));
    const tint = new THREE.Mesh(mergeBoxes([{ w: 0.95, h: 0.06, d: 7.05, x: -8.5, y: 0.53, z: 5.5 }]), K.toon(RED)); court.add(tint);
    const tint2 = new THREE.Mesh(mergeBoxes([{ w: 0.95, h: 0.06, d: 7.05, x: 8.5, y: 0.53, z: -5.5 }]), K.toon(BLUE)); court.add(tint2);
  }

  /* standalone room: gym floor, walls, bleachers, crowd */
  let crowd = null;
  if (!world) {
    const gym = new THREE.Mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), K.toon(0x8a7fb8)); gym.position.y = -0.1; room.add(gym);
    const walls = mergeBoxes([
      { w: 60, h: 14, d: 1, x: 0, y: 7, z: -26 }, { w: 1, h: 14, d: 60, x: -24, y: 7, z: 0 }, { w: 1, h: 14, d: 60, x: 24, y: 7, z: 0 },
    ]);
    room.add(new THREE.Mesh(walls, K.toon(0x4b3f7a)));
    const stripe = mergeBoxes([{ w: 60, h: 1.2, d: 1.1, x: 0, y: 3.5, z: -25.9 }, { w: 1.1, h: 1.2, d: 60, x: -23.9, y: 3.5, z: 0 }, { w: 1.1, h: 1.2, d: 60, x: 23.9, y: 3.5, z: 0 }]);
    room.add(new THREE.Mesh(stripe, K.toon(YELLOW)));
    const steps = [];
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) steps.push({ w: 2, h: 0.6 + i * 0.8, d: 26, x: s * (12.5 + i * 2), y: (0.6 + i * 0.8) / 2, z: 0 });
    for (let i = 0; i < 3; i++) steps.push({ w: 30, h: 0.6 + i * 0.8, d: 2, x: 0, y: (0.6 + i * 0.8) / 2, z: -17 - i * 2 });
    room.add(new THREE.Mesh(mergeBoxes(steps), K.toon(0x5d528f)));
    const N = touch ? 40 : 70;
    crowd = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.45, 0.6, 3, 8), K.toon(0xffffff), N);
    const cols = [0xf07a2a, 0xffd23a, 0x3ad7ff, 0xec3013, 0x9be15d, 0xff8fb8, 0xffffff];
    crowd.userData.seats = [];
    for (let i = 0; i < N; i++) {
      const side = i % 3, row = 1 + Math.floor(Math.random() * 3);
      let x, z;
      if (side < 2) { const s = side ? 1 : -1; x = s * (12.5 + row * 2); z = rnd(-12, 12); } else { x = rnd(-13, 13); z = -17 - (row - 1) * 2; }
      const y = 0.6 + row * 0.8 + 0.6;
      crowd.userData.seats.push({ x, y, z, p: Math.random() * 6 });
      crowd.setColorAt(i, new THREE.Color(cols[i % cols.length]));
    }
    room.add(crowd);
  }

  /* blob shadows, rings, markers */
  const shadowGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false });
  function blob(r) { const m = new THREE.Mesh(shadowGeo, shadowMat); m.scale.setScalar(r); m.position.y = 0.04; root.add(m); return m; }
  const ringGeo = new THREE.RingGeometry(0.78, 0.95, 32).rotateX(-Math.PI / 2);
  const markerGeo = new THREE.ConeGeometry(0.28, 0.5, 4).rotateX(Math.PI);

  /* ---------- foxes ---------- */
  const CAST = [
    { name: 'PIP', torso: [0xf5b83a, YELLOW, 0x7a5a2a], outfit: 'tee', mate: { name: 'TOFU', torso: [0xe8873a, 0x8fb3ff, 0x2b2f5a], outfit: 'tee' } },
    { name: 'HOPE', torso: [0xe27b3a, 0xffffff, 0x2f6bff], outfit: 'vest', glasses: true, cane: true, mate: { name: 'JUNO', torso: [0xd9662a, 0x5a8cff, 0x2b2f5a], outfit: 'dress' } },
    { name: 'NOBLE', torso: [0xc9552a, 0x3a2a5a, 0x1d1b2b], outfit: 'coat', chair: true, redEyes: true, eyes: 'red', mate: { name: 'VEX', torso: [0xb84a2a, 0x2f3a8f, 0x1d1b2b], outfit: 'coat' } },
  ];
  const HOME = [{ name: 'YOU', torso: [0xf07a2a, RED, 0x3a3836], outfit: 'tee' }, { name: 'RUFUS', torso: [0xd9662a, YELLOW, 0x3a3836], outfit: 'vest' }];
  const P2LOOK = [{ name: 'P2', torso: [0xf09a3a, BLUE, 0x2b2f5a], outfit: 'tee' }, { name: 'MAPLE', torso: [0xd9662a, 0x8fb3ff, 0x2b2f5a], outfit: 'dress' }];

  const players = [];
  const balls = [];
  let mode = ['cpu', 'local', 'demo'].includes(opts.mode) ? opts.mode : 'cpu';
  let level = clamp(opts.level ?? ls.get('level', 0), 0, 2) | 0;
  let now = 0;

  function clearFoxes() {
    for (const p of players) { root.remove(p.fox, p.shadow, p.ring, p.pring, p.marker); }
    players.length = 0;
  }
  function makePlayer(team, slot, look, skill) {
    const fox = FX.makeFox({ torso: look.torso, outfit: look.outfit, glasses: look.glasses, cane: look.cane, chair: look.chair, redEyes: look.redEyes, eyes: look.eyes === 'red' ? 'red' : INK });
    root.add(fox);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: TEAM_COL[team], transparent: true, opacity: 0.85, depthWrite: false }));
    ring.position.y = 0.05; root.add(ring);
    const pring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: YELLOW, transparent: true, opacity: 1, depthWrite: false }));
    pring.position.y = 0.06; pring.visible = false; root.add(pring);
    const marker = new THREE.Mesh(markerGeo, K.toon(YELLOW)); marker.visible = false; root.add(marker);
    const p = {
      id: players.length, team, slot, name: look.name, look, fox, ring, pring, marker, shadow: blob(0.8), skill,
      x: 0, z: 0, vx: 0, vz: 0, face: team === 0 ? Math.PI : 0, alive: true, outOrder: 0, knockT: 0, benchI: 0,
      holding: null, chargeStart: -1, catchStart: -9, catchCool: 0, dashT: 0, dashCool: 0, dashX: 0, dashZ: 0, invuln: 0,
      throwAnim: 0, hitT: 0, cheer: 0, sad: 0, moveTo: null, target: null, warnT: 0, nowCued: null,
      ai: { plan: null, reacted: new Set(), aimWait: -1, chargeDur: 0, power: 0, wander: null, wanderT: 0, claim: null },
    };
    players.push(p); return p;
  }
  function buildTeams() {
    clearFoxes();
    const opp = CAST[level];
    const homeLook = mode === 'demo' ? [{ ...HOME[0], name: 'ROSA' }, HOME[1]] : HOME.map((h, i) => (mode === 'local' && i === 0 ? { ...h, name: 'P1' } : h));
    makePlayer(0, 0, homeLook[0], MATE); makePlayer(0, 1, homeLook[1], MATE);
    if (mode === 'local') { makePlayer(1, 0, P2LOOK[0], MATE); makePlayer(1, 1, P2LOOK[1], MATE); }
    else { const L = LEVELS[level]; makePlayer(1, 0, opp, L); makePlayer(1, 1, opp.mate, { ...L, catch: L.catch * 0.8 }); }
    for (const p of players) p.pring.material.color.setHex(p.team === 0 ? PLAYER_COL[0] : PLAYER_COL[1]);
  }

  /* ---------- balls ---------- */
  const ballGeo = new THREE.SphereGeometry(BALL.r, 20, 14);
  const bandGeo = new THREE.TorusGeometry(BALL.r * 1.01, 0.05, 6, 24);
  const trailMat = new THREE.MeshBasicMaterial({ color: YELLOW, transparent: true, opacity: 0.45, depthWrite: false });
  for (let i = 0; i < 3; i++) {
    const mesh = new THREE.Group();
    K.part(ballGeo, RED, mesh, 0, 0, 0, 0.09);
    K.part(bandGeo, YELLOW, mesh, 0, 0, 0, 0);
    root.add(mesh);
    const trail = [0, 1, 2].map((j) => { const t = new THREE.Mesh(ballGeo, trailMat); t.scale.setScalar(0.8 - j * 0.2); t.visible = false; root.add(t); return t; });
    balls.push({ id: i, mesh, trail, hist: [], shadow: blob(0.45), x: 0, y: BALL.r, z: 0, vx: 0, vy: 0, vz: 0, state: 'loose', owner: null, team: -1, perfect: false, idle: 0, serial: 0 });
  }

  /* ---------- match state ---------- */
  let phase = 'countdown', paused = false, round = 1, score = [0, 0], timer = ROUND_TIME, cd = 3, endT = 0;
  let msg = '', msgT = 0, tipI = 0, tipT = 0, result = null, lastWinner = -1, menuReq = 0;
  let stats = { outs: 0, catches: 0, perfects: 0, flawless: 0 };
  let lastInput = 0, dirty = true, outCounter = 0, demoRestartT = 0;

  function say(t, d = 2.2) { msg = t; msgT = d; dirty = true; }
  function resetRound() {
    const sx = [-3.2, 3.2];
    for (const p of players) {
      p.alive = true; p.knockT = 0; p.holding = null; p.chargeStart = -1; p.catchStart = -9; p.catchCool = 0; p.dashT = 0; p.dashCool = 0;
      p.invuln = 0; p.throwAnim = 0; p.hitT = 0; p.cheer = 0; p.sad = 0; p.moveTo = null; p.target = null; p.vx = p.vz = 0;
      p.ai.plan = null; p.ai.reacted.clear(); p.ai.aimWait = -1; p.ai.claim = null; p.ai.wander = null;
      p.x = sx[p.slot]; p.z = p.team === 0 ? 9 : -9; p.face = p.team === 0 ? Math.PI : 0;
    }
    [-4.2, 0, 4.2].forEach((x, i) => { const b = balls[i]; Object.assign(b, { x, y: BALL.r, z: 0, vx: 0, vy: 0, vz: 0, state: 'loose', owner: null, team: -1, perfect: false, idle: 0 }); b.hist.length = 0; });
    phase = 'countdown'; cd = 3.2; timer = ROUND_TIME; outCounter = 0;
    say('ROUND ' + round, 1.2);
    dirty = true;
  }
  function startMatch(m, lv) {
    if (m && ['cpu', 'local', 'demo'].includes(m)) mode = m;
    if (lv !== undefined && lv !== null) { level = clamp(lv | 0, 0, 2); ls.set('level', level); }
    round = 1; score = [0, 0]; result = null; stats = { outs: 0, catches: 0, perfects: 0, flawless: 0 };
    tipI = 0; tipT = 0.5; demoRestartT = 0; paused = false;
    buildTeams(); resetRound(); snapCam();
  }

  /* who controls whom: 0 = player one, 1 = player two, -1 = AI */
  function active(team) { return players.find((p) => p.team === team && p.alive) || null; }
  function ctrl(p) {
    if (mode === 'demo' || !p.alive) return -1;
    if (p.team === 0 && active(0) === p) return 0;
    if (mode === 'local' && p.team === 1 && active(1) === p) return 1;
    return -1;
  }
  function human(i) { const p = active(i === 0 ? 0 : 1); return p && ctrl(p) === i ? p : null; }

  /* ---------- input ---------- */
  const joy = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  const keys = new Map();
  let sawKeyup = !world;
  function touchInput() { lastInput = now; audio.unlock(); dirty = true; }
  function keyDir(i) {
    const on = (c) => { const t = keys.get(c); return t !== undefined && t > now; };
    let x = 0, y = 0;
    const set = mode === 'local'
      ? (i === 0 ? ['KeyA', 'KeyD', 'KeyW', 'KeyS'] : ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
      : null;
    const sets = set ? [set] : (i === 0 ? [['KeyA', 'KeyD', 'KeyW', 'KeyS'], ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']] : []);
    for (const s of sets) { if (on(s[0])) x -= 1; if (on(s[1])) x += 1; if (on(s[2])) y += 1; if (on(s[3])) y -= 1; }
    return { x, y };
  }
  function bindingFor(code) {
    if (mode === 'local') {
      const m = { KeyF: [0, 'throw'], KeyG: [0, 'catch'], KeyH: [0, 'dodge'], KeyR: [0, 'target'], Enter: [1, 'throw'], Slash: [1, 'catch'], Period: [1, 'dodge'], Comma: [1, 'target'] };
      return m[code] || null;
    }
    const m = { Space: [0, 'throw'], KeyJ: [0, 'throw'], KeyK: [0, 'catch'], KeyL: [0, 'dodge'], ShiftLeft: [0, 'dodge'], ShiftRight: [0, 'dodge'], KeyQ: [0, 'target'], Tab: [0, 'target'] };
    return m[code] || null;
  }
  const keyCharge = [false, false];
  function onKey(e) {
    const down = e.type !== 'keyup';
    const code = e.code || e.key;
    if (down && code === 'Escape') { menuReq++; dirty = true; return; }
    const b = bindingFor(code);
    const isMove = /^(Key[WASD]|Arrow)/.test(code);
    if (!b && !isMove) return;
    if (e.preventDefault) e.preventDefault();
    touchInput();
    if (!down) { sawKeyup = true; keys.delete(code); if (b && b[1] === 'throw' && keyCharge[b[0]]) { keyCharge[b[0]] = false; api.throwUp(b[0]); } return; }
    keys.set(code, sawKeyup ? Infinity : now + 0.55);
    if (!b || e.repeat) return;
    const [i, act] = b;
    if (act === 'throw') {
      if (sawKeyup) { if (!keyCharge[i]) { keyCharge[i] = true; api.throwDown(i); } }
      else { const p = human(i); if (p && p.chargeStart >= 0) api.throwUp(i); else api.throwDown(i); }
    } else if (act === 'catch') api.catchBall(i);
    else if (act === 'dodge') api.dodge(i);
    else if (act === 'target') api.cycleTarget(i);
  }

  /* pointer: tap the floor to run there, tap a fox on the other team to target it */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
  function onPointer(e) {
    if (world) { if (e.target !== renderer.domElement) return; e.preventDefault(); e.stopImmediatePropagation(); }
    touchInput();
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    cam.updateMatrixWorld();
    ray.setFromCamera(ndc, cam);
    if (!ray.ray.intersectPlane(floorPlane, hitP)) return;
    const me = human(0); if (!me || phase !== 'play') return;
    let best = null, bd = 1.8;
    for (const p of players) if (p.alive && p.team !== me.team) {
      /* test the ray against the fox's middle, not just its feet */
      const c = new THREE.Vector3(p.x, 1.3, p.z), d = ray.ray.distanceToPoint(c);
      if (d < bd) { bd = d; best = p; }
    }
    if (best) { me.target = best; audio.sfx.tap(); return; }
    me.moveTo = [hitP.x, hitP.z];
  }
  if (world) window.addEventListener('pointerdown', onPointer, true);
  else {
    renderer.domElement.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
  }

  /* ---------- actions ---------- */
  function startCatch(p) {
    if (p.catchCool > 0 || !p.alive) return false;
    p.catchStart = now; p.catchCool = FOX.catchCool; return true;
  }
  function startDash(p, dx, dz) {
    if (p.dashCool > 0 || !p.alive || p.look.chair && p.dashT > 0) return false;
    const l = Math.hypot(dx, dz) || 1;
    p.dashX = dx / l; p.dashZ = dz / l; p.dashT = FOX.dashTime; p.invuln = FOX.dashTime + 0.06; p.dashCool = FOX.dashCool;
    audio.sfx.dash(pan(p.x)); return true;
  }
  function foes(p) { return players.filter((q) => q.alive && q.team !== p.team); }
  function autoTarget(p) {
    if (p.target && p.target.alive && p.target.team !== p.team) return p.target;
    let best = null, bd = 1e9;
    for (const q of foes(p)) { const d = Math.hypot(q.x - p.x, q.z - p.z) + Math.abs(q.x - p.x) * 0.3; if (d < bd) { bd = d; best = q; } }
    p.target = best; return best;
  }
  function doThrow(p, power, target) {
    const b = p.holding; if (!b || !target) return;
    const hp = handPos(p);
    p.holding = null; p.chargeStart = -1; p.throwAnim = 0.3;
    const perfect = isPerfect(power), speed = throwSpeed(power) * (p.skill.speed || 1);
    const sx = hp[0], sy = Math.max(1.6, hp[1] - 0.3), sz = hp[2];
    let tx = target.x, tz = target.z, ty = 1.35;
    const d0 = Math.hypot(tx - sx, tz - sz), t0 = d0 / speed;
    tx += target.vx * t0 * 0.7; tz += target.vz * t0 * 0.7;
    const err = aimError(power, p.skill.spread ?? 0.7), a = Math.random() * Math.PI * 2, rr = Math.random() * err;
    tx += Math.cos(a) * rr; ty += Math.sin(a) * rr * 0.6;
    const dx = tx - sx, dz = tz - sz, dh = Math.hypot(dx, dz) || 1, t = dh / speed;
    Object.assign(b, { x: sx, y: sy, z: sz, vx: dx / dh * speed, vz: dz / dh * speed, vy: (ty - sy + 0.5 * BALL.g * t * t) / t, state: 'live', owner: p, team: p.team, perfect, serial: b.serial + 1, lastThrower: p.id });
    b.hist.length = 0;
    audio.sfx.throw(power, pan(p.x));
    if (perfect) { audio.sfx.perfect(pan(p.x)); if (p.team === 0 && mode === 'cpu') stats.perfects++; if (ctrl(p) >= 0) say('PERFECT THROW', 1); }
    dirty = true;
  }
  function knockOut(p, by, how) {
    if (!p.alive) return;
    p.alive = false; p.knockT = 0.8; p.outOrder = ++outCounter; p.chargeStart = -1;
    if (p.holding) { const b = p.holding; p.holding = null; Object.assign(b, { state: 'loose', vx: rnd(-2, 2), vy: 3, vz: p.team === 0 ? 2 : -2 }); }
    const benchTaken = players.filter((q) => q !== p && q.team === p.team && !q.alive).length;
    p.benchI = benchTaken;
    if (by && by.team === 0 && mode === 'cpu') stats.outs++;
    audio.sfx.out();
    if (how !== 'catch') say(p.name + ' IS OUT', 1.6);
    dirty = true;
    checkRound();
  }
  function revive(team) {
    const out = players.filter((q) => q.team === team && !q.alive).sort((a, b) => a.outOrder - b.outOrder)[0];
    if (!out) return null;
    out.alive = true; out.knockT = 0; out.x = team === 0 ? -6 : 6; out.z = team === 0 ? 9.5 : -9.5; out.vx = out.vz = 0;
    out.ai.plan = null; out.ai.reacted.clear(); out.invuln = 1.0; out.cheer = 0.8;
    audio.sfx.back();
    return out;
  }
  function checkRound() {
    if (phase !== 'play') return;
    const ah = players.filter((p) => p.team === 0 && p.alive).length, aa = players.filter((p) => p.team === 1 && p.alive).length;
    const w = roundWinner(ah, aa, timer <= 0);
    if (w === null) return;
    endRound(w, ah, aa);
  }
  function teamName(t) {
    if (mode === 'local') return t === 0 ? 'P1' : 'P2';
    if (mode === 'demo') return t === 0 ? 'ROSA' : CAST[level].name;
    return t === 0 ? 'YOU' : CAST[level].name;
  }
  function endRound(w, ah, aa) {
    phase = 'roundEnd'; endT = 3; lastWinner = w;
    for (const b of balls) if (b.state === 'live') b.state = 'loose';
    if (w >= 0) {
      score[w]++;
      for (const p of players) { if (p.team === w) p.cheer = 3; else p.sad = 3; }
      if (w === 0 && ah === 2 && mode === 'cpu') stats.flawless++;
      const you = teamName(w) === 'YOU';
      say(timer <= 0 ? 'TIME. ' + teamName(w) + (you ? ' TAKE' : ' TAKES') + ' THE ROUND' : teamName(w) + (you ? ' WIN' : ' WINS') + ' ROUND ' + round, 2.8);
      audio.sfx.whistle(); audio.sfx.cheer();
    } else { say(timer <= 0 ? 'TIME. DRAW ROUND' : 'DOUBLE OUT. DRAW ROUND', 2.8); audio.sfx.whistle(); }
    dirty = true;
  }
  function finishMatch() {
    phase = 'result';
    const w = score[0] > score[1] ? 0 : 1;
    for (const p of players) { p.cheer = p.team === w ? 99 : 0; p.sad = p.team === w ? 0 : 99; }
    if (mode === 'cpu') {
      const won = w === 0;
      let pts = stats.outs * POINTS.out + stats.catches * POINTS.catch + stats.perfects * POINTS.perfect + score[0] * POINTS.round + stats.flawless * POINTS.flawless + (won ? POINTS.win * (1 + level * 0.5) : 0);
      pts = Math.round(pts);
      const st = stars(won, score[0], score[1], stats.flawless > 0);
      const rw = rewards(level, won, st, pts);
      const best = Math.max(ls.get('best', 0), pts);
      ls.set('best', best);
      if (rw.gold) ls.gold(rw.gold);
      ls.set('xp', ls.get('xp', 0) + rw.xp);
      if (won) ls.set('beat' + level, true);
      result = { win: won, title: won ? 'YOU WIN' : CAST[level].name + ' WINS', sub: score[0] + ' : ' + score[1] + ' ROUNDS', score: pts, best, newBest: pts >= best && pts > 0, gold: won ? rw.gold : rw.gold, xp: rw.xp, stars: st,
        lines: ['OUTS ' + stats.outs, 'CATCHES ' + stats.catches, 'PERFECT THROWS ' + stats.perfects] };
      won ? audio.sfx.win() : audio.sfx.lose();
    } else if (mode === 'local') {
      result = { win: true, title: (w === 0 ? 'P1' : 'P2') + ' WINS', sub: score[0] + ' : ' + score[1] + ' ROUNDS', score: null, best: null, gold: 0, xp: 0, stars: null, lines: [] };
      audio.sfx.win();
    } else {
      result = null; demoRestartT = 4; say(teamName(w) + ' WINS THE DEMO MATCH', 4);
    }
    dirty = true;
  }

  /* ---------- simulation ---------- */
  function pan(x) { return clamp(x / 9, -1, 1); }
  function handPos(p) {
    const s = Math.sin(p.face), c = Math.cos(p.face);
    let lx = 0.62, ly = 1.45, lz = 0.35;
    if (p.chargeStart >= 0) { lx = 0.65; ly = 2.55; lz = -0.45; }
    return [p.x + lx * c + lz * s, ly + (p.look.chair ? 0.15 : 0), p.z - lx * s + lz * c];
  }
  function catchWindowFor(b) { return b.perfect ? FOX.catchWinFast : FOX.catchWin; }

  function stepBalls(dt) {
    for (const b of balls) {
      if (b.state === 'held') {
        if (!b.owner || b.owner.holding !== b) { b.state = 'loose'; continue; }
        const h = handPos(b.owner); b.x = h[0]; b.y = h[1]; b.z = h[2]; b.vx = b.vy = b.vz = 0; continue;
      }
      b.vy -= BALL.g * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      if (b.y < BALL.r) {
        b.y = BALL.r;
        if (b.vy < 0) {
          const v = -b.vy;
          if (v > 1.2) audio.sfx.bounce(v, pan(b.x));
          b.vy = v > 1.6 ? v * BALL.bounce : 0;
          b.vx *= 0.86; b.vz *= 0.86;
          if (b.state === 'live') { b.state = 'loose'; dirty = true; }
        }
      }
      if (b.y <= BALL.r + 0.01) { const f = Math.pow(0.35, dt); b.vx *= f; b.vz *= f; }
      const bx = COURT.boundX - BALL.r, bz = COURT.boundZ - BALL.r;
      if (Math.abs(b.x) > bx) { b.x = Math.sign(b.x) * bx; b.vx *= -0.55; if (b.state === 'live') b.state = 'loose'; audio.sfx.bounce(Math.abs(b.vx) * 1.5, pan(b.x)); }
      if (Math.abs(b.z) > bz) { b.z = Math.sign(b.z) * bz; b.vz *= -0.55; if (b.state === 'live') b.state = 'loose'; audio.sfx.bounce(Math.abs(b.vz) * 1.5, pan(b.x)); }
      if (b.state === 'live') {
        for (const p of players) {
          if (!p.alive || p.team === b.team) continue;
          const lift = p.look.chair ? 0.2 : 0;
          if (b.y < 0.15 + lift || b.y > FOX.top + lift + 0.1) continue;
          if (Math.hypot(b.x - p.x, b.z - p.z) > FOX.radius + BALL.r) continue;
          if (p.invuln > 0) continue;
          const caught = now - p.catchStart <= catchWindowFor(b);
          if (caught && p.holding) {
            Object.assign(b, { state: 'loose', vx: -b.vx * 0.25 + rnd(-3, 3), vz: -b.vz * 0.25, vy: 5 });
            audio.sfx.block(pan(p.x)); say(p.name + ' BLOCKS', 1.2); p.catchStart = -9; break;
          }
          if (caught) {
            b.state = 'held'; b.owner = p; p.holding = b; p.catchStart = -9; p.cheer = 0.6;
            audio.sfx.catch(pan(p.x));
            const t = players.find((q) => q.id === b.lastThrower);
            if (p.team === 0 && mode === 'cpu') stats.catches++;
            const back = revive(p.team);
            say(p.name + ' CATCHES!' + (t ? ' ' + t.name + ' IS OUT.' : '') + (back ? ' ' + back.name + ' IS BACK.' : ''), 2.2);
            if (t) knockOut(t, p, 'catch');
            dirty = true; break;
          }
          /* hit */
          Object.assign(b, { state: 'loose', vx: -b.vx * 0.2 + rnd(-2, 2), vz: -b.vz * 0.2, vy: 4.5 });
          p.hitT = 0.6; p.vx += b.vx * 0.3;
          audio.sfx.hit(pan(p.x));
          knockOut(p, players.find((q) => q.id === b.lastThrower), 'hit');
          break;
        }
      }
      /* pick up */
      if (b.state === 'loose' && b.y < 1.1 && Math.hypot(b.vx, b.vz) < 13 && phase === 'play') {
        for (const p of players) {
          if (!p.alive || p.holding || p.knockT > 0 || p.hitT > 0.2) continue;
          if (Math.hypot(b.x - p.x, b.z - p.z) < 0.95) {
            b.state = 'held'; b.owner = p; p.holding = b; b.team = p.team; p.ai.aimWait = -1; p.ai.claim = null;
            audio.sfx.pick(pan(p.x)); dirty = true; break;
          }
        }
      }
      /* ball boy: a ball that rests where nobody can reach goes back in */
      if (b.state === 'loose') {
        const slow = Math.hypot(b.vx, b.vz) < 1.2 && b.y < BALL.r + 0.05;
        const unreachable = Math.abs(b.x) > COURT.edgeX + 0.8 || Math.abs(b.z) > COURT.backZ + 0.8;
        b.idle = slow && unreachable ? b.idle + dt : 0;
        if (b.idle > 1.0) {
          b.x = clamp(b.x, -COURT.edgeX + 0.5, COURT.edgeX - 0.5);
          b.z = Math.abs(b.z) < 0.4 ? 0 : clamp(b.z, -COURT.backZ + 0.8, COURT.backZ - 0.8);
          b.y = 1.5; b.vy = 2; b.vx = b.vz = 0; b.idle = 0; audio.sfx.pick(pan(b.x));
        }
      }
    }
  }

  function stepFox(p, dt) {
    p.catchCool = Math.max(0, p.catchCool - dt); p.dashCool = Math.max(0, p.dashCool - dt);
    p.invuln = Math.max(0, p.invuln - dt); p.throwAnim = Math.max(0, p.throwAnim - dt); p.hitT = Math.max(0, p.hitT - dt);
    p.cheer = Math.max(0, p.cheer - dt); p.sad = Math.max(0, p.sad - dt);
    let wx = 0, wz = 0, speed = FOX.run * (p.skill.speed || 1);
    if (!p.alive) {
      if (p.knockT > 0) { p.knockT -= dt; p.vx *= 0.9; p.vz *= 0.9; p.x += p.vx * dt; p.z += p.vz * dt; return; }
      const bx = p.team === 0 ? -8.5 : 8.5, bz = p.team === 0 ? 3 + p.benchI * 2.2 : -3 - p.benchI * 2.2;
      const dx = bx - p.x, dz = bz - p.z, d = Math.hypot(dx, dz);
      if (d > 0.15) { const s = Math.min(4.5, d * 4); p.vx = dx / d * s; p.vz = dz / d * s; } else { p.vx = p.vz = 0; p.x = bx; p.z = bz; }
      p.x += p.vx * dt; p.z += p.vz * dt;
      const sitFace = p.team === 0 ? Math.PI / 2 : -Math.PI / 2;
      turn(p, d > 0.3 ? Math.atan2(p.vx, p.vz) : sitFace, dt);
      return;
    }
    const h = ctrl(p);
    if (phase === 'play') {
      if (h >= 0) {
        const k = keyDir(h), j = joy[h];
        let ix = j.x + k.x, iy = j.y + k.y;
        const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
        if (il > 0.12) p.moveTo = null;
        if (p.moveTo) {
          const dx = p.moveTo[0] - p.x, dz = p.moveTo[1] - p.z, d = Math.hypot(dx, dz);
          if (d < 0.25) p.moveTo = null; else { wx = dx / d * Math.min(1, d); wz = dz / d * Math.min(1, d); }
        } else { wx = ix; wz = -iy; }
        humanThreat(p);
      } else aiThink(p, dt, (x, z) => { wx = x; wz = z; });
    } else if (phase === 'countdown') {
      /* step up to the start mark */
    }
    if (p.chargeStart >= 0) speed *= 0.55;
    if (p.dashT > 0) { p.dashT -= dt; p.vx = p.dashX * FOX.dash; p.vz = p.dashZ * FOX.dash; }
    else {
      const k = 1 - Math.exp(-12 * dt);
      p.vx += (wx * speed - p.vx) * k; p.vz += (wz * speed - p.vz) * k;
    }
    p.x += p.vx * dt; p.z += p.vz * dt;
    /* keep teammates apart */
    for (const q of players) if (q !== p && q.alive && q.team === p.team) {
      const dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz);
      if (d < 1.1 && d > 1e-3) { p.x += dx / d * (1.1 - d) * 0.5; p.z += dz / d * (1.1 - d) * 0.5; }
    }
    const c = clampToSide(p.team, p.x, p.z); p.x = c[0]; p.z = c[1];
    /* face: toward the target while holding, else toward running direction, else toward the other side */
    const sp = Math.hypot(p.vx, p.vz);
    let goal = p.team === 0 ? Math.PI : 0;
    if (p.holding || p.chargeStart >= 0) { const t = autoTarget(p); if (t) goal = Math.atan2(t.x - p.x, t.z - p.z); }
    else if (sp > 2.5 && p.dashT <= 0) goal = Math.atan2(p.vx, p.vz);
    turn(p, goal, dt);
  }
  function turn(p, goal, dt) {
    let d = goal - p.face; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    p.face += d * (1 - Math.exp(-10 * dt));
  }

  /* the player's fox: warning ticks and the yellow NOW ring when a ball is coming */
  function humanThreat(p) {
    let best = null;
    for (const b of balls) {
      if (b.state !== 'live' || b.team === p.team) continue;
      const a = approach(b.x, b.z, b.vx, b.vz, p.x, p.z);
      if (a.t > 0 && a.t < 1.1 && a.miss < 1.25 && (!best || a.t < best.t)) best = { t: a.t, b };
    }
    p.threat = best;
    if (!best) { p.nowCued = null; return; }
    if (now > p.warnT) { audio.sfx.warn(1 - best.t / 1.1, pan(best.b.x - p.x)); p.warnT = now + Math.max(0.07, best.t * 0.25); }
    const win = catchWindowFor(best.b);
    if (best.t < win * 0.85 && p.nowCued !== best.b.serial) { p.nowCued = best.b.serial; audio.sfx.now(pan(best.b.x - p.x)); }
  }

  function aiThink(p, dt, move) {
    const S = p.skill, A = p.ai;
    /* 1. react to throws */
    for (const b of balls) {
      if (b.state !== 'live' || b.team === p.team) continue;
      const key = b.id * 1000 + b.serial;
      if (A.reacted.has(key)) continue;
      const a = approach(b.x, b.z, b.vx, b.vz, p.x, p.z);
      if (a.t > 0 && a.t < 1.3 && a.miss < 1.25) {
        A.reacted.add(key);
        A.plan = { b, serial: b.serial, choice: reactChoice(S, Math.hypot(b.vx, b.vz), !!p.holding), at: now + S.react * rnd(0.75, 1.3), jitter: rnd(-1, 1) * (1 - S.catch) * 0.09 };
      }
    }
    if (A.reacted.size > 40) A.reacted.clear();
    if (A.plan) {
      const pl = A.plan, b = pl.b;
      if (b.state !== 'live' || b.serial !== pl.serial) A.plan = null;
      else if (now >= pl.at) {
        const a = approach(b.x, b.z, b.vx, b.vz, p.x, p.z);
        if (pl.choice === 'catch') {
          if (a.t <= catchWindowFor(b) * 0.55 + pl.jitter) { startCatch(p); A.plan = null; }
        } else if (pl.choice === 'dodge') {
          let sx = -b.vz, sz = b.vx; const side = (p.x - b.x) * sx + (p.z - b.z) * sz >= 0 ? 1 : -1;
          if (Math.abs(p.x + Math.sign(sx * side) * 2) > COURT.edgeX) { sx = -sx; sz = -sz; }
          startDash(p, sx * side, sz * side * 0.4); A.plan = null;
        } else A.plan = null;
      }
    }
    const fw = p.team === 0 ? -1 : 1, sideZ = p.team === 0 ? 1 : -1;
    /* 2. holding: walk up, wait, wind up, throw */
    if (p.holding) {
      if (A.aimWait < 0) { A.aimWait = rnd(S.aimWait[0], S.aimWait[1]); A.spot = [clamp(p.x + rnd(-3, 3), -5.5, 5.5), sideZ * rnd(2.2, 4.5)]; }
      if (p.chargeStart >= 0) {
        if (now - p.chargeStart >= A.chargeDur) { const t = p.ai.tgt && p.ai.tgt.alive ? p.ai.tgt : autoTarget(p); doThrow(p, A.power, t); A.aimWait = -1; }
        move(0, 0); return;
      }
      A.aimWait -= dt;
      const dx = A.spot[0] - p.x, dz = A.spot[1] - p.z, d = Math.hypot(dx, dz);
      if (d > 0.4) move(dx / d, dz / d); else move(0, 0);
      if (A.aimWait <= 0) {
        const tgt = pickTarget(p, foes(p).map((q) => ({ ...q, ref: q, dashing: q.dashT > 0, holding: !!q.holding })));
        p.ai.tgt = tgt ? tgt.ref : null; p.target = p.ai.tgt;
        A.power = Math.random() < S.perfect ? rnd(METER.perfectLo + 0.01, METER.perfectHi - 0.01) : rnd(S.power[0], S.power[1]);
        if (isPerfect(A.power) && Math.random() > S.perfect) A.power = Math.min(A.power, METER.perfectLo - 0.02);
        A.chargeDur = rnd(0.3, 0.6); p.chargeStart = now;
      }
      return;
    }
    /* 3. fetch a ball on our side nobody on the team has claimed */
    let best = null, bd = 1e9;
    for (const b of balls) {
      if (b.state !== 'loose') continue;
      const mine = p.team === 0 ? b.z > -0.15 : b.z < 0.15;
      if (!mine || Math.abs(b.x) > COURT.edgeX + 0.8 || Math.abs(b.z) > COURT.backZ + 0.8) continue;
      if (players.some((q) => q !== p && q.team === p.team && q.alive && q.ai.claim === b && ctrl(q) < 0)) continue;
      const d = Math.hypot(b.x - p.x, b.z - p.z);
      if (d < bd) { bd = d; best = b; }
    }
    A.claim = best;
    if (best && !threatened(p)) { const dx = best.x - p.x, dz = best.z - p.z, d = Math.hypot(dx, dz) || 1; move(dx / d, dz / d); return; }
    /* 4. defend: stay deep, sidestep away from foxes holding a ball */
    A.wanderT -= dt;
    if (!A.wander || A.wanderT <= 0) { A.wander = [rnd(-5, 5), sideZ * rnd(6, 9.5)]; A.wanderT = rnd(1, 2.4); }
    let tx = A.wander[0];
    const shooter = foes(p).find((q) => q.chargeStart >= 0 || q.holding);
    if (shooter) tx = clamp(p.x + (p.x >= shooter.x ? 2 : -2), -5.5, 5.5);
    const dx = tx - p.x, dz = A.wander[1] - p.z, d = Math.hypot(dx, dz);
    if (d > 0.5) move(dx / d * 0.75, dz / d * 0.75); else move(0, 0);
    void fw;
  }
  function threatened(p) {
    for (const b of balls) if (b.state === 'live' && b.team !== p.team) { const a = approach(b.x, b.z, b.vx, b.vz, p.x, p.z); if (a.t > 0 && a.t < 0.6 && a.miss < 1.3) return true; }
    return false;
  }

  /* ---------- posing ---------- */
  function pose(p, dt) {
    const fox = p.fox, P = fox.userData.P;
    const sp = Math.hypot(p.vx, p.vz) / FOX.run;
    FX.animFox(fox, dt, p.alive || p.knockT <= 0 ? Math.min(1.2, sp) : 0);
    fox.position.set(p.x, 0, p.z); fox.rotation.set(0, p.face, 0);
    const seated = !p.alive && p.knockT <= 0 && sp < 0.05;
    if (p.look.chair) {
      fox.position.y = 0.32 + Math.sin(now * 3 + p.id) * 0.06;
      P.legs[0].rotation.x = P.legs[1].rotation.x = -1.45;
      fox.userData.chair.rotation.y = 0;
    }
    if (p.knockT > 0) { P.body.rotation.x = -0.9 * Math.min(1, (0.8 - p.knockT) * 4); fox.rotation.y += (0.8 - p.knockT) * 5; P.arms[0].rotation.x = P.arms[1].rotation.x = -2.6; return; }
    if (seated && !p.look.chair) { P.legs[0].rotation.x = P.legs[1].rotation.x = -1.4; fox.position.y = -0.36; }
    if (p.hitT > 0) P.body.rotation.x = -0.5 * p.hitT / 0.6;
    if (p.dashT > 0) { P.body.rotation.z = (p.dashX * Math.cos(p.face) - p.dashZ * Math.sin(p.face)) * 0.55; fox.position.y += 0.15; }
    const R = P.arms[1], Lh = P.arms[0];
    if (p.chargeStart >= 0) { const k = Math.min(1, (now - p.chargeStart) * 5); R.rotation.x = 2.5 * k; R.rotation.z = -0.3; P.body.rotation.y = 0.35 * k; }
    else if (p.throwAnim > 0) { const k = p.throwAnim / 0.3; R.rotation.x = -1.1 + 3.4 * k * k; P.body.rotation.y = -0.3 * (1 - k); P.body.rotation.x = 0.25; }
    const catching = now - p.catchStart < 0.35;
    if (catching) { R.rotation.x = Lh.rotation.x = -1.45; R.rotation.z = 0.25; Lh.rotation.z = -0.25; }
    else if (p.holding && p.chargeStart < 0 && p.throwAnim <= 0) { Lh.rotation.x = -0.7; }
    if (p.cheer > 0 && phase !== 'play') { R.rotation.x = Lh.rotation.x = -2.9 + Math.sin(now * 12) * 0.25; fox.position.y += Math.abs(Math.sin(now * 7 + p.id)) * 0.35; }
    else if (p.cheer > 0) { R.rotation.x = -2.8; }
    if (p.sad > 0 && phase !== 'play') { P.head.rotation.x = 0.45; P.body.rotation.x = 0.2; }
    /* blink while invulnerable after coming back */
    fox.visible = !(p.invuln > 0.3 && p.alive && p.dashT <= 0 && Math.floor(now * 14) % 2 === 0);
  }

  /* ---------- camera ---------- */
  const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  const wcam = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  const goalPos = new THREE.Vector3(0, 20, 26);
  const camQ = new THREE.Quaternion();
  let safe = { top: 0, bottom: 0, left: 0, right: 0 };
  const FIT = [];
  for (const x of [-7.6, 7.6]) for (const z of [-11.6, 11.6]) FIT.push(new THREE.Vector3(x, 0, z));
  FIT.push(new THREE.Vector3(-7.4, 3.1, -11.4), new THREE.Vector3(7.4, 3.1, -11.4), new THREE.Vector3(-7.4, 2.6, 11), new THREE.Vector3(7.4, 2.6, 11));
  function viewSize() {
    const el = world ? renderer.domElement : container;
    return [Math.max(1, el.clientWidth || 1), Math.max(1, el.clientHeight || 1)];
  }
  function fitCamera() {
    const [W, H] = viewSize();
    const portrait = H > W;
    cam.aspect = W / H;
    cam.fov = world ? (world.camera.fov || 50) : (portrait ? 58 : 44);
    cam.updateProjectionMatrix();
    const pitch = (portrait ? 54 : 46) * Math.PI / 180;
    const e = new THREE.Euler(-pitch, 0, 0, 'YXZ'); camQ.setFromEuler(e);
    cam.quaternion.copy(camQ);
    const back = new THREE.Vector3(0, 0, 1).applyQuaternion(camQ);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camQ), up = new THREE.Vector3(0, 1, 0).applyQuaternion(camQ);
    let x0 = -1 + 2 * safe.left / W, x1 = 1 - 2 * safe.right / W, y0 = -1 + 2 * safe.bottom / H, y1 = 1 - 2 * safe.top / H;
    if (x1 - x0 < 0.4) { x0 = -0.2; x1 = 0.2; } if (y1 - y0 < 0.4) { y0 = -0.2; y1 = 0.2; }
    let d = 30;
    const pos = new THREE.Vector3(0, 0.6, 0).addScaledVector(back, d);
    const v = new THREE.Vector3();
    for (let it = 0; it < 14; it++) {
      cam.position.copy(pos); cam.updateMatrixWorld();
      let bx0 = 9, bx1 = -9, by0 = 9, by1 = -9;
      for (const p of FIT) { v.copy(p).project(cam); bx0 = Math.min(bx0, v.x); bx1 = Math.max(bx1, v.x); by0 = Math.min(by0, v.y); by1 = Math.max(by1, v.y); }
      const s = Math.max((bx1 - bx0) / (x1 - x0), (by1 - by0) / (y1 - y0)) * 1.04;
      const halfH = Math.tan(cam.fov * Math.PI / 360) * d, halfW = halfH * cam.aspect;
      pos.addScaledVector(right, ((bx0 + bx1) / 2 - (x0 + x1) / 2) * halfW);
      pos.addScaledVector(up, ((by0 + by1) / 2 - (y0 + y1) / 2) * halfH);
      const nd = d * Math.pow(s, 0.85);
      pos.addScaledVector(back, nd - d); d = nd;
    }
    goalPos.copy(pos);
  }
  function snapCam() { fitCamera(); cam.position.copy(goalPos); cam.quaternion.copy(camQ); mirror(); }
  const tmpQ = new THREE.Quaternion();
  function mirror() {
    cam.updateMatrixWorld();
    if (!world) return;
    root.updateWorldMatrix(true, false);
    wcam.position.copy(cam.position); root.localToWorld(wcam.position);
    root.getWorldQuaternion(tmpQ); wcam.quaternion.copy(tmpQ).multiply(cam.quaternion);
    wcam.fov = cam.fov; wcam.aspect = cam.aspect; wcam.near = cam.near; wcam.far = cam.far; wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
  }
  let lastW = 0, lastH = 0;

  /* ---------- HUD ---------- */
  function hud() {
    const team = (t) => ({
      name: teamName(t),
      color: t === 0 ? '#ec3013' : '#2f6bff',
      foxes: players.filter((p) => p.team === t).map((p) => ({ name: p.name, alive: p.alive, holding: !!p.holding, human: ctrl(p) >= 0 })),
    });
    const pinfo = (i) => {
      const p = human(i);
      if (!p) return { active: false };
      const charging = p.chargeStart >= 0, power = charging ? meterAt(now - p.chargeStart) : 0;
      return { active: true, name: p.name, holding: !!p.holding, charging, power, perfect: charging && isPerfect(power),
        catchReady: 1 - p.catchCool / FOX.catchCool, dashReady: 1 - p.dashCool / FOX.dashCool, blockMode: !!p.holding, threat: p.threat ? Math.max(0, 1 - p.threat.t / 1.1) : 0,
        now: !!(p.threat && p.threat.t < catchWindowFor(p.threat.b) * 0.85), target: p.target && p.target.alive ? p.target.name : null };
    };
    return {
      key: KEY, game: GAME.name, phase, paused, mode, level, levelName: LEVELS[level].name, levelTitle: LEVELS[level].title,
      round, roundsToWin: ROUNDS_TO_WIN, score: score.slice(), timer: Math.max(0, Math.ceil(timer)), countdown: phase === 'countdown' ? Math.max(0, Math.ceil(cd - 0.2)) : 0,
      teams: [team(0), team(1)], p: [pinfo(0), pinfo(1)],
      msg: msgT > 0 ? msg : '', tip: mode === 'demo' ? DEMO_TIPS[tipI % DEMO_TIPS.length] : '',
      hint: phase === 'play' && mode !== 'demo' && !paused && now - lastInput > 3,
      result, rules: RULES_TEXT, sound: audio.sound, music: audio.music, touch, world: !!world, menuReq,
      best: ls.get('best', 0), meter: { lo: METER.perfectLo, hi: METER.perfectHi },
      levels: LEVELS.map((l) => ({ name: l.name, title: l.title, beaten: !!ls.get('beat' + l.id, false) })),
    };
  }
  let emitT = 0;
  function emit(force) {
    if (!force && !dirty && emitT > 0) return;
    emitT = 0.1; dirty = false;
    try { onState(hud()); } catch (e) { console.error(e); }
  }

  /* ---------- main loop ---------- */
  let raf = 0, last = performance.now(), dead = false, cdLast = 4;
  function frame(t) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    let dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!(dt > 0)) dt = 0.016;
    if (!world) {
      const w = container.clientWidth, h = container.clientHeight;
      if (w !== lastW || h !== lastH) { lastW = w; lastH = h; renderer.setSize(w, h, false); fitCamera(); }
    } else {
      const [w, h] = viewSize();
      if (w !== lastW || h !== lastH) { lastW = w; lastH = h; fitCamera(); }
      cam.aspect = w / h; cam.updateProjectionMatrix();
    }
    if (!paused) update(dt);
    /* camera glide */
    cam.position.lerp(goalPos, 1 - Math.exp(-6 * dt)); cam.quaternion.slerp(camQ, 1 - Math.exp(-6 * dt));
    mirror();
    draw(dt);
    if (!world) renderer.render(root, cam);
    emitT -= dt;
    const charging = human(0)?.chargeStart >= 0 || human(1)?.chargeStart >= 0;
    if (charging && emitT > 0.033) emitT = 0.033;
    if (emitT <= 0 || dirty) emit(true);
  }
  function update(dt) {
    now += dt;
    if (msgT > 0) { msgT -= dt; if (msgT <= 0) dirty = true; }
    if (mode === 'demo') { tipT -= dt; if (tipT <= 0) { tipI++; tipT = 5.5; dirty = true; } }
    if (phase === 'countdown') {
      cd -= dt;
      const c = Math.ceil(cd - 0.2);
      if (c !== cdLast) { cdLast = c; if (c > 0) { audio.sfx.beep(false); say(String(c), 0.9); } else { audio.sfx.beep(true); audio.sfx.whistle(); say('DODGE!', 1); } dirty = true; }
      if (cd <= 0.2) { phase = 'play'; cdLast = 4; lastInput = now; dirty = true; }
    } else if (phase === 'play') {
      timer -= dt;
      if (timer <= 0) { timer = 0; checkRound(); }
    } else if (phase === 'roundEnd') {
      endT -= dt;
      if (endT <= 0) {
        if (score[0] >= ROUNDS_TO_WIN || score[1] >= ROUNDS_TO_WIN) finishMatch();
        else { round++; resetRound(); }
      }
    } else if (phase === 'result' && mode === 'demo') {
      demoRestartT -= dt; if (demoRestartT <= 0) startMatch('demo');
    }
    for (const p of players) stepFox(p, dt);
    const sub = 3;
    for (let i = 0; i < sub; i++) stepBalls(dt / sub);
  }
  function draw(dt) {
    for (const p of players) {
      pose(p, dt);
      p.shadow.position.set(p.x, 0.04, p.z); p.shadow.visible = p.alive || p.knockT > 0;
      p.ring.position.set(p.x, 0.05, p.z); p.ring.visible = p.alive;
      const h = ctrl(p);
      p.pring.visible = h >= 0 && p.alive;
      if (p.pring.visible) {
        p.pring.position.set(p.x, 0.06, p.z);
        const th = p.threat;
        if (th && th.t < catchWindowFor(th.b) * 0.85) { p.pring.material.color.setHex(0xffffff); p.pring.scale.setScalar(1.35 + Math.sin(now * 40) * 0.08); }
        else if (th) { p.pring.material.color.setHex(h === 0 ? YELLOW : CYAN); p.pring.scale.setScalar(1 + (1 - th.t / 1.1) * 0.5); }
        else { p.pring.material.color.setHex(h === 0 ? YELLOW : CYAN); p.pring.scale.setScalar(1); }
      }
      p.marker.visible = false;
    }
    /* target markers above the fox each player aims at */
    for (const i of [0, 1]) {
      const me = human(i); if (!me || phase !== 'play' || !me.holding) continue;
      const t = autoTarget(me); if (!t) continue;
      t.marker.visible = true; t.marker.material = K.toon(i === 0 ? YELLOW : CYAN);
      t.marker.position.set(t.x, 3.4 + Math.sin(now * 6) * 0.15 + (t.look.chair ? 0.3 : 0), t.z); t.marker.rotation.y = now * 3;
    }
    for (const b of balls) {
      b.mesh.position.set(b.x, b.y, b.z);
      const sp = Math.hypot(b.vx, b.vz);
      if (sp > 0.05) { b.mesh.rotation.x += b.vz * dt / BALL.r; b.mesh.rotation.z -= b.vx * dt / BALL.r; }
      b.shadow.position.set(b.x, 0.04, b.z); b.shadow.scale.setScalar(0.45 / (1 + b.y * 0.15));
      const showTrail = b.state === 'live' && b.perfect;
      if (showTrail) { b.hist.unshift([b.x, b.y, b.z]); if (b.hist.length > 9) b.hist.length = 9; } else b.hist.length = 0;
      b.trail.forEach((m, j) => { const h = b.hist[(j + 1) * 2]; m.visible = !!h; if (h) m.position.set(h[0], h[1], h[2]); });
    }
    if (crowd) {
      const m = new THREE.Matrix4(), cheer = phase === 'roundEnd' || phase === 'result';
      crowd.userData.seats.forEach((s, i) => { const j = cheer ? Math.abs(Math.sin(now * 8 + s.p)) * 0.6 : Math.sin(now * 2 + s.p) * 0.05; m.makeTranslation(s.x, s.y + j, s.z); crowd.setMatrixAt(i, m); });
      crowd.instanceMatrix.needsUpdate = true;
    }
  }

  /* ---------- API ---------- */
  const api = {
    hud,
    setSafe(s = {}) { safe = { top: +s.top || 0, bottom: +s.bottom || 0, left: +s.left || 0, right: +s.right || 0 }; fitCamera(); },
    start(m = mode, lv) { touchInput(); startMatch(m, lv); emit(true); },
    restart() { touchInput(); startMatch(mode); emit(true); },
    playAgain() { api.restart(); },
    setLevel(l) { touchInput(); startMatch(mode === 'local' ? 'cpu' : mode, l); emit(true); },
    setMode(m) { api.start(m); },
    setSound(on) { audio.setSound(on); ls.set('sound', !!on); dirty = true; },
    setMusic(on) { audio.setMusic(on); if (!world) ls.set('music', !!on); dirty = true; },
    pause(on = true) { paused = !!on; if (on) { joy[0] = { x: 0, y: 0 }; joy[1] = { x: 0, y: 0 }; } dirty = true; },
    resume() { api.pause(false); },
    key(e) { onKey(e); },
    joy(i, x, y) { const j = joy[i ? 1 : 0]; j.x = clamp(+x || 0, -1, 1); j.y = clamp(+y || 0, -1, 1); if (x || y) touchInput(); },
    throwDown(i = 0) {
      touchInput(); if (phase !== 'play' || paused) return;
      const p = human(i); if (!p || !p.holding || p.chargeStart >= 0) return;
      autoTarget(p); p.chargeStart = now; dirty = true;
    },
    throwUp(i = 0) {
      const p = human(i); if (!p || p.chargeStart < 0) return;
      if (phase !== 'play') { p.chargeStart = -1; return; }
      doThrow(p, meterAt(now - p.chargeStart), autoTarget(p));
    },
    catchBall(i = 0) { touchInput(); if (phase !== 'play' || paused) return; const p = human(i); if (p) { startCatch(p); dirty = true; } },
    dodge(i = 0) {
      touchInput(); if (phase !== 'play' || paused) return;
      const p = human(i); if (!p) return;
      const j = joy[i], k = keyDir(i);
      let dx = j.x + k.x, dz = -(j.y + k.y);
      if (Math.hypot(dx, dz) < 0.2) {
        const th = p.threat;
        if (th) { dx = -th.b.vz; dz = th.b.vx * 0.3; if ((p.x + Math.sign(dx) * 2) > COURT.edgeX || (p.x + Math.sign(dx) * 2) < -COURT.edgeX) dx = -dx; }
        else { dx = p.x > 0 ? -1 : 1; dz = 0; }
      }
      startDash(p, dx, dz);
    },
    cycleTarget(i = 0) {
      touchInput(); const p = human(i); if (!p) return;
      const f = foes(p); if (!f.length) return;
      const k = f.indexOf(p.target); p.target = f[(k + 1) % f.length]; audio.sfx.tap(); dirty = true;
    },
    get camera() { return world ? wcam : cam; },
    snapCam,
    destroy() {
      dead = true; cancelAnimationFrame(raf);
      if (world) { window.removeEventListener('pointerdown', onPointer, true); world.parent.remove(root); }
      else {
        renderer.domElement.removeEventListener('pointerdown', onPointer);
        window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey);
        ro && ro.disconnect();
        renderer.dispose(); renderer.domElement.remove();
      }
      audio.close();
      root.traverse((o) => { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); });
      FX.dispose(); K.dispose();
    },
  };

  let ro = null;
  if (!world && typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => { lastW = -1; }); ro.observe(container); }

  /* first-touch audio unlock */
  const unlock = () => audio.unlock();
  if (!world) renderer.domElement.addEventListener('pointerdown', unlock, { once: true });

  startMatch(mode, level);
  if (!world) { lastW = container.clientWidth; lastH = container.clientHeight; renderer.setSize(lastW || 1, lastH || 1, false); }
  snapCam();
  raf = requestAnimationFrame(frame);
  emit(true);
  return api;
}

export default createDodgeball;
