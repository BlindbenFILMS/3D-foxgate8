/* CAR WASH: pure rules + AI. No three.js here.
   Spot levels: 0 = mud (needs SOAP), 1 = foam (needs RINSE), 2 = wet (needs DRY), 3 = clean. */

export const TOOLS = ['SOAP', 'RINSE', 'DRY'];
export const ROUND_SECS = 60;      /* VS CPU + DEMO round */
export const TURN_SECS = 40;       /* PASS & PLAY turn per player */
export const RADIUS = 0.7;         /* brush radius, car-local units */
export const PLAYER_RATE = 4.4;    /* progress per second at the brush centre */

export const LEVELS = {
  easy:   { key: 'easy',   name: 'PIP',   tag: 'ROOKIE', speed: 2.3, rate: 2.5, style: 'wander',  pause: 0.38 },
  medium: { key: 'medium', name: 'HOPE',  tag: 'CLUB',   speed: 3.5, rate: 3.2, style: 'sweep',   pause: 0.1 },
  hard:   { key: 'hard',   name: 'NOBLE', tag: 'MASTER', speed: 5.6, rate: 4.3, style: 'nearest', pause: 0 }
};

/* Dirt spots on the player's side and the top of the car (car-local, car faces +x, player side is +z). */
const SIDE = [0, 0, 1], UP = [0, 1, 0];
export const SPOT_POOL = [
  { p: [-1.8, 1.0, 1.01], n: SIDE }, { p: [-1.0, 0.78, 1.01], n: SIDE }, { p: [-0.2, 1.1, 1.01], n: SIDE },
  { p: [0.6, 0.8, 1.01], n: SIDE },  { p: [1.4, 1.08, 1.01], n: SIDE }, { p: [1.95, 0.8, 1.01], n: SIDE },
  { p: [-0.95, 1.76, 0.86], n: SIDE }, { p: [0.25, 1.8, 0.86], n: SIDE }, { p: [-0.35, 1.58, 0.86], n: SIDE },
  { p: [1.55, 1.36, 0.45], n: UP }, { p: [1.8, 1.36, -0.3], n: UP }, { p: [1.15, 1.36, 0.05], n: UP },
  { p: [-1.75, 1.36, 0.35], n: UP }, { p: [-1.85, 1.36, -0.35], n: UP },
  { p: [-0.6, 2.16, 0.3], n: UP }, { p: [0.2, 2.16, -0.2], n: UP }
];

export function pickSpots(rng = Math.random) {
  const pool = SPOT_POOL.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const n = 9 + Math.floor(rng() * 3);
  return pool.slice(0, n).map(s => {
    const p = s.p.slice();
    const j = () => (rng() - 0.5) * 0.16;
    if (s.n === SIDE) { p[0] += j(); p[1] += j(); } else { p[0] += j(); p[2] += j(); }
    return { p, n: s.n.slice(), size: 0.85 + rng() * 0.35, rot: rng() * Math.PI * 2, lvl: 0, prog: 0 };
  });
}

/* Stage of a car = the lowest spot level. 3 = all clean. */
export function stageOf(spots) { let m = 3; for (const s of spots) if (s.lvl < m) m = s.lvl; return m; }
export function pctOf(spots) {
  if (!spots.length) return 0;
  let t = 0; for (const s of spots) t += Math.min(3, s.lvl + (s.lvl < 3 ? s.prog : 0));
  return t / (3 * spots.length);
}

/* Apply a brush at local point q = {x,y,z}. Mutates spots. Returns events. */
export function brush(spots, q, dt, rate) {
  const stage = stageOf(spots);
  const ev = { pops: [], stageUp: false, done: false, stage };
  if (stage >= 3) return ev;
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    if (s.lvl !== stage) continue;
    const dx = s.p[0] - q.x, dy = s.p[1] - q.y, dz = s.p[2] - q.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > RADIUS * RADIUS) continue;
    const w = 1 - 0.5 * d2 / (RADIUS * RADIUS);
    s.prog += dt * rate * w;
    if (s.prog >= 1) { s.lvl++; s.prog = 0; ev.pops.push(i); }
  }
  const ns = stageOf(spots);
  if (ns > stage) { ev.stageUp = true; ev.stage = ns; }
  if (ns >= 3) ev.done = true;
  return ev;
}

/* Scoring */
export function carPoints(secs) { return 100 + Math.max(0, Math.round(60 - secs * 4)); }
export function partialPoints(pct) { return Math.round(pct * 50); }
export function starsFor(score, secs) {
  const k = secs / ROUND_SECS;
  return score >= 800 * k ? 3 : score >= 500 * k ? 2 : score >= 250 * k ? 1 : 0;
}
export function goldFor(score, win, level) {
  const mult = level === 'hard' ? 2 : level === 'medium' ? 1.5 : 1;
  return win ? Math.round((10 + score / 40) * mult) : Math.round(score / 100);
}
export function xpFor(score, win) { return Math.round(score / 10) + (win ? 25 : 5); }

/* AI washer. ai = { x, y, z, t, wait, spraying }, spots as above. */
export function aiCreate(levelKey) {
  return { level: LEVELS[levelKey] || LEVELS.medium, x: -2.4, y: 1.0, z: 1.02, t: -1, wait: 0.6, spraying: false };
}

function choose(ai, spots, stage, rng) {
  let best = -1, bv = Infinity;
  const left = [];
  for (let i = 0; i < spots.length; i++) if (spots[i].lvl === stage) left.push(i);
  if (!left.length) return -1;
  const st = ai.level.style;
  if (st === 'wander') return left[Math.floor(rng() * left.length)];
  for (const i of left) {
    const p = spots[i].p;
    const v = st === 'sweep'
      ? p[0] * 10 + p[1]                                                       /* HOPE feels left to right */
      : (p[0] - ai.x) ** 2 + (p[1] - ai.y) ** 2 + (p[2] - ai.z) ** 2;          /* NOBLE: nearest */
    if (v < bv) { bv = v; best = i; }
  }
  return best;
}

/* Moves the AI brush. Returns true while it is spraying. */
export function aiStep(ai, spots, stage, dt, rng = Math.random) {
  if (stage >= 3) { ai.spraying = false; return false; }
  if (ai.wait > 0) { ai.wait -= dt; ai.spraying = false; return false; }
  let s = spots[ai.t];
  if (!s || s.lvl !== stage) {
    const had = ai.t >= 0;
    ai.t = choose(ai, spots, stage, rng);
    s = spots[ai.t];
    if (had && ai.level.pause > 0) { ai.wait = ai.level.pause * (0.5 + rng()); ai.spraying = false; return false; }
    if (!s) { ai.spraying = false; return false; }
  }
  const dx = s.p[0] - ai.x, dy = s.p[1] - ai.y, dz = s.p[2] - ai.z;
  const d = Math.hypot(dx, dy, dz), step = ai.level.speed * dt;
  if (d > step) { ai.x += dx / d * step; ai.y += dy / d * step; ai.z += dz / d * step; }
  else { ai.x = s.p[0]; ai.y = s.p[1]; ai.z = s.p[2]; }
  ai.spraying = d < RADIUS * 0.8;
  return ai.spraying;
}

export const DEMO_CAPTIONS = [
  'Drag over the mud to SOAP it.',
  'Then RINSE the foam away.',
  'DRY the water drops to finish.',
  'Clean cars fast for bigger tips.',
  'HOPE washes by feel, left to right.',
  'Tap the screen to play.'
];
