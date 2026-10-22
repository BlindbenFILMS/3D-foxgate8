/* PLAYGROUND for 8 GATES 3D: swings, monkey bars, merry-go-round, sandbox.
   Standalone: createPlayground({ container, onState }).
   World mode: createPlayground({ container, onState, opts: { world: { renderer, camera, parent } } }). */
import * as THREE from '../../vendor/three/three.module.js';
import { EVENTS, LEVELS, CAST, roster, makeEvent, makeAI, rankEvent, standings, LINES, TEACH, RULES_TEXT } from './playground-rules.js';
import { createAudio } from './playground-audio.js';
import { ST, buildStations, buildEnv, makeFox, setPose, walkPose, makeBucket, makeLayer, makeFlag, disposeTree } from './playground-build.js';

export const GAME = { key: 'playground', name: 'PLAYGROUND', maxPlayers: 4 };

const DEG = Math.PI / 180, UP = new THREE.Vector3(0, 1, 0);
const POSE = {
  swing: { lL: [-1.35, 0, 0.05], lR: [-1.35, 0, -0.05], aL: [-2.95, 0, -0.06], aR: [-2.95, 0, 0.06] },
  hang:  { aL: [-Math.PI, 0, -0.12], aR: [-Math.PI, 0, 0.12], lL: [0.12, 0, 0], lR: [-0.12, 0, 0] },
  hold:  { aL: [-1.45, 0, 0.14], aR: [-1.45, 0, -0.14] },
  sit:   { lL: [-1.5, 0, -0.1], lR: [-1.5, 0, 0.1], aL: [-0.9, 0, -0.05], aR: [-0.9, 0, 0.05] },
};
const SIT_Y = -0.915;
const VIEWS = {
  all:    { dir: [0, 0.95, 1],     pts: [[-11, 0, -8], [12, 0, -8], [-11, 0, 9], [12, 0, 9], [0, 5.6, -4.5]] },
  swings: { dir: [0.55, 0.5, 1], pdir: [0.85, 0.6, 1], pts: [[-10.7, 0, -4.5], [-2.3, 0, -4.5], [-6.5, 6, -4.5], [-6.5, 0, -8.8], [-6.5, 0, -0.6]] },
  bars:   { dir: [0.05, 0.55, 1], pdir: [0.7, 0.75, 1], pts: [[0, 0, -4.5], [12, 0, -4.5], [6.5, 4.6, -7.4], [6.5, 4.6, -1.6], [6.5, 0, -1.6]] },
  spin:   { dir: [0, 0.9, 1],      pts: [[-9.6, 0, 5.5], [-2.4, 0, 5.5], [-6, 0, 1.9], [-6, 0, 9.1], [-6, 3.2, 5.5]] },
  sand:   { dir: [0, 0.8, 1],      pts: [[2.8, 0, 5.5], [9.2, 0, 5.5], [6, 0, 2.4], [6, 0, 8.6], [6, 3.4, 6.5]] },
  podium: { dir: [0, 0.45, 1],     pts: [[-4.5, 0, 2.5], [4.5, 0, 2.5], [0, 3.2, 2.5], [0, 0, 4.5]] },
};

export async function createPlayground({ container, onState = () => {}, opts = {} } = {}) {
  const W = opts.world || null, kit = opts.kit || null, save = opts.save || null;
  const touch = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
  const audio = createAudio({ music: !W && opts.music !== false });

  /* ---------- renderer + scene ---------- */
  let renderer, scene, ro = null;
  if (W) {
    renderer = W.renderer;
    scene = new THREE.Group(); scene.name = 'playground';
    W.parent.add(scene);
  } else {
    renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.75 : 2));
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;-webkit-tap-highlight-color:transparent';
    container.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    buildEnv(scene, touch);
  }
  const st = buildStations(); scene.add(st.group);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  const wcam = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  let vw = 1, vh = 1;
  const safe = { top: 0, bottom: 0, left: 0, right: 0 };

  function resizeStandalone() {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    vw = w; vh = h; renderer.setSize(w, h, false);
  }
  if (!W) { resizeStandalone(); ro = new ResizeObserver(resizeStandalone); ro.observe(container); }

  /* ---------- save ---------- */
  const store = {
    get(k, d) {
      if (save && save.stat) { try { const v = save.stat('playground.' + k, d); return v == null ? d : v; } catch (e) { /* fall through */ } }
      try { const v = localStorage.getItem('playground.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      if (save && save.setStat) { try { save.setStat('playground.' + k, v); return; } catch (e) { /* fall through */ } }
      try { localStorage.setItem('playground.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ }
    },
    gold(n) {
      if (save && save.addGold) { try { save.addGold(n); return; } catch (e) { /* fall through */ } }
      this.set('gold', (+this.get('gold', 0) || 0) + n);
    },
  };

  /* ---------- game state ---------- */
  const G = {
    mode: ['cpu', 'local', 'demo'].includes(opts.mode) ? opts.mode : 'cpu',
    level: opts.level != null ? Math.max(0, Math.min(2, opts.level | 0)) : 1,
    nFoxes: 4, nLocal: 2,
    phase: 'intro', pt: 0, ei: 0, ev: null, turn: -1, countdown: '', caption: null,
    evRes: null, result: null, evWins: 0, paused: false, teachT: 0, teachK: 0,
    lastInput: performance.now(), flash: null,
  };
  let players = [];
  const now = () => performance.now();

  /* station visuals */
  const SV = { sw: [0, 0, 0, 0], th: [0, 0, 0, 0], discW: 0, towers: [[], [], [], []], off: [], crumbling: [false, false, false, false], buckets: [], flags: [], pull: [0, 0, 0, 0], slam: [0, 0, 0, 0] };
  st.towers.forEach((t, i) => { const b = makeBucket(['#ec3013', '#2f6fe0', '#ffd23a', '#2bb3a3'][i]); b.visible = false; t.add(b); SV.buckets.push(b); SV.off.push(new THREE.Vector2()); });

  /* ---------- foxes ---------- */
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion();
  function localPos(obj, out) { obj.getWorldPosition(out); return scene.worldToLocal(out); }
  function yawOf(obj) { const d = new THREE.Vector3(0, 0, 1).applyQuaternion(obj.quaternion); return Math.atan2(d.x, d.z); }
  function turnTo(f, yaw, k) {
    let d = yaw - f.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    f.rotation.y += d * Math.min(1, k);
  }

  function clearField() {
    players.forEach(p => {
      if (p.fox.parent) p.fox.parent.remove(p.fox);
      if (p.chair) scene.remove(p.chair);
      scene.remove(p.shadow);
      if (!p.fox.userData.fromKit) disposeTree(p.fox);
      if (p.chair) disposeTree(p.chair);
      disposeTree(p.shadow);
    });
    players = [];
  }
  function buildField() {
    clearField();
    const list = roster(G.mode, G.level, G.mode === 'local' ? G.nLocal : G.nFoxes);
    players = list.map((r, i) => {
      const fox = makeFox(r.look, kit);
      const p = { ...r, i, fox, ai: r.human ? null : makeAI(r.skill), pts: 0, mode: 'stand', t: Math.random() * 5,
        yawGoal: 0, walk: null, vel: new THREE.Vector3(), spinRate: 0, onLand: 'dizzy', station: '',
        chair: fox.userData.chair || null, shadow: fox.userData.shadow, chairPark: new THREE.Vector3(), cheerAfter: false };
      const s = spot('podium', i, list.length);
      fox.position.copy(s.pos); fox.rotation.y = 0;
      scene.add(fox); scene.add(p.shadow);
      if (p.chair) { scene.add(p.chair); p.chair.position.set(s.pos.x, 0.35, s.pos.z); }
      return p;
    });
  }

  function spot(key, i, n = players.length) {
    const pos = new THREE.Vector3(); let yaw = 0;
    if (key === 'swings') { pos.set(ST.swings.px[i], 0, ST.swings.z + 1.8); yaw = 0; }
    else if (key === 'bars') { pos.set(ST.bars.x0 - 2.3, 0, ST.bars.lanes[i]); yaw = Math.PI / 2; }
    else if (key === 'spin') { const a = ST.spin.ang[i]; pos.set(ST.spin.x + Math.sin(a) * 3.6, 0, ST.spin.z + Math.cos(a) * 3.6); yaw = a + Math.PI; }
    else if (key === 'sand') { pos.set(ST.sand.tx[i], ST.sand.top, ST.sand.fz - 0.4); yaw = 0; }
    else { pos.set((i - (n - 1) / 2) * 2.2, 0, 2.5); yaw = 0; }
    return { pos, yaw };
  }

  function toGround(p) {
    const f = p.fox;
    if (f.parent !== scene) scene.attach(f);
    const y = yawOf(f);
    f.rotation.set(0, y, 0); f.scale.setScalar(1);
    if (f.position.y < 0) f.position.y = Math.max(f.position.y, 0);
    setPose(f, {});
    p.station = '';
  }
  function walkTo(p, pos, yaw) {
    toGround(p);
    const from = p.fox.position.clone();
    p.walk = { from, to: pos.clone(), t: 0, dur: Math.max(0.35, from.distanceTo(pos) / 3.4), yaw };
    p.mode = 'walk'; p.yawGoal = yaw;
  }

  function mount(p) {
    const f = p.fox, i = p.i, key = EVENTS[G.ei].key;
    toGround(p);
    p.mode = 'mounted'; p.station = key; p.walk = null;
    const s = spot(key, i);
    p.chairPark.set(s.pos.x + 1.1, 0, s.pos.z + 1.0);
    if (key === 'swings') {
      p.chairPark.set(ST.swings.px[3] + 2.8, 0, ST.swings.z - 2.6);
      st.swings[i].add(f); f.position.set(0, -ST.swings.L - 0.86, 0.05); f.rotation.set(0, 0, 0); setPose(f, POSE.swing);
    } else if (key === 'bars') {
      const pv = st.barPivots[i]; pv.position.set(ST.bars.x0, ST.bars.y, ST.bars.lanes[i]); pv.rotation.set(0, 0, 0);
      pv.add(f); f.position.set(0, -ST.bars.hang, 0); f.rotation.set(0, Math.PI / 2, 0); setPose(f, POSE.hang);
      p.chairPark.set(ST.bars.x0 - 2.3, 0, ST.bars.lanes[i] + (i < 2 ? -0.1 : 0.1));
    } else if (key === 'spin') {
      st.anchors[i].add(f); f.position.set(0, ST.spin.top, ST.spin.ride); f.rotation.set(0, Math.PI, 0); setPose(f, POSE.hold);
    } else if (key === 'sand') {
      f.position.set(ST.sand.tx[i], ST.sand.top + SIT_Y, ST.sand.fz); f.rotation.set(0, 0, 0); setPose(f, POSE.sit);
      SV.buckets[i].visible = true;
      p.chairPark.set(ST.sand.tx[i] + (i < 2 ? -0.7 : 0.7), 0, ST.sand.fz - 2.6);
    }
  }

  function flyOff(p, dir) {
    const f = p.fox;
    scene.attach(f);
    f.rotation.set(0, yawOf(f), 0);
    const d = new THREE.Vector3(f.position.x - ST.spin.x, 0, f.position.z - ST.spin.z).normalize();
    const w = SV.discW;
    const tang = new THREE.Vector3(d.z, 0, -d.x);
    const v = dir > 0 ? d.multiplyScalar(2.6 + w * 0.8).addScaledVector(tang, w * 0.7) : d.multiplyScalar(1.6).addScaledVector(tang, w * 0.5);
    const h = Math.hypot(v.x, v.z); if (h > 6.5) v.multiplyScalar(6.5 / h);
    v.y = dir > 0 ? 5.5 : 3.2;
    p.vel.copy(v); p.spinRate = dir > 0 ? 9 : 5; p.onLand = 'dizzy'; p.mode = 'fly'; p.station = '';
    setPose(f, { aL: [-2.6, 0, -0.6], aR: [-2.6, 0, 0.6], lL: [-0.6, 0, -0.3], lR: [0.4, 0, 0.3] });
  }
  function dropOff(p, happy) {
    const f = p.fox;
    scene.attach(f);
    f.rotation.set(0, Math.PI / 2, 0);
    p.vel.set(1.2, 0, 0); p.spinRate = 0; p.onLand = happy ? 'cheer' : 'stand'; p.mode = 'fly'; p.station = '';
    p.yawGoal = 0;
    setPose(f, { aL: [-2.8, 0, -0.3], aR: [-2.8, 0, 0.3] });
  }

  function updateFox(p, dt) {
    const f = p.fox; p.t += dt;
    const onChair = !!p.chair && (p.mode === 'walk' || p.mode === 'stand' || p.mode === 'cheer');
    const useKit = f.userData.fromKit && kit && typeof kit.animFox === 'function';
    switch (p.mode) {
      case 'walk': {
        const w = p.walk; w.t += dt / w.dur; const k = Math.min(1, w.t);
        f.position.lerpVectors(w.from, w.to, k * k * (3 - 2 * k));
        const dx = w.to.x - w.from.x, dz = w.to.z - w.from.z;
        if (k < 0.9 && dx * dx + dz * dz > 0.04) turnTo(f, Math.atan2(dx, dz), dt * 10); else turnTo(f, w.yaw, dt * 8);
        if (onChair) setPose(f, POSE.sit);
        else if (useKit) kit.animFox(f, dt, 1);
        else { walkPose(f, p.t * 10, 1); f.position.y += Math.abs(Math.sin(p.t * 10)) * 0.07; }
        if (k >= 1) { p.mode = p.cheerAfter ? 'cheer' : 'stand'; p.cheerAfter = false; }
        break;
      }
      case 'stand':
        turnTo(f, p.yawGoal, dt * 8);
        if (onChair) setPose(f, { ...POSE.sit, aL: [-0.5, 0, -0.1], aR: [-0.5, 0, 0.1] });
        else if (useKit) kit.animFox(f, dt, 0);
        else setPose(f, { body: [0.03 * Math.sin(p.t * 2), 0, 0], head: [0, 0.15 * Math.sin(p.t * 0.7), 0], aL: [0, 0, -0.07], aR: [0, 0, 0.07] });
        break;
      case 'cheer': {
        turnTo(f, p.yawGoal, dt * 8);
        const s = Math.sin(p.t * 13);
        const arms = { aL: [-Math.PI + 0.25 * s, 0, -0.35], aR: [-Math.PI - 0.25 * s, 0, 0.35] };
        if (onChair) setPose(f, { ...POSE.sit, ...arms });
        else { setPose(f, { ...arms, lL: [-0.2, 0, 0], lR: [-0.2, 0, 0] }); f.position.y = Math.abs(Math.sin(p.t * 6.5)) * 0.45; }
        break;
      }
      case 'fly':
        p.vel.y -= 18 * dt; f.position.addScaledVector(p.vel, dt); f.rotation.y += p.spinRate * dt;
        if (f.position.y <= 0 && p.vel.y < 0) {
          f.position.y = 0; p.vel.set(0, 0, 0); audio.play('thud'); p.t = 0;
          p.mode = p.onLand;
          if (p.mode === 'stand' || p.mode === 'cheer') setPose(f, {});
        }
        break;
      case 'dizzy':
        setPose(f, { ...POSE.sit, head: [0.15 * Math.sin(p.t * 5), 0, 0.25 * Math.sin(p.t * 3.3)], aL: [-0.3, 0, -0.5], aR: [-0.3, 0, 0.5] });
        f.position.y = SIT_Y + 0.0; if (p.t < 2) f.rotation.y += dt * 2.2 * (2 - p.t);
        break;
      default: break;
    }
    if (onChair) {
      const c = p.chair;
      c.position.set(f.position.x, 0.35 + 0.06 * Math.sin(p.t * 2.4), f.position.z);
      c.rotation.y = f.rotation.y;
      f.position.y = c.position.y + 0.95 - 1.0 + 0.085;
    } else if (p.chair) {
      const c = p.chair;
      c.position.x += (p.chairPark.x - c.position.x) * Math.min(1, dt * 3);
      c.position.z += (p.chairPark.z - c.position.z) * Math.min(1, dt * 3);
      c.position.y = 0.35 + 0.06 * Math.sin(p.t * 2.4);
      c.rotation.y += dt * 0.4;
    }
    if (p.chair) p.chair.userData.glow.scale.setScalar(1 + 0.08 * Math.sin(p.t * 6));
    const cane = f.userData.cane;
    if (cane) {
      cane.visible = p.mode === 'walk' || p.mode === 'stand' || p.mode === 'cheer';
      cane.rotation.x = p.mode === 'walk' ? 0.3 * Math.sin(p.t * 5) : 0.05;
    }
    const sh = p.shadow;
    sh.visible = !(p.mode === 'mounted' && p.station !== 'sand');
    if (sh.visible) {
      localPos(f, _v);
      const gy = groundAt(_v.x, _v.z);
      sh.position.set(_v.x, gy + 0.02, _v.z);
      const hgt = Math.max(0, _v.y - gy);
      sh.scale.setScalar(Math.max(0.4, 1 - hgt * 0.15));
    }
  }
  function groundAt(x, z) {
    return Math.abs(x - ST.sand.x) < 3 && Math.abs(z - ST.sand.z) < 3 ? ST.sand.top : 0;
  }

  /* ---------- sandbox towers ---------- */
  function resetTowers() {
    SV.towers.forEach((list, i) => {
      list.forEach(L => { st.towers[i].remove(L.mesh); disposeTree(L.mesh); });
      SV.towers[i] = []; SV.off[i].set(0, 0); SV.crumbling[i] = false;
      if (SV.flags[i]) { st.towers[i].remove(SV.flags[i]); disposeTree(SV.flags[i]); SV.flags[i] = null; }
      SV.buckets[i].visible = false;
    });
  }
  function spawnLayer(i, q) {
    const list = SV.towers[i], k = list.length;
    const a = Math.random() * Math.PI * 2;
    SV.off[i].x += Math.cos(a) * (1 - q) * 0.1; SV.off[i].y += Math.sin(a) * (1 - q) * 0.1;
    const mesh = makeLayer(k);
    mesh.position.set(SV.off[i].x, k * 0.38, SV.off[i].y);
    mesh.scale.set(1, 0.001, 1);
    st.towers[i].add(mesh);
    list.push({ mesh, born: 0.13, vel: null, tilt: (1 - q) * 0.08 * (Math.random() < 0.5 ? -1 : 1) });
    SV.slam[i] = 1;
  }
  function crumble(i) {
    SV.crumbling[i] = true;
    SV.towers[i].forEach(L => { L.vel = new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3); });
  }
  function addFlag(i) {
    const f = makeFlag(); f.position.set(SV.off[i].x, SV.towers[i].length * 0.38, SV.off[i].y); st.towers[i].add(f); SV.flags[i] = f;
  }

  function resetStation(key) {
    if (key === 'sand') resetTowers();
    else SV.buckets.forEach(b => { b.visible = false; });
    st.barPivots.forEach((pv, i) => { pv.position.set(ST.bars.x0, ST.bars.y, ST.bars.lanes[i]); pv.rotation.set(0, 0, 0); });
    SV.th = [0, 0, 0, 0];
  }

  /* ---------- per-frame station animation ---------- */
  function updateStations(dt) {
    const ev = G.ev, key = ev ? ev.key : '';
    /* swings */
    st.swings.forEach((pv, i) => {
      const r = ev && key === 'swings' && ev.runners[i];
      const target = r && r.started && !r.done ? -r.ang * DEG : 0;
      SV.sw[i] = r && r.started && !r.done ? target : SV.sw[i] * Math.exp(-dt * 0.8);
      pv.rotation.x = SV.sw[i];
      const p = players[i];
      if (p && p.mode === 'mounted' && p.station === 'swings') {
        const c = r && r.started && !r.done ? Math.cos(r.phi) : 0;
        setPose(p.fox, { ...POSE.swing, lL: [-1.3 - 0.4 * c, 0, 0.05], lR: [-1.3 - 0.4 * c, 0, -0.05], body: [0.2 * c, 0, 0] });
      }
    });
    /* monkey bars */
    if (ev && key === 'bars') {
      ev.runners.forEach((r, i) => {
        const p = players[i]; if (!p || p.mode !== 'mounted' || p.station !== 'bars' || !r.started) return;
        const pv = st.barPivots[i];
        const e = r.st === 'move' ? r.sx * r.sx * (3 - 2 * r.sx) : 0;
        pv.position.x = ST.bars.x0 + (r.rung + e) * ST.bars.step;
        pv.position.y = ST.bars.y - (r.st === 'slip' ? 0.25 * Math.sin(Math.PI * r.sx) : 0);
        SV.th[i] += (r.theta - SV.th[i]) * Math.min(1, dt * 12);
        pv.rotation.z = SV.th[i] * DEG;
        const reach = r.st === 'move' ? 0.55 * Math.sin(Math.PI * r.sx) : 0;
        const slip = r.st === 'slip' ? 1.2 * Math.sin(Math.PI * r.sx) : 0;
        const lead = r.lead;
        setPose(p.fox, {
          aL: [-Math.PI + (lead === 0 ? reach : 0) + slip, 0, -0.12], aR: [-Math.PI + (lead === 1 ? reach : 0), 0, 0.12],
          lL: [0.15 + 0.2 * Math.sin(p.t * 6), 0, 0], lR: [-0.15 - 0.2 * Math.sin(p.t * 6), 0, 0],
        });
      });
    }
    /* merry-go-round */
    let wt = 0;
    if (ev && key === 'spin') ev.runners.forEach(r => { if (r.active && !r.done) wt = Math.max(wt, r.w); });
    SV.discW += (wt - SV.discW) * Math.min(1, dt * (wt > SV.discW ? 3 : 0.8));
    st.disc.rotation.y += SV.discW * dt;
    if (ev && key === 'spin') ev.runners.forEach((r, i) => {
      const p = players[i]; if (!p || p.mode !== 'mounted' || p.station !== 'spin') return;
      SV.pull[i] = Math.max(0, SV.pull[i] - dt * 4);
      const b = r.started ? r.b : 0;
      setPose(p.fox, { aL: [-1.45, 0, 0.14 + SV.pull[i] * 0.1], aR: [-1.45, 0, -0.14 - SV.pull[i] * 0.1], body: [-0.45 * Math.max(-0.4, b) + SV.pull[i] * 0.25, 0, 0], lL: [0.25 * Math.max(0, b), 0, 0], lR: [-0.1, 0, 0] });
    });
    /* sandbox */
    st.towers.forEach((tw, i) => {
      const list = SV.towers[i];
      list.forEach((L, k) => {
        if (L.vel) {
          L.vel.y -= 9.8 * dt; L.mesh.position.addScaledVector(L.vel, dt);
          if (L.mesh.position.y < 0) { L.mesh.position.y = 0; L.vel.multiplyScalar(0.3); L.vel.y = 0; }
          L.mesh.rotation.x += dt * 2; L.mesh.scale.y = Math.max(0.35, L.mesh.scale.y - dt * 0.8);
        } else if (L.born > 0) {
          L.born -= dt;
          if (L.born <= 0) audio.play('pack');
        } else if (L.mesh.scale.y < 1) {
          L.mesh.scale.y = Math.min(1, L.mesh.scale.y + dt * 9);
        }
        if (!L.vel) L.mesh.rotation.z = L.tilt * Math.sin(now() / 300 + k);
      });
      const b = SV.buckets[i];
      if (!b.visible) return;
      const r = ev && key === 'sand' ? ev.runners[i] : null;
      const topY = list.filter(L => !L.vel).length * 0.38;
      const ox = SV.off[i].x, oz = SV.off[i].y;
      if (!r || !r.started || r.done || r.st === 'crumble') { b.position.set(ox, topY + 1.1, oz); b.rotation.z = 0; }
      else if (r.st === 'aim') { b.position.set(ox, topY + 0.65 + r.m * 0.75, oz); b.rotation.z = 0.06 * Math.sin(now() / 90); }
      else if (r.st === 'drop') {
        const s = r.sx, lt = topY, lo = lt - 0.38;
        const y = s < 0.3 ? (lt + 0.8) + (lo - (lt + 0.8)) * (s / 0.3) : lo + (lt + 1.1 - lo) * ((s - 0.3) / 0.7);
        b.position.set(ox, y, oz); b.rotation.z = 0;
      }
      SV.slam[i] = Math.max(0, SV.slam[i] - dt * 4);
      const p = players[i];
      if (p && p.mode === 'mounted' && p.station === 'sand') {
        const sl = SV.slam[i], m = r && r.st === 'aim' ? r.m : 0.3;
        setPose(p.fox, { ...POSE.sit, aL: [-1.2 - m * 0.9 + sl * 0.9, 0, -0.1], aR: [-1.2 - m * 0.9 + sl * 0.9, 0, 0.1], body: [0.15 * sl, 0, 0] });
      }
    });
  }

  /* ---------- flow ---------- */
  function setPhase(ph) { G.phase = ph; G.pt = 0; emit(true); }
  function participants() { return G.mode === 'local' ? (G.turn >= 0 ? [G.turn] : []) : players.map(p => p.i); }
  function humanIndex() {
    if (G.mode === 'local') return G.turn;
    if (G.mode === 'demo') return 0;
    return 0;
  }
  function rivalKey() { return LEVELS[G.level].rival; }

  function beginChampionship() {
    buildField();
    G.ei = 0; G.result = null; G.evWins = 0; G.paused = false; G.flash = null;
    players.forEach(p => { p.pts = 0; });
    beginEvent(0);
    snapCam();
  }
  function beginEvent(ei) {
    G.ei = ei;
    const E = EVENTS[ei];
    G.ev = makeEvent(E.key, players.length);
    G.turn = -1; G.evRes = null; G.countdown = ''; G.teachT = 0; G.teachK = 0;
    resetStation(E.key);
    players.forEach(p => { const s = spot(E.key, p.i); walkTo(p, s.pos, s.yaw); if (p.ai) p.ai.reset(); });
    if (G.mode === 'cpu') { const rk = rivalKey(); G.caption = { who: CAST[rk].name, text: LINES[E.key][rk] }; }
    else if (G.mode === 'demo') G.caption = { who: 'HOW TO PLAY', text: E.hint };
    else G.caption = { who: E.name, text: E.hint };
    setPhase('intro');
  }
  function beginTurnPrompt() {
    const p = players[G.turn];
    G.caption = { who: p.name, text: 'Your turn. Tap to start.' };
    setPhase('turn');
  }
  function startCount() {
    if (G.mode !== 'local') players.forEach(mount);
    else mount(players[G.turn]);
    G.countdown = '3'; audio.play('count');
    setPhase('count');
  }
  function endEvent() {
    const ev = G.ev;
    const vals = players.map((p, i) => ev.rankValue(i));
    const { place, pts } = rankEvent(vals);
    players.forEach((p, i) => { p.pts += pts[i]; });
    let newBest = false;
    if (G.mode === 'cpu') {
      if (place[0] === 1) G.evWins++;
      const key = 'best.' + ev.key, r = ev.runners[0], prev = store.get(key, null);
      let v = null, better = false;
      if (ev.key === 'bars') { if (r.fin > 0) { v = +r.fin.toFixed(2); better = prev == null || v < prev; } }
      else { v = +ev.rankValue(0).toFixed(2); better = prev == null || v > prev; }
      if (v != null && better) { store.set(key, v); newBest = prev != null; }
    }
    G.evRes = players.map((p, i) => ({ name: p.name, color: p.look.torso[0], human: p.human, place: place[i], placeText: ord(place[i]), score: ev.scoreText(i), gain: '+' + pts[i], best: p.human && G.mode === 'cpu' && newBest }))
      .sort((a, b) => a.place - b.place);
    G.caption = null;
    const me = humanIndex();
    if (G.mode === 'cpu') audio.play(place[me] === 1 ? 'finish' : 'click');
    else audio.play('finish');
    setPhase('eventEnd');
  }
  function ord(n) { return n + (n === 1 ? 'ST' : n === 2 ? 'ND' : n === 3 ? 'RD' : 'TH'); }

  function finishChampionship() {
    const place = standings(players.map(p => p.pts));
    const sorted = players.slice().sort((a, b) => place[a.i] - place[b.i] || a.i - b.i);
    sorted.forEach((p, k) => {
      const s = spot('podium', k);
      if (place[p.i] === 1) { s.pos.z += 0.8; p.cheerAfter = true; }
      walkTo(p, s.pos, 0);
    });
    const standingsList = sorted.map(p => ({ name: p.name, pts: p.pts, place: place[p.i], placeText: ord(place[p.i]), color: p.look.torso[0], human: p.human }));
    let R;
    if (G.mode === 'cpu') {
      const me = players[0], my = place[0], n = players.length, win = my === 1;
      const stars = my === 1 ? 3 : (my === 2 && n > 2) ? 2 : (my === 3 && n > 3) ? 1 : 0;
      const gold = win ? 20 + 15 * G.level + 5 * G.evWins : 0;
      const xp = win ? 40 + 20 * G.level + me.pts * 5 : 0;
      const best = +store.get('best', 0) || 0, newBest = me.pts > best;
      if (newBest) store.set('best', me.pts);
      if (gold) store.gold(gold);
      if (xp) store.set('xp', (+store.get('xp', 0) || 0) + xp);
      if (stars > (+store.get('stars', 0) || 0)) store.set('stars', stars);
      R = { title: win ? 'CHAMPION' : 'YOU PLACED ' + ord(my), win, pts: me.pts, best: Math.max(best, me.pts), newBest, gold, xp, stars, standings: standingsList, note: win ? 'You beat ' + CAST[rivalKey()].name + ' on ' + LEVELS[G.level].name + '.' : 'Beat ' + CAST[rivalKey()].name + ' to win gold.' };
      audio.play(win ? 'win' : 'lose');
    } else if (G.mode === 'local') {
      const top = standingsList.filter(s => s.place === 1).map(s => s.name);
      R = { title: top.join(' + ') + (top.length > 1 ? ' TIE' : ' WINS'), win: true, pts: standingsList[0].pts, best: null, newBest: false, gold: 0, xp: 0, stars: 0, standings: standingsList, note: 'Pass & play. No gold on shared games.' };
      audio.play('win');
    } else {
      R = { title: 'DEMO OVER', win: false, pts: standingsList[0].pts, best: null, newBest: false, gold: 0, xp: 0, stars: 0, standings: standingsList, note: 'Tap PLAY NOW to try it yourself.' };
    }
    G.result = R; G.caption = null;
    setPhase('result');
  }

  function handleFx(list) {
    const hi = humanIndex();
    for (const fx of list) {
      const p = players[fx.i]; if (!p) continue;
      const mine = fx.i === hi && (p.human || G.mode === 'demo');
      const key = G.ev.key;
      switch (fx.type) {
        case 'cue': if (mine) audio.play('tick'); break;
        case 'good':
        case 'bad':
          if (mine) { audio.play(fx.type, fx.q); G.flash = { type: fx.type, t: now() }; }
          else if (G.mode === 'demo') audio.play('ai');
          if (key === 'bars' && fx.type === 'good' && mine) audio.play('grab');
          if (key === 'spin') SV.pull[fx.i] = 1;
          if (key === 'sand') spawnLayer(fx.i, fx.q);
          break;
        case 'out': flyOff(p, fx.dir); audio.play('out'); break;
        case 'crumble': crumble(fx.i); audio.play('crumble'); break;
        case 'finish':
          if (key === 'bars') dropOff(p, true);
          if (key === 'sand' && fx.castle) addFlag(fx.i);
          if (mine) audio.play('finish');
          break;
        case 'timeout':
          if (key === 'bars') dropOff(p, false);
          break;
        default: break;
      }
    }
  }

  function tickFlow(dt) {
    G.pt += dt;
    const ev = G.ev;
    switch (G.phase) {
      case 'intro': {
        const minT = G.mode === 'demo' ? 3.2 : 2.6;
        if (G.pt > minT && players.every(p => p.mode !== 'walk')) {
          if (G.mode === 'local') { G.turn = 0; beginTurnPrompt(); }
          else startCount();
        }
        break;
      }
      case 'count': {
        const n = 3 - Math.floor(G.pt / 0.7);
        const label = n > 0 ? String(n) : 'GO';
        if (label !== G.countdown) { G.countdown = label; audio.play(n > 0 ? 'count' : 'go'); emit(true); }
        if (n <= 0) {
          participants().forEach(i => ev.start(i));
          if (G.mode === 'cpu') G.caption = { who: EVENTS[G.ei].name, text: EVENTS[G.ei].hint };
          else if (G.mode === 'local') G.caption = null;
          G.lastInput = now();
          setPhase('play'); G.countdown = 'GO';
        }
        break;
      }
      case 'play': {
        if (G.pt > 0.7 && G.countdown) { G.countdown = ''; }
        if (G.mode === 'cpu' && G.pt > 4 && G.caption) G.caption = null;
        if (G.mode === 'demo') {
          G.teachT -= dt;
          if (G.teachT <= 0) { const T = TEACH[ev.key]; G.caption = { who: 'HOW TO PLAY', text: T[G.teachK % T.length] }; G.teachK++; G.teachT = 4.5; }
        }
        const parts = participants();
        for (const i of parts) {
          const p = players[i];
          if (p.ai && p.ai.step(ev, i, dt)) handleFx(ev.tap(i));
        }
        handleFx(ev.update(dt));
        if (ev.allDone(parts)) {
          if (G.mode === 'local') { G.caption = { who: players[G.turn].name, text: 'Score: ' + ev.scoreText(G.turn) }; setPhase('turnEnd'); }
          else endEvent();
        }
        break;
      }
      case 'turnEnd':
        if (G.pt > 1.8) {
          G.turn++;
          if (G.turn < players.length) beginTurnPrompt(); else endEvent();
        }
        break;
      case 'eventEnd':
        if (G.pt > 3.6) {
          if (G.ei + 1 < EVENTS.length) beginEvent(G.ei + 1); else finishChampionship();
        }
        break;
      case 'result':
        if (G.mode === 'demo' && G.pt > 7) beginChampionship();
        break;
      default: break;
    }
  }

  /* ---------- camera ---------- */
  const cam = { pos: new THREE.Vector3(0, 20, 26), look: new THREE.Vector3(0, 0, 0), gpos: new THREE.Vector3(), glook: new THREE.Vector3() };
  function viewKey() {
    if (G.phase === 'result') return 'podium';
    if (G.phase === 'left') return 'all';
    return EVENTS[G.ei] ? EVENTS[G.ei].key : 'all';
  }
  function computeGoal() {
    const V = VIEWS[viewKey()] || VIEWS.all;
    const pts = V.pts.map(a => new THREE.Vector3(...a));
    const center0 = new THREE.Box3().setFromPoints(pts).getCenter(new THREE.Vector3());
    if (viewKey() !== 'all') {
      players.forEach(p => {
        localPos(p.fox, _v);
        if (_v.distanceTo(center0) < 11) { pts.push(_v.clone()); pts.push(_v.clone().setY(_v.y + 2.9)); }
      });
    }
    const box = new THREE.Box3().setFromPoints(pts), c = box.getCenter(new THREE.Vector3());
    const aspect = vw / vh;
    const dir = new THREE.Vector3(...(aspect < 1 && V.pdir ? V.pdir : V.dir)).normalize();
    const tanV = Math.tan(camera.fov * DEG / 2), tanH = tanV * aspect;
    let fx0 = safe.left / vw, fx1 = 1 - safe.right / vw, fy0 = safe.top / vh, fy1 = 1 - safe.bottom / vh;
    if (fx1 - fx0 < 0.3) { fx0 = 0; fx1 = 1; }
    if (fy1 - fy0 < 0.22) { fy0 = 0; fy1 = 1; }
    const fw = fx1 - fx0, fh = fy1 - fy0;
    const cx = fx0 + fx1 - 1, cy = 1 - (fy0 + fy1);
    const fwd = dir.clone().negate(), right = new THREE.Vector3().crossVectors(fwd, UP).normalize(), up = new THREE.Vector3().crossVectors(right, fwd);
    /* tight fit: every point must project inside the free area (camera looks at c from distance D) */
    let dist = 6;
    for (const p of pts) {
      _v.copy(p).sub(c);
      const x = Math.abs(_v.dot(right)) + 0.5, y = Math.abs(_v.dot(up)) + 0.5, z = _v.dot(fwd);
      dist = Math.max(dist, x / (tanH * fw) - z, y / (tanV * fh) - z);
    }
    cam.gpos.copy(c).addScaledVector(dir, dist);
    cam.glook.copy(c).addScaledVector(right, -cx * dist * tanH).addScaledVector(up, -cy * dist * tanV);
  }
  function setFov() {
    const fov = W ? (W.camera && W.camera.fov) || 50 : (vw / vh < 1 ? 62 : 45);
    if (camera.fov !== fov) { camera.fov = fov; }
    camera.aspect = vw / vh; camera.updateProjectionMatrix();
  }
  function updateCamera(dt, snap) {
    if (W) { vw = Math.max(1, W.renderer.domElement.clientWidth); vh = Math.max(1, W.renderer.domElement.clientHeight); }
    setFov();
    computeGoal();
    const k = snap ? 1 : 1 - Math.exp(-3 * dt);
    cam.pos.lerp(cam.gpos, k); cam.look.lerp(cam.glook, k);
    camera.position.copy(cam.pos); camera.lookAt(cam.look);
    camera.updateMatrixWorld();
    if (W) {
      scene.updateWorldMatrix(true, false);
      wcam.position.copy(camera.position); scene.localToWorld(wcam.position);
      scene.getWorldQuaternion(_q); wcam.quaternion.copy(_q).multiply(camera.quaternion);
      wcam.fov = camera.fov; wcam.aspect = camera.aspect; wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
    }
  }
  function snapCam() { updateCamera(0, true); }

  /* ---------- HUD ---------- */
  let lastEmit = 0;
  function hud() {
    const E = EVENTS[G.ei] || EVENTS[0], ev = G.ev;
    const place = standings(players.map(p => p.pts));
    const hi = humanIndex();
    let meter = null;
    if (ev && hi >= 0 && G.phase === 'play') {
      const m = ev.meter(hi);
      if (m) meter = { v: Math.round(m.v * 1000) / 1000, lo: m.lo, hi: m.hi, idle: !!m.idle, flash: G.flash && now() - G.flash.t < 350 ? G.flash.type : '' };
    }
    const playing = G.phase === 'play' || G.phase === 'turn';
    const humanUp = G.mode !== 'demo' && (G.mode === 'cpu' || G.turn >= 0);
    let actionLabel = E.verb, canAct = true;
    if (G.mode === 'demo') actionLabel = 'PLAY NOW';
    else if (G.phase === 'turn') actionLabel = 'START';
    else if (G.phase === 'intro') actionLabel = 'SKIP';
    else if (G.phase === 'result' || G.phase === 'left') { actionLabel = 'PLAY AGAIN'; }
    else if (G.phase !== 'play' && G.phase !== 'count') canAct = false;
    return {
      key: GAME.key, name: GAME.name, phase: G.phase, mode: G.mode, paused: G.paused,
      level: G.level, levelName: LEVELS[G.level].name, rival: CAST[rivalKey()].name,
      foxes: G.nFoxes, localPlayers: G.nLocal,
      eventIndex: G.ei, eventCount: EVENTS.length, eventKey: E.key, eventName: E.name, verb: E.verb, hint: E.hint, goal: E.goal,
      timerText: ev && hi >= 0 ? ev.clock(hi) : '',
      countdown: G.countdown, caption: G.caption,
      players: players.map((p, i) => {
        const r = ev && ev.runners[i];
        return { name: p.name, color: p.look.torso[0], human: p.human, pts: p.pts, place: place[i], placeText: ord(place[i]),
          score: ev ? ev.scoreText(i) : '', active: !!(r && r.active && !r.done && G.phase === 'play'), out: !!(r && r.out), done: !!(r && r.done), turn: i === G.turn };
      }),
      turn: G.turn, turnName: G.turn >= 0 && players[G.turn] ? players[G.turn].name : '',
      meter, idleHint: playing && humanUp && !G.paused && now() - G.lastInput > 3000,
      actionLabel, canAct,
      eventResult: G.phase === 'eventEnd' ? G.evRes : null,
      result: G.phase === 'result' ? G.result : null,
      sound: audio.sound, music: audio.music, online: false, world: !!W,
      gold: +store.get('gold', 0) || 0,
      rules: RULES_TEXT,
    };
  }
  function emit(force) {
    const t = now(), gap = G.phase === 'play' ? 33 : 100;
    if (!force && t - lastEmit < gap) return;
    lastEmit = t;
    try { onState(hud()); } catch (e) { console.error('[playground] onState', e); }
  }

  /* ---------- input ---------- */
  function action() {
    audio.unlock();
    G.lastInput = now();
    if (G.paused) return;
    if (G.mode === 'demo') { start('cpu'); return; }
    switch (G.phase) {
      case 'play': {
        const i = humanIndex();
        if (i >= 0 && players[i] && players[i].human) handleFx(G.ev.tap(i));
        break;
      }
      case 'turn': startCount(); break;
      case 'intro':
        players.forEach(p => { if (p.walk) p.walk.t = 1; });
        G.pt = 99; break;
      case 'result': case 'left': beginChampionship(); break;
      default: break;
    }
    emit(true);
  }
  function onKey(e) {
    if (e.repeat) return;
    const k = e.code || e.key;
    if (k === 'Space' || k === ' ' || k === 'Enter' || k === 'KeyJ' || k === 'Digit1') {
      if (e.preventDefault) e.preventDefault();
      action();
    } else if (k === 'KeyR') beginChampionship();
  }
  function onCanvasDown(e) {
    if (e.button > 0) return;
    e.preventDefault();
    try { container.focus({ preventScroll: true }); } catch (err) { /* ignore */ }
    action();
  }
  function onWorldDown(e) {
    if (e.target !== W.renderer.domElement) return;
    if (e.button > 0) return;
    e.preventDefault(); e.stopImmediatePropagation();
    action();
  }
  if (W) window.addEventListener('pointerdown', onWorldDown, true);
  else {
    renderer.domElement.addEventListener('pointerdown', onCanvasDown);
    if (container.tabIndex < 0) container.tabIndex = 0;
    container.style.outline = 'none';
    container.addEventListener('keydown', onKey);
  }

  /* ---------- loop ---------- */
  let raf = 0, last = now(), dead = false;
  function frame() {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const t = now(), dt = Math.min(0.05, (t - last) / 1000) * (opts.timeScale || 1); last = t;
    if (W) scene.updateWorldMatrix(true, true);
    if (!G.paused) {
      tickFlow(dt);
      players.forEach(p => updateFox(p, dt));
      updateStations(dt);
    }
    updateCamera(dt, false);
    if (!W) renderer.render(scene, camera);
    emit(false);
  }

  function start(mode) {
    if (['cpu', 'local', 'demo'].includes(mode)) G.mode = mode;
    beginChampionship();
  }

  beginChampionship();
  snapCam();
  raf = requestAnimationFrame(frame);

  const api = {
    hud,
    setSafe(s = {}) {
      safe.top = +s.top || 0; safe.bottom = +s.bottom || 0; safe.left = +s.left || 0; safe.right = +s.right || 0;
      computeGoal();
    },
    start,
    key: onKey,
    get camera() { return W ? wcam : camera; },
    snapCam,
    destroy() {
      if (dead) return; dead = true;
      cancelAnimationFrame(raf);
      if (W) window.removeEventListener('pointerdown', onWorldDown, true);
      else {
        renderer.domElement.removeEventListener('pointerdown', onCanvasDown);
        container.removeEventListener('keydown', onKey);
        if (ro) ro.disconnect();
      }
      audio.close();
      players.forEach(p => { if (p.fox.userData.fromKit && p.fox.parent) p.fox.parent.remove(p.fox); });
      if (W) { W.parent.remove(scene); disposeTree(scene); }
      else { disposeTree(scene); renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); }
    },
    /* page actions */
    action,
    tap: action,
    restart() { beginChampionship(); },
    playAgain() { beginChampionship(); },
    setLevel(l) { G.level = Math.max(0, Math.min(2, l | 0)); if (G.mode === 'cpu') beginChampionship(); else emit(true); },
    setFoxes(n) {
      n = Math.max(2, Math.min(4, n | 0));
      if (G.mode === 'local') G.nLocal = n; else G.nFoxes = n;
      beginChampionship();
    },
    setSound(b) { audio.setSound(b); emit(true); },
    setMusic(b) { audio.setMusic(b); emit(true); },
    pause(b) { G.paused = !!b; last = now(); emit(true); },
    leave() { G.paused = false; G.caption = { who: 'PLAYGROUND', text: 'See you next time. Tap PLAY AGAIN to come back.' }; setPhase('left'); },
    invite() { return { online: false, message: 'Online play is coming soon.' }; },
    rules() { return RULES_TEXT.slice(); },
  };
  emit(true);
  return api;
}
