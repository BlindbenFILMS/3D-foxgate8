/* ORCHARD — pure rules + AI. No three.js in here.
   Coordinates: x across the orchard, z toward the player (+z), y up. */

export const STAGE = { BUD: 0, UNRIPE: 1, RIPE: 2, OVER: 3, FALLING: 4, GROUND: 5, GONE: 6 };
export const STAGE_NAME = ['bud', 'unripe', 'ripe', 'overripe', 'falling', 'ground', 'gone'];

export const KINDS = {
  apple: { label: 'APPLE', ripe: '#e2322b', unripe: '#8cc63f', over: '#6e3a24', pts: 10 },
  pear:  { label: 'PEAR',  ripe: '#f2d14b', unripe: '#9fcf4a', over: '#7c6a2a', pts: 10 },
  plum:  { label: 'PLUM',  ripe: '#7b3fa8', unripe: '#86c46a', over: '#3d2440', pts: 12 },
  peach: { label: 'PEACH', ripe: '#ff8f45', unripe: '#a8cf55', over: '#7a4a2c', pts: 11 },
  gold:  { label: 'GOLDEN APPLE', ripe: '#ffd23a', unripe: '#c9d65a', over: '#8a6a1c', pts: 30 },
};
export const TREE_KINDS = ['apple', 'pear', 'plum', 'peach'];

export const ROUND_TIME = 60;
export const TURN_TIME = 40;
export const G = 15;
export const CANOPY = { y: 4.3, rx: 2.0, ry: 1.45, rz: 1.5 };
export const TREE_SPACING = 4.7;
export const TREE_Z = -1.6;
export const SLOTS_PER_TREE = 9;
export const SHAKE_COOLDOWN = 5;
export const PLAY = { minX: -7.4, maxX: 7.4, minZ: -0.6, maxZ: 4.4 };

/* Opponent cast. easy / medium / hard map to PIP / HOPE / NOBLE. */
export const LEVELS = {
  pip:   { key: 'pip',   name: 'PIP',   rank: 'ROOKIE', speed: 4.3, react: [0.75, 1.4], mistake: 0.22, foresight: 0,   shake: 0.04, contest: 0.1 },
  hope:  { key: 'hope',  name: 'HOPE',  rank: 'CLUB',   speed: 5.3, react: [0.4, 0.8],  mistake: 0.06, foresight: 0.8, shake: 0.14, contest: 0.35 },
  noble: { key: 'noble', name: 'NOBLE', rank: 'MASTER', speed: 6.5, react: [0.15, 0.4], mistake: 0,    foresight: 1.6, shake: 0.24, contest: 0.7 },
};
export const LEVEL_ORDER = ['pip', 'hope', 'noble'];

export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- orchard ---------- */
/* layout: { spacing, sx } — portrait screens use closer, slimmer trees */
export const LAYOUT_WIDE = { spacing: TREE_SPACING, sx: 1 };
export const LAYOUT_TALL = { spacing: 3.45, sx: 0.78 };
export function makeOrchard(seed, layout = LAYOUT_WIDE) {
  const rnd = rng(seed);
  const trees = [];
  for (let i = 0; i < 3; i++) {
    const kind = TREE_KINDS[(seed + i) % TREE_KINDS.length];
    trees.push({ i, x: (i - 1) * layout.spacing, z: TREE_Z, kind, cool: 0, shakeT: 0, sx: layout.sx });
  }
  const half = layout.spacing + CANOPY.rx * layout.sx;
  const o = { seed, rnd, trees, fruits: [], nextId: 1, t: 0, layout, half, minX: Math.max(PLAY.minX, -half - 0.4), maxX: Math.min(PLAY.maxX, half + 0.4) };
  for (const tr of trees) {
    const slots = [];
    let guard = 0;
    while (slots.length < SLOTS_PER_TREE && guard++ < 600) {
      const dx = lerp(-1.65, 1.65, rnd()) * layout.sx;
      const dy = lerp(-1.1, 1.2, rnd());
      const e = (dx / (CANOPY.rx * layout.sx)) ** 2 + (dy / CANOPY.ry) ** 2;
      if (e > 0.82) continue;
      if (slots.some((s) => Math.hypot(s.dx - dx, s.dy - dy) < 0.78 * (0.5 + layout.sx / 2))) continue;
      const dz = CANOPY.rz * Math.sqrt(Math.max(0, 1 - e)) + 0.08;
      slots.push({ dx, dy, dz });
    }
    slots.forEach((s, k) => {
      const f = newFruit(o, tr, k, s);
      /* stagger the opening so a few are ripe right away */
      const r = rnd();
      if (r < 0.3) { f.stage = STAGE.RIPE; f.dur = lerp(3, 7, rnd()); }
      else if (r < 0.75) { f.stage = STAGE.UNRIPE; f.dur = lerp(1, 6, rnd()); }
      else { f.stage = STAGE.BUD; f.dur = lerp(0.5, 3, rnd()); }
      o.fruits.push(f);
    });
  }
  return o;
}

function newFruit(o, tr, slot, s) {
  const kind = o.rnd() < 0.06 ? 'gold' : tr.kind;
  const hx = tr.x + s.dx, hy = CANOPY.y + s.dy, hz = tr.z + s.dz;
  return {
    id: o.nextId++, tree: tr.i, slot, s, kind, stage: STAGE.BUD, t: 0, dur: lerp(1.2, 2.6, o.rnd()),
    hx, hy, hz, x: hx, y: hy, z: hz, vx: 0, vy: 0, vz: 0, fellFrom: STAGE.RIPE, regrow: 0,
  };
}

function stageDur(o, f, stage) {
  const r = o.rnd();
  switch (stage) {
    case STAGE.BUD: return lerp(1.2, 2.6, r);
    case STAGE.UNRIPE: return lerp(3.5, 6.5, r);
    case STAGE.RIPE: return f.kind === 'gold' ? lerp(2.6, 3.6, r) : lerp(5, 8, r);
    case STAGE.OVER: return lerp(2.6, 3.8, r);
    case STAGE.GROUND: return 4.5;
    case STAGE.GONE: return lerp(0.8, 2.4, r);
  }
  return 1;
}

export function onTree(f) { return f.stage === STAGE.UNRIPE || f.stage === STAGE.RIPE || f.stage === STAGE.OVER; }
export function pickable(f) { return onTree(f) || f.stage === STAGE.GROUND; }

export function dropFruit(o, f, push = 1) {
  f.fellFrom = f.stage;
  f.stage = STAGE.FALLING; f.t = 0;
  f.vx = (o.rnd() - 0.5) * 0.9 * push; f.vy = 0.6 * push; f.vz = (0.8 + o.rnd() * 0.7) * push;
}

/* when will a falling fruit land, and where */
export function landing(f) {
  const y0 = f.y - 0.32, v = f.vy;
  const t = (v + Math.sqrt(v * v + 2 * G * Math.max(0, y0))) / G;
  return { t, x: f.x + f.vx * t, z: f.z + f.vz * t };
}

export function stepOrchard(o, dt, ev) {
  o.t += dt;
  for (const tr of o.trees) { tr.cool = Math.max(0, tr.cool - dt); tr.shakeT = Math.max(0, tr.shakeT - dt); }
  for (const f of o.fruits) {
    if (f.stage === STAGE.FALLING) {
      f.vy -= G * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
      if (f.y <= 0.32) {
        f.y = 0.32; f.stage = STAGE.GROUND; f.t = 0; f.dur = stageDur(o, f, STAGE.GROUND);
        f.x = clamp(f.x, o.minX, o.maxX); f.z = clamp(f.z, PLAY.minZ - 0.4, PLAY.maxZ);
        ev.push({ type: 'land', f });
      }
      continue;
    }
    f.t += dt;
    if (f.t < f.dur) continue;
    f.t = 0;
    switch (f.stage) {
      case STAGE.BUD: f.stage = STAGE.UNRIPE; break;
      case STAGE.UNRIPE: f.stage = STAGE.RIPE; ev.push({ type: 'ripe', f }); break;
      case STAGE.RIPE: f.stage = STAGE.OVER; break;
      case STAGE.OVER: dropFruit(o, f, 0.4); ev.push({ type: 'drop', f }); continue;
      case STAGE.GROUND: f.stage = STAGE.GONE; ev.push({ type: 'rot', f }); break;
      case STAGE.GONE: {
        const tr = o.trees[f.tree];
        const nf = newFruit(o, tr, f.slot, f.s);
        Object.assign(f, nf, { id: f.id });
        f.stage = STAGE.BUD; ev.push({ type: 'spawn', f });
        break;
      }
    }
    f.dur = stageDur(o, f, f.stage);
  }
}

/* ---------- scoring ---------- */
export function valueOf(f, how) {
  const base = KINDS[f.kind].pts;
  const st = how === 'catch' ? f.fellFrom : f.stage;
  if (how === 'ground') {
    const was = f.fellFrom === STAGE.RIPE ? base : f.fellFrom === STAGE.OVER ? Math.round(base * 0.4) : 2;
    return { pts: Math.max(1, Math.floor(was / 2)), ripe: false };
  }
  let pts = 2, ripe = false;
  if (st === STAGE.RIPE) { pts = base; ripe = true; }
  else if (st === STAGE.OVER) pts = Math.round(base * 0.4);
  if (how === 'catch') pts += 3;
  return { pts, ripe };
}
export function streakBonus(streak) { return Math.min(Math.max(streak - 1, 0), 5) * 2; }
export function starsFor(score, mode) {
  const k = mode === 'local' ? 0.7 : 1;
  return score >= 380 * k ? 3 : score >= 240 * k ? 2 : score >= 120 * k ? 1 : 0;
}

/* ---------- foxes ---------- */
export function makeFoxState(id, o, x, z) {
  return {
    id, name: o.name, color: o.color, ai: o.ai || null, you: !!o.you,
    x, z, face: Math.PI, speed: o.ai ? LEVELS[o.ai].speed : 6.2, moving: 0,
    task: null, queue: null, act: null, score: 0, streak: 0, bestStreak: 0, picks: 0, ripe: 0,
    think: 0.6, home: { x, z }, cheer: 0,
  };
}

export function standPoint(o, task) {
  if (task.type === 'move') return { x: task.x, z: task.z };
  if (task.type === 'shake') { const tr = o.trees[task.tree]; return { x: tr.x + 0.35, z: tr.z + 1.05 }; }
  const f = o.fruits.find((q) => q.id === task.fid);
  if (!f) return null;
  if (f.stage === STAGE.GROUND) return { x: f.x, z: f.z + 0.55 };
  return { x: f.x, z: clamp(f.z + 0.62, PLAY.minZ, PLAY.maxZ) };
}

function taskValid(o, fox, task) {
  if (task.type !== 'pick') return true;
  const f = o.fruits.find((q) => q.id === task.fid);
  return !!f && pickable(f);
}

export function setTask(fox, task) {
  if (fox.act) fox.queue = task; else { fox.task = task; fox.queue = null; }
}

export function stepFoxes(o, foxes, dt, ev, frozen) {
  const minX = o.minX ?? PLAY.minX, maxX = o.maxX ?? PLAY.maxX;
  for (const fx of foxes) {
    fx.cheer = Math.max(0, fx.cheer - dt);
    fx.moving = 0;
    if (frozen) continue;
    if (fx.act) {
      const a = fx.act;
      a.t += dt;
      if (!a.done && a.t >= a.dur * a.hit) { a.done = true; resolveAct(o, fx, a, ev, foxes); }
      if (a.t >= a.dur) {
        fx.act = null;
        if (fx.queue) { fx.task = fx.queue; fx.queue = null; }
      }
      continue;
    }
    if (!fx.task) continue;
    if (!taskValid(o, fx, fx.task)) { fx.task = null; continue; }
    const p = standPoint(o, fx.task);
    if (!p) { fx.task = null; continue; }
    const dx = p.x - fx.x, dz = p.z - fx.z, d = Math.hypot(dx, dz);
    const step = fx.speed * dt;
    if (d > 0.06) {
      const k = Math.min(1, step / d);
      fx.x += dx * k; fx.z += dz * k; fx.moving = fx.speed;
      fx.face = Math.atan2(dx, dz);
    }
    if (d <= Math.max(0.12, step)) startAct(o, fx);
  }
  /* soft separation so foxes don't stack */
  for (let i = 0; i < foxes.length; i++) for (let j = i + 1; j < foxes.length; j++) {
    const a = foxes[i], b = foxes[j];
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d > 0.0001 && d < 0.85) {
      const push = (0.85 - d) * 0.5;
      const ax = a.act ? 0 : 1, bx = b.act ? 0 : 1;
      a.x -= (dx / d) * push * ax; a.z -= (dz / d) * push * ax;
      b.x += (dx / d) * push * bx; b.z += (dz / d) * push * bx;
    }
  }
  for (const fx of foxes) { fx.x = clamp(fx.x, minX, maxX); fx.z = clamp(fx.z, PLAY.minZ, PLAY.maxZ); }
  /* catching falling fruit */
  if (!frozen) for (const f of o.fruits) {
    if (f.stage !== STAGE.FALLING || f.y > 2.5 || f.y < 0.5) continue;
    let best = null, bd = 0.95;
    for (const fx of foxes) {
      if (fx.act && fx.act.type === 'shake') continue;
      const d = Math.hypot(fx.x - f.x, fx.z - f.z);
      if (d < bd) { bd = d; best = fx; }
    }
    if (best) award(o, best, f, 'catch', ev);
  }
}

function startAct(o, fx) {
  const t = fx.task;
  fx.task = null;
  if (t.type === 'move') return;
  if (t.type === 'shake') {
    fx.face = Math.PI;
    fx.act = { type: 'shake', t: 0, dur: 0.75, hit: 0.55, tree: t.tree };
    return;
  }
  const f = o.fruits.find((q) => q.id === t.fid);
  if (!f) return;
  fx.face = Math.PI;
  if (f.stage === STAGE.GROUND) fx.act = { type: 'stoop', t: 0, dur: 0.34, hit: 0.6, fid: f.id };
  else if (f.y > 4.35) fx.act = { type: 'jump', t: 0, dur: 0.58, hit: 0.5, fid: f.id };
  else fx.act = { type: 'reach', t: 0, dur: 0.36, hit: 0.6, fid: f.id };
}

function resolveAct(o, fx, a, ev, foxes) {
  if (a.type === 'shake') {
    const tr = o.trees[a.tree];
    if (tr.cool > 0) { ev.push({ type: 'shakeFail', fox: fx, tree: tr }); return; }
    tr.cool = SHAKE_COOLDOWN; tr.shakeT = 0.9;
    let n = 0;
    for (const f of o.fruits) if (f.tree === tr.i && (f.stage === STAGE.RIPE || f.stage === STAGE.OVER)) { dropFruit(o, f); n++; }
    ev.push({ type: 'shake', fox: fx, tree: tr, n });
    return;
  }
  const f = o.fruits.find((q) => q.id === a.fid);
  if (!f || !pickable(f)) { ev.push({ type: 'miss', fox: fx }); fx.streak = 0; return; }
  if (Math.hypot(f.x - fx.x, f.z - fx.z) > 1.5) { ev.push({ type: 'miss', fox: fx }); return; }
  award(o, fx, f, f.stage === STAGE.GROUND ? 'ground' : 'pick', ev);
}

function award(o, fx, f, how, ev) {
  const v = valueOf(f, how);
  let pts = v.pts;
  if (v.ripe) { fx.streak++; fx.ripe++; pts += streakBonus(fx.streak); fx.bestStreak = Math.max(fx.bestStreak, fx.streak); }
  else fx.streak = 0;
  fx.score += pts; fx.picks++;
  const wasStage = how === 'catch' ? f.fellFrom : f.stage;
  ev.push({ type: 'pick', fox: fx, f, pts, how, ripe: v.ripe, gold: f.kind === 'gold' && v.ripe, wasStage, x: f.x, y: f.y, z: f.z, kind: f.kind });
  f.stage = STAGE.GONE; f.t = 0; f.dur = stageDur(o, f, STAGE.GONE);
}

/* ---------- AI ---------- */
function eta(fx, p) { return Math.hypot(p.x - fx.x, p.z - fx.z) / fx.speed; }

export function aiThink(o, fx, foxes, rnd) {
  const L = LEVELS[fx.ai];
  const others = foxes.filter((q) => q !== fx);
  let best = null, bestScore = 0;
  const consider = (task, value, time) => {
    const s = value / (0.4 + time);
    if (s > bestScore) { bestScore = s; best = task; }
  };
  for (const f of o.fruits) {
    let value = 0, wait = 0;
    const base = KINDS[f.kind].pts;
    if (f.stage === STAGE.FALLING) {
      const land = landing(f);
      const t = eta(fx, land);
      if (t < land.t + 0.05) consider({ type: 'move', x: land.x, z: land.z, catchFid: f.id }, base + 6, t);
      continue;
    }
    const p = standPoint(o, { type: 'pick', fid: f.id });
    if (!p) continue;
    const t = eta(fx, p);
    if (f.stage === STAGE.RIPE) {
      const left = f.dur - f.t;
      if (left < t * 0.8) continue; /* will go over before we arrive */
      value = base + streakBonus(fx.streak + 1);
    } else if (f.stage === STAGE.UNRIPE) {
      const until = f.dur - f.t;
      if (L.foresight > 0 && until < L.foresight && until <= t + 0.3) value = base * 0.8;
      else if (rnd() < L.mistake * 0.15) value = 3;
      else continue;
      wait = Math.max(0, until - t);
    } else if (f.stage === STAGE.OVER) value = Math.round(base * 0.4);
    else if (f.stage === STAGE.GROUND) value = Math.max(1, Math.floor(base * 0.35));
    else continue;
    /* is somebody already going there and closer? */
    const rival = others.find((q) => q.task && q.task.type === 'pick' && q.task.fid === f.id);
    if (rival && eta(rival, p) < t && rnd() > L.contest) continue;
    if (fx.ai === 'pip' && rnd() < L.mistake) value *= 0.5 + rnd();
    consider({ type: 'pick', fid: f.id }, value, t + wait + (f.y > 4.35 ? 0.25 : 0));
  }
  /* shaking: worth it when a tree is loaded and we can catch */
  if (rnd() < L.shake) {
    for (const tr of o.trees) {
      if (tr.cool > 0) continue;
      const n = o.fruits.filter((f) => f.tree === tr.i && (f.stage === STAGE.RIPE || f.stage === STAGE.OVER)).length;
      if (n >= 3) consider({ type: 'shake', tree: tr.i }, n * 7, eta(fx, standPoint(o, { type: 'shake', tree: tr.i })) + 0.8);
    }
  }
  if (!best) {
    const tr = o.trees[Math.floor(rnd() * o.trees.length)];
    best = { type: 'move', x: tr.x + (rnd() - 0.5) * 2, z: tr.z + 2.2 + rnd() };
  }
  return best;
}

export function stepAI(o, foxes, dt, rnd, frozen) {
  if (frozen) return;
  for (const fx of foxes) {
    if (!fx.ai) continue;
    fx.think -= dt;
    const L = LEVELS[fx.ai];
    if (fx.think > 0) continue;
    fx.think = lerp(L.react[0], L.react[1], rnd());
    if (fx.act) continue;
    const t = aiThink(o, fx, foxes, rnd);
    if (t) fx.task = t;
  }
}
