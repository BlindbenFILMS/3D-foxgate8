/* AIRPORT TSA . 8 GATES 3D minigame
   Work Lane 1 of the security checkpoint (ID check + X-ray), or leave your post
   and patrol the terminal for anything suspicious. A rival agent works Lane 2. */
import * as THREE from '../../vendor/three/three.module.js';
import * as R from './airport-rules.js';
import { buildAirport, makeProp } from './airport-world.js';
import { makeFoxMaker, animFox } from './airport-fox.js';
import { drawXray, hitXray, drawBoard, XW, XH } from './airport-xray.js';
import { createAudio } from './airport-audio.js';
import { clearMats, disposeObj } from './airport-kit.js';

export const GAME = { key: 'airportTSA', name: 'AIRPORT TSA', maxPlayers: 4 };
const KEY = GAME.key, PI = Math.PI;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const fmt = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const angTo = (a, b) => { let d = (b - a) % (PI * 2); if (d > PI) d -= PI * 2; if (d < -PI) d += PI * 2; return d; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const SHIFT = { cpu: 180, local: 120, demo: 150 };

const LOOK = {
  player: { torso: ['#3d5a96', '#26304a', '#ffd23a'], outfit: 'tee', fur: '#e8742c', badge: true, mood: 'happy' },
  npc: { torso: ['#3d5a96', '#26304a', '#ffd23a'], outfit: 'tee', fur: '#7a4a2a', badge: true },
  pip: { torso: ['#ffd23a', '#3d5a96', '#ec3013'], outfit: 'tee', fur: '#f0a050', badge: true, mood: 'happy' },
  hope: { torso: ['#3d5a96', '#2b6fe0', '#ffd23a'], outfit: 'vest', fur: '#d0581f', badge: true, shades: true, cane: true, mood: 'calm' },
  noble: { torso: ['#2b2d42', '#1b1c2a', '#ec3013'], outfit: 'coat', fur: '#b9b2a8', badge: true, eyes: '#ff2233', chair: true, mood: 'proud' },
  crew: { torso: ['#1f2a44', '#1f2a44', '#ffd23a'], outfit: 'coat', fur: '#c95a1e', badge: true, cap: '#1f2a44' },
  checkin: { torso: ['#2c4d8f', '#2a2f45', '#ffd23a'], outfit: 'vest', fur: '#f0a050', badge: true },
  barista: { torso: ['#7c5233', '#2a2f45', '#ffd23a'], outfit: 'tee', fur: '#b9b2a8' },
};

export async function createAirport({ container, onState = () => {}, opts = {} } = {}) {
  const WO = opts.world || null;
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const makeFox = makeFoxMaker(opts.kit);

  /* ---------- renderer & scenes ---------- */
  let renderer, root = null, scene, env;
  if (WO) {
    renderer = WO.renderer;
    scene = new THREE.Group(); scene.name = KEY; WO.parent.add(scene);
    env = new THREE.Scene(); /* throw-away: lights, sky, room shell never reach the town */
  } else {
    renderer = new THREE.WebGLRenderer({ antialias: !coarse || (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const cv = renderer.domElement; cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
    container.appendChild(cv);
    root = new THREE.Scene(); root.background = new THREE.Color('#bfe3f5'); root.fog = new THREE.Fog('#bfe3f5', 140, 320);
    scene = new THREE.Group(); root.add(scene); env = root;
  }
  try { if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load('900 40px Archivo'), new Promise(r => setTimeout(r, 700))]); } catch (e) { /* fonts optional */ }

  const A = buildAirport({ group: scene, env, full: !WO });
  const L_SPEC = A.lanes;

  /* ---------- cameras ---------- */
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 700);
  const wcam = new THREE.PerspectiveCamera(50, 1, 0.1, 700);
  let W = 1, H = 1, safe = { top: 0, bottom: 0, left: 0, right: 0 };
  function readSize() {
    const el = WO ? renderer.domElement : container;
    W = Math.max(1, el.clientWidth || 1); H = Math.max(1, el.clientHeight || 1);
  }
  readSize();
  let ro = null;
  if (!WO) { renderer.setSize(W, H, false); ro = new ResizeObserver(() => { readSize(); renderer.setSize(W, H, false); }); ro.observe(container); }

  /* ---------- save ---------- */
  const save = opts.save || null;
  const store = {
    get(k, d) { try { if (save && save.stat) { const v = save.stat(KEY + '.' + k, d); return v == null ? d : v; } const v = localStorage.getItem(KEY + '.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { if (save && save.setStat) return save.setStat(KEY + '.' + k, v); localStorage.setItem(KEY + '.' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
    gold(n) { if (n <= 0) return; if (save && save.addGold) save.addGold(n); else store.set('gold', store.get('gold', 0) + n); },
  };
  const settings = {
    mode: opts.mode || 'cpu', level: clamp(store.get('level', 1) | 0, 0, 2), players: clamp(store.get('players', 2) | 0, 2, 4),
    sound: store.get('sound', true) !== false, music: WO ? false : store.get('music', true) !== false,
  };
  const audio = createAudio({ music: settings.music, muted: !settings.sound });

  /* ---------- shared visuals ---------- */
  const ring = makeProp('ring'); ring.visible = false; scene.add(ring);
  const shadowGeo = new THREE.CircleGeometry(0.72, 18); shadowGeo.rotateX(-PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x1a1626, transparent: true, opacity: 0.2, depthWrite: false });
  const shadows = new THREE.InstancedMesh(shadowGeo, shadowMat, 80); shadows.frustumCulled = false; shadows.renderOrder = 1; scene.add(shadows);
  const _dm = new THREE.Object3D();

  /* ---------- actors ---------- */
  const actors = new Set();
  function actor(look, x, z, ry = 0) {
    const fox = makeFox(look); fox.position.set(x, 0, z); fox.rotation.y = ry; scene.add(fox);
    const a = { fox, x, z, ry, tgtRy: ry, speed: 0, path: null, spd: 3, onArrive: null, look };
    actors.add(a); return a;
  }
  function killActor(a) { if (!a || !actors.has(a)) return; actors.delete(a); scene.remove(a.fox); disposeObj(a.fox); }
  function goTo(a, x, z, spd, cb, direct) { a.path = direct ? [{ x, z }] : A.nav(a.x, a.z, x, z); a.spd = spd; a.onArrive = cb || null; }
  function stepActor(a, dt) {
    let mv = 0;
    if (a.path && a.path.length && !a.hold) {
      const p = a.path[0], dx = p.x - a.x, dz = p.z - a.z, d = Math.hypot(dx, dz), st = a.spd * dt;
      if (d <= st) { a.x = p.x; a.z = p.z; a.path.shift(); } else { a.x += (dx / d) * st; a.z += (dz / d) * st; }
      if (d > 0.04) a.tgtRy = Math.atan2(dx, dz);
      mv = a.spd;
      if (!a.path.length) { a.path = null; const cb = a.onArrive; a.onArrive = null; if (cb) cb(a); }
    }
    a.speed = mv;
    a.ry += angTo(a.ry, a.tgtRy) * (1 - Math.exp(-dt * 10));
    a.fox.position.set(a.x, 0, a.z); a.fox.rotation.y = a.ry;
    animFox(a.fox, dt, a.speed);
  }
  function holdBag(a, bag) {
    const arm = a.fox.userData.P && a.fox.userData.P.arms ? a.fox.userData.P.arms[1] : a.fox;
    if (bag.parent) bag.parent.remove(bag);
    arm.add(bag); bag.position.set(0, -1.82, 0.05); bag.rotation.set(0, PI / 2, 0); bag.scale.setScalar(0.92);
    a.fox.userData.pose = 'carry';
  }
  function dropBag(bag) {
    if (!bag) return;
    bag.updateMatrixWorld(true);
    const wp = new THREE.Vector3(); bag.getWorldPosition(wp); scene.worldToLocal(wp);
    if (bag.parent) bag.parent.remove(bag);
    scene.add(bag); bag.position.copy(wp); bag.rotation.set(0, 0, 0); bag.scale.setScalar(1);
  }

  /* ---------- tweens ---------- */
  let tweens = [];
  function arcTo(obj, to, dur, h, cb) { tweens.push({ k: 'arc', obj, from: obj.position.clone(), to: new THREE.Vector3(to.x, to.y, to.z), dur, h, t: 0, cb }); }
  function slide(obj, pts, speed, cb, onStep) { tweens.push({ k: 'path', obj, pts: pts.map(p => new THREE.Vector3(p.x, p.y, p.z)), speed, cb, onStep }); }
  function popOut(obj, cb) { tweens.push({ k: 'pop', obj, t: 0, cb }); }
  function stepTweens(dt) {
    const keep = [];
    for (const tw of tweens) {
      let done = false;
      if (tw.k === 'arc') {
        tw.t += dt; const u = Math.min(1, tw.t / tw.dur);
        tw.obj.position.lerpVectors(tw.from, tw.to, u); tw.obj.position.y += Math.sin(u * PI) * tw.h;
        done = u >= 1;
      } else if (tw.k === 'path') {
        const p = tw.pts[0], d = tw.obj.position.distanceTo(p), st = tw.speed * dt;
        if (d <= st) { tw.obj.position.copy(p); tw.pts.shift(); } else tw.obj.position.addScaledVector(p.clone().sub(tw.obj.position).normalize(), st);
        if (tw.onStep) tw.onStep(tw.obj.position);
        done = !tw.pts.length;
      } else if (tw.k === 'pop') {
        tw.t += dt; const u = Math.min(1, tw.t / 0.35); tw.obj.scale.setScalar(Math.max(0.001, 1 + Math.sin(u * PI) * 0.25 - u)); done = u >= 1;
      }
      if (done) { if (tw.cb) tw.cb(); } else keep.push(tw);
    }
    tweens = keep;
  }
  function killTweens(obj) { tweens = tweens.filter(t => t.obj !== obj); }

  /* ---------- shift state ---------- */
  let G = null, player = null, rival = null, near = null, extras = [];
  const joy = { x: 0, y: 0 }, keys = {};
  let sprintBtn = false, sprintKey = false, lastInput = performance.now(), dirty = true, emitT = 0;
  const pp = { scores: [], seed: 1 };

  function clearWorld() {
    for (const a of [...actors]) killActor(a);
    if (G) {
      for (const L of G.lanes) { if (L.bagObj) { scene.remove(L.bagObj); disposeObj(L.bagObj); } }
      for (const q of G.pax) if (q.bagObj) { if (q.bagObj.parent) q.bagObj.parent.remove(q.bagObj); disposeObj(q.bagObj); }
      for (const inc of G.inc) cleanInc(inc, true);
    }
    tweens = []; extras = []; A.staffDoor.set(false); ring.visible = false;
  }

  function makeLane(spec, idx) {
    return { ...spec, idx, queue: [], cur: null, stage: 'none', op: null, bag: null, bagObj: null, scan: 0, num: 0, timer: 0, aiT: 0, aiPlan: null, aiTagged: false, result: null, spawnT: 1.5 + idx * 2, archT: 0, monDirty: true };
  }

  function makeAgent(role, look, x, z, ry) {
    const a = actor(look, x, z, ry);
    Object.assign(a, { role, score: 0, ai: null, mode: 'idle', inc: null, think: 0, cool: 2, atStation: false });
    return a;
  }

  function startShift(mode, idx = 0) {
    clearWorld();
    settings.mode = mode;
    const seed = mode === 'local' ? pp.seed : ((Math.random() * 1e9) | 0);
    const lvl = R.LEVELS[settings.level];
    G = {
      mode, lvl, seed, r: R.makeRng(seed), t: 0, len: SHIFT[mode], left: SHIFT[mode], phase: 'patrol', paused: false, atPost: false,
      score: 0, stats: { screened: 0, caught: 0, incidents: 0, mistakes: 0 },
      lanes: L_SPEC.map((s, i) => makeLane(s, i)), pax: [], paxN: 0, inc: [], incN: 0, nextInc: 8, nextPA: 12, paIdx: 0,
      seatTaken: new Map(), toast: null, toastN: 0, caption: null, capT: 0, feed: null, reveal: null, inspect: null,
      radioT: 0, radioCd: 0, queueT: 0, rqueueT: 0, result: null, handoff: null, playerIdx: idx, boardT: 0, clock: 10 * 60 + 40,
      flights: R.DESTS.slice(0, 5).map((d, i) => ({ code: d[0], dest: d[1], gate: d[2], t: 10 * 60 + 50 + i * 12 })),
    };
    player = makeAgent('player', LOOK.player, -4, 9, PI);
    if (mode === 'local') { rival = makeAgent('npc', LOOK.npc, 7, 3.4, -PI / 2); rival.ai = R.LEVELS[1]; }
    else { rival = makeAgent('rival', LOOK[lvl.key], 4, 9, PI); rival.ai = lvl; rival.name = lvl.name; }
    if (mode === 'demo') { player.ai = R.LEVELS[1]; player.role = 'auto'; player.cool = 1; }
    /* ambient staff */
    const ci1 = actor(LOOK.checkin, -33.5, 21.3, 0); ci1.fox.userData.pose = 'type';
    const ci2 = actor(LOOK.checkin, -23.5, 21.3, 0); ci2.fox.userData.pose = 'type';
    const cust = actor(R.pick(G.r, R.OUTFITS), -23.5, 24.1, PI); cust.fox.userData.pose = 'hand';
    const bar = actor(LOOK.barista, 36.3, 9.4, -PI / 2); bar.fox.userData.pose = 'type';
    extras.push(ci1, ci2, cust, bar);
    /* prefill */
    for (const L of G.lanes) for (let k = 0; k < 2; k++) spawnPax(L, true);
    for (let k = 0; k < 3; k++) { const q = newPax(null); const seat = freeSeat(q.data.gate); if (seat) { placeAt(q, seat.x, seat.z); sitDown(q, seat); } else killPax(q); }
    redrawBoard(); for (const L of G.lanes) drawMonitor(L);
    near = null; G.phase = 'patrol';
    if (mode === 'demo') caption(R.DEMO.start, 7);
    else caption(mode === 'local' ? 'PLAYER ' + (idx + 1) + ': your shift starts now. Walk to LANE 1 to take your post.' : 'Shift start. Take your post at LANE 1, or patrol the floor.', 5);
    audio.sfx('start');
    snapCam(); dirty = true;
  }

  /* ---------- passengers ---------- */
  function newPax(L) {
    const data = R.makePassenger(G.r, ++G.paxN, 0.22);
    const look = { torso: data.look.torso, outfit: data.look.outfit, fur: data.fur };
    const a = actor(look, A.entrance.x + (G.r() - 0.5) * 6, A.entrance.z, PI);
    const bag = R.makeBag(G.r, 0.38);
    const bagObj = makeProp('suitcase', { color: bag.color, type: bag.type });
    const q = { data, a, lane: L, state: 'arrive', slot: -1, bag, bagObj, seat: null, timer: 0, bagReady: false };
    holdBag(a, bagObj);
    G.pax.push(q); return q;
  }
  function placeAt(q, x, z) { q.a.x = x; q.a.z = z; q.a.fox.position.set(x, 0, z); }
  function killPax(q) {
    killActor(q.a);
    if (q.bagObj) { killTweens(q.bagObj); if (q.bagObj.parent) q.bagObj.parent.remove(q.bagObj); disposeObj(q.bagObj); q.bagObj = null; }
    if (q.seat) G.seatTaken.delete(q.seat);
    G.pax = G.pax.filter(p => p !== q);
  }
  function spawnPax(L, prefill) {
    const q = newPax(L);
    L.queue.push(q); q.slot = L.queue.length - 1;
    const s = L.slot(q.slot);
    if (prefill) { placeAt(q, s.x, s.z); q.state = 'queued'; q.a.tgtRy = q.a.ry = PI; return q; }
    goTo(q.a, L.entry.x, L.entry.z, 3.2, () => { const t = L.slot(q.slot); goTo(q.a, t.x, t.z, 2.6, () => { q.state = 'queued'; q.a.tgtRy = PI; }, true); });
    return q;
  }
  function seatsFor(gate) { return gate ? A.seats.filter(s => s.gate === gate) : A.seats; }
  function freeSeat(gate) {
    const list = seatsFor(gate).filter(s => !G.seatTaken.has(s));
    return list.length ? R.pick(G.r, list) : null;
  }
  function sitDown(q, seat) {
    G.seatTaken.set(seat, q); q.seat = seat; q.state = 'seated'; q.timer = 25 + G.r() * 35;
    const a = q.a; a.x = seat.x; a.z = seat.z; a.tgtRy = a.ry = seat.ry;
    a.fox.userData.sit = true; a.fox.userData.sitY = seat.y + 0.14; a.fox.userData.pose = G.r() < 0.4 ? 'read' : G.r() < 0.5 ? 'sleep' : 'look';
    if (q.bagObj) { dropBag(q.bagObj); q.bagObj.position.set(seat.x, 0, seat.z - 1.55); q.bagObj.rotation.y = G.r(); }
  }
  function standUp(q) {
    const a = q.a; a.fox.userData.sit = false; a.fox.userData.pose = null;
    if (q.seat) { G.seatTaken.delete(q.seat); q.seat = null; }
    if (q.bagObj) holdBag(a, q.bagObj);
  }
  function goSeat(q) {
    const seat = freeSeat(q.data.gate);
    q.state = 'toSeat';
    if (seat) { G.seatTaken.set(seat, q); goTo(q.a, seat.fx, seat.fz, 2.8, () => goTo(q.a, seat.x, seat.z, 2, () => sitDown(q, seat), true)); }
    else leaveGate(q);
  }
  function leaveGate(q) {
    q.state = 'leaving';
    const door = A.gateDoor[q.data.gate] || A.gateDoor.A1;
    goTo(q.a, door.x, door.z, 2.8, () => killPax(q));
  }
  function waiting(L) { return L.queue.length + (L.cur && L.stage === 'call' ? 1 : 0); }

  function paxUpdate(q, dt) {
    if (q.state === 'seated') {
      q.timer -= dt;
      if (q.timer <= 0 && !q.a.path) { standUp(q); leaveGate(q); }
    } else if (q.state === 'collect' && q.bagReady && !q.a.path) {
      q.state = 'pickup';
      const bo = q.bagObj;
      if (bo) { killTweens(bo); arcTo(bo, { x: q.a.x, y: 1.0, z: q.a.z }, 0.45, 0.8, () => { holdBag(q.a, bo); goSeat(q); }); }
      else goSeat(q);
    }
  }

  /* ---------- lane machinery ---------- */
  function laneUpdate(L, dt) {
    L.spawnT -= dt;
    if (L.spawnT <= 0) { L.spawnT = (L.idx === 0 ? 6.0 : 7.5) + G.r() * 3.5; if (L.queue.length < 7) spawnPax(L, false); }
    L.queue.forEach((q, k) => {
      q.slot = k;
      if (q.state === 'queued' && !q.a.path) {
        const s = L.slot(k);
        if (Math.abs(q.a.z - s.z) > 0.1 || Math.abs(q.a.x - s.x) > 0.1) goTo(q.a, s.x, s.z, 2.4, () => { q.a.tgtRy = PI; }, true);
      }
    });
    if (L.archT > 0) { L.archT -= dt; A.archLights[L.idx].material.color.set(L.archT > 0 ? '#ec3013' : '#36d36b'); }
    const op = L.op, ready = op && op.atStation;
    switch (L.stage) {
      case 'none':
        if (ready && L.queue.length && L.queue[0].state === 'queued') {
          const q = L.queue.shift(); L.cur = q; L.stage = 'call'; q.state = 'toPodium';
          goTo(q.a, L.p0.x, L.p0.z, 2.6, () => { q.state = 'podium'; q.a.tgtRy = L.p0.ry; q.a.fox.userData.pose = 'hand'; L.stage = 'id'; L.num++; stageEnter(L); }, true);
          L.monDirty = true;
        }
        break;
      case 'id':
        if (op && op.ai && ready) { L.aiT -= dt; if (L.aiT <= 0) decideId(L, R.aiId(L.cur.data, op.ai, G.r), op); }
        break;
      case 'xray':
        if (op && op.ai && ready) {
          L.aiT -= dt;
          if (!L.aiTagged && L.aiT < L.aiTotal * 0.5) { L.aiTagged = true; L.aiPlan.tags.forEach(i => { L.bag.items[i].tag = true; }); L.monDirty = true; if (op === player) audio.sfx('tag'); }
          if (L.aiT <= 0) decideBag(L, L.aiPlan.search, op);
        }
        break;
      case 'reveal':
        L.timer -= dt;
        if (L.timer <= 0) endReveal(L);
        break;
    }
    if (L.monDirty || L.stage === 'belt') drawMonitor(L);
  }
  function stageEnter(L) {
    const op = L.op;
    if (op && op.ai) {
      const demo = G.mode === 'demo' && op === player;
      L.aiTotal = L.aiT = op.ai.think * (0.8 + G.r() * 0.5) + (demo ? 2.2 : 0);
      if (L.stage === 'xray') { L.aiPlan = R.aiBag(L.bag, op.ai, G.r); L.aiTagged = false; }
      if (demo) caption(L.stage === 'id' ? R.DEMO.id : R.DEMO.xray, 4.5);
    }
    if (op === player) audio.sfx(L.stage === 'id' ? 'beep' : 'pop');
    dirty = true;
  }
  function decideId(L, approve, who) {
    const q = L.cur; if (!q || L.stage !== 'id') return;
    const res = R.judgeId(q.data, approve);
    award(who, res, 'id', q.data);
    q.a.fox.userData.pose = 'carry';
    if (approve) {
      L.stage = 'toss';
      const bo = q.bagObj; dropBag(bo);
      L.bag = q.bag; L.bagObj = bo; L.scan = 0; L.monDirty = true;
      audio.sfx(who === player ? 'toss' : 'tap');
      arcTo(bo, L.beltStart, 0.6, 1.6, () => {
        L.stage = 'belt'; if (who === player) audio.sfx('scan');
        const z0 = L.beltStart.z, z1 = L.tunnel.z;
        slide(bo, [L.tunnel], 3.0, () => { L.scan = 1; L.stage = 'xray'; L.monDirty = true; stageEnter(L); }, p => { L.scan = clamp((z0 - p.z) / (z0 - z1), 0, 1); });
      });
      q.state = 'walk';
      goTo(q.a, L.arch.x, L.arch.z, 2.6, () => {
        if (G.r() < 0.18) { L.archT = 1.1; if (L.op === player) audio.sfx('alarm'); q.a.hold = true; setTimeout(() => { q.a.hold = false; }, 900); }
        else if (L.op === player) audio.sfx('beep');
        goTo(q.a, L.collect.x, L.collect.z, 2.6, () => { q.state = 'collect'; q.a.tgtRy = PI; }, true);
      }, true);
    } else {
      q.state = 'denied'; q.a.fox.userData.pose = 'carry';
      goTo(q.a, L.out.x, L.out.z, 3, () => goTo(q.a, A.entrance.x, A.entrance.z, 3.2, () => killPax(q)), true);
      L.stage = 'none'; L.cur = null; L.monDirty = true;
    }
    dirty = true;
  }
  function decideBag(L, search, who) {
    if (L.stage !== 'xray' || !L.bag) return;
    const res = R.judgeBag(L.bag, search);
    award(who, res, 'bag');
    L.result = res; L.stage = 'reveal'; L.timer = who === player ? (G.mode === 'demo' ? 2.4 : 2.0) : 0.8; L.monDirty = true;
    if (who === player) G.reveal = { title: res.title, text: res.text, good: res.good, pts: res.pts };
    const bo = L.bagObj, q = L.cur;
    const done = () => { if (q) q.bagReady = true; };
    if (search) slide(bo, [{ x: L.bx, y: L.tunnel.y, z: -6.6 }], 3.2, () => arcTo(bo, { x: L.table.x, y: L.table.y, z: L.table.z }, 0.5, 1.0, done));
    else slide(bo, [L.beltEnd], 3.2, done);
    dirty = true;
  }
  function endReveal(L) {
    if (L.stage !== 'reveal') return;
    if (L.bag && L.result && L.bag.bad) L.bag.items = L.bag.items.filter(i => !i.bad || !L.result.good);
    L.stage = 'none'; L.cur = null; L.bag = null; L.bagObj = null; L.result = null; L.monDirty = true;
    if (L.op === player) G.reveal = null;
    dirty = true;
  }
  function drawMonitor(L) {
    const m = A.monitors[L.idx]; L.monDirty = false;
    const show = (L.stage === 'belt' || L.stage === 'xray' || L.stage === 'reveal') ? L.bag : null;
    const idle = L.op ? (L.stage === 'id' ? 'CHECKING ID' : 'WAITING FOR BAG') : 'LANE CLOSED';
    drawXray(m.ctx, show, { lane: L.idx + 1, label: 'BAG ' + String(L.num).padStart(2, '0'), scan: L.stage === 'belt' ? L.scan : 1, reveal: L.stage === 'reveal', idle });
    m.tex.needsUpdate = true;
  }

  /* ---------- scoring ---------- */
  function award(who, res, kind, data) {
    if (who === player) {
      G.score += res.pts;
      if (kind === 'id' && data && data.flaw && res.good) G.stats.caught++;
      if (kind === 'bag') { G.stats.screened++; if (res.good && res.title.startsWith('FOUND')) G.stats.caught++; }
      if (kind === 'inc' && res.good) G.stats.incidents++;
      if (!res.good) G.stats.mistakes++;
      toast(res.title, res.pts, res.good);
      audio.sfx(res.good ? 'good' : 'bad');
    } else if (who && who.role === 'rival') {
      who.score += res.pts;
      G.feed = { text: who.name + (res.pts >= 0 ? ' +' : ' ') + res.pts, good: res.pts >= 0, n: (G.feed ? G.feed.n : 0) + 1 };
    } else if (who && who.role === 'auto') {
      G.score += res.pts; if (!res.good) G.stats.mistakes++; toast(res.title, res.pts, res.good);
    }
    dirty = true;
  }
  function toast(text, pts, good) { G.toast = { text, pts: pts == null ? null : (pts > 0 ? '+' + pts : String(pts)), good: !!good, n: ++G.toastN }; G.toastT = 2.6; dirty = true; }
  function caption(text, t) { G.caption = text; G.capT = t || 5; dirty = true; }

  /* ---------- incidents ---------- */
  function canSpawn(type, active) {
    const n = t => active.filter(i => i.type === t).length;
    if (type === 'door' || type === 'tail') return !n('door') && !n('tail');
    if (type === 'wrong') return !n('wrong');
    if (type === 'spill') return n('spill') < 2;
    if (type === 'bag') return n('bag') < 2;
    if (type === 'lost') return n('lost') < 1;
    return true;
  }
  function seatPair() {
    const all = A.seats.concat(A.benches);
    for (let tries = 0; tries < 40; tries++) {
      const s = R.pick(G.r, all);
      const nb = all.find(o => o.row === s.row && o.k === s.k + 1);
      if (!nb || G.seatTaken.has(s) || G.seatTaken.has(nb)) continue;
      if (dist(s, player) < 7) continue;
      return [s, nb];
    }
    return null;
  }
  function randomLook() { const o = R.pick(G.r, R.OUTFITS); return { torso: o.torso, outfit: o.outfit, fur: R.pick(G.r, R.FURS).c }; }
  function spawnIncident() {
    const active = G.inc.filter(i => !i.done);
    if (active.length >= 3) return;
    const types = ['bag', 'bag', 'door', 'tail', 'spill', 'lost', 'wrong', 'tail', 'wrong'];
    let type = null;
    for (let k = 0; k < 12 && !type; k++) { const t = R.pick(G.r, types); if (canSpawn(t, active)) type = t; }
    if (!type) return;
    const def = R.INC[type], real = def.fake ? G.r() < 0.66 : true;
    const inc = { id: ++G.incN, type, def, real, text: real ? def.real : def.fake, born: G.t, objs: [], acts: [], seats: [], claim: null, done: false, x: 0, z: 0, ax: 0, az: 0, cleanAt: 0 };
    if (type === 'bag' || type === 'lost') {
      const pr = seatPair(); if (!pr) return;
      const [s, nb] = pr;
      const obj = type === 'bag' ? makeProp('suitcase', { color: R.pick(G.r, R.BAG_COLORS), type: R.pick(G.r, ['suitcase', 'duffel', 'backpack']) }) : makeProp('wallet');
      obj.position.set(s.x, s.y, s.z); obj.rotation.y = (G.r() - 0.5) * 0.8; scene.add(obj); inc.objs.push(obj);
      G.seatTaken.set(s, inc); inc.seats.push(s);
      if (!real) { const o = actor(randomLook(), nb.x, nb.z, nb.ry); o.fox.userData.sit = true; o.fox.userData.sitY = nb.y + 0.14; o.fox.userData.pose = R.pick(G.r, ['read', 'look']); inc.acts.push(o); G.seatTaken.set(nb, inc); inc.seats.push(nb); }
      inc.x = s.x; inc.z = s.z; inc.ax = s.fx; inc.az = s.fz;
    } else if (type === 'door') {
      A.staffDoor.set(true); audio.sfx('door');
      const cr = makeProp('crate'); cr.position.set(-32.4, 0, -6.4); scene.add(cr); inc.objs.push(cr);
      inc.x = -32.6; inc.z = -7.5; inc.ax = A.staffDoor.front.x; inc.az = A.staffDoor.front.z;
    } else if (type === 'tail') {
      const o = actor(real ? randomLook() : LOOK.crew, -31.7, -7.4, -PI / 2); o.fox.userData.pose = real ? 'tug' : 'swipe'; inc.acts.push(o);
      inc.x = -31.7; inc.z = -7.4; inc.ax = -29.6; inc.az = -7.4;
    } else if (type === 'spill') {
      const used = G.inc.filter(i => !i.done && i.type === 'spill').map(i => i.spot);
      const spots = A.spills.filter(s => !used.includes(s) && dist(s, player) > 6);
      if (!spots.length) return;
      const sp = R.pick(G.r, spots); inc.spot = sp;
      const pd = makeProp('puddle'); pd.position.set(sp.x, 0, sp.z); pd.rotation.y = G.r() * 6; scene.add(pd); inc.objs.push(pd);
      inc.x = sp.x; inc.z = sp.z; inc.ax = sp.x + 1.6; inc.az = sp.z;
    } else if (type === 'wrong') {
      const o = actor(real ? randomLook() : LOOK.crew, A.exitLane.x, A.exitLane.z, real ? PI : 0); o.fox.userData.pose = real ? 'look' : null; inc.acts.push(o);
      if (real) { const bo = makeProp('suitcase', { color: R.pick(G.r, R.BAG_COLORS), type: 'backpack' }); holdBag(o, bo); o.fox.userData.pose = 'look'; inc.objs.push(bo); }
      inc.x = A.exitLane.x; inc.z = A.exitLane.z; inc.ax = A.exitLane.x; inc.az = A.exitLane.z + 2.4;
    }
    G.inc.push(inc);
    if (G.mode === 'demo' && G.incN === 1) caption(R.DEMO.patrol, 5);
    dirty = true;
  }
  function resolveInc(inc, who, act) {
    if (inc.done) return;
    inc.done = true; inc.claim = who;
    award(who, R.judgeInc(inc, act), 'inc');
    inc.cleanAt = G.t + 5;
    const a0 = inc.acts[0];
    if (act && inc.real) {
      if (inc.type === 'bag' || inc.type === 'lost') { const o = inc.objs[0]; setTimeout(() => { if (o.parent) popOut(o, () => { o.visible = false; }); }, 700); }
      if (inc.type === 'door') { A.staffDoor.set(false); audio.sfx('door'); const o = inc.objs[0]; if (o) popOut(o, () => { o.visible = false; }); }
      if (inc.type === 'spill') { const cone = makeProp('cone'); cone.position.set(inc.x + 0.6, 0, inc.z + 0.6); scene.add(cone); inc.objs.push(cone); inc.cleanAt = G.t + 8; }
      if ((inc.type === 'tail' || inc.type === 'wrong') && a0) { a0.fox.userData.pose = 'carry'; const tx = inc.type === 'wrong' ? 16 : -24; const tz = inc.type === 'wrong' ? 2 : -2; goTo(a0, tx, tz, 3, () => goTo(a0, A.entrance.x, A.entrance.z, 3.2, () => killActor(a0))); inc.acts = []; }
    } else if (!inc.real) {
      if ((inc.type === 'tail') && a0) { A.staffDoor.set(true); setTimeout(() => { if (G && actors.has(a0)) { a0.fox.userData.pose = null; goTo(a0, -36, -7.5, 2.5, () => { killActor(a0); A.staffDoor.set(false); }, true); } }, 900); inc.acts = []; }
      if (inc.type === 'bag' && a0 && inc.objs[0]) {
        const bo = inc.objs[0]; inc.objs = []; inc.acts = [];
        setTimeout(() => { if (!G || !actors.has(a0)) return; a0.fox.userData.sit = false; for (const st of inc.seats) G.seatTaken.delete(st); inc.seats = []; holdBag(a0, bo); goTo(a0, A.gateDoor.A1.x * (a0.x < 0 ? 1 : -1), A.gateDoor.A1.z, 2.6, () => killActor(a0)); }, 1200);
      }
      if (inc.type === 'wrong' && a0) { a0.fox.userData.pose = null; goTo(a0, 16, 4, 2.6, () => goTo(a0, A.entrance.x, A.entrance.z, 3, () => killActor(a0))); inc.acts = []; }
    }
    dirty = true;
  }
  function cleanInc(inc, now) {
    for (const o of inc.objs) { killTweens(o); if (o.parent) o.parent.remove(o); disposeObj(o); }
    inc.objs = [];
    for (const a of inc.acts) killActor(a);
    inc.acts = [];
    for (const s of inc.seats) if (G && G.seatTaken.get(s) === inc) G.seatTaken.delete(s);
    inc.seats = [];
    if (inc.type === 'door' && !now) A.staffDoor.set(false);
  }
  function incUpdate(dt) {
    G.nextInc -= dt;
    if (G.nextInc <= 0) { G.nextInc = 10 + G.r() * 7; spawnIncident(); }
    for (const inc of G.inc) {
      if (!inc.done && G.t - inc.born > (inc.real ? 55 : 40) && inc.claim == null) { inc.done = true; inc.expired = true; inc.cleanAt = G.t + 0.5; if (inc.type === 'door') A.staffDoor.set(false); }
    }
    const gone = G.inc.filter(i => i.done && G.t >= i.cleanAt);
    gone.forEach(i => cleanInc(i));
    if (gone.length) G.inc = G.inc.filter(i => !gone.includes(i));
  }

  /* ---------- player (human) ---------- */
  function takePost() {
    if (G.mode === 'demo') return;
    const L = G.lanes[0];
    G.atPost = true; L.op = player; player.atStation = false; near = null; ring.visible = false;
    goTo(player, L.agent.x, L.agent.z, 6, () => { player.atStation = true; player.tgtRy = L.agent.ry; }, true);
    audio.sfx('pop'); dirty = true;
  }
  function leavePost() {
    if (!G.atPost || G.mode === 'demo') return;
    const L = G.lanes[0];
    if (L.stage === 'reveal') endReveal(L);
    G.atPost = false; L.op = null; player.atStation = false; player.path = null; L.monDirty = true; G.reveal = null;
    audio.sfx('tap'); dirty = true;
  }
  function stationFor(L) { return (L.stage === 'toss' || L.stage === 'belt' || L.stage === 'xray' || L.stage === 'reveal') ? L.op : L.agent; }
  function stationUpdate(a, L) {
    const st = stationFor(L);
    if (!a.path && dist(a, st) > 0.15) { goTo(a, st.x, st.z, 5, () => { a.tgtRy = st.ry; if (a === player || a.ai) a.atStation = true; }, true); }
    else if (!a.path) a.tgtRy = st.ry;
  }
  function playerUpdate(dt) {
    const p = player, L = G.lanes[0];
    if (G.atPost) { stationUpdate(p, L); stepActor(p, dt); return; }
    if (G.inspect) { stepActor(p, dt); return; }
    if (p.ai) { stepActor(p, dt); return; }
    let ix = joy.x, iy = joy.y;
    const now = performance.now(), kd = k => keys[k] && keys[k] > now;
    if (kd('l')) ix -= 1; if (kd('r')) ix += 1; if (kd('u')) iy += 1; if (kd('d')) iy -= 1;
    const len = Math.hypot(ix, iy); if (len > 1) { ix /= len; iy /= len; }
    const sp = (sprintBtn || sprintKey ? 9.5 : 6) * Math.min(1, len);
    const vx = ix * sp, vz = -iy * sp;
    p.path = null;
    p.x += vx * dt; p.z += vz * dt; collide(p);
    p.speed = Math.hypot(vx, vz);
    if (p.speed > 0.1) p.tgtRy = Math.atan2(vx, vz);
    p.ry += angTo(p.ry, p.tgtRy) * (1 - Math.exp(-dt * 12));
    p.fox.position.set(p.x, 0, p.z); p.fox.rotation.y = p.ry;
    animFox(p.fox, dt, p.speed);
    /* what is near? */
    let nn = null, nd = 1e9;
    if (dist(p, L.agent) < 2.8) { nn = { kind: 'post', label: 'TAKE POST', x: L.agent.x, z: L.agent.z }; nd = dist(p, L.agent); }
    for (const inc of G.inc) {
      if (inc.done) continue;
      const d = Math.min(dist(p, inc), dist(p, { x: inc.ax, z: inc.az }));
      if (d < 3.8 && d < nd) { nd = d; nn = inc.claim && inc.claim !== p ? { kind: 'busy', label: (inc.claim.name || 'AGENT') + ' IS ON IT', x: inc.x, z: inc.z } : { kind: 'inc', label: 'INSPECT', inc, x: inc.x, z: inc.z }; }
    }
    if ((nn && nn.kind) !== (near && near.kind) || (nn && near && nn.inc !== near.inc)) dirty = true;
    near = nn;
    ring.visible = !!near; if (near) ring.position.set(near.x, 0.06, near.z);
  }
  function collide(p) {
    const rad = 0.55;
    for (let it = 0; it < 2; it++) for (const c of A.colliders) {
      const cx = clamp(p.x, c.x0, c.x1), cz = clamp(p.z, c.z0, c.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= rad * rad) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (rad - d) / d; p.x += dx * k; p.z += dz * k; }
      else { const l = p.x - c.x0, r = c.x1 - p.x, b = p.z - c.z0, t = c.z1 - p.z, m = Math.min(l, r, b, t); if (m === l) p.x = c.x0 - rad; else if (m === r) p.x = c.x1 + rad; else if (m === b) p.z = c.z0 - rad; else p.z = c.z1 + rad; }
    }
    p.x = clamp(p.x, A.bounds.x0, A.bounds.x1); p.z = clamp(p.z, A.bounds.z0, A.bounds.z1);
  }
  function act() {
    if (!G || G.paused) return;
    lastInput = performance.now(); audio.unlock();
    if (G.phase !== 'patrol' || !near) return;
    if (near.kind === 'post') takePost();
    else if (near.kind === 'inc') openInspect(near.inc, player);
  }
  function openInspect(inc, who) {
    inc.claim = who; G.inspect = { id: inc.id, title: inc.def.title, text: inc.text, act: inc.def.act, demo: who.ai ? true : false };
    who.path = null; who.tgtRy = Math.atan2(inc.x - who.x, inc.z - who.z);
    ring.visible = true; ring.position.set(inc.x, 0.06, inc.z);
    audio.sfx('radio'); dirty = true;
  }
  function inspectChoose(doAct) {
    if (!G || !G.inspect || G.inspect.demo) return;
    const inc = G.inc.find(i => i.id === G.inspect.id); G.inspect = null; ring.visible = false;
    if (inc) resolveInc(inc, player, doAct);
    dirty = true;
  }
  function radio() {
    if (!G || G.radioCd > 0) return;
    G.radioT = 6; G.radioCd = 18; audio.sfx('radio');
    const open = G.inc.filter(i => !i.done).length;
    toast(open ? 'RADIO: ' + open + ' OPEN ON THE MAP' : 'RADIO: ALL QUIET', null, true);
    dirty = true;
  }

  /* ---------- AI agents ---------- */
  function pickInc(a) {
    let best = null, bd = 1e9;
    for (const inc of G.inc) {
      if (inc.done || (inc.claim && inc.claim !== a) || G.t - inc.born < a.ai.notice) continue;
      if (inc === (G.inspect && G.inc.find(i => i.id === G.inspect.id))) continue;
      const d = dist(a, inc); if (d < bd) { bd = d; best = inc; }
    }
    return best;
  }
  function aiUpdate(a, dt) {
    const lvl = a.ai, L = G.lanes[a.role === 'auto' ? 0 : 1];
    a.cool -= dt;
    if (a.mode === 'idle') {
      const inc = a.role !== 'npc' && a.cool <= 0 ? pickInc(a) : null;
      if (inc) {
        a.mode = 'toInc'; a.inc = inc;
        goTo(a, inc.ax, inc.az, lvl.speed, () => {
          if (inc.done || (inc.claim && inc.claim !== a)) { a.mode = 'idle'; return; }
          inc.claim = a; a.mode = 'incThink'; a.tgtRy = Math.atan2(inc.x - a.x, inc.z - a.z);
          a.think = lvl.think * (1 + G.r() * 0.6) + (a.role === 'auto' ? 2.6 : 0);
          if (a.role === 'auto') { openInspect(inc, a); caption(R.DEMO.inc, 4); }
        });
        if (a.role === 'auto' && !G.demoRadio) { G.demoRadio = true; caption(R.DEMO.radio, 4); G.radioT = 5; }
      } else {
        a.mode = 'toPost'; a.atStation = false;
        goTo(a, L.agent.x, L.agent.z, lvl.speed, () => { a.mode = 'post'; L.op = a; a.atStation = true; a.tgtRy = L.agent.ry; if (a.role === 'auto') G.atPost = true; if (L.stage === 'id' || L.stage === 'xray') stageEnter(L); });
      }
    } else if (a.mode === 'toInc') {
      if (a.inc.done || (a.inc.claim && a.inc.claim !== a)) { a.mode = 'idle'; a.path = null; a.cool = 0.5; }
    } else if (a.mode === 'incThink') {
      const inc = a.inc;
      if (inc.done) { a.mode = 'idle'; if (a.role === 'auto') G.inspect = null; return; }
      a.think -= dt;
      if (a.think <= 0) {
        const doAct = R.aiInc(inc, lvl, G.r);
        if (a.role === 'auto') { G.inspect = null; ring.visible = false; }
        resolveInc(inc, a, doAct);
        a.mode = 'idle'; a.cool = 2 + G.r() * 2;
      }
    } else if (a.mode === 'post') {
      stationUpdate(a, L);
      const between = L.stage === 'none' || L.stage === 'call';
      if (a.role !== 'npc' && between && a.cool <= 0 && L.queue.length < 6) {
        const inc = pickInc(a);
        if (inc) { L.op = null; a.atStation = false; a.mode = 'idle'; a.cool = 0; if (a.role === 'auto') G.atPost = false; L.monDirty = true; }
      }
    }
    stepActor(a, dt);
  }

  /* ---------- update ---------- */
  function update(dt) {
    if (!G) return;
    A.update(performance.now() / 1000, dt);
    if (G.paused || G.phase === 'result' || G.phase === 'handoff') { for (const a of actors) if (a !== player) animFox(a.fox, dt, 0); animFox(player.fox, dt, 0); return; }
    G.t += dt; G.left -= dt;
    for (const L of G.lanes) laneUpdate(L, dt);
    for (const q of [...G.pax]) paxUpdate(q, dt);
    incUpdate(dt);
    if (player.ai) aiUpdate(player, dt); else playerUpdate(dt);
    if (rival && rival.ai) aiUpdate(rival, dt);
    for (const a of actors) if (a !== player && a !== rival) stepActor(a, dt);
    stepTweens(dt);
    /* queue pressure */
    const L0 = G.lanes[0], L1 = G.lanes[1];
    if (waiting(L0) >= 6) { G.queueT += dt; if (G.queueT >= 6) { G.queueT = 0; G.score += R.PTS.queue; toast('LINE IS BACKING UP', R.PTS.queue, false); audio.sfx('bad'); } } else G.queueT = 0;
    if (rival && rival.role === 'rival') { if (waiting(L1) >= 6) { G.rqueueT += dt; if (G.rqueueT >= 6) { G.rqueueT = 0; rival.score += R.PTS.queue; } } else G.rqueueT = 0; }
    /* timers */
    if (G.toastT > 0) { G.toastT -= dt; if (G.toastT <= 0) { G.toast = null; dirty = true; } }
    if (G.capT > 0) { G.capT -= dt; if (G.capT <= 0) { G.caption = null; dirty = true; } }
    if (G.radioT > 0) G.radioT -= dt;
    if (G.radioCd > 0) G.radioCd -= dt;
    G.nextPA -= dt;
    if (G.nextPA <= 0) { G.nextPA = 30 + G.r() * 12; audio.sfx('chime'); if (!G.caption) caption('PA: ' + R.PA[G.paIdx++ % R.PA.length], 5); }
    G.boardT -= dt; if (G.boardT <= 0) { G.boardT = 5; G.clock += 1; redrawBoard(); }
    derivePhase();
    if (G.left <= 0) endShift();
  }
  function derivePhase() {
    const before = G.phase;
    const L = G.lanes[0];
    if (G.inspect) G.phase = 'inspect';
    else if (G.atPost) { const s = L.stage; G.phase = s === 'id' ? 'id' : (s === 'toss' || s === 'belt') ? 'belt' : s === 'xray' ? 'xray' : s === 'reveal' ? 'reveal' : 'post'; }
    else G.phase = 'patrol';
    if (G.phase !== before) dirty = true;
  }
  function redrawBoard() {
    const hhmm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    G.flights = G.flights.filter(f => f.t > G.clock - 3);
    while (G.flights.length < 5) { const d = R.DESTS[(G.clock + G.flights.length * 3) % R.DESTS.length]; const last = G.flights.length ? G.flights[G.flights.length - 1].t : G.clock; G.flights.push({ code: d[0], dest: d[1], gate: d[2], t: last + 9 + (G.clock % 7) }); }
    const rows = G.flights.map((f, i) => ({ time: hhmm(f.t), code: f.code, dest: f.dest, gate: f.gate, status: f.t - G.clock <= 2 ? 'FINAL CALL' : f.t - G.clock <= 15 ? 'BOARDING' : (i === 3 ? 'DELAYED' : 'ON TIME') }));
    drawBoard(A.board.ctx, 1024, 288, rows, hhmm(G.clock));
    A.board.tex.needsUpdate = true;
  }

  function endShift() {
    if (G.phase === 'result' || G.phase === 'handoff') return;
    const L = G.lanes[0]; if (L.stage === 'reveal') endReveal(L);
    G.inspect = null; G.reveal = null; ring.visible = false; G.left = 0;
    audio.sfx('end');
    const stars = R.stars(G.score, G.len);
    const statRows = [['SCREENED', G.stats.screened], ['CAUGHT', G.stats.caught], ['INCIDENTS', G.stats.incidents], ['MISTAKES', G.stats.mistakes]].map(([label, value]) => ({ label, value }));
    if (G.mode === 'local') {
      pp.scores[G.playerIdx] = G.score;
      if (G.playerIdx + 1 < settings.players) {
        G.phase = 'handoff';
        G.handoff = { last: 'PLAYER ' + (G.playerIdx + 1), score: G.score, next: 'PLAYER ' + (G.playerIdx + 2), stars };
        dirty = true; return;
      }
      const rows = pp.scores.map((s, i) => ({ name: 'PLAYER ' + (i + 1), score: s })).sort((a, b) => b.score - a.score);
      const top = rows[0];
      const gold = R.gold(top.score, true); store.gold(gold);
      const best0 = store.get('best', 0), mx = Math.max(...pp.scores), newBest = mx > best0; if (newBest) store.set('best', mx);
      G.result = { title: top.name + ' WINS', sub: 'Pass and play. Same airport, same passengers, ' + rows.length + ' agents.', score: top.score, best: Math.max(best0, mx), newBest, gold, xp: Math.max(0, Math.round(top.score / 10)), stars: R.stars(top.score, G.len), rows, stats: statRows };
    } else if (G.mode === 'demo') {
      G.result = { title: 'DEMO OVER', sub: 'Now try it yourself. Pick VS CPU or PASS AND PLAY.', score: G.score, best: store.get('best', 0), newBest: false, gold: 0, xp: 0, stars, rows: [{ name: 'AUTO AGENT', score: G.score }, { name: rival.name, score: rival.score }].sort((a, b) => b.score - a.score), stats: statRows };
    } else {
      const rv = rival.score, won = G.score > rv;
      const best0 = store.get('best', 0), newBest = G.score > best0; if (newBest) store.set('best', G.score);
      const gold = R.gold(G.score, won); store.gold(gold);
      const xp = Math.max(0, Math.round(G.score / 10)); store.set('xp', store.get('xp', 0) + xp);
      G.result = { title: won ? 'YOU WIN THE SHIFT' : G.score === rv ? 'DEAD HEAT' : rival.name + ' WINS THE SHIFT', sub: won ? 'Sharp eyes, agent.' : 'Try again. Watch the line and the floor.', score: G.score, best: Math.max(best0, G.score), newBest, gold, xp, stars, won, rows: [{ name: 'YOU', score: G.score }, { name: rival.name, score: rv }].sort((a, b) => b.score - a.score), stats: statRows };
    }
    G.phase = 'result'; dirty = true;
  }
  function nextPlayer() { if (G && G.phase === 'handoff') startShift('local', G.playerIdx + 1); }

  /* ---------- camera ---------- */
  const UP = new THREE.Vector3(0, 1, 0), goalPos = new THREE.Vector3(), goalQ = new THREE.Quaternion(), _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _c = new THREE.Vector3(), _m4 = new THREE.Matrix4(), _box = new THREE.Box3(), _t = new THREE.Vector3();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function setLens() {
    camera.fov = WO ? (WO.camera.fov || 50) : (H > W ? 58 : 44);
    camera.aspect = W / H; camera.updateProjectionMatrix();
  }
  function fit(points, f, minD) {
    _f.copy(f).normalize(); _r.crossVectors(_f, UP).normalize(); _u.crossVectors(_r, _f).normalize();
    _box.setFromPoints(points); _box.getCenter(_c);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), tanH = tanV * camera.aspect;
    const fx0 = safe.left, fx1 = W - safe.right, fy0 = safe.top, fy1 = H - safe.bottom;
    const fw = clamp(fx1 - fx0, W * 0.35, W), fh = clamp(fy1 - fy0, H * 0.28, H);
    const tx = tanH * fw / W, ty = tanV * fh / H;
    let d = minD || 3;
    for (const p of points) {
      _t.subVectors(p, _c); const x = _t.dot(_r), y = _t.dot(_u), a = _t.dot(_f);
      d = Math.max(d, Math.abs(x) / tx - a, Math.abs(y) / ty - a);
    }
    d *= 1.06;
    const ncx = clamp(((fx0 + fx1) / 2 - W / 2) / (W / 2), -0.6, 0.6), ncy = clamp((H / 2 - (fy0 + fy1) / 2) / (H / 2), -0.6, 0.6);
    goalPos.copy(_c).addScaledVector(_f, -d).addScaledVector(_r, -ncx * tanH * d).addScaledVector(_u, -ncy * tanV * d);
    _t.copy(goalPos).add(_f); _m4.lookAt(goalPos, _t, UP); goalQ.setFromRotationMatrix(_m4);
  }
  function computeGoal() {
    setLens();
    const portrait = H > W;
    if (!G || G.phase === 'result' || G.phase === 'handoff') {
      fit([V(-36, 0, -30), V(36, 0, -30), V(-36, 0, 32), V(36, 0, 32)], V(0, -0.86, -0.5), 20); return;
    }
    const L = G.lanes[0], ph = G.phase, s = L.s;
    if (ph === 'belt' || ph === 'xray' || ph === 'reveal') {
      const c = L.screen;
      fit([V(c.x - 1.2, c.y - 0.78, c.z), V(c.x + 1.2, c.y + 0.78, c.z), V(c.x, c.y, c.z + 0.1)], V(0, -0.12, -1), 2); return;
    }
    if (ph === 'id' || ph === 'post') {
      const p = L.p0;
      fit([V(p.x - 0.7, 0.4, p.z - 0.7), V(p.x + 0.7, 3.1, p.z + 0.7), V(s * 8.3, 1.8, 3.4)], V(s * 0.74, -0.3, -0.6), 4); return;
    }
    const pl = player, ex = portrait ? 3.8 : 7;
    const pts = [V(pl.x - ex, 0, pl.z - 5.5), V(pl.x + ex, 0, pl.z + 3.4), V(pl.x, 3, pl.z)];
    if (ph === 'inspect') { const inc = G.inc.find(i => G.inspect && i.id === G.inspect.id); if (inc) pts.push(V(inc.x - 1.2, 0, inc.z - 1.2), V(inc.x + 1.2, 2.4, inc.z + 1.2)); }
    fit(pts, V(0, -0.8, -0.6), 8);
  }
  let camInit = false;
  function aimCam(dt) {
    computeGoal();
    if (!camInit) { camera.position.copy(goalPos); camera.quaternion.copy(goalQ); camInit = true; }
    const k = 1 - Math.exp(-dt * 4.5);
    camera.position.lerp(goalPos, k); camera.quaternion.slerp(goalQ, k);
    camera.updateMatrixWorld();
    /* hide the overhead board when it sits between the camera and the player; hide columns in the overview */
    const over = !G || G.phase === 'result' || G.phase === 'handoff';
    let block = false;
    if (G && player && !over) block = segHitsBox(camera.position, player.x, 2.0, player.z, -9.5, 9.5, 4.6, 12.6, 3.6, 5.6);
    A.overhead.visible = !block;
    if (A.columns) A.columns.visible = !over;
    /* in the monitor view, hide anyone standing between the camera and the screen */
    const monView = G && (G.phase === 'belt' || G.phase === 'xray' || G.phase === 'reveal');
    const sc = G ? G.lanes[0].screen : null;
    for (const a of actors) a.fox.visible = !(monView && Math.abs(a.x - sc.x) < 1.7 && a.z > sc.z && a.z < camera.position.z + 0.6);
    if (WO) {
      scene.updateWorldMatrix(true, false);
      wcam.position.copy(camera.position); scene.localToWorld(wcam.position);
      const q = new THREE.Quaternion(); scene.getWorldQuaternion(q); wcam.quaternion.copy(q).multiply(camera.quaternion);
      wcam.fov = camera.fov; wcam.aspect = camera.aspect; wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
    }
  }
  function segHitsBox(c, px, py, pz, x0, x1, y0, y1, z0, z1) {
    if (c.x > x0 && c.x < x1 && c.y > y0 && c.y < y1 && c.z > z0 && c.z < z1) return true;
    let t0 = 0, t1 = 1;
    for (const [o, d, lo, hi] of [[c.x, px - c.x, x0, x1], [c.y, py - c.y, y0, y1], [c.z, pz - c.z, z0, z1]]) {
      if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return false; continue; }
      let a = (lo - o) / d, b = (hi - o) / d; if (a > b) { const t = a; a = b; b = t; }
      t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return false;
    }
    return true;
  }
  function snapCam() { camInit = false; aimCam(0.016); }

  /* ---------- shadows ---------- */
  function updateShadows() {
    let n = 0;
    for (const a of actors) { if (n >= 80) break; _dm.position.set(a.x, 0.03, a.z); _dm.scale.setScalar(a.fox.userData.sit ? 0.8 : 1); _dm.updateMatrix(); shadows.setMatrixAt(n++, _dm.matrix); }
    shadows.count = n; shadows.instanceMatrix.needsUpdate = true;
    if (ring.visible) { ring.rotation.y += 0.02; ring.userData.arrow.position.y = 3.9 + Math.sin(performance.now() / 200) * 0.2; }
  }

  /* ---------- HUD state ---------- */
  function idCard(L) {
    const d = L.cur.data;
    return { n: L.num, photo: d.photo, live: d.fur, idName: d.idName, exp: d.exp, passName: d.passName, flight: d.flight, dest: d.dest, gate: d.gate, seat: d.seat, date: d.date };
  }
  function mapPt(x, z) { return { x: Math.round(((x + 40) / 80) * 1000) / 10, y: Math.round(((z + 34) / 68) * 1000) / 10 }; }
  function hud() {
    if (!G) return { key: KEY, phase: 'loading' };
    const L0 = G.lanes[0], w = waiting(L0);
    const showInc = G.radioT > 0;
    return {
      key: KEY, phase: G.phase, mode: G.mode, demo: G.mode === 'demo', world: !!WO, paused: G.paused, menu: G.paused,
      level: settings.level, levelName: R.LEVELS[settings.level].name, levels: R.LEVELS.map((l, i) => ({ i, name: l.name, title: l.title, blurb: l.blurb })),
      players: settings.players, playerNo: G.playerIdx + 1,
      time: Math.max(0, G.left), timeText: fmt(G.left), low: G.left < 20,
      score: G.score, best: store.get('best', 0), gold: store.get('gold', 0),
      rival: G.mode === 'local' ? null : { name: rival.name, score: rival.score },
      queue: w, queueWarn: w >= 5,
      near: near ? { kind: near.kind, label: near.label } : null,
      sprint: sprintBtn || sprintKey, radioReady: G.radioCd <= 0, radioCd: Math.max(0, Math.ceil(G.radioCd)),
      id: G.phase === 'id' && L0.cur ? idCard(L0) : null,
      xray: (G.phase === 'xray' || G.phase === 'belt') ? { ready: G.phase === 'xray', tags: L0.bag ? L0.bag.items.filter(i => i.tag).length : 0, num: L0.num } : null,
      inspect: G.inspect, reveal: G.phase === 'reveal' ? G.reveal : null,
      toast: G.toast, caption: G.caption, feed: G.feed,
      map: {
        p: { ...mapPt(player.x, player.z), a: Math.round(player.ry * 180 / PI) },
        rv: rival ? mapPt(rival.x, rival.z) : null,
        post: mapPt(L0.agent.x, L0.agent.z),
        inc: showInc ? G.inc.filter(i => !i.done).map(i => ({ ...mapPt(i.x, i.z), id: i.id })) : [],
      },
      result: G.phase === 'result' ? G.result : null,
      handoff: G.phase === 'handoff' ? G.handoff : null,
      idle: !G.paused && G.mode !== 'demo' && ['patrol', 'id', 'xray', 'inspect'].includes(G.phase) && performance.now() - lastInput > 3000,
      sound: settings.sound, music: settings.music, today: R.TODAY.text,
    };
  }
  function emit() { dirty = false; emitT = 0; try { onState(hud()); } catch (e) { console.error(e); } }

  /* ---------- input ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function onPointer(e) {
    if (WO) { if (e.target !== renderer.domElement) return; e.preventDefault(); e.stopImmediatePropagation(); }
    lastInput = performance.now(); audio.unlock();
    if (!G || G.paused || G.phase !== 'xray' || G.mode === 'demo') return;
    const L = G.lanes[0];
    const rc = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    camera.updateMatrixWorld(); ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction, sc = L.screen;
    if (Math.abs(d.z) < 1e-5) return;
    const t = (sc.z - o.z) / d.z; if (t < 0) return;
    const u = (o.x + d.x * t - (sc.x - sc.w / 2)) / sc.w, v = 1 - (o.y + d.y * t - (sc.y - sc.h / 2)) / sc.h;
    if (u < 0 || u > 1 || v < 0 || v > 1) return;
    const it = hitXray(L.bag, u * XW, v * XH);
    if (it) { it.tag = !it.tag; audio.sfx(it.tag ? 'tag' : 'untag'); L.monDirty = true; drawMonitor(L); dirty = true; }
    else audio.sfx('tap');
  }
  function button(n) {
    if (!G || G.paused) return;
    lastInput = performance.now(); audio.unlock();
    const L = G.lanes[0];
    switch (G.phase) {
      case 'patrol': if (n === 1) act(); else if (n === 2) { sprintBtn = !sprintBtn; dirty = true; } else radio(); break;
      case 'post': case 'belt': if (n === 3) leavePost(); break;
      case 'id': if (n === 1) decideId(L, true, player); else if (n === 2) decideId(L, false, player); else leavePost(); break;
      case 'xray': if (n === 1) decideBag(L, false, player); else if (n === 2) decideBag(L, true, player); else leavePost(); break;
      case 'reveal': endReveal(L); break;
      case 'inspect': if (n === 1) inspectChoose(true); else if (n === 2) inspectChoose(false); break;
      case 'handoff': nextPlayer(); break;
      case 'result': if (n === 1) api.restart(); break;
    }
  }
  const MOVE = { KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
  const BTN = { Digit1: 1, Numpad1: 1, KeyE: 1, Space: 1, Enter: 1, Digit2: 2, Numpad2: 2, Digit3: 3, Numpad3: 3, KeyR: 3 };
  function key(e) {
    if (!e || !e.code) return;
    const down = e.type !== 'keyup';
    const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
    const mv = MOVE[e.code];
    if (mv) { keys[mv] = down ? performance.now() + (WO ? 300 : 1e12) : 0; if (down) lastInput = performance.now(); if (G && G.phase === 'patrol' && e.preventDefault) e.preventDefault(); return; }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { sprintKey = down; return; }
    if (!down || e.repeat) return;
    if (e.code === 'Escape' || e.code === 'KeyM') { api.menu(!(G && G.paused)); return; }
    const n = BTN[e.code]; if (!n) return;
    if (e.preventDefault) e.preventDefault();
    button(n);
  }
  function clearKeys() { for (const k in keys) keys[k] = 0; sprintKey = false; }
  const target = WO ? window : renderer.domElement;
  target.addEventListener('pointerdown', onPointer, WO ? { capture: true } : false);
  if (!WO) { window.addEventListener('keydown', key); window.addEventListener('keyup', key); window.addEventListener('blur', clearKeys); }

  /* ---------- loop ---------- */
  let raf = 0, last = performance.now(), alive = true;
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    if (WO) readSize();
    update(dt);
    updateShadows();
    aimCam(dt);
    if (!WO) renderer.render(root, camera);
    emitT += dt;
    if (dirty || emitT >= 0.1) emit();
  }

  /* ---------- API ---------- */
  const api = {
    hud,
    setSafe(s) { safe = { top: s.top || 0, bottom: s.bottom || 0, left: s.left || 0, right: s.right || 0 }; },
    start(mode) { const m = ['cpu', 'local', 'demo'].includes(mode) ? mode : 'cpu'; pp.scores = []; pp.seed = (Math.random() * 1e9) | 0; startShift(m, 0); },
    restart() { api.start(settings.mode); },
    key,
    get camera() { return WO ? wcam : camera; },
    snapCam,
    destroy() {
      if (!alive) return; alive = false;
      cancelAnimationFrame(raf);
      target.removeEventListener('pointerdown', onPointer, WO ? { capture: true } : false);
      if (!WO) { window.removeEventListener('keydown', key); window.removeEventListener('keyup', key); window.removeEventListener('blur', clearKeys); }
      if (ro) ro.disconnect();
      audio.close();
      clearWorld();
      scene.traverse(n => { if (n.geometry) n.geometry.dispose(); });
      A.dispose(); shadowGeo.dispose(); shadowMat.dispose(); (ring.userData.own || []).forEach(d => d.dispose());
      if (WO) { if (scene.parent) scene.parent.remove(scene); env.traverse(n => { if (n.geometry) n.geometry.dispose(); }); }
      else { env.traverse(n => { if (n.geometry) n.geometry.dispose(); }); renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); }
      clearMats();
    },
    /* buttons the page calls */
    button,
    act, radio, takePost, leavePost,
    move(x, y) { joy.x = clamp(+x || 0, -1, 1); joy.y = clamp(+y || 0, -1, 1); if (x || y) lastInput = performance.now(); },
    sprint(on) { sprintBtn = !!on; dirty = true; },
    approve() { if (G && G.phase === 'id') button(1); },
    deny() { if (G && G.phase === 'id') button(2); },
    clearBag() { if (G && G.phase === 'xray') button(1); },
    searchBag() { if (G && G.phase === 'xray') button(2); },
    inspectAct() { inspectChoose(true); },
    inspectClear() { inspectChoose(false); },
    skip() { if (G && G.phase === 'reveal') endReveal(G.lanes[0]); },
    next: nextPlayer,
    quit() { if (G && G.phase !== 'result' && G.phase !== 'handoff') { G.paused = false; endShift(); emit(); } },
    menu(open) { if (!G) return; G.paused = !!open; if (open) clearKeys(); dirty = true; emit(); },
    setLevel(i) { settings.level = clamp(i | 0, 0, 2); store.set('level', settings.level); api.start('cpu'); },
    setPlayers(n) { settings.players = clamp(n | 0, 2, 4); store.set('players', settings.players); api.start('local'); },
    setMode(m) { api.start(m); },
    setSound(b) { settings.sound = !!b; store.set('sound', settings.sound); audio.setMuted(!settings.sound); if (settings.sound) audio.sfx('tap'); dirty = true; },
    setMusic(b) { settings.music = !!b; if (!WO) store.set('music', settings.music); audio.setMusic(settings.music); audio.unlock(); dirty = true; },
    unlock() { audio.unlock(); },
    /* tap the x-ray screen in normalized screen coords (0..1), for tests or custom UIs */
    tapXray(u, v) { if (!G || G.phase !== 'xray') return; const L = G.lanes[0]; const it = hitXray(L.bag, u * XW, v * XH); if (it) { it.tag = !it.tag; audio.sfx(it.tag ? 'tag' : 'untag'); drawMonitor(L); dirty = true; } },
    get debug() { return { G, player, rival, A, camera }; },
  };

  api.start(settings.mode);
  raf = requestAnimationFrame(frame);
  emit();
  return api;
}

export default createAirport;
