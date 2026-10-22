/* FOX FARM: pure rules + AI. No three.js, runs headless (node or browser).
   Coordinates here are PLOT-LOCAL (x right, z toward the player, units = world units). */

export const CROPS = {
  lettuce: { key: 'lettuce', name: 'LETTUCE', grow: 6, pts: 2, waters: 1 },
  carrot:  { key: 'carrot',  name: 'CARROT',  grow: 10, pts: 3, waters: 2 },
  corn:    { key: 'corn',    name: 'CORN',    grow: 16, pts: 5, waters: 2 },
};
export const SEEDS = ['corn', 'carrot', 'lettuce'];

export const COLS = 3, ROWS = 4, GAP = 2.3;
export const RIPE_WINDOW = 8;       /* seconds a ripe crop waits before it wilts */
export const WALK = 5.6;            /* units per second at speed 1 */
export const ACT = { plant: 0.42, water: 0.5, pick: 0.36, clear: 0.4, shoo: 0.2 };
export const CROW_FLY = 1.6, CROW_EAT = 3.6;
export const GOLD_CHANCE = 0.08;
export const SALAD_BONUS = 6;      /* one of each crop picked = a salad bowl */
export const MAX_QUEUE = 6;

export const LEVELS = {
  pip:   { key: 'pip',   name: 'PIP',   speed: 0.8,  react: 0.85, noise: 26, actMul: 1.3,  label: 'ROOKIE' },
  hope:  { key: 'hope',  name: 'HOPE',  speed: 0.95, react: 0.42, noise: 10, actMul: 1.08, label: 'CLUB' },
  noble: { key: 'noble', name: 'NOBLE', speed: 1.05, react: 0.16, noise: 2,  actMul: 0.86, label: 'MASTER' },
  human: { key: 'human', name: 'YOU',   speed: 1.0,  react: 0,    noise: 0,  actMul: 1,    label: '' },
};

export function tilePos(i) {
  const c = i % COLS, r = Math.floor(i / COLS);
  return { x: (c - (COLS - 1) / 2) * GAP, z: (r - (ROWS - 1) / 2) * GAP };
}
/* where a worker stands to tend tile i: just in front of it (toward +z) */
export function standPos(i) { const p = tilePos(i); return { x: p.x, z: p.z + GAP * 0.48 }; }
export const HOME = { x: 0, z: ((ROWS - 1) / 2) * GAP + GAP * 0.95 };

export function makeRng(seed = Date.now() % 2147483647) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function newTile() {
  return { crop: null, stage: 'empty', g: 0, w: 0, thirsty: false, ripeT: 0, golden: false, crow: null, wiltT: 0 };
}

export function createMatch({ players, seconds = 90, seed, active } = {}) {
  const rng = makeRng(seed);
  const m = {
    rng, seconds, time: seconds, over: false, t: 0,
    crowTimer: 8 + rng() * 4,
    players: players.map((p, i) => ({
      idx: i, name: p.name, kind: p.kind, level: p.level || (p.kind === 'human' ? 'human' : 'pip'),
      color: p.color, x: HOME.x, z: HOME.z, face: Math.PI, queue: [], busy: null, path: null,
      score: 0, picked: { corn: 0, carrot: 0, lettuce: 0 }, bowl: { corn: false, carrot: false, lettuce: false }, salads: 0, lost: 0, gold: 0, cool: 0.6 + i * 0.2,
      tiles: Array.from({ length: COLS * ROWS }, newTile), walking: false,
    })),
    active: active || players.map((_, i) => i),
  };
  return m;
}

export function visualStage(t) {
  if (t.stage === 'empty' || t.stage === 'withered' || t.stage === 'ripe') return t.stage;
  if (t.g < 0.12) return 'seed';
  if (t.g < 0.5) return 'sprout';
  return 'growing';
}

/* --- queueing (humans) --- */
export function toggleQueue(m, pi, tile, seed) {
  const p = m.players[pi];
  const k = p.queue.findIndex(q => q.tile === tile);
  if (k >= 0) { p.queue.splice(k, 1); return 'unqueue'; }
  if (p.busy && p.busy.tile === tile) return 'busy';
  if (p.queue.length >= MAX_QUEUE) return 'full';
  p.queue.push({ tile, seed });
  return 'queue';
}

/* What would happen on arrival at tile i (used by AI, hints and the HUD) */
export function actionFor(t) {
  if (t.crow) return 'shoo';
  if (t.stage === 'empty') return 'plant';
  if (t.stage === 'withered') return 'clear';
  if (t.stage === 'ripe') return 'pick';
  if (t.thirsty) return 'water';
  return null;
}

function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

/* Best crop to plant with `left` seconds remaining. */
export function bestSeed(left, walkPad = 4, p = null) {
  let best = null, bv = -1;
  for (const k of SEEDS) {
    if (CROPS[k].grow + walkPad > left) continue;
    let v = CROPS[k].pts;
    if (p && !p.bowl[k] && p.tiles.filter(t => t.crop === k).length < 2) v += 3.5;
    if (v > bv) { bv = v; best = k; }
  }
  return best;
}

/* Score every tile for a player; returns best {tile, seed, score} or null. Used by AI + hints. */
export function chooseTask(m, pi, noise = 0) {
  const p = m.players[pi], rng = m.rng;
  const lv = LEVELS[p.level] || LEVELS.human;
  const left = m.time;
  let best = null;
  p.tiles.forEach((t, i) => {
    const d = dist(p, standPos(i));
    const reach = d / (WALK * lv.speed);
    let s = -1e9, seed = null;
    const act = actionFor(t);
    if (act === 'shoo') s = 120 - d * 2;
    else if (act === 'pick') s = 80 + t.ripeT * 4 + CROPS[t.crop].pts * 3 + (t.golden ? 12 : 0) - d * 2.4;
    else if (act === 'water') s = 62 + CROPS[t.crop].pts * 2 - d * 2.4;
    else if (act === 'plant') {
      seed = bestSeed(left - reach - 1.5, 4, p);
      if (seed) s = 40 + CROPS[seed].pts - d * 2.6;
    } else if (act === 'clear') s = 28 - d * 2;
    if (s < -1e8) return;
    if (noise) s += (rng() - 0.5) * noise * 2;
    if (!best || s > best.score) best = { tile: i, seed, score: s, act };
  });
  if (best && noise > 15 && best.act === 'plant' && rng() < 0.3) best.seed = SEEDS[Math.floor(rng() * 3)];
  return best;
}

/* --- the main step. Returns an array of events for sound, captions and effects --- */
export function step(m, dt) {
  const ev = [];
  if (m.over) return ev;
  m.t += dt;
  m.time = Math.max(0, m.time - dt);
  for (const pi of m.active) stepPlayer(m, pi, dt, ev);
  stepCrows(m, dt, ev);
  if (m.time <= 0) { m.over = true; ev.push({ type: 'over' }); }
  return ev;
}

function stepPlayer(m, pi, dt, ev) {
  const p = m.players[pi];
  const lv = LEVELS[p.level] || LEVELS.human;
  /* tiles */
  p.tiles.forEach((t, i) => {
    if (t.stage === 'growing') {
      if (!t.thirsty) {
        const before = t.g;
        t.g += dt / CROPS[t.crop].grow;
        if (before < 0.5 && t.g >= 0.5 && t.w < CROPS[t.crop].waters) { t.thirsty = true; ev.push({ type: 'thirsty', p: pi, tile: i }); }
        if (t.g >= 1) { t.g = 1; t.stage = 'ripe'; t.ripeT = 0; ev.push({ type: 'ripe', p: pi, tile: i, crop: t.crop, golden: t.golden }); }
      }
    } else if (t.stage === 'ripe') {
      t.ripeT += dt;
      if (t.ripeT > RIPE_WINDOW && !t.crow) { t.stage = 'withered'; t.wiltT = 0; p.lost++; ev.push({ type: 'wilt', p: pi, tile: i, crop: t.crop }); }
    } else if (t.stage === 'withered') t.wiltT += dt;
  });
  /* AI thinking */
  if (p.kind === 'cpu' && !p.busy && !p.queue.length) {
    p.cool -= dt;
    if (p.cool <= 0) {
      const task = chooseTask(m, pi, lv.noise);
      if (task) p.queue.push({ tile: task.tile, seed: task.seed || 'lettuce' });
      p.cool = lv.react * (0.6 + m.rng() * 0.8);
    }
  }
  /* busy doing an action */
  if (p.busy) {
    p.busy.t -= dt;
    if (p.busy.t <= 0) { finishAction(m, pi, p.busy, ev); p.busy = null; }
    p.walking = false;
    return;
  }
  /* walk toward the head of the queue (or home) */
  const head = p.queue[0];
  const goal = head ? standPos(head.tile) : HOME;
  const d = dist(p, goal);
  const sp = WALK * lv.speed * dt;
  if (d > 0.02) {
    const k = Math.min(1, sp / d);
    p.face = Math.atan2(goal.x - p.x, goal.z - p.z);
    p.x += (goal.x - p.x) * k; p.z += (goal.z - p.z) * k;
    p.walking = d > 0.05;
  } else p.walking = false;
  if (head && d <= 0.02 + sp) {
    p.x = goal.x; p.z = goal.z; p.face = Math.PI; /* face the tile (toward -z) */
    p.queue.shift();
    const t = p.tiles[head.tile];
    const act = actionFor(t);
    if (!act) { ev.push({ type: 'nothing', p: pi, tile: head.tile }); return; }
    if (act === 'shoo') {
      t.crow.state = 'leave'; t.crow.t = 0; ev.push({ type: 'shoo', p: pi, tile: head.tile });
      /* still pick it if ripe */
      const after = actionFor({ ...t, crow: null });
      if (after) p.busy = { tile: head.tile, act: after, seed: head.seed, t: ACT[after] * lv.actMul + ACT.shoo };
      else p.busy = { tile: head.tile, act: 'none', t: ACT.shoo };
      t.crow = null;
      return;
    }
    p.busy = { tile: head.tile, act, seed: head.seed, t: ACT[act] * lv.actMul };
    ev.push({ type: 'start', p: pi, tile: head.tile, act });
  }
}

function finishAction(m, pi, b, ev) {
  const p = m.players[pi], t = p.tiles[b.tile];
  const act = actionFor(t) || b.act;
  if (act !== b.act) { ev.push({ type: 'nothing', p: pi, tile: b.tile }); return; }
  if (act === 'plant') {
    Object.assign(t, newTile(), { crop: b.seed || 'lettuce', stage: 'growing', g: 0, w: 0, thirsty: true, golden: m.rng() < GOLD_CHANCE });
    ev.push({ type: 'plant', p: pi, tile: b.tile, crop: t.crop });
  } else if (act === 'water') {
    t.thirsty = false; t.w++;
    ev.push({ type: 'water', p: pi, tile: b.tile, crop: t.crop });
  } else if (act === 'pick') {
    const c = CROPS[t.crop];
    const pts = c.pts * (t.golden ? 2 : 1);
    p.score += pts; p.picked[t.crop]++;
    if (t.golden) p.gold++;
    ev.push({ type: 'pick', p: pi, tile: b.tile, crop: t.crop, pts, golden: t.golden });
    p.bowl[t.crop] = true;
    if (p.bowl.corn && p.bowl.carrot && p.bowl.lettuce) {
      p.bowl = { corn: false, carrot: false, lettuce: false };
      p.score += SALAD_BONUS; p.salads++;
      ev.push({ type: 'salad', p: pi, tile: b.tile, pts: SALAD_BONUS });
    }
    Object.assign(t, newTile());
  } else if (act === 'clear') {
    Object.assign(t, newTile());
    ev.push({ type: 'clear', p: pi, tile: b.tile });
  }
}

/* Crows: land on a ripe crop somewhere; if nobody shoos them, they eat it. */
function stepCrows(m, dt, ev) {
  for (const pi of m.active) {
    const p = m.players[pi];
    p.tiles.forEach((t, i) => {
      const c = t.crow; if (!c) return;
      c.t += dt;
      if (c.state === 'fly' && c.t >= CROW_FLY) { c.state = 'eat'; c.t = 0; ev.push({ type: 'crowLand', p: pi, tile: i }); }
      else if (c.state === 'eat' && c.t >= CROW_EAT) {
        ev.push({ type: 'eaten', p: pi, tile: i, crop: t.crop });
        p.lost++;
        Object.assign(t, newTile());
      }
    });
  }
  m.crowTimer -= dt;
  if (m.crowTimer <= 0) {
    const spots = [];
    for (const pi of m.active) m.players[pi].tiles.forEach((t, i) => { if (t.stage === 'ripe' && !t.crow && t.ripeT < RIPE_WINDOW - CROW_FLY - 1) spots.push([pi, i]); });
    if (!spots.length) { m.crowTimer = 1.5; return; }
    const [pi, i] = spots[Math.floor(m.rng() * spots.length)];
    m.players[pi].tiles[i].crow = { state: 'fly', t: 0, id: Math.floor(m.rng() * 1e9) };
    ev.push({ type: 'crow', p: pi, tile: i });
    const late = 1 - m.time / m.seconds;
    m.crowTimer = (9 - late * 3.5) + m.rng() * 4;
  }
}

export function ranking(m) {
  return m.players.map(p => p.idx).sort((a, b) => m.players[b].score - m.players[a].score);
}
export function starsFor(score) { return score >= 85 ? 3 : score >= 55 ? 2 : score >= 25 ? 1 : 0; }
