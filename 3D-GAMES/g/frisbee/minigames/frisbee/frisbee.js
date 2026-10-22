/* FRISBEE - an 8 GATES 3D minigame. 2 v 2 Ultimate on a small field.
   Standalone: makes its own renderer. World mode: opts.world = { renderer, camera, parent }.
   Local coordinates: origin = field centre, y = 0 ground, +z = the player's side. */

import * as THREE from '../../vendor/three/three.module.js';
import * as R from './frisbee-rules.js';
import { createAudio } from './frisbee-audio.js';

export const GAME = { key: 'frisbeeField', name: 'FRISBEE', maxPlayers: 4 };

const KEY = GAME.key;
const INK = 0x1a1626;
const TEAM_COL = [0xec3013, 0x2f6bff];
const TEAM_HEX = ['#ec3013', '#2f6bff'];
const YEL = 0xffd23a;
const PI = Math.PI;

const CAST = {
  you:   { name: 'YOU',   fur: 0xe8742a, outfit: TEAM_COL[0] },
  ziggy: { name: 'ZIGGY', fur: 0xc95a2c, outfit: TEAM_COL[0], legs: 0x4a3328 },
  red:   { name: 'RED',   fur: 0xe8742a, outfit: TEAM_COL[0] },
  pip:   { name: 'PIP',   fur: 0xf4c430, outfit: TEAM_COL[1] },
  hope:  { name: 'HOPE',  fur: 0xe08a4c, outfit: TEAM_COL[1], legs: 0x2a4fd0, glasses: true, cane: true },
  noble: { name: 'NOBLE', fur: 0x8c5a3a, outfit: TEAM_COL[1], eyes: 0xff1a1a, chair: true },
  nix:   { name: 'NIX',   fur: 0xb6b9c6, outfit: TEAM_COL[1] },
  lyra:  { name: 'LYRA',  fur: 0xd9a46e, outfit: TEAM_COL[1], legs: 0x5a3a2a },
  kane:  { name: 'KANE',  fur: 0x5b4a44, outfit: TEAM_COL[1] },
};

const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * PI * v) * 0.6; };
const lerpAngle = (a, b, k) => { let d = ((b - a + PI) % (2 * PI)) - PI; if (d < -PI) d += 2 * PI; return a + d * k; };

export async function createFrisbee({ container, onState = () => {}, opts = {} } = {}) {
  const world = opts.world || null;
  const kit = opts.kit || null;
  const full = !world;
  const touch = (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);

  /* ---------- renderer / scene roots ---------- */
  let renderer = null;
  let scene;            /* the group (world) or scene (standalone) that holds the playable field */
  let envScene;         /* lights, sky, park: the real scene standalone, a throw-away scene in world mode */
  if (world) {
    scene = new THREE.Group(); scene.name = 'frisbeeField';
    world.parent.add(scene);
    envScene = new THREE.Scene();
  } else {
    renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.75 : 2));
    const cv = renderer.domElement;
    cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
    container.appendChild(cv);
    scene = new THREE.Scene();
    envScene = scene;
  }
  const dom = world ? world.renderer.domElement : renderer.domElement;

  /* ---------- materials ---------- */
  const grad = new THREE.DataTexture(new Uint8Array([95, 175, 255]), 3, 1, THREE.RedFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.generateMipmaps = false; grad.needsUpdate = true;
  const mats = new Map();
  const toon = (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshToonMaterial({ color: c, gradientMap: grad })); return mats.get(c); };
  const OUT = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  const geos = new Map();
  const geo = (k, make) => { if (!geos.has(k)) geos.set(k, make()); return geos.get(k); };
  const G = {
    cap: (r, l) => geo('c' + r + '_' + l, () => new THREE.CapsuleGeometry(r, l, 4, 10)),
    sph: (r) => geo('s' + r, () => new THREE.SphereGeometry(r, 16, 12)),
    snout: () => geo('snout', () => new THREE.ConeGeometry(0.2, 0.42, 12).rotateX(PI / 2)),
    ear: () => geo('ear', () => new THREE.ConeGeometry(0.15, 0.38, 4)),
    vest: () => geo('vest', () => new THREE.CylinderGeometry(0.44, 0.47, 0.62, 16)),
    glass: () => geo('glass', () => new THREE.BoxGeometry(0.5, 0.11, 0.08)),
    cane: () => geo('cane', () => new THREE.CylinderGeometry(0.035, 0.035, 1.15, 6)),
    caneTip: () => geo('canet', () => new THREE.CylinderGeometry(0.04, 0.04, 0.18, 6)),
    ring: () => geo('ring', () => new THREE.RingGeometry(0.62, 0.8, 28).rotateX(-PI / 2)),
    ring2: () => geo('ring2', () => new THREE.RingGeometry(0.86, 1.08, 28).rotateX(-PI / 2)),
    blob: () => geo('blob', () => new THREE.CircleGeometry(0.62, 20).rotateX(-PI / 2)),
    box: (x, y, z) => geo('b' + x + y + z, () => new THREE.BoxGeometry(x, y, z)),
  };
  function mesh(g, m, outline = 0) {
    const o = new THREE.Mesh(g, m);
    if (outline) { const s = new THREE.Mesh(g, OUT); s.scale.setScalar(outline); o.add(s); }
    return o;
  }
  const BLOB = new THREE.MeshBasicMaterial({ color: 0x10301a, transparent: true, opacity: 0.32, depthWrite: false });

  /* ---------- fox adapter ---------- */
  function ownFox(c) {
    const g = new THREE.Group(); const P = {};
    const fur = toon(c.fur), belly = toon(0xfff3e2), out = toon(c.outfit), legM = toon(c.legs ?? c.fur), dark = toon(0x2a2230);
    P.legs = [1, -1].map((s) => {
      const hip = new THREE.Group(); hip.position.set(0.2 * s, 1.0, 0);
      const l = mesh(G.cap(0.17, 0.55), legM, 1.14); l.position.y = -0.45; hip.add(l);
      const ft = mesh(G.sph(0.19), dark); ft.scale.set(1, 0.55, 1.5); ft.position.set(0, -0.92, 0.08); hip.add(ft);
      g.add(hip); return hip;
    });
    P.body = new THREE.Group(); P.body.position.y = 1.0; g.add(P.body);
    const torso = mesh(G.cap(0.4, 0.45), fur, 1.07); torso.position.y = 0.5; P.body.add(torso);
    const vest = mesh(G.vest(), out); vest.position.y = 0.52; P.body.add(vest);
    const bel = mesh(G.sph(0.26), belly); bel.scale.set(1, 1.25, 0.55); bel.position.set(0, 0.55, 0.36); P.body.add(bel);
    P.head = new THREE.Group(); P.head.position.y = 1.02; P.body.add(P.head);
    const hd = mesh(G.sph(0.4), fur, 1.07); hd.position.y = 0.36; P.head.add(hd);
    const chk = mesh(G.sph(0.28), belly); chk.scale.set(1.35, 0.75, 0.9); chk.position.set(0, 0.22, 0.2); P.head.add(chk);
    const sn = mesh(G.snout(), belly, 1.1); sn.position.set(0, 0.26, 0.42); P.head.add(sn);
    const nose = mesh(G.sph(0.075), dark); nose.position.set(0, 0.28, 0.65); P.head.add(nose);
    [1, -1].forEach((s) => {
      const e = mesh(G.ear(), fur, 1.12); e.position.set(0.23 * s, 0.74, -0.02); e.rotation.z = -0.32 * s; P.head.add(e);
      const ey = mesh(G.sph(0.068), c.eyes ? new THREE.MeshBasicMaterial({ color: c.eyes }) : dark);
      ey.position.set(0.15 * s, 0.45, 0.33); P.head.add(ey);
    });
    P.arms = [1, -1].map((s) => {
      const sh = new THREE.Group(); sh.position.set(0.5 * s, 0.85, 0);
      const a = mesh(G.cap(0.12, 0.45), fur, 1.15); a.position.y = -0.32; sh.add(a);
      const hand = mesh(G.sph(0.14), dark); hand.position.y = -0.64; sh.add(hand);
      P.body.add(sh); return sh;
    });
    const tail = new THREE.Group(); tail.position.set(0, 0.25, -0.35); tail.rotation.x = -1.05; P.body.add(tail);
    const tm = mesh(G.sph(0.26), fur, 1.08); tm.scale.set(1, 2.1, 1); tm.position.y = 0.5; tail.add(tm);
    const tip = mesh(G.sph(0.2), belly); tip.position.y = 0.98; tail.add(tip);
    P.tail = tail;
    g.userData.P = P;
    addExtras(g, P, c);
    return g;
  }
  function addExtras(g, P, c) {
    if (c.glasses && P.head) {
      const gl = mesh(G.glass(), toon(0x111111)); gl.position.set(0, 0.46, 0.37); P.head.add(gl);
    }
    if (c.cane && P.arms && P.arms[0]) {
      const cg = new THREE.Group(); cg.position.y = -0.64; cg.rotation.x = 0.3;
      const st = mesh(G.cane(), toon(0xffffff), 1.35); st.position.y = -0.5; cg.add(st);
      const tp = mesh(G.caneTip(), toon(0xec3013)); tp.position.y = -1.0; cg.add(tp);
      P.arms[0].add(cg); P.cane = cg;
    }
    if (c.chair) {
      const ch = new THREE.Group();
      const shell = toon(0x2b2d42), glow = new THREE.MeshBasicMaterial({ color: 0x38f0ff });
      const seat = mesh(G.box(1.0, 0.16, 0.9), shell, 1.06); seat.position.y = 0.82; ch.add(seat);
      const back = mesh(G.box(1.0, 1.05, 0.14), shell, 1.05); back.position.set(0, 1.38, -0.46); ch.add(back);
      [1, -1].forEach((s) => { const ar = mesh(G.box(0.12, 0.12, 0.75), shell); ar.position.set(0.52 * s, 1.12, -0.02); ch.add(ar); });
      const stripe = mesh(G.box(1.02, 0.06, 0.16), glow); stripe.position.set(0, 1.7, -0.46); ch.add(stripe);
      const ring = mesh(geo('chairRing', () => new THREE.TorusGeometry(0.46, 0.06, 6, 24).rotateX(PI / 2)), glow); ring.position.y = 0.42; ch.add(ring);
      g.add(ch); P.chair = ch;
    }
  }
  /* SMALL ADAPTER: the world's kit fox when given, else our placeholder with the same joints. */
  function makeFox(c) {
    if (kit && typeof kit.makeFox === 'function') {
      try {
        const f = kit.makeFox({ torso: [c.fur, 0xfff3e2, c.outfit], outfit: 'vest', mood: c.mood || 'happy' });
        if (f && f.userData && f.userData.P) { addExtras(f, f.userData.P, c); f.userData.kitFox = true; return f; }
      } catch (e) { console.warn('[frisbee] kit.makeFox failed, using placeholder', e); }
    }
    return ownFox(c);
  }

  /* ---------- field (the playable object; lives in the group) ---------- */
  function fieldTexture() {
    const S = 32, W = 14 * S, L = 36 * S;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = L;
    const x = cv.getContext('2d');
    for (let i = 0; i < 18; i++) { x.fillStyle = i % 2 ? '#53ad46' : '#5dba4f'; x.fillRect(0, i * 2 * S, W, 2 * S); }
    x.fillStyle = 'rgba(236,48,19,0.22)'; x.fillRect(0, 0, W, 6 * S);
    x.fillStyle = 'rgba(47,107,255,0.22)'; x.fillRect(0, L - 6 * S, W, 6 * S);
    x.strokeStyle = '#ffffff'; x.lineWidth = 5;
    x.strokeRect(3, 3, W - 6, L - 6);
    x.beginPath(); x.moveTo(0, 6 * S); x.lineTo(W, 6 * S); x.moveTo(0, L - 6 * S); x.lineTo(W, L - 6 * S); x.stroke();
    x.lineWidth = 4;
    [12 * S, L - 12 * S].forEach((y) => { x.beginPath(); x.moveTo(W / 2 - 12, y - 12); x.lineTo(W / 2 + 12, y + 12); x.moveTo(W / 2 + 12, y - 12); x.lineTo(W / 2 - 12, y + 12); x.stroke(); });
    x.fillStyle = 'rgba(255,255,255,0.35)'; x.font = '900 120px Archivo, Arial Black, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('FOX', W / 2, 3 * S); x.save(); x.translate(W / 2, L - 3 * S); x.rotate(PI); x.fillText('FOX', 0, 0); x.restore();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }
  const fieldMat = new THREE.MeshToonMaterial({ map: fieldTexture(), gradientMap: grad });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(14, 36).rotateX(-PI / 2), fieldMat);
  field.position.y = 0.012; scene.add(field);
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(17, 39).rotateX(-PI / 2), toon(0x3f8a3a));
  apron.position.y = 0.004; scene.add(apron);
  {
    const cg = new THREE.ConeGeometry(0.24, 0.55, 10);
    const pts = [[7, 12], [-7, 12], [7, -12], [-7, -12], [7, 18], [-7, 18], [7, -18], [-7, -18]];
    const cones = new THREE.InstancedMesh(cg, toon(0xff7a1a), pts.length);
    const outl = new THREE.InstancedMesh(cg, OUT, pts.length);
    const m4 = new THREE.Matrix4();
    pts.forEach(([px, pz], i) => {
      m4.makeTranslation(px, 0.275, pz); cones.setMatrixAt(i, m4);
      m4.makeScale(1.18, 1.1, 1.18).setPosition(px, 0.27, pz); outl.setMatrixAt(i, m4);
    });
    scene.add(cones, outl);
  }

  /* ---------- environment (lights, sky, park): never in the group ---------- */
  function buildEnv(sc) {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x5f8a50, 1.7);
    const sun = new THREE.DirectionalLight(0xffffff, 2.3); sun.position.set(9, 22, 12);
    sc.add(hemi, sun);
    if (sc.isScene) { sc.background = new THREE.Color(0x9fd8ff); sc.fog = new THREE.Fog(0x9fd8ff, 75, 175); }
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 320).rotateX(-PI / 2), toon(0x78c05a));
    ground.position.y = -0.01; sc.add(ground);
    const n = 46, trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.38, 2.2, 7), toon(0x7a4a2a), n);
    const cgeo = new THREE.IcosahedronGeometry(1.7, 0);
    const crowns = new THREE.InstancedMesh(cgeo, toon(0x3f9a45), n), crownO = new THREE.InstancedMesh(cgeo, OUT, n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    let rs = 7;
    const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + rnd() * 0.12, r = 27 + rnd() * 20;
      const x = Math.cos(a) * r * 0.75, z = Math.sin(a) * r;
      const k = 0.8 + rnd() * 0.7;
      m4.compose(p.set(x, 1.1 * k, z), q.identity(), s.set(k, k, k)); trunks.setMatrixAt(i, m4);
      q.setFromAxisAngle(p.set(0, 1, 0), rnd() * 3);
      m4.compose(p.set(x, 3.2 * k, z), q, s.set(k, k * 1.1, k)); crowns.setMatrixAt(i, m4);
      m4.compose(p.set(x, 3.2 * k, z), q, s.set(k * 1.07, k * 1.17, k * 1.07)); crownO.setMatrixAt(i, m4);
    }
    sc.add(trunks, crowns, crownO);
    const bg = new THREE.BoxGeometry(0.8, 0.5, 3.2);
    const benches = new THREE.InstancedMesh(bg, toon(YEL), 8), bo = new THREE.InstancedMesh(bg, OUT, 8);
    let i = 0;
    for (const side of [-1, 1]) for (const z of [-9, -3, 3, 9]) {
      m4.compose(p.set(side * 10.2, 0.25, z), q.identity(), s.set(1, 1, 1)); benches.setMatrixAt(i, m4);
      m4.compose(p.set(side * 10.2, 0.25, z), q, s.set(1.12, 1.15, 1.04)); bo.setMatrixAt(i, m4); i++;
    }
    sc.add(benches, bo);
    const hill = new THREE.SphereGeometry(1, 16, 10);
    [[-60, -80, 30], [50, -95, 38], [90, 10, 30], [-95, 20, 34]].forEach(([x, z, r]) => {
      const h = new THREE.Mesh(hill, toon(0x5fae52)); h.position.set(x, -r * 0.55, z); h.scale.setScalar(r); sc.add(h);
    });
  }
  buildEnv(envScene);

  /* ---------- disc + markers ---------- */
  const discTop = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
    x.fillStyle = '#ec3013'; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = '#ffd23a'; x.lineWidth = 12; x.beginPath(); x.arc(64, 64, 44, 0, PI * 2); x.stroke();
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(64, 64, 14, 0, PI * 2); x.fill();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const disc = new THREE.Group();
  const discM = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 28),
    [toon(0xd8260c), new THREE.MeshToonMaterial({ map: discTop, gradientMap: grad }), toon(0xa81c06)]);
  const discO = new THREE.Mesh(discM.geometry, OUT); discO.scale.set(1.12, 1.6, 1.12); discM.add(discO);
  disc.add(discM); disc.scale.setScalar(1.35); scene.add(disc);
  const discBlob = new THREE.Mesh(G.blob(), BLOB); discBlob.position.y = 0.02; scene.add(discBlob);
  const landMark = new THREE.Mesh(G.ring2(), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
  landMark.position.y = 0.035; landMark.visible = false; scene.add(landMark);
  const reticleMat = new THREE.MeshBasicMaterial({ color: YEL, transparent: true, opacity: 0.95, depthWrite: false });
  const reticle = new THREE.Mesh(G.ring2(), reticleMat); reticle.position.y = 0.04; reticle.visible = false; scene.add(reticle);
  const NDOT = 18;
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: YEL }), NDOT);
  dots.count = 0; dots.frustumCulled = false; scene.add(dots);
  const NTRAIL = 10;
  const trail = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65, depthWrite: false }), NTRAIL);
  trail.count = 0; trail.frustumCulled = false; scene.add(trail);
  const trailPts = [];
  const ctrlRings = [0, 1].map(() => {
    const m = new THREE.Mesh(G.ring2(), new THREE.MeshBasicMaterial({ color: YEL, transparent: true, opacity: 1, depthWrite: false }));
    m.position.y = 0.045; m.visible = false; scene.add(m); return m;
  });

  /* ---------- actors ---------- */
  const actors = [];
  function makeActor(team, idx, castKey) {
    const c = CAST[castKey];
    const m = makeFox(c); scene.add(m);
    if (!m.userData.kitFox) m.scale.setScalar(1.12);
    const ring = new THREE.Mesh(G.ring(), new THREE.MeshBasicMaterial({ color: TEAM_COL[team], transparent: true, opacity: 0.95, depthWrite: false }));
    ring.position.y = 0.03; scene.add(ring);
    const blob = new THREE.Mesh(G.blob(), BLOB); blob.position.y = 0.02; scene.add(blob);
    return {
      team, idx, key: castKey, name: c.name, mesh: m, ring, blob, chair: !!c.chair, kitFox: !!m.userData.kitFox,
      x: 0, z: 0, vx: 0, vz: 0, face: 0, faceGoal: 0, speedNow: 0, walk: Math.random() * 6,
      target: null, home: null, spd: 1, prof: R.PARTNER, holding: false,
      diveT: 0, jumpT: 0, throwT: 0, reachT: 0, celebrate: 0, thinkT: 0,
      seen: { x: 0, z: 0 }, cutT: 0, cutSpot: null, cmd: null, cmdHold: 0, tried: false, chase: 0, role: '',
    };
  }
  function removeActor(a) { scene.remove(a.mesh, a.ring, a.blob); }

  /* ---------- state ---------- */
  const audio = createAudio({ sound: opts.sound !== false, music: world ? false : opts.music !== false });
  const S = {
    mode: 'cpu', level: clampLevel(opts.level ?? 1), firstTo: opts.firstTo || 5, score: [0, 0], off: 0,
    phase: 'ready', phaseT: 0, time: 0, holder: null, thrower: null, receiver: null, picker: null, scorer: null,
    flight: null, ft: 0, dp: {}, spot: null, dropH: 0, stall: 0, lastTick: 0,
    throwType: ['flat', 'flat'], ctrl: [null, null], aim: null, aimKb: false, aimInfo: null,
    flash: '', flashT: 0, caption: '', capT: 0, capSeen: {}, result: null, paused: false, menuReq: 0,
    lastInput: 0, open: false, spin: 0, stats: { blocks: [0, 0], drops: [0, 0], completions: [0, 0] },
  };
  function clampLevel(i) { return Math.max(0, Math.min(2, i | 0)); }
  const L = () => R.LEVELS[S.level];
  const isHuman = (team) => (S.mode === 'cpu' ? team === 0 : S.mode === 'local');
  const teamName = (t) => (S.mode === 'cpu' ? (t === 0 ? 'YOU' : L().name) : S.mode === 'local' ? (t === 0 ? 'RED' : 'BLUE') : (t === 0 ? 'RED' : L().name));
  const poss = (t) => (teamName(t) === 'YOU' ? 'YOUR' : teamName(t) + "'S");
  const picks = (t) => (teamName(t) === 'YOU' ? 'YOU PICK' : teamName(t) + ' PICKS');
  const isCtrl = (a) => isHuman(a.team) && S.ctrl[a.team] === a;

  function buildTeams() {
    while (actors.length) removeActor(actors.pop());
    const lv = L();
    const t0 = S.mode === 'cpu' ? ['you', 'ziggy'] : ['red', 'ziggy'];
    const t1 = [lv.key, lv.partner.toLowerCase()];
    actors.push(makeActor(0, 0, t0[0]), makeActor(0, 1, t0[1]), makeActor(1, 0, t1[0]), makeActor(1, 1, t1[1]));
    if (S.mode === 'local') { actors[0].name = 'RED'; actors[2].name = 'BLUE'; }
    for (const a of actors) {
      if (isHuman(a.team) && a.idx === 0) a.prof = R.HUMAN;
      else if (a.team === 1 && S.mode !== 'local') a.prof = lv;
      else a.prof = R.PARTNER;
      a.spd = a.prof.spd;
      if (a.chair) a.spd *= 1.02;
    }
    S.ctrl = [isHuman(0) ? actors[0] : null, isHuman(1) ? actors[2] : null];
  }

  /* ---------- save ---------- */
  const store = (() => {
    const sv = opts.save;
    const lget = (k, d) => { try { const v = localStorage.getItem(KEY + '.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
    const lset = (k, v) => { try { localStorage.setItem(KEY + '.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } };
    return {
      get: (k, d) => { try { return sv ? sv.stat(KEY + '.' + k, d) : lget(k, d); } catch (e) { return d; } },
      set: (k, v) => { try { if (sv) sv.setStat(KEY + '.' + k, v); else lset(k, v); } catch (e) { /* ignore */ } },
      addGold: (n) => { try { if (sv) sv.addGold(n); else lset('gold', lget('gold', 0) + n); } catch (e) { /* ignore */ } },
    };
  })();

  /* ---------- game flow ---------- */
  function place(a, x, z) {
    a.x = x; a.z = z; a.vx = a.vz = 0; a.seen.x = x; a.seen.z = z; a.target = null; a.home = { x, z };
    a.face = a.faceGoal = Math.atan2(0, R.dirOf(a.team)); a.cutSpot = null; a.cutT = 0.4 + Math.random() * 0.4;
    a.cmd = null; a.diveT = a.jumpT = a.throwT = a.reachT = a.celebrate = 0; a.holding = false; a.tried = false;
  }
  function setupPoint(offTeam) {
    S.off = offTeam;
    const s = -R.dirOf(offTeam);
    const O = actors.filter((a) => a.team === offTeam), D = actors.filter((a) => a.team !== offTeam);
    place(O[0], 0, s * 11); place(O[1], 2.6, s * 5);
    place(D[0], 0, s * 9.6); place(D[1], 2.6, s * 3.6);
    O[0].holding = true; S.holder = O[0];
    S.flight = null; S.thrower = S.receiver = S.picker = S.scorer = null; S.aim = null; S.aimKb = false;
    S.stall = 0; S.lastTick = 0;
    S.phase = 'ready'; S.phaseT = 0;
    assignRoles(S.holder);
    if (S.score[0] + S.score[1] === 0) say('start', 'DEMO: two fox teams. Catch the disc inside the far end zone to score.');
    emit(true);
  }
  function newGame() {
    S.score = [0, 0]; S.result = null; S.paused = false;
    S.stats = { blocks: [0, 0], drops: [0, 0], completions: [0, 0] };
    buildTeams();
    setupPoint(S.mode === 'demo' ? (Math.random() < 0.5 ? 0 : 1) : 0);
  }
  function assignRoles(hp) {
    const off = S.off;
    const D = actors.filter((a) => a.team !== off);
    if (!hp) return;
    const d0 = R.dist(D[0], hp), d1 = R.dist(D[1], hp);
    const mark = d0 <= d1 ? D[0] : D[1], guard = mark === D[0] ? D[1] : D[0];
    mark.role = 'mark'; guard.role = 'guard';
    for (const a of actors) if (a.team === off) a.role = 'off';
  }
  const mates = (a) => actors.filter((b) => b.team === a.team && b !== a);
  const foes = (team) => actors.filter((b) => b.team !== team);
  function cutterOf(team) { return actors.find((a) => a.team === team && !a.holding && a !== S.picker) || actors.find((a) => a.team === team); }

  function throwDisc(H, to, type, side, err, receiver) {
    const d = R.dist(H, to), e = err * d;
    const tgt = { x: to.x + gauss() * e, z: to.z + gauss() * e };
    const f = R.makeFlight(H, tgt, type, side);
    S.flight = f; S.ft = 0; S.thrower = H; S.phase = 'flight'; S.phaseT = 0;
    H.holding = false; H.throwT = 0.4; H.faceGoal = Math.atan2(tgt.x - H.x, tgt.z - H.z);
    S.receiver = receiver || mates(H).sort((a, b) => R.dist(a, tgt) - R.dist(b, tgt))[0];
    for (const a of actors) { a.tried = false; a.chase = 0; }
    S.aim = null; S.aimKb = false; S.holder = null; trailPts.length = 0;
    audio.play('throw', { type });
    if (type === 'flat') say('flat', 'FLAT is fast and straight. A mark standing in the lane can block it.');
    else if (type === 'curve') say('curve', 'CURVE bends around the mark. Good when the straight lane is covered.');
    else say('lob', 'LOB floats over defenders, but it is slow, so they have time to run.');
    emit(true);
  }
  function turnover(spot, why, byTeam) {
    const nt = byTeam;
    S.off = nt; S.phase = 'loose'; S.phaseT = 0; S.holder = null; S.flight = null;
    S.spot = R.pickupSpot(nt, spot.x, spot.z);
    S.picker = actors.filter((a) => a.team === nt).sort((a, b) => R.dist(a, S.spot) - R.dist(b, S.spot))[0];
    for (const a of actors) { a.holding = false; a.cmd = null; a.cutSpot = null; }
    assignRoles(S.spot);
    const msg = { block: 'BLOCKED!', drop: 'NO CATCH: TURNOVER', stall: 'STALL 8: TURNOVER', out: 'OUT OF BOUNDS' }[why] || 'TURNOVER';
    flash(msg);
    if (why === 'stall') say('stall', 'Stall 8! Holding the disc too long gives it to the other team.');
    else say('turn', 'Dropped or blocked: the other team takes the disc where it stopped.');
    if (why !== 'block') audio.play('turn');
    emit(true);
  }
  function onCatch(a, p) {
    a.holding = true; a.vx *= 0.3; a.vz *= 0.3; a.target = null; a.cmd = null;
    if (p.h > 2.2) a.jumpT = 0.5; a.reachT = 0.3;
    if (!R.inBounds(a.x, a.z)) { a.holding = false; turnover({ x: a.x, z: a.z }, 'out', 1 - a.team); return; }
    S.stats.completions[a.team]++;
    if (R.inScoringZone(a.team, a.z)) { scorePoint(a); return; }
    S.holder = a; S.flight = null; S.phase = 'play'; S.phaseT = 0; S.stall = 0; S.lastTick = 0;
    assignRoles(a); audio.play('catch'); flash(a.name + ' CATCHES');
    say('hold', 'The holder cannot run. Throw before the stall count reaches 8.');
    emit(true);
  }
  function onBlock(a, p) {
    S.stats.blocks[a.team]++; a.reachT = 0.35; a.celebrate = 0.8;
    audio.play('block');
    S.dropH = p.h;
    turnover({ x: p.x, z: p.z }, 'block', a.team);
  }
  function onDrop(p) {
    S.stats.drops[S.thrower.team]++;
    audio.play('land'); S.dropH = 0.08;
    turnover({ x: p.x, z: p.z }, 'drop', 1 - S.thrower.team);
  }
  function scorePoint(a) {
    S.score[a.team]++; S.scorer = a; S.phase = 'point'; S.phaseT = 0; S.holder = null; S.flight = null;
    for (const b of actors) if (b.team === a.team) b.celebrate = 2.0;
    const good = S.mode !== 'cpu' || a.team === 0;
    audio.play(good ? 'score' : 'against');
    flash('POINT: ' + teamName(a.team) + '!');
    say('point', 'Score! Next point, the team that was scored on starts with the disc.');
    emit(true);
  }
  function afterPoint() {
    const w = S.scorer.team;
    if (S.score[w] >= S.firstTo) gameOver(w);
    else setupPoint(1 - w);
  }
  function gameOver(w) {
    S.phase = 'over'; S.phaseT = 0; S.aim = null;
    const my = S.score[0], their = S.score[1];
    const r = { winner: w, title: teamName(w) + (S.mode === 'cpu' && w === 0 ? ' WIN' : ' WINS'), score: S.score[0] + ' - ' + S.score[1], gold: 0, xp: 0, stars: 0, best: '', win: false, demo: S.mode === 'demo', mode: S.mode, level: L().name };
    if (S.mode === 'cpu') {
      const lv = L(), k = lv.key;
      if (w === 0) {
        const m = my - their;
        r.win = true; r.gold = lv.gold + m * 2; r.xp = lv.xp + m * 5; r.stars = R.starsFor(my, their);
        store.addGold(r.gold); store.set('xp', (store.get('xp', 0) || 0) + r.xp);
        store.set('wins.' + k, (store.get('wins.' + k, 0) || 0) + 1);
        if (r.stars > (store.get('stars.' + k, 0) || 0)) store.set('stars.' + k, r.stars);
        const best = store.get('best.' + k, 0) || 0;
        if (m > best) { store.set('best.' + k, m); r.newBest = true; }
        r.best = '+' + Math.max(m, best) + ' VS ' + lv.name;
        audio.play('win');
      } else {
        const best = store.get('best.' + k, 0) || 0;
        r.best = best ? '+' + best + ' VS ' + lv.name : 'NONE YET';
        audio.play('lose');
      }
    } else { audio.play('win'); r.best = '-'; }
    S.result = r;
    emit(true);
  }

  /* ---------- per-phase update ---------- */
  function update(dt) {
    S.time += dt;
    if (S.flashT > 0) S.flashT -= dt;
    if (S.capT > 0) { S.capT -= dt; if (S.capT <= 0) S.caption = ''; }
    if (S.paused) { poseAll(dt * 0.0001); return; }
    S.phaseT += dt;
    switch (S.phase) {
      case 'ready': if (S.phaseT > 1.1) { S.phase = 'play'; S.phaseT = 0; S.stall = 0; S.lastTick = 0; audio.play('whistle'); emit(true); } break;
      case 'play': updatePlay(dt); break;
      case 'flight': updateFlight(dt); break;
      case 'loose': updateLoose(); break;
      case 'point': if (S.phaseT > 2.3) afterPoint(); break;
      case 'over': if (S.mode === 'demo' && S.phaseT > 4.5) newGame(); break;
    }
    steerAll(dt);
    for (const a of actors) moveActor(a, dt);
    separate();
    updateDisc(dt);
    updateAimVisual();
    poseAll(dt);
    updateRings();
  }
  function updatePlay(dt) {
    const H = S.holder; if (!H) return;
    S.stall += dt;
    const c = Math.floor(S.stall);
    if (c > S.lastTick) { S.lastTick = c; if (c < R.STALL) audio.play('tick', { hot: c >= 5 }); emit(true); }
    if (S.stall >= R.STALL) { H.holding = false; turnover({ x: H.x, z: H.z }, 'stall', 1 - H.team); return; }
    if (!isHuman(H.team)) holderAI(H, dt);
    const cut = cutterOf(H.team);
    const g = foes(H.team).find((d) => d.role === 'guard');
    const was = S.open;
    S.open = !!(cut && g && R.dist(cut, g) > 2.6 && R.dist(cut, H) > 3.5);
    if (S.open !== was && isHuman(H.team)) emit(true);
  }
  function holderAI(H, dt) {
    H.thinkT -= dt;
    if (H.thinkT > 0 || S.stall < 0.7) return;
    H.thinkT = H.prof.think * (0.6 + Math.random() * 0.5);
    const defs = foes(H.team);
    const defP = { react: isHuman(1 - H.team) ? 0.3 : (defs[0].prof.react || 0.3) };
    const options = mates(H).map((m) => ({ a: m, spots: [m.cutSpot || { x: m.x, z: m.z }, { x: m.x + m.vx * 0.9, z: m.z + m.vz * 0.9 }, { x: m.x, z: m.z }] }));
    const best = R.chooseThrow(H, options, defs, { ...defP, risk: H.prof.risk }, S.stall);
    if (best) throwDisc(H, best.to, best.type, best.side, H.prof.err, best.receiver);
  }
  function updateFlight(dt) {
    const f = S.flight; if (!f) return;
    S.ft += dt;
    const p = R.flightPos(f, S.ft, S.dp);
    if (p.u >= R.RELEASE && p.h < R.CATCH_H) {
      let best = null, bd = 1e9;
      for (const a of actors) {
        if (a === S.thrower) continue;
        const isDef = a.team !== S.thrower.team;
        if (isDef && a.tried) continue;
        const reach = a.diveT > 0 ? R.DIVE_REACH : isDef ? R.BLOCK_REACH : R.REACH;
        const d = Math.hypot(a.x - p.x, a.z - p.z);
        if (d < reach && d < bd) { bd = d; best = a; }
      }
      if (best) {
        if (best.team !== S.thrower.team) {
          best.tried = true; best.reachT = 0.3;
          const pr = isCtrl(best) ? 1 : best.prof.block;
          if (Math.random() < pr) { onBlock(best, p); return; }
        } else { onCatch(best, p); return; }
      }
    }
    if (p.landed) onDrop(p);
  }
  function updateLoose() {
    const a = S.picker; if (!a) return;
    if (R.dist(a, S.spot) < 0.6 && S.dropH < 0.35) {
      a.holding = true; S.holder = a; S.picker = null; S.phase = 'play'; S.phaseT = 0; S.stall = 0; S.lastTick = 0;
      assignRoles(a); emit(true);
    }
  }

  /* ---------- steering ---------- */
  function steerAll(dt) {
    const ph = S.phase;
    const hp = S.holder || (ph === 'loose' ? S.spot : null);
    for (const a of actors) {
      if (ph === 'ready' || ph === 'point' || ph === 'over') { a.target = ph === 'ready' ? a.home : null; continue; }
      if (a.holding && ph === 'play') {
        a.target = null;
        const look = S.aim || (cutterOf(a.team) || a);
        if (look !== a) a.faceGoal = Math.atan2(look.x - a.x, look.z - a.z);
        continue;
      }
      const offense = a.team === S.off;
      if (ph === 'flight') {
        if (offense) { if (a === S.receiver) a.target = { x: S.flight.x1, z: S.flight.z1 }; }
        else chaseDisc(a, dt);
      } else if (ph === 'loose' && offense && a === S.picker) {
        a.target = S.spot;
      } else if (offense) {
        cutterAI(a, hp, dt);
      } else {
        defendAI(a, hp, dt);
      }
      if (!offense && isCtrl(a) && a.cmd) {
        a.target = a.cmd;
        if (R.dist(a, a.cmd) < 0.45) { a.cmdHold -= dt; if (a.cmdHold <= 0) a.cmd = null; }
      }
    }
  }
  function cutterAI(a, hp, dt) {
    if (!hp) return;
    a.cutT -= dt;
    const guard = foes(a.team).find((d) => d.role === 'guard') || null;
    if (!a.cutSpot || a.cutT <= 0 || R.dist(a, a.cutSpot) < 0.6) {
      a.cutSpot = R.chooseCut(a.team, hp, a, guard);
      a.cutT = 0.9 + Math.random() * 0.9;
    }
    a.target = a.cutSpot;
  }
  function defendAI(d, hp, dt) {
    if (!hp) return;
    const off = S.off;
    const cut = actors.find((a) => a.team === off && a !== S.holder && a !== S.picker) || actors.find((a) => a.team === off);
    const react = Math.max(0.05, isCtrl(d) ? 0.35 : d.prof.react || 0.3);
    const k = 1 - Math.exp(-dt / react);
    d.seen.x += (cut.x - d.seen.x) * k; d.seen.z += (cut.z - d.seen.z) * k;
    if (d.role === 'mark') d.target = R.markSpot(off, hp, cut);
    else d.target = R.guardSpot(off, d.seen);
  }
  const _q = {};
  function chaseDisc(a, dt) {
    a.chase += dt;
    const react = isCtrl(a) ? 0.35 : a.prof.react || 0.3;
    if (a.chase < react) return;
    const f = S.flight; let best = null, bs = 1e9;
    for (let i = 0; i <= 14; i++) {
      const t = S.ft + (Math.max(0.05, f.T - S.ft) * i) / 14;
      R.flightPos(f, t, _q);
      if (_q.h > R.CATCH_H) continue;
      const need = Math.hypot(a.x - _q.x, a.z - _q.z) / (R.RUN * a.spd);
      const late = Math.max(0, need - (t - S.ft));
      if (late < bs - 0.01) { bs = late; best = { x: _q.x, z: _q.z }; }
    }
    if (best) a.target = best;
    if (!isCtrl(a) && bs < 0.12 && a.diveT <= 0 && Math.random() < 0.04 && R.dist(a, best) < 2.4) a.diveT = R.DIVE_TIME;
  }
  function moveActor(a, dt) {
    let dvx = 0, dvz = 0;
    const frozen = a.holding && (S.phase === 'play' || S.phase === 'ready' || S.phase === 'point');
    const maxS = frozen ? 0 : a.diveT > 0 ? R.DIVE : R.RUN * a.spd;
    if (a.target && !frozen) {
      const dx = a.target.x - a.x, dz = a.target.z - a.z, d = Math.hypot(dx, dz);
      if (d > 0.05) { const s = Math.min(maxS, d * 3.2); dvx = (dx / d) * s; dvz = (dz / d) * s; }
    }
    const k = Math.min(1, dt * (a.diveT > 0 ? 14 : frozen ? 12 : 8.5));
    a.vx += (dvx - a.vx) * k; a.vz += (dvz - a.vz) * k;
    a.x = R.clamp(a.x + a.vx * dt, -R.HALF_W - 2.5, R.HALF_W + 2.5);
    a.z = R.clamp(a.z + a.vz * dt, -R.HALF_L - 2.5, R.HALF_L + 2.5);
    a.diveT = Math.max(0, a.diveT - dt); a.jumpT = Math.max(0, a.jumpT - dt);
    a.throwT = Math.max(0, a.throwT - dt); a.reachT = Math.max(0, a.reachT - dt); a.celebrate = Math.max(0, a.celebrate - dt);
    a.speedNow = Math.hypot(a.vx, a.vz);
    if (a.speedNow > 0.5 && !a.holding) a.faceGoal = Math.atan2(a.vx, a.vz);
    a.face = lerpAngle(a.face, a.faceGoal, 1 - Math.exp(-dt * 10));
  }
  function separate() {
    for (let i = 0; i < actors.length; i++) for (let j = i + 1; j < actors.length; j++) {
      const a = actors[i], b = actors[j];
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d < 0.85 && d > 0.0001) {
        const push = (0.85 - d), nx = dx / d, nz = dz / d;
        const fa = a.holding ? 0 : b.holding ? 1 : 0.5;
        a.x -= nx * push * fa; a.z -= nz * push * fa;
        b.x += nx * push * (1 - fa); b.z += nz * push * (1 - fa);
      }
    }
  }

  /* ---------- visuals ---------- */
  const _v = new THREE.Vector3();
  function handPos(a, out) {
    const throwing = a.throwT > 0;
    const lx = -0.6, ly = throwing ? 1.5 : 1.2, lz = throwing ? 0.6 : 0.35;
    const c = Math.cos(a.face), s = Math.sin(a.face);
    out.x = a.x + lx * c + lz * s; out.z = a.z - lx * s + lz * c; out.h = ly + jumpY(a);
    return out;
  }
  const jumpY = (a) => (a.jumpT > 0 ? Math.sin((1 - a.jumpT / 0.5) * PI) * 0.9 : 0) + (a.chair ? 0.14 + Math.sin(S.time * 2.2 + a.idx) * 0.05 : 0);
  const _h = {};
  function updateDisc(dt) {
    let x, z, h, tilt = 0;
    if (S.phase === 'flight' && S.flight) {
      const p = R.flightPos(S.flight, S.ft, S.dp); x = p.x; z = p.z; h = p.h; S.spin += dt * 26;
      tilt = S.flight.side * 0.35 * Math.max(0, 1 - p.u);
      trailPts.unshift({ x, z, h }); if (trailPts.length > NTRAIL * 2) trailPts.length = NTRAIL * 2;
    } else if (S.phase === 'loose' && S.spot) {
      S.dropH = Math.max(0.06, S.dropH - dt * 6);
      x = S.spot.x; z = S.spot.z; h = S.dropH; S.spin += dt * 2;
      trailPts.length = 0;
    } else {
      const a = S.holder || (S.phase === 'point' ? S.scorer : null) || actors[0];
      handPos(a, _h); x = _h.x; z = _h.z; h = _h.h; S.spin += dt * 1.5;
      trailPts.length = 0;
    }
    disc.position.set(x, h, z);
    disc.rotation.set(tilt, S.spin, 0);
    discBlob.position.set(x, 0.022, z);
    const sh = Math.max(0.35, 1 - h / 7); discBlob.scale.setScalar(sh);
    let n = 0;
    for (let i = 2; i < trailPts.length && n < NTRAIL; i += 2, n++) {
      const t = trailPts[i], k = 1 - n / NTRAIL;
      _m4.makeScale(k, k, k).setPosition(t.x, t.h, t.z); trail.setMatrixAt(n, _m4);
    }
    trail.count = n; trail.instanceMatrix.needsUpdate = true;
    if (S.phase === 'flight' && S.flight) {
      landMark.visible = true; landMark.position.set(S.flight.x1, 0.035, S.flight.z1);
      const pulse = 1 + Math.sin(S.time * 10) * 0.08; landMark.scale.setScalar(pulse);
    } else landMark.visible = false;
  }
  const _m4 = new THREE.Matrix4();
  const _ap = {};
  function updateAimVisual() {
    const H = S.holder;
    if (!S.aim || S.phase !== 'play' || !H) { reticle.visible = false; dots.count = 0; S.aimInfo = null; return; }
    const type = S.throwType[H.team];
    const defs = foes(H.team);
    const side = type === 'curve' ? R.bestSide(H, S.aim, defs) : 0;
    const mate = mates(H).sort((a, b) => R.dist(a, S.aim) - R.dist(b, S.aim))[0];
    const ev = R.evaluateThrow(H, S.aim, type, side, mate, defs, { react: 0.3 });
    const tooClose = R.dist(H, S.aim) < 2;
    const good = ev.catchable && ev.risk < 0.5 && !tooClose;
    reticleMat.color.setHex(good ? YEL : tooClose ? 0xffffff : 0xec3013);
    reticle.visible = true; reticle.position.set(S.aim.x, 0.04, S.aim.z);
    const f = ev.f;
    for (let i = 0; i < NDOT; i++) {
      R.flightPos(f, (f.T * (i + 1)) / (NDOT + 1), _ap);
      _m4.makeTranslation(_ap.x, _ap.h, _ap.z); dots.setMatrixAt(i, _m4);
    }
    dots.count = tooClose ? 0 : NDOT; dots.instanceMatrix.needsUpdate = true;
    const info = tooClose ? 'DRAG FURTHER OUT' : !R.inBounds(S.aim.x, S.aim.z) ? 'OUT OF BOUNDS' : !ev.catchable ? 'TOO FAR FOR ' + mate.name : ev.risk >= 0.5 ? 'RISKY: DEFENDER IN THE WAY' : 'GOOD THROW';
    if (info !== S.aimInfo) { S.aimInfo = info; emit(true); }
  }
  function updateRings() {
    for (const a of actors) {
      a.mesh.position.set(a.x, jumpY(a), a.z);
      a.mesh.rotation.y = a.face;
      a.ring.position.set(a.x, 0.03, a.z);
      a.blob.position.set(a.x, 0.02, a.z);
      const op = a === S.receiver && S.phase === 'flight' ? 0.6 + Math.sin(S.time * 14) * 0.4 : 0.95;
      a.ring.material.opacity = op;
    }
    for (let t = 0; t < 2; t++) {
      const r = ctrlRings[t], a = S.ctrl[t];
      const show = a && isHuman(t) && S.mode !== 'demo' && S.phase !== 'over' && !(a.holding && S.phase === 'play');
      r.visible = !!show;
      if (show) { r.position.set(a.x, 0.045, a.z); r.scale.setScalar(1 + Math.sin(S.time * 5) * 0.06); }
    }
  }
  function poseAll(dt) { for (const a of actors) poseActor(a, dt); }
  function poseActor(a, dt) {
    const f = a.mesh, P = f.userData.P; if (!P) return;
    const sp = a.speedNow;
    a.walk += dt * (2 + sp * 1.9);
    if (a.kitFox && kit && typeof kit.animFox === 'function') {
      try { kit.animFox(f, dt, a.chair ? 0 : sp); } catch (e) { /* kit anim failed: keep pose */ }
    } else {
      const k = Math.min(1, sp / 5);
      const sw = Math.sin(a.walk) * 0.85 * k;
      if (a.chair) { P.legs[0].rotation.x = P.legs[1].rotation.x = -1.45; }
      else { P.legs[0].rotation.x = sw; P.legs[1].rotation.x = -sw; }
      P.arms[0].rotation.set(-sw * 0.8, 0, 0.12);
      P.arms[1].rotation.set(sw * 0.8, 0, -0.12);
      P.body.position.y = 1.0 + (a.chair ? 0 : Math.abs(Math.sin(a.walk)) * 0.07 * k);
      P.body.rotation.set(k * 0.16, 0, 0);
      P.head.rotation.set(-k * 0.1, Math.sin(S.time * 0.9 + a.idx * 2) * 0.12 * (1 - k), 0);
      if (P.tail) P.tail.rotation.z = Math.sin(S.time * 3 + a.idx) * 0.25;
    }
    if (P.chair) P.chair.children.forEach((c) => { if (c.geometry && c.geometry.type === 'TorusGeometry') c.rotation.y += dt * 3; });
    const R1 = P.arms[1], R0 = P.arms[0];
    if (a.holding && (S.phase === 'play' || S.phase === 'ready')) {
      const cocked = S.aim && a === S.holder;
      R1.rotation.set(cocked ? -0.4 : -0.7, 0, cocked ? -1.2 : -0.5);
    }
    if (a.throwT > 0) { const u = 1 - a.throwT / 0.4; R1.rotation.set(-1.5, 0, -1.3 + u * 2.4); }
    if (a.diveT > 0) { P.body.rotation.x = 0.85; R0.rotation.set(-2.6, 0, 0); R1.rotation.set(-2.6, 0, 0); }
    if (a.reachT > 0) { R1.rotation.set(-2.9, 0, -0.2); if (!P.cane) R0.rotation.set(-2.9, 0, 0.2); }
    if (a.celebrate > 0) { const w = Math.sin(S.time * 12) * 0.3; R1.rotation.set(-2.8, 0, -0.3 + w); if (!P.cane) R0.rotation.set(-2.8, 0, 0.3 - w); }
  }

  /* ---------- camera ---------- */
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 420);
  const wcam = new THREE.PerspectiveCamera(55, 1, 0.1, 420);
  const tmpCam = new THREE.PerspectiveCamera(55, 1, 0.1, 420);
  const goal = { pos: new THREE.Vector3(0, 30, 30), quat: new THREE.Quaternion(), ok: false };
  let safe = { top: 0, bottom: 0, left: 0, right: 0 };
  let sizeKey = '';
  const FIT_PTS = [];
  for (const x of [-7.6, 7.6]) for (const z of [-18.6, 18.6]) FIT_PTS.push(new THREE.Vector3(x, 0, z));
  for (const x of [-7, 7]) for (const z of [-18, 18]) FIT_PTS.push(new THREE.Vector3(x, 1.2, z));
  function size() {
    const el = world ? world.renderer.domElement : container;
    return { w: Math.max(1, el.clientWidth || 1), h: Math.max(1, el.clientHeight || 1) };
  }
  const _off = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _pp = new THREE.Vector3();
  function proj(C, d) {
    tmpCam.position.copy(C).addScaledVector(_off, d); tmpCam.lookAt(C); tmpCam.updateMatrixWorld();
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9, ok = true;
    for (const p of FIT_PTS) {
      _pp.copy(p).project(tmpCam);
      if (_pp.z > 1 || _pp.z < -1) ok = false;
      x0 = Math.min(x0, _pp.x); x1 = Math.max(x1, _pp.x); y0 = Math.min(y0, _pp.y); y1 = Math.max(y1, _pp.y);
    }
    return { w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, ok };
  }
  function computeGoal() {
    const { w, h } = size();
    const aspect = w / h, portrait = aspect < 1;
    const fov = world ? (world.camera && world.camera.fov) || 50 : portrait ? 60 : 46;
    const yaw = portrait ? 0 : PI / 2, pitch = portrait ? 0.96 : 0.9;
    for (const c of [tmpCam, camera]) { c.fov = fov; c.aspect = aspect; c.updateProjectionMatrix(); }
    _off.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const l = R.clamp(safe.left || 0, 0, w * 0.4), r = w - R.clamp(safe.right || 0, 0, w * 0.4);
    const t = R.clamp(safe.top || 0, 0, h * 0.45), b = h - R.clamp(safe.bottom || 0, 0, h * 0.45);
    const fx0 = (l / w) * 2 - 1, fx1 = (r / w) * 2 - 1, fy0 = 1 - (b / h) * 2, fy1 = 1 - (t / h) * 2;
    const fw = (fx1 - fx0) * 0.94, fh = (fy1 - fy0) * 0.94, fcx = (fx0 + fx1) / 2, fcy = (fy0 + fy1) / 2;
    const C = new THREE.Vector3(0, 0, 0);
    let d = 40;
    for (let it = 0; it < 5; it++) {
      let lo = 3, hi = 300;
      for (let k = 0; k < 22; k++) { const mid = (lo + hi) / 2; const bb = proj(C, mid); if (bb.ok && bb.w <= fw && bb.h <= fh) hi = mid; else lo = mid; }
      d = hi;
      const bb = proj(C, d);
      const halfH = d * Math.tan((fov * PI) / 360), halfW = halfH * aspect;
      _r.set(1, 0, 0).applyQuaternion(tmpCam.quaternion); _u.set(0, 1, 0).applyQuaternion(tmpCam.quaternion);
      C.addScaledVector(_r, (bb.cx - fcx) * halfW).addScaledVector(_u, (bb.cy - fcy) * halfH);
    }
    goal.pos.copy(C).addScaledVector(_off, d);
    tmpCam.position.copy(goal.pos); tmpCam.lookAt(C); goal.quat.copy(tmpCam.quaternion);
    if (!goal.ok) { goal.ok = true; camera.position.copy(goal.pos); camera.quaternion.copy(goal.quat); }
  }
  function checkSize() {
    const { w, h } = size();
    const k = w + 'x' + h + ':' + safe.top + ',' + safe.bottom + ',' + safe.left + ',' + safe.right + (world ? ':' + world.camera.fov : '');
    if (k !== sizeKey) {
      sizeKey = k;
      if (renderer) renderer.setSize(w, h, false);
      computeGoal();
    }
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const _wq = new THREE.Quaternion();
  function mirror() {
    camera.updateMatrixWorld();
    if (!world) return;
    scene.updateWorldMatrix(true, false);
    wcam.position.copy(camera.position); scene.localToWorld(wcam.position);
    scene.getWorldQuaternion(_wq); wcam.quaternion.copy(_wq).multiply(camera.quaternion);
    wcam.fov = camera.fov; wcam.aspect = camera.aspect; wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
  }
  function camGlide(dt) {
    const k = 1 - Math.exp(-dt * 4);
    camera.position.lerp(goal.pos, k);
    camera.quaternion.slerp(goal.quat, k);
  }
  function screenOf(x, y, z) {
    const { w, h } = size();
    _v.set(x, y, z).project(camera);
    return { x: Math.round(((_v.x + 1) / 2) * w), y: Math.round(((1 - _v.y) / 2) * h) };
  }

  /* ---------- input ---------- */
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
  function groundAt(e) {
    const rc = dom.getBoundingClientRect();
    ndc.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    camera.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
  }
  const input = () => { S.lastInput = S.time; };
  function humanDefTeam() {
    if (!(S.phase === 'play' || S.phase === 'flight' || S.phase === 'loose' || S.phase === 'ready')) return -1;
    const t = 1 - S.off; return isHuman(t) ? t : -1;
  }
  function command(team, g, allowDive) {
    const a = S.ctrl[team]; if (!a || a.holding) return;
    a.cmd = { x: R.clamp(g.x, -R.HALF_W - 2, R.HALF_W + 2), z: R.clamp(g.z, -R.HALF_L - 2, R.HALF_L + 2) };
    a.cmdHold = 1.4;
    if (allowDive && S.phase === 'flight' && a.diveT <= 0 && R.dist(a, g) < 6.5) { a.diveT = R.DIVE_TIME; audio.play('dive'); }
  }
  let ptr = null;
  function onDown(e) {
    if (world) { if (e.target !== dom) return; e.preventDefault(); e.stopImmediatePropagation(); }
    else e.preventDefault();
    if (e.button != null && e.button > 0) return;
    audio.unlock(); input();
    if (S.paused || S.phase === 'over') return;
    const g = groundAt(e); if (!g) return;
    const H = S.holder;
    if (S.phase === 'play' && H && isHuman(H.team)) {
      const near = R.dist(H, g) < 3.4;
      if (!isHuman(1 - H.team) || near) {
        ptr = { id: e.pointerId, kind: 'aim' };
        S.aim = { x: g.x, z: g.z }; S.aimKb = false;
        try { dom.setPointerCapture && dom.setPointerCapture(e.pointerId); } catch (er) { /* fine */ }
        return;
      }
    }
    const t = humanDefTeam();
    if (t >= 0) { command(t, g, true); ptr = { id: e.pointerId, kind: 'move', team: t }; }
  }
  function onMove(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    if (world) { e.preventDefault(); e.stopImmediatePropagation(); }
    input();
    const g = groundAt(e); if (!g) return;
    if (ptr.kind === 'aim' && S.aim) { S.aim.x = g.x; S.aim.z = g.z; }
    else if (ptr.kind === 'move') command(ptr.team, g, false);
  }
  function onUp(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    if (world) { e.preventDefault(); e.stopImmediatePropagation(); }
    const k = ptr.kind; ptr = null;
    if (k === 'aim') releaseAim();
  }
  function releaseAim() {
    const H = S.holder;
    if (S.phase === 'play' && H && S.aim && isHuman(H.team) && R.dist(H, S.aim) >= 2) {
      const type = S.throwType[H.team];
      const side = type === 'curve' ? R.bestSide(H, S.aim, foes(H.team)) : 0;
      throwDisc(H, { x: S.aim.x, z: S.aim.z }, type, side, R.HUMAN.err, null);
    }
    S.aim = null; S.aimKb = false; emit(true);
  }
  function viewDirs() {
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); f.y = 0; f.normalize();
    const r = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion); r.y = 0; r.normalize();
    return { f, r };
  }
  function handleKey(e) {
    if (!e || !e.key) return;
    const k = e.key;
    audio.unlock(); input();
    if (k === 'Escape') { S.menuReq++; emit(true); return; }
    if (S.paused || S.phase === 'over') return;
    if (k === '1' || k === '2' || k === '3') { api.setThrow(R.THROW_KEYS[+k - 1]); return; }
    if (k === 'q' || k === 'Q' || k === 'Tab') { if (e.preventDefault) e.preventDefault(); api.switchFox(); return; }
    const dirs = { ArrowUp: [0, 1], w: [0, 1], W: [0, 1], ArrowDown: [0, -1], s: [0, -1], S: [0, -1], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0] };
    const H = S.holder;
    const myOffense = S.phase === 'play' && H && isHuman(H.team);
    if (dirs[k]) {
      if (e.preventDefault) e.preventDefault();
      const { f, r } = viewDirs(); const [dx, dy] = dirs[k];
      if (myOffense) {
        if (!S.aim) { const m = mates(H)[0]; S.aim = { x: m.x, z: m.z }; S.aimKb = true; }
        S.aim.x += (r.x * dx + f.x * dy) * 1.0; S.aim.z += (r.z * dx + f.z * dy) * 1.0;
        S.aim.x = R.clamp(S.aim.x, -R.HALF_W - 1, R.HALF_W + 1); S.aim.z = R.clamp(S.aim.z, -R.HALF_L - 1, R.HALF_L + 1);
      } else {
        const t = humanDefTeam(); if (t < 0) return;
        const a = S.ctrl[t]; const base = a.cmd || { x: a.x, z: a.z };
        command(t, { x: base.x + (r.x * dx + f.x * dy) * 2.2, z: base.z + (r.z * dx + f.z * dy) * 2.2 }, false);
      }
      return;
    }
    if (k === ' ' || k === 'Enter') {
      if (e.preventDefault) e.preventDefault();
      if (myOffense) { if (S.aim) releaseAim(); else { const m = mates(H)[0]; S.aim = { x: m.x, z: m.z }; S.aimKb = true; } return; }
      const t = humanDefTeam();
      if (t >= 0 && S.phase === 'flight') { const a = S.ctrl[t]; if (a.diveT <= 0) { a.diveT = R.DIVE_TIME; audio.play('dive'); } }
    }
  }
  if (world) {
    window.addEventListener('pointerdown', onDown, true);
  } else {
    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', handleKey);
  }
  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', onUp, true);
  const ctxMenu = (e) => e.preventDefault();
  dom.addEventListener('contextmenu', ctxMenu);

  /* ---------- HUD ---------- */
  function flash(m) { S.flash = m; S.flashT = 1.6; }
  function say(key, text) {
    if (S.mode !== 'demo') return;
    const last = S.capSeen[key];
    if (last != null && S.time - last < 25) return;
    S.capSeen[key] = S.time; S.caption = text; S.capT = 4.2;
  }
  function phaseMsg() {
    const off = S.off, offH = isHuman(off), defH = isHuman(1 - off);
    if (S.phase === 'ready') return poss(off) + ' DISC. GET READY.';
    if (S.phase === 'play') {
      if (offH && defH) return teamName(off) + ': DRAG FROM YOUR FOX TO THROW. ' + teamName(1 - off) + ': TAP TO RUN.';
      if (offH) {
        if (S.aim) return S.aimInfo || 'LET GO TO THROW.';
        const m = cutterOf(off);
        return S.open ? m.name + ' IS OPEN! DRAG TO AIM, LET GO TO THROW.' : 'YOUR DISC. DRAG TO AIM, LET GO TO THROW.';
      }
      if (defH) return 'DEFEND! TAP TO RUN INTO THE THROWING LANE.';
      return '';
    }
    if (S.phase === 'flight') return defH ? 'DISC IN THE AIR: TAP NEAR IT TO DIVE!' : offH && S.receiver ? 'GO, ' + S.receiver.name + '!' : '';
    if (S.phase === 'loose') return picks(S.off) + ' UP THE DISC.';
    if (S.phase === 'point' && S.scorer) return 'POINT: ' + teamName(S.scorer.team) + '!';
    return '';
  }
  function hintNow() {
    if (S.mode === 'demo' || S.paused || S.phase === 'over' || S.time - S.lastInput < 3) return { show: false };
    const H = S.holder;
    if (S.phase === 'play' && H && isHuman(H.team) && !S.aim) {
      const p = screenOf(H.x, 1.4, H.z), m = cutterOf(H.team), q = screenOf(m.x, 0.5, m.z);
      return { show: true, x: p.x, y: p.y, tx: q.x, ty: q.y, text: 'DRAG TO AIM' };
    }
    const t = humanDefTeam();
    if (t >= 0 && S.phase === 'play') { const a = S.ctrl[t]; const p = screenOf(a.x, 1.2, a.z); return { show: true, x: p.x, y: p.y, tx: p.x, ty: p.y, text: 'TAP TO RUN' }; }
    return { show: false };
  }
  function hud() {
    const lv = L();
    const off = S.off;
    const offH = isHuman(off);
    const defT = humanDefTeam();
    return {
      game: KEY, phase: S.phase, mode: S.mode, paused: S.paused,
      level: S.level, levelName: lv.name, levelTitle: lv.title, levels: R.LEVELS.map((l) => ({ name: l.name, title: l.title })),
      firstTo: S.firstTo, score: S.score.slice(),
      teams: [0, 1].map((t) => ({ name: teamName(t), color: TEAM_HEX[t], human: isHuman(t) })),
      off, offName: teamName(off),
      stall: Math.min(R.STALL, Math.floor(S.stall)), stallMax: R.STALL, showStall: S.phase === 'play',
      throwType: S.throwType[offH ? off : 0], throws: R.THROW_KEYS.map((k) => ({ key: k, label: R.THROWS[k].label })),
      canAim: S.phase === 'play' && !!S.holder && offH, aiming: !!S.aim, aimInfo: S.aimInfo,
      humanDef: defT >= 0, ctrlName: defT >= 0 && S.ctrl[defT] ? S.ctrl[defT].name : '',
      open: S.open, msg: S.flashT > 0 ? S.flash : phaseMsg(), caption: S.caption,
      hint: hintNow(), result: S.result, sound: audio.sound, music: audio.music, menuReq: S.menuReq,
      world: !!world, online: false,
      gold: store.get('gold', 0), stars: R.LEVELS.map((l) => store.get('stars.' + l.key, 0) || 0),
    };
  }
  let emitAcc = 0;
  function emit(now) {
    if (!now) return;
    emitAcc = 0;
    try { onState(hud()); } catch (e) { console.error('[frisbee] onState', e); }
  }

  /* ---------- loop ---------- */
  let raf = 0, last = performance.now(), dead = false;
  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    let dt = (now - last) / 1000; last = now;
    if (!(dt > 0)) dt = 0; if (dt > 0.05) dt = 0.05;
    S._dt = dt;
    checkSize();
    update(dt);
    camGlide(dt);
    mirror();
    if (renderer) renderer.render(scene, camera);
    emitAcc += dt;
    if (emitAcc >= 0.1) emit(true);
  }
  let ro = null;
  if (!world && typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => { sizeKey = ''; }); ro.observe(container); }

  /* ---------- API ---------- */
  function destroy() {
    if (dead) return; dead = true;
    cancelAnimationFrame(raf);
    if (world) window.removeEventListener('pointerdown', onDown, true);
    else { dom.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', handleKey); }
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', onUp, true);
    window.removeEventListener('pointercancel', onUp, true);
    dom.removeEventListener('contextmenu', ctxMenu);
    if (ro) ro.disconnect();
    audio.close();
    if (world) {
      world.parent.remove(scene);
    } else {
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      mats.forEach((m) => m.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }
  const api = {
    hud,
    setSafe(s) { safe = { top: 0, bottom: 0, left: 0, right: 0, ...safe, ...(s || {}) }; sizeKey = ''; },
    start(mode = 'cpu') { S.mode = ['cpu', 'local', 'demo'].includes(mode) ? mode : 'cpu'; newGame(); },
    key: handleKey,
    get camera() { return world ? wcam : camera; },
    snapCam() { checkSize(); computeGoal(); camera.position.copy(goal.pos); camera.quaternion.copy(goal.quat); mirror(); },
    destroy,
    setThrow(t) {
      if (!R.THROWS[t]) return;
      const team = isHuman(S.off) ? S.off : 0;
      S.throwType[team] = t; audio.play('select'); emit(true);
    },
    switchFox() {
      let t = humanDefTeam(); if (t < 0) t = isHuman(0) ? 0 : isHuman(1) ? 1 : -1;
      if (t < 0) return;
      const cur = S.ctrl[t], other = actors.find((a) => a.team === t && a !== cur);
      if (other && !other.holding) { S.ctrl[t] = other; other.cmd = null; audio.play('select'); emit(true); }
    },
    restart() { newGame(); },
    playAgain() { newGame(); },
    setLevel(i) { S.level = clampLevel(i); newGame(); },
    setFirstTo(n) { S.firstTo = [3, 5, 7].includes(+n) ? +n : 5; newGame(); },
    setSound(b) { audio.setSound(b); emit(true); },
    setMusic(b) { audio.setMusic(b); if (b) audio.unlock(); emit(true); },
    pause(b) { S.paused = !!b; if (ptr) { ptr = null; S.aim = null; } emit(true); },
    get game() { return GAME; },
  };

  S.mode = ['cpu', 'local', 'demo'].includes(opts.mode) ? opts.mode : 'cpu';
  newGame();
  checkSize(); computeGoal(); api.snapCam();
  raf = requestAnimationFrame(frame);
  return api;
}

export default createFrisbee;
