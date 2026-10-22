/* 8 GATES 3D - CROQUET minigame module.
   Standalone: makes its own renderer inside `container`.
   World mode (opts.world = { renderer, camera, parent }): builds only the court into a Group under parent,
   never renders, exposes a world-space camera as api.camera. */
import * as THREE from '../../vendor/three/three.module.js';
import * as R from './croquet-rules.js';
import { createAudio } from './croquet-audio.js';
import * as K from './croquet-models.js';

export const GAME = { key: 'croquet', name: 'CROQUET', maxPlayers: 4 };

export const CAST = [
  { name: 'PIP', level: 0, torso: ['#f0a03c', '#fff3e0', '#ffd23a'], outfit: 'tee', mood: 'happy', tag: 'ROOKIE' },
  { name: 'HOPE', level: 1, torso: ['#d9773e', '#fff3e0', '#f4f1ea'], outfit: 'vest', mood: 'calm', legs: '#2f6fdb', glasses: true, cane: true, tag: 'CLUB' },
  { name: 'NOBLE', level: 2, torso: ['#b8572f', '#f4e6d4', '#2b2d42'], outfit: 'coat', mood: 'stern', eyes: '#ff2a2a', chair: true, tag: 'MASTER' },
];
const THINK_LINES = ['PIP is lining up a shot.', 'HOPE listens, then feels for the line.', 'NOBLE calculates the angle.'];
const SETTINGS_KEY = 'croquet.settings';
const TAU = Math.PI * 2;
const STAND = 0.9;               /* mallet head rests this far behind the ball */
const SIDE = 0.62;               /* the fox stands beside the mallet, away from the camera */
const SPECTATOR_SPOTS = [[-8.3, -1.2, 1], [8.3, -1.2, -1], [-8.3, -4.4, 1], [8.3, -4.4, -1]];

function lsGet(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export async function createCroquet({ container, onState = () => {}, opts = {} } = {}) {
  const world = opts.world || null;
  const kit = opts.kit || null;
  const save = opts.save || null;
  const touch = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0);

  /* ---------- renderer / scene ---------- */
  let renderer, renderScene = null, envScene;
  const root = new THREE.Group();           /* "scene" in the brief: every game object lives here */
  root.name = 'croquet';
  if (world) {
    renderer = world.renderer;
    world.parent.add(root);
    envScene = new THREE.Scene();          /* throw-away: lights, sky and garden never reach the town */
  } else {
    renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.75 : 2));
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;';
    container.appendChild(renderer.domElement);
    renderScene = new THREE.Scene();
    renderScene.add(root);
    envScene = renderScene;
  }
  const canvas = renderer.domElement;

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  const wcam = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  const _q = new THREE.Quaternion();

  K.buildCourt(root);
  if (!world) K.buildGarden(envScene, { touch });
  else envScene.add(new THREE.HemisphereLight('#ffffff', '#446633', 1));   /* throw-away scene: never rendered */

  const aimGuide = K.makeAimGuide();
  aimGuide.visible = false;
  root.add(aimGuide);
  const marker = K.makeTargetMarker();
  root.add(marker);

  /* ---------- settings ---------- */
  const stored = lsGet(SETTINGS_KEY, {});
  const settings = {
    mode: opts.mode || stored.mode || 'cpu',
    level: clamp(stored.level ?? 1, 0, 2),
    opponents: clamp(stored.opponents ?? 1, 1, 3),
    humans: clamp(stored.humans ?? 2, 2, 4),
    sound: stored.sound ?? true,
    music: world ? false : (stored.music ?? true),
  };
  if (settings.mode === 'left') settings.mode = 'cpu';
  const audio = createAudio({ music: settings.music, sound: settings.sound });
  function persist() { lsSet(SETTINGS_KEY, { mode: settings.mode, level: settings.level, opponents: settings.opponents, humans: settings.humans, sound: settings.sound, music: world ? stored.music : settings.music }); }

  /* ---------- per-player actors ---------- */
  let actors = [];
  function clearActors() {
    for (const a of actors) {
      root.remove(a.ball, a.ballShadow, a.holder, a.foxShadow, a.mallet);
      a.mallet.traverse(o => o.geometry && o.geometry.dispose());
      a.ball.traverse(o => o.geometry && o.geometry.dispose());
      if (!a.fox.userData.kitFox) a.holder.traverse(o => o.geometry && o.geometry.dispose());
    }
    actors = [];
  }
  function buildActors(players) {
    clearActors();
    players.forEach((p, i) => {
      const ball = K.makeBall(p.color);
      const ballShadow = K.makeShadow(0.75);
      const holder = new THREE.Group();
      const look = p.look;
      const fox = K.makeFox({ torso: look.torso, outfit: look.outfit, mood: look.mood, legs: look.legs, eyes: look.eyes }, kit);
      holder.add(fox);
      let lift = 0, chair = null;
      if (look.chair) {
        chair = K.makeChair(); holder.add(chair);
        lift = 0.42; fox.position.y = lift;
      }
      if (look.glasses) K.addSunglasses(fox);
      let cane = null;
      if (look.cane) { cane = K.makeCane(); cane.position.set(0.72, 0, -0.15); cane.rotation.z = -0.12; holder.add(cane); }
      const mallet = K.makeMallet(p.color, 1.05 + lift - 0.12);
      mallet.userData.handY = 1.05 + lift;
      root.add(mallet);
      const foxShadow = K.makeShadow(1.6);
      const spot = SPECTATOR_SPOTS[i % 4];
      holder.position.set(spot[0], 0, spot[1]);
      holder.rotation.y = Math.atan2(spot[2], 0);
      root.add(ball, ballShadow, holder, foxShadow);
      ball.visible = false; ballShadow.visible = false;
      actors.push({ ball, ballShadow, holder, fox, mallet, chair, cane, foxShadow, lift, swing: 0, walkSpeed: 0, lastX: 0, lastZ: 0, jump: 0, look });
    });
  }

  function makePlayers(mode) {
    const list = [];
    if (mode === 'local') {
      for (let i = 0; i < settings.humans; i++) list.push({ name: 'PLAYER ' + (i + 1), kind: 'human', level: 1, look: { torso: ['#e8743b', '#fff3e0', K.BALL_COLORS[i]], outfit: ['vest', 'tee', 'coat', 'dress'][i] } });
    } else if (mode === 'demo') {
      list.push({ ...castPlayer(1) }, { ...castPlayer(0) });
    } else {
      list.push({ name: 'YOU', kind: 'human', level: 1, look: { torso: ['#e8743b', '#fff3e0', '#2f6fdb'], outfit: 'vest' } });
      const order = [settings.level, ...[0, 1, 2].filter(l => l !== settings.level)];
      for (let i = 0; i < settings.opponents; i++) list.push(castPlayer(order[i]));
    }
    return list.map((p, i) => ({ ...p, color: K.BALL_COLORS[i], ball: K.BALL_NAMES[i] }));
  }
  function castPlayer(l) { const c = CAST[l]; return { name: c.name, kind: 'cpu', level: c.level, look: c, tag: c.tag }; }

  /* ---------- state ---------- */
  let m = null, mode = settings.mode;
  let phase = 'intro', phaseT = 0, paused = false;
  let aimAngle = -Math.PI / 2, power = 0.45, charging = false, chargeT = 0, chargeByKey = false, chargeKeyT = 0;
  let camYaw = -Math.PI / 2, view = 'aim', camFrozen = false;
  let drag = null, events = [], evSeen = 0, acc = 0;
  let cpuPlan = null, cpuStage = 0, cpuT = 0, cpuFrom = 0;
  let message = '', caption = '', result = null, lastInput = performance.now();
  let pendingStrike = null, waitT = 0, afterWait = null;
  let taught = {};
  let safe = { top: 0, bottom: 0, left: 0, right: 0 };
  let ver = 0;

  function cur() { return m.players[m.turn]; }
  function curActor() { return actors[m.turn]; }
  function isHumanTurn() { return m && !m.over && cur().kind === 'human'; }

  function targetPoint(b) {
    if (b.next >= R.PEG_TARGET) return { x: R.PEG.x, z: R.PEG.z };
    const h = R.HOOPS[b.next];
    const s = (b.z - h.z) * h.dir;
    if (s < -0.3 || b.hin) return { x: h.x, z: h.z + h.dir * 0.6 };
    return { x: h.x, z: h.z - h.dir * 0.9 };
  }

  function startMatch(newMode) {
    if (newMode) mode = newMode;
    if (mode !== 'demo') { settings.mode = mode; persist(); }
    const players = makePlayers(mode);
    m = R.createMatch(players);
    buildActors(players);
    phase = 'intro'; phaseT = 0; result = null; view = 'aim'; charging = false; drag = null; pendingStrike = null;
    afterWait = null; cpuPlan = null; taught = {};
    caption = mode === 'demo' ? 'DEMO: watch two foxes play. Open MENU to play yourself.' : '';
    message = 'Run hoops 1 to 6 in order, then hit the peg to win.';
    audio.setMusic(settings.music);
    emit(true);
  }

  function beginTurn() {
    R.prepareTurn(m);
    const b = R.striker(m);
    const t = targetPoint(b);
    aimAngle = Math.atan2(t.z - b.z, t.x - b.x);
    camYaw = aimAngle; view = 'aim'; camFrozen = false;
    power = clamp(R.powerFor(Math.hypot(t.x - b.x, t.z - b.z) + 0.6), 0.2, 0.9);
    charging = false; drag = null;
    const fa = curActor(), ss = standSpot(m.turn), fh = fa.holder.position;
    const fd = Math.hypot(fh.x - ss.x, fh.z - ss.z);
    if (fd > 4.5) { fh.x = ss.x + (fh.x - ss.x) / fd * 3; fh.z = ss.z + (fh.z - ss.z) / fd * 3; }
    const p = cur();
    const extra = m.strokesLeft > 1 ? ' ' + m.strokesLeft + ' strokes.' : '';
    audio.play('turn');
    if (p.kind === 'human') {
      phase = 'aim';
      const who = mode === 'cpu' ? 'YOUR TURN.' : p.name + ' (' + p.ball + ').';
      message = who + ' Next: ' + R.targetLabel(b.next) + '.' + extra;
      if (mode === 'cpu' && m.players[0].strokes === 0) message = 'YOUR TURN. Drag back from anywhere, let go to hit.';
      lastInput = performance.now();
    } else {
      phase = 'think'; cpuStage = 0; cpuT = 0;
      cpuPlan = R.planShot(m, p.level);
      message = THINK_LINES[p.level] + ' Next: ' + R.targetLabel(b.next) + '.';
      if (p.look.cane) setTimeout(() => audio.play('cane'), 250), setTimeout(() => audio.play('cane'), 520);
    }
    if (mode === 'demo') teachFor(b);
    phaseT = 0;
    emit(true);
  }

  function teachFor(b) {
    if (b.next === R.PEG_TARGET && !taught.peg) { taught.peg = 1; caption = 'After hoop 6, hit the peg to win.'; }
    else if (!taught.order && m.totalStrokes > 1) { taught.order = 1; caption = 'Hoops go in order. The painted arrow shows the way through.'; }
  }

  function doStrike(angle, pw) {
    if (!m || m.over) return;
    aimAngle = angle; power = clamp(pw, 0.03, 1);
    charging = false; chargeByKey = false; drag = null;
    const a = curActor();
    snapFox(a);
    pendingStrike = { angle: aimAngle, power, t: 0 };
    phase = 'swing'; phaseT = 0; camFrozen = false;
    emit(true);
  }

  function contact() {
    R.strike(m, pendingStrike.angle, pendingStrike.power);
    audio.play('mallet', pendingStrike.power);
    events = []; evSeen = 0; acc = 0;
    phase = 'roll'; phaseT = 0;
    message = '';
    emit(true);
  }

  function handleEventSounds() {
    for (; evSeen < events.length; evSeen++) {
      const e = events[evSeen];
      if (e.type === 'hit') audio.play('click', e.v);
      else if (e.type === 'leg') audio.play('leg');
      else if (e.type === 'pegtap') audio.play('pegtap');
      else if (e.type === 'hoop') { audio.play('hoop'); actors[e.ball].jump = 0.0001; }
      else if (e.type === 'out') audio.play('out');
      else if (e.type === 'peg') audio.play('peg');
    }
  }

  function finishStroke() {
    const p = cur();
    const o = R.resolveStroke(m, events);
    const msgs = [];
    if (o.hoop >= 0 && o.roquet >= 0) msgs.push('HOOP ' + (o.hoop + 1) + ' and a ROQUET on ' + m.players[o.roquet].ball + '! Two extra strokes.');
    else if (o.hoop >= 0) msgs.push(p.name + ' ran HOOP ' + (o.hoop + 1) + '! One extra stroke.');
    else if (o.roquet >= 0) { msgs.push('ROQUET on ' + m.players[o.roquet].ball + '! Two extra strokes.'); audio.play('roquet'); }
    if (o.out) msgs.push('Out of bounds. Turn over.');
    for (const id of o.peels) msgs.push(m.players[id].ball + ' was knocked through its hoop.');
    if (mode === 'demo') {
      if (o.hoop >= 0 && !taught.hoop) { taught.hoop = 1; caption = 'Running your next hoop earns one extra stroke.'; }
      else if (o.roquet >= 0 && !taught.roq) { taught.roq = 1; caption = 'Hitting another ball is a ROQUET: two extra strokes.'; }
      else if (o.out && !taught.out) { taught.out = 1; caption = 'A ball that leaves the court goes back on the line. Turn over.'; }
    }
    message = msgs.slice(0, 2).join(' ') || (o.turnEnds ? '' : 'Extra stroke.');
    if (m.over) { endGame(); return; }
    if (o.turnEnds) {
      R.nextTurn(m);
      wait(message ? 1.1 : 0.5, beginTurn);
    } else wait(0.7, beginTurn);
    emit(true);
  }

  function wait(t, fn) { phase = 'wait'; waitT = t; afterWait = fn; phaseT = 0; }

  function endGame() {
    phase = 'over'; phaseT = 0;
    const w = m.winner;
    const winP = m.players[w];
    actors[w].jump = 0.0001;
    const rank = R.ranking(m);
    const focus = mode === 'cpu' ? 0 : w;
    const fp = m.players[focus], fb = m.balls[focus];
    const won = focus === w;
    const hoops = fp.hoops;
    const score = Math.max(0, hoops * 10 + (fb.done ? 30 : 0) - fp.strokes);
    let gold = 0, xp = 0;
    if (mode === 'cpu') {
      gold = won ? [20, 35, 55][settings.level] + (settings.opponents - 1) * 10 : 5;
      xp = hoops * 5 + (won ? 40 : 10);
    } else if (mode === 'local') { gold = 10; xp = 15; }
    const stars = !won || mode === 'demo' ? 0 : score >= 70 ? 3 : score >= 55 ? 2 : 1;
    let best = 0, newBest = false;
    if (mode !== 'demo') {
      if (save) {
        best = Number(save.stat('croquet.best', 0)) || 0;
        if (score > best) { save.setStat('croquet.best', score); best = score; newBest = true; }
        if (gold) save.addGold(gold);
        save.setStat('croquet.xp', (Number(save.stat('croquet.xp', 0)) || 0) + xp);
        if (won) save.setStat('croquet.wins', (Number(save.stat('croquet.wins', 0)) || 0) + 1);
      } else {
        best = lsGet('croquet.best', 0);
        if (score > best) { lsSet('croquet.best', score); best = score; newBest = true; }
        lsSet('croquet.gold', lsGet('croquet.gold', 0) + gold);
        lsSet('croquet.xp', lsGet('croquet.xp', 0) + xp);
        if (won) lsSet('croquet.wins', lsGet('croquet.wins', 0) + 1);
      }
    } else best = save ? Number(save.stat('croquet.best', 0)) || 0 : lsGet('croquet.best', 0);
    const title = mode === 'cpu' ? (won ? 'YOU WIN' : winP.name + ' WINS') : winP.name + ' WINS';
    result = {
      title, won, score, best, newBest, gold, xp, stars,
      strokes: fp.strokes, hoops,
      rows: rank.map((id, i) => ({ place: i + 1, name: m.players[id].name, ball: m.players[id].ball, color: m.players[id].color, hoops: m.players[id].hoops, strokes: m.players[id].strokes, pegged: m.balls[id].done })),
    };
    message = winP.name + ' pegged out and wins the game.';
    if (mode === 'demo') caption = 'That is croquet. Open MENU and pick VS CPU to play.';
    audio.play(won || mode !== 'cpu' ? 'win' : 'lose');
    emit(true);
  }

  /* ---------- camera ---------- */
  const V = () => new THREE.Vector3();
  const camGoalPos = V(), camGoalQuat = new THREE.Quaternion();
  let camInit = false;
  function viewSize() {
    if (world) return { w: canvas.clientWidth || 1, h: canvas.clientHeight || 1 };
    return { w: container.clientWidth || 1, h: container.clientHeight || 1 };
  }
  function fit(points, yaw, pitch, minD = 4) {
    const { w: W, h: H } = viewSize();
    const fx = Math.cos(yaw), fz = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const f = new THREE.Vector3(fx * cp, -sp, fz * cp);
    const r = new THREE.Vector3(-fz, 0, fx);
    const u = new THREE.Vector3().crossVectors(r, f);
    const T = new THREE.Vector3();
    points.forEach(p => T.add(p)); T.multiplyScalar(1 / points.length);
    const tV = Math.tan(camera.fov * Math.PI / 360), tH = tV * W / H;
    let xmin = -1 + 2 * safe.left / W, xmax = 1 - 2 * safe.right / W;
    let ymin = -1 + 2 * safe.bottom / H, ymax = 1 - 2 * safe.top / H;
    if (xmax - xmin < 0.6) { xmin = -1; xmax = 1; }
    if (ymax - ymin < 0.5) { ymin = -1; ymax = 1; }
    const mx = (xmax - xmin) * 0.07, my = (ymax - ymin) * 0.07;
    xmin += mx; xmax -= mx; ymin += my; ymax -= my;
    const P = points.map(p => { const d = p.clone().sub(T); return { r: d.dot(r), u: d.dot(u), f: d.dot(f) }; });
    const solve = (D, axis) => {
      let lo = -Infinity, hi = Infinity;
      const t = axis ? tV : tH, mn = axis ? ymin : xmin, mxv = axis ? ymax : xmax;
      for (const p of P) {
        const z = p.f + D; if (z < 0.6) return null;
        const c = axis ? p.u : p.r;
        lo = Math.max(lo, c - mxv * t * z); hi = Math.min(hi, c - mn * t * z);
      }
      return lo <= hi ? (lo + hi) / 2 : null;
    };
    let a = 3, b = 160;
    if (solve(b, 0) === null || solve(b, 1) === null) a = b;
    else for (let i = 0; i < 28; i++) { const mid = (a + b) / 2; if (solve(mid, 0) !== null && solve(mid, 1) !== null) b = mid; else a = mid; }
    const D = Math.max(minD, b);
    const ax = solve(D, 0) ?? 0, by = solve(D, 1) ?? 0;
    const pos = T.clone().addScaledVector(f, -D).addScaledVector(r, ax).addScaledVector(u, by);
    const mtx = new THREE.Matrix4().makeBasis(r, u, f.clone().negate());
    return { pos, quat: new THREE.Quaternion().setFromRotationMatrix(mtx) };
  }
  function v3(x, y, z) { return new THREE.Vector3(x, y, z); }
  function camGoal() {
    const { w: W, h: H } = viewSize();
    const portrait = H > W * 1.05;
    const courtPts = [v3(-R.COURT.hw, 0, -R.COURT.hl), v3(R.COURT.hw, 0, -R.COURT.hl), v3(-R.COURT.hw, 0, R.COURT.hl), v3(R.COURT.hw, 0, R.COURT.hl), v3(0, 0.8, 0)];
    if (!m || phase === 'intro' || phase === 'over' || phase === 'left' || view === 'map') {
      return fit(courtPts, -Math.PI / 2, portrait ? 1.2 : 0.95);
    }
    const b = R.striker(m);
    const pts = [];
    const pitch = portrait ? 1.12 : 0.95;
    const yaw = camYaw + 0.72;
    const minD = portrait ? 11 : 10;
    if (phase === 'roll') {
      m.balls.forEach(o => { if (o.inPlay && R.moving(o)) pts.push(v3(o.x, 0.2, o.z)); });
      if (b.inPlay) pts.push(v3(b.x, 0.2, b.z));
      const t = b.done ? { x: 0, z: 0 } : targetPoint(b);
      pts.push(v3(t.x, 0.6, t.z));
      if (pts.length < 2) pts.push(v3(b.x + 1, 0, b.z + 1));
      return fit(pts, yaw, pitch, minD);
    }
    const a = curActor();
    const dx = Math.cos(aimAngle), dz = Math.sin(aimAngle);
    const reach = 1.2 + power * 5;
    pts.push(v3(b.x, 0.2, b.z), v3(b.x + dx * reach, 0, b.z + dz * reach));
    const t = targetPoint(b);
    if (Math.hypot(t.x - b.x, t.z - b.z) < 11) pts.push(v3(t.x, 0.7, t.z));
    const fp = a.holder.position;
    pts.push(v3(fp.x - 0.7, 0, fp.z - 0.7), v3(fp.x + 0.7, 0, fp.z + 0.7), v3(fp.x - 0.7, 0, fp.z + 0.7), v3(fp.x + 0.7, 0, fp.z - 0.7), v3(fp.x, 2.5, fp.z));
    return fit(pts, yaw, pitch, minD);
  }
  function updateCamera(dt, snap) {
    const { w: W, h: H } = viewSize();
    camera.fov = world ? world.camera.fov : (H > W * 1.05 ? 58 : 46);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    if (!camFrozen || !camInit) {
      const g = camGoal();
      camGoalPos.copy(g.pos); camGoalQuat.copy(g.quat);
    }
    if (snap || !camInit) { camera.position.copy(camGoalPos); camera.quaternion.copy(camGoalQuat); camInit = true; }
    else {
      const k = 1 - Math.exp(-dt * (phase === 'roll' ? 3.2 : 4.5));
      camera.position.lerp(camGoalPos, k);
      camera.quaternion.slerp(camGoalQuat, k);
    }
    camera.updateMatrixWorld();
    if (world) {
      root.updateWorldMatrix(true, false);
      wcam.position.copy(camera.position); root.localToWorld(wcam.position);
      root.getWorldQuaternion(_q); wcam.quaternion.copy(_q).multiply(camera.quaternion);
      wcam.fov = camera.fov; wcam.aspect = camera.aspect; wcam.near = camera.near; wcam.far = camera.far;
      wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
    }
  }

  /* ---------- foxes ---------- */
  function standSpot(i) {
    const b = m.balls[i];
    if (i === m.turn && !m.over && b.inPlay && phase !== 'intro') {
      const dx = Math.cos(aimAngle), dz = Math.sin(aimAngle);
      const rx = -dz, rz = dx;
      return { x: b.x - dx * STAND + rx * SIDE, z: b.z - dz * STAND + rz * SIDE, face: Math.atan2(-rx, -rz), aiming: true, mx: b.x - dx * STAND, mz: b.z - dz * STAND, mface: Math.atan2(dx, dz) };
    }
    const s = SPECTATOR_SPOTS[i % 4];
    return { x: s[0], z: s[1], face: Math.atan2(s[2], 0), aiming: false };
  }
  function snapFox(a) {
    const i = actors.indexOf(a);
    const s = standSpot(i);
    a.holder.position.set(s.x, 0, s.z); a.holder.rotation.y = s.face;
  }
  function updateFoxes(dt, t) {
    actors.forEach((a, i) => {
      const s = standSpot(i);
      const hp = a.holder.position;
      const dx = s.x - hp.x, dz = s.z - hp.z, d = Math.hypot(dx, dz);
      let speed = 0;
      if (d > 0.04) {
        const sp = Math.min(d, (d > 3 ? 6.5 : 4) * dt);
        hp.x += dx / d * sp; hp.z += dz / d * sp;
        speed = d > 0.25 ? 1 : 0;
        const face = d > 0.4 ? Math.atan2(dx, dz) : s.face;
        a.holder.rotation.y += angDiff(a.holder.rotation.y, face) * Math.min(1, dt * 10);
      } else {
        a.holder.rotation.y += angDiff(a.holder.rotation.y, s.face) * Math.min(1, dt * 12);
      }
      if (a.look.chair) speed = 0;
      K.animFox(a.fox, dt, speed, kit);
      /* mallet + arms */
      let swing = 0;
      const striker = i === m.turn && !m.over;
      if (striker && (phase === 'aim' || phase === 'think') && s.aiming) swing = (charging || drag || (phase === 'think' && cpuStage >= 2)) ? 0.25 + power * 0.95 : 0.08;
      if (striker && phase === 'swing' && pendingStrike) {
        const st = pendingStrike.t;
        const back = 0.25 + pendingStrike.power * 0.95;
        swing = st < 0.09 ? back + (-0.05 - back) * (st / 0.09) : -0.05 - Math.min(0.5, (st - 0.09) * 5);
      }
      if (striker && phase === 'roll' && phaseT < 0.4) swing = -0.55 + phaseT * 1.2;
      if (!s.aiming && !striker) swing = 0;
      a.swing += (swing - a.swing) * Math.min(1, dt * (phase === 'swing' ? 60 : 12));
      /* mallet: at the ball when the fox is in place, else held in front of the fox */
      const hy = a.mallet.userData.handY;
      if (s.aiming && d < 0.3) {
        a.mallet.position.set(s.mx, hy, s.mz);
        a.mallet.rotation.set(0, 0, 0); a.mallet.rotation.y = s.mface;
      } else {
        const ry = a.holder.rotation.y;
        a.mallet.position.set(hp.x + Math.sin(ry) * 0.42, hy + (a.fox.position.y - (a.look.chair ? a.lift : 0)), hp.z + Math.cos(ry) * 0.42);
        a.mallet.rotation.set(0, 0, 0); a.mallet.rotation.y = ry;
      }
      a.mallet.rotateX(a.swing);
      const P = a.fox.userData.P;
      if (P && P.arms) {
        const ax = speed > 0 && !s.aiming ? null : (s.aiming ? -0.8 + a.swing * 0.3 : -0.45);
        if (ax !== null) for (const arm of P.arms) arm.rotation.x = ax;
        if (P.arms[0]) P.arms[0].rotation.z = -0.25;
        if (P.arms[1]) P.arms[1].rotation.z = 0.25;
      }
      if (a.look.chair && P && P.legs) {
        for (const leg of P.legs) leg.rotation.x = -1.45;
        a.fox.position.y = a.lift + Math.sin(t * 2.2 + i) * 0.04;
        if (a.chair) a.chair.position.y = Math.sin(t * 2.2 + i) * 0.04;
      }
      /* celebration hop */
      if (a.jump > 0) {
        a.jump += dt;
        const j = a.jump;
        a.fox.position.y = (a.look.chair ? a.lift : 0) + Math.max(0, Math.sin(j * 9)) * 0.35 * Math.max(0, 1 - j / 1.4);
        if (j > 1.4) a.jump = 0;
      }
      a.foxShadow.position.set(hp.x, 0.012, hp.z);
    });
  }

  /* ---------- balls ---------- */
  const _axis = new THREE.Vector3(), _dq = new THREE.Quaternion();
  function updateBalls() {
    m.balls.forEach((b, i) => {
      const a = actors[i];
      const show = b.inPlay && !b.done;
      a.ball.visible = show; a.ballShadow.visible = show;
      if (!show) return;
      const dx = b.x - a.lastX, dz = b.z - a.lastZ, d = Math.hypot(dx, dz);
      if (d > 1e-5 && d < 2) {
        _axis.set(dz / d, 0, -dx / d);
        _dq.setFromAxisAngle(_axis, d / R.BALL_R);
        a.ball.userData.spinMesh.quaternion.premultiply(_dq);
      }
      a.lastX = b.x; a.lastZ = b.z;
      a.ball.position.set(b.x, 0, b.z);
      a.ballShadow.position.set(b.x + 0.06, 0.012, b.z + 0.06);
    });
  }

  function updateGuides(t) {
    const showAim = m && !m.over && (phase === 'aim' || (phase === 'think' && cpuStage >= 1)) && R.striker(m).inPlay;
    aimGuide.visible = showAim;
    if (showAim) {
      const b = R.striker(m);
      aimGuide.position.set(b.x, 0, b.z);
      aimGuide.rotation.y = -aimAngle;
      const { dots, head, ring } = aimGuide.userData;
      const len = 0.7 + power * 5.2;
      const n = 16, mtx = new THREE.Matrix4(), rot = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
      for (let i = 0; i < n; i++) {
        const x = 0.45 + (i / (n - 1)) * (len - 0.45);
        const fade = i / n;
        mtx.makeTranslation(x, 0.025, 0).multiply(rot).scale(new THREE.Vector3(1 - fade * 0.4, 1 - fade * 0.4, 1));
        dots.setMatrixAt(i, mtx);
      }
      dots.instanceMatrix.needsUpdate = true;
      head.position.set(len + 0.2, 0.026, 0);
      head.rotation.set(-Math.PI / 2, -Math.PI / 2, 0, 'YXZ');
      ring.scale.setScalar(1 + Math.sin(t * 6) * 0.06);
    }
    const b = m ? R.striker(m) : null;
    const showMarker = b && !m.over && phase !== 'intro' && !b.done;
    marker.visible = !!showMarker;
    if (showMarker) {
      if (b.next >= R.PEG_TARGET) { marker.position.set(R.PEG.x, 0, R.PEG.z); marker.userData.gem.position.y = 1.35 + Math.sin(t * 3) * 0.1; }
      else { const h = R.HOOPS[b.next]; marker.position.set(h.x, 0, h.z); marker.userData.gem.position.y = 1.15 + Math.sin(t * 3) * 0.1; }
      marker.userData.gem.rotation.y = t * 1.6;
      marker.userData.ring.scale.setScalar(1 + Math.sin(t * 4) * 0.05);
    }
  }

  /* ---------- input ---------- */
  const ray = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function groundAt(cx, cy) {
    const rect = canvas.getBoundingClientRect();
    const nx = ((cx - rect.left) / rect.width) * 2 - 1, ny = -((cy - rect.top) / rect.height) * 2 + 1;
    camera.updateMatrixWorld();
    ray.setFromCamera({ x: nx, y: ny }, camera);
    const p = new THREE.Vector3();
    return ray.ray.intersectPlane(ground, p) ? p : null;
  }
  function canAim() { return !paused && phase === 'aim' && isHumanTurn(); }

  function onDown(e) {
    if (world) {
      if (e.target !== canvas) return;
      e.preventDefault(); e.stopImmediatePropagation();
    }
    audio.unlock();
    lastInput = performance.now();
    if (!canAim() || drag || e.button > 0) return;
    const g = groundAt(e.clientX, e.clientY);
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, g0: g, active: false };
    camFrozen = true;
    if (!world && canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } }
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (world) e.stopImmediatePropagation();
    lastInput = performance.now();
    const ddx = e.clientX - drag.sx, ddy = e.clientY - drag.sy;
    const dl = Math.hypot(ddx, ddy);
    if (!drag.active && dl > 12) drag.active = true;
    if (!drag.active) return;
    const g1 = groundAt(e.clientX, e.clientY);
    if (drag.g0 && g1) {
      const vx = drag.g0.x - g1.x, vz = drag.g0.z - g1.z;
      if (Math.hypot(vx, vz) > 0.05) aimAngle = Math.atan2(vz, vx);
    }
    const { w: W, h: H } = viewSize();
    power = clamp((dl - 12) / (Math.min(W, H) * 0.42), 0, 1);
    emit();
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (world) e.stopImmediatePropagation();
    const d = drag; drag = null;
    if (!canAim()) { camFrozen = false; return; }
    if (d.active) {
      if (power > 0.03) doStrike(aimAngle, power);
      else { camFrozen = false; message = 'Too soft. Drag further back for more power.'; emit(true); }
    } else {
      /* tap: aim at that spot */
      const g = groundAt(e.clientX, e.clientY);
      const b = R.striker(m);
      if (g && Math.hypot(g.x - b.x, g.z - b.z) > 0.3) {
        aimAngle = Math.atan2(g.z - b.z, g.x - b.x);
        power = clamp(R.powerFor(Math.hypot(g.x - b.x, g.z - b.z)), 0.05, 1);
        audio.play('tick');
      }
      camFrozen = false;
      emit(true);
    }
  }
  function onCancel(e) { if (drag && e.pointerId === drag.id) { drag = null; camFrozen = false; } }

  function startCharge(byKey) {
    if (!canAim()) return;
    audio.unlock();
    charging = true; chargeT = 0; chargeByKey = !!byKey; chargeKeyT = performance.now(); camFrozen = true;
    lastInput = performance.now();
    emit(true);
  }
  function releaseCharge() {
    if (!charging) return;
    if (!canAim()) { charging = false; return; }
    doStrike(aimAngle, Math.max(0.04, power));
  }
  function nudge(dir, fine) {
    if (!canAim()) return;
    aimAngle += dir * (fine ? 0.008 : 0.03);
    lastInput = performance.now();
    emit(true);
  }
  function key(e) {
    const k = e.key;
    lastInput = performance.now();
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { nudge(-1, e.shiftKey); e.preventDefault && e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { nudge(1, e.shiftKey); e.preventDefault && e.preventDefault(); }
    else if (k === 'ArrowUp' || k === 'w' || k === 'W') { if (canAim() && !charging) { power = clamp(power + 0.04, 0.03, 1); emit(true); } }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { if (canAim() && !charging) { power = clamp(power - 0.04, 0.03, 1); emit(true); } }
    else if (k === ' ' || k === 'Enter') {
      e.preventDefault && e.preventDefault();
      if (e.repeat) return;
      if (phase === 'over' && k === 'Enter') { api.playAgain(); return; }
      if (!charging) startCharge(true); else releaseCharge();
    } else if (k === 'v' || k === 'V') api.toggleView();
  }
  function onKeyUp(e) {
    if ((e.key === ' ' || e.key === 'Enter') && charging && chargeByKey && performance.now() - chargeKeyT > 280) releaseCharge();
  }
  function onKeyDown(e) {
    const tg = e.target && e.target.tagName;
    if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || tg === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
    key(e);
  }

  if (world) {
    window.addEventListener('pointerdown', onDown, true);
  } else {
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }
  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', onCancel, true);

  /* ---------- size ---------- */
  let ro = null;
  function resize() {
    if (world) return;
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
  }
  if (!world) {
    ro = new ResizeObserver(() => { resize(); updateCamera(0, false); });
    ro.observe(container);
    resize();
  }

  /* ---------- HUD ---------- */
  let lastEmit = 0, dirty = true;
  function hud() {
    if (!m) return { key: GAME.key, phase: 'loading' };
    const p = cur();
    const now = performance.now();
    return {
      key: GAME.key, ver: ++ver, phase, mode, world: !!world,
      players: m.players.map((pl, i) => ({
        id: i, name: pl.name, ball: pl.ball, color: pl.color, kind: pl.kind, tag: pl.tag || (pl.kind === 'human' ? 'PLAYER' : ''),
        hoops: pl.hoops, strokes: pl.strokes, target: R.targetLabel(m.balls[i].next), done: m.balls[i].done,
        progress: (m.balls[i].done ? 7 : Math.min(6, m.balls[i].next)) + '/7', isTurn: i === m.turn && !m.over,
      })),
      turn: { id: m.turn, name: p.name, ball: p.ball, color: p.color, human: p.kind === 'human', strokesLeft: Math.max(m.strokesLeft, phase === 'roll' || phase === 'swing' ? 0 : 1), target: R.targetLabel(R.striker(m).next) },
      message, caption,
      power: Math.round(power * 100) / 100, charging, aiming: !!(drag && drag.active),
      canStrike: canAim(), view,
      hint: canAim() && !charging && !drag && now - lastInput > 3000,
      result,
      settings: { ...settings },
      levels: CAST.map(c => ({ name: c.name, tag: c.tag })),
    };
  }
  function emit(force) { dirty = true; if (force) { lastEmit = 0; } }
  function flush(now) {
    if (now - lastEmit >= 100 || (dirty && lastEmit === 0)) {
      lastEmit = now; dirty = false;
      try { onState(hud()); } catch (e) { console.error(e); }
    }
  }

  /* ---------- loop ---------- */
  let raf = 0, last = performance.now(), alive = true, clock = 0;
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    clock += dt;
    if (!paused) update(dt);
    if (m) { updateBalls(); updateFoxes(dt, clock); updateGuides(clock); }
    updateCamera(dt, false);
    if (!world) renderer.render(renderScene, camera);
    flush(now);
  }

  function update(dt) {
    if (!m) return;
    phaseT += dt;
    if (charging) {
      chargeT += dt;
      power = 0.5 - 0.5 * Math.cos(chargeT * Math.PI / 0.95);
      power = clamp(power, 0.02, 1);
      emit();
    }
    switch (phase) {
      case 'intro':
        if (phaseT > 1.6) beginTurn();
        break;
      case 'aim':
        if (canAim() && performance.now() - lastInput > 3000) emit();
        break;
      case 'think': {
        const a = curActor(), s = standSpot(m.turn);
        const arrived = Math.hypot(a.holder.position.x - s.x, a.holder.position.z - s.z) < 0.3;
        const lv = R.LEVELS[cur().level] || R.LEVELS[1];
        if (cpuStage === 0 && arrived && phaseT > lv.think * (mode === 'demo' ? 1.1 : 0.8)) { cpuStage = 1; cpuT = 0; cpuFrom = aimAngle; }
        else if (cpuStage === 1) {
          cpuT += dt;
          const k = Math.min(1, cpuT / 0.55), e = k * k * (3 - 2 * k);
          aimAngle = cpuFrom + angDiff(cpuFrom, cpuPlan.angle) * e;
          power = 0.3 + (cpuPlan.power - 0.3) * e * 0.3;
          if (k >= 1) { cpuStage = 2; cpuT = 0; }
          emit();
        } else if (cpuStage === 2) {
          cpuT += dt;
          const k = Math.min(1, cpuT / 0.65);
          power = cpuPlan.power * k;
          charging = false;
          emit();
          if (k >= 1 && cpuT > 0.8) doStrike(cpuPlan.angle, cpuPlan.power);
        }
        break;
      }
      case 'swing':
        pendingStrike.t += dt;
        if (pendingStrike.t >= 0.09 && !pendingStrike.hit) { pendingStrike.hit = true; contact(); }
        break;
      case 'roll':
        acc += dt;
        while (acc >= R.DT) { R.step(m.balls, R.DT, events); acc -= R.DT; }
        handleEventSounds();
        if (phaseT > 0.3 && R.allStopped(m.balls)) finishStroke();
        else if (phaseT > 20) { m.balls.forEach(b => { b.vx = b.vz = 0; }); finishStroke(); }
        break;
      case 'wait':
        waitT -= dt;
        if (waitT <= 0 && afterWait) { const f = afterWait; afterWait = null; f(); }
        break;
      case 'over':
        if (mode === 'demo' && phaseT > 6) startMatch('demo');
        break;
      default: break;
    }
  }

  /* ---------- API ---------- */
  const api = {
    hud,
    setSafe(s = {}) {
      safe = { top: +s.top || 0, bottom: +s.bottom || 0, left: +s.left || 0, right: +s.right || 0 };
      if (!camFrozen) { const g = camGoal(); camGoalPos.copy(g.pos); camGoalQuat.copy(g.quat); }
    },
    start(newMode) {
      if (newMode && !['cpu', 'local', 'demo'].includes(newMode)) newMode = 'cpu';
      audio.unlock();
      startMatch(newMode || mode);
    },
    key,
    get camera() { return world ? wcam : camera; },
    snapCam() { updateCamera(0, true); },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      if (world) window.removeEventListener('pointerdown', onDown, true);
      else {
        canvas.removeEventListener('pointerdown', onDown);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      }
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onCancel, true);
      if (ro) ro.disconnect();
      audio.close();
      clearActors();
      if (world) { world.parent.remove(root); }
      else {
        renderer.dispose();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
      root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    },
    /* page actions */
    restart() { audio.unlock(); audio.play('ui'); startMatch(mode === 'demo' ? 'demo' : mode); },
    playAgain() { audio.unlock(); audio.play('ui'); startMatch(mode === 'left' ? settings.mode : mode); },
    chargeStart() { startCharge(false); },
    chargeEnd() { releaseCharge(); },
    nudge(dir) { audio.unlock(); nudge(dir > 0 ? 1 : -1, false); },
    toggleView() { view = view === 'map' ? 'aim' : 'map'; camFrozen = false; audio.play('ui'); lastInput = performance.now(); emit(true); },
    setMode(md) { if (!['cpu', 'local', 'demo'].includes(md)) return; audio.unlock(); audio.play('ui'); startMatch(md); },
    setLevel(l) { settings.level = clamp(l | 0, 0, 2); persist(); if (mode === 'cpu') startMatch('cpu'); else emit(true); },
    setOpponents(n) { settings.opponents = clamp(n | 0, 1, 3); persist(); if (mode === 'cpu') startMatch('cpu'); else emit(true); },
    setHumans(n) { settings.humans = clamp(n | 0, 2, 4); persist(); if (mode === 'local') startMatch('local'); else emit(true); },
    setSound(v) { settings.sound = !!v; audio.setSound(settings.sound); persist(); audio.unlock(); audio.play('ui'); emit(true); },
    setMusic(v) { settings.music = !!v; audio.unlock(); audio.setMusic(settings.music); persist(); emit(true); },
    pause(v) { paused = !!v; if (paused) { drag = null; charging = false; camFrozen = false; } lastInput = performance.now(); emit(true); },
    back() {
      /* standalone leave: stop play, tell the host page */
      mode = 'left'; phase = 'left'; paused = false; audio.setMusic(false);
      message = 'You left the court.';
      emit(true);
      try { window.dispatchEvent(new CustomEvent('8g:back', { detail: { key: GAME.key } })); } catch (e) { /* ignore */ }
    },
    unlockAudio() { audio.unlock(); },
    get settings() { return { ...settings }; },
    get root() { return root; },
  };

  startMatch(mode);
  updateCamera(0, true);
  raf = requestAnimationFrame(frame);
  try { onState(hud()); } catch (e) { console.error(e); }
  return api;
}

export const createGame = createCroquet;
export default createCroquet;
