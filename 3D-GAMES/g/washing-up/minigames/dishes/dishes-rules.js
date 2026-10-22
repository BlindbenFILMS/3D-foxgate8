/* WASHING UP: pure rules + AI tuning. No three.js here. */

export const ROUND = 60;
export const SPONGE_R = 0.2;
export const RUB_K = 0.5;          /* dirt removed per world unit of sponge travel over a spot */
export const CRACK_SPEED = 8.5;    /* sponge speed (units/s) above which crystal starts to crack */
export const WARN_SPEED = 6.5;

export const DISHES = {
  plate:   { name: 'PLATE',   R: 0.82, pts: 1, spots: [4, 6], kinds: { food: 0.75, grease: 0.25 }, tip: 'Rub the mess off.' },
  bowl:    { name: 'BOWL',    R: 0.62, pts: 1, spots: [3, 5], kinds: { food: 0.55, grease: 0.45 }, tip: 'Scrub inside the bowl.' },
  mug:     { name: 'MUG',     R: 0.34, pts: 1, spots: [2, 3], kinds: { food: 0.5, grease: 0.5 }, tip: 'Small circles inside the mug.' },
  pan:     { name: 'PAN',     R: 0.74, pts: 2, spots: [3, 5], kinds: { food: 0.25, grease: 0.3, burnt: 0.45 }, tip: 'Burnt bits need extra scrubbing.' },
  crystal: { name: 'CRYSTAL', R: 0.78, pts: 2, spots: [3, 4], kinds: { food: 0.7, grease: 0.3 }, fragile: true, tip: 'Fragile. Rub slowly and gently.' }
};

export const KINDS = {
  food:   { dirt: 0.8, mult: 1.0, soap: false },
  grease: { dirt: 1.0, mult: 1.0, soap: true, dry: 0.15 },
  burnt:  { dirt: 1.8, mult: 0.75, soap: false }
};

/* Opponent cast: easy / medium / hard */
export const CAST = {
  pip:   { name: 'PIP',   rate: 1.25, speed: 2.6, circle: 9,  daydream: 0.22, slip: 0.30, soapWait: 0.9, gold: 1.0 },
  hope:  { name: 'HOPE',  rate: 1.85, speed: 3.2, circle: 11, daydream: 0.06, slip: 0.0,  soapWait: 0.6, gold: 1.5 },
  noble: { name: 'NOBLE', rate: 2.7,  speed: 5.0, circle: 14, daydream: 0.0,  slip: 0.0,  soapWait: 0.4, gold: 2.0 }
};
export const ORDER = ['pip', 'hope', 'noble'];

export const TIPS = [
  'Drag the sponge over the mess to scrub it off.',
  'Yellow grease needs soap. Tap SOAP when the bottle runs low.',
  'Crystal is fragile. Scrub too fast and it cracks.',
  'Burnt pan bits take extra scrubbing.',
  'Finish a dish fast for a speed bonus.',
  'Most points when the clock hits zero wins.'
];

export const RULES = [
  'Drag on the dish to scrub. Arrow keys work too.',
  'Every spot gone: the dish goes to the rack.',
  'Plate, bowl, mug: 1 point. Pan, crystal: 2.',
  'Fast dish: +1. Broken crystal: -1.',
  'Grease needs soap. Tap SOAP or press Space.',
  'Most points before time runs out wins.'
];

export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickW(r, weights) {
  let sum = 0;
  for (const k in weights) sum += weights[k];
  let x = r() * sum;
  for (const k in weights) { x -= weights[k]; if (x <= 0) return k; }
  return Object.keys(weights)[0];
}

/* The same seed gives every player the same dish queue, so rounds are fair. */
export function dishType(seed, i) {
  if (i < 2) return 'plate';
  const r = rng(seed * 31 + i * 977);
  return pickW(r, { plate: 4, bowl: 3, mug: 2, pan: 1 + Math.min(i, 20) * 0.12, crystal: 1 + Math.min(i, 20) * 0.08 });
}

export function makeDish(seed, i) {
  const type = dishType(seed, i);
  const D = DISHES[type];
  const r = rng(seed * 7 + i * 131 + 5);
  const n = D.spots[0] + Math.floor(r() * (D.spots[1] - D.spots[0] + 1));
  const spots = [];
  let tries = 0;
  while (spots.length < n && tries < 200) {
    tries++;
    const ang = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * D.R * 0.78;
    const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
    const sr = (type === 'mug' ? 0.11 : 0.15) + r() * (type === 'mug' ? 0.05 : 0.09);
    if (spots.some(s => Math.hypot(s.x - x, s.z - z) < s.r + sr + 0.04)) continue;
    let kind = pickW(r, D.kinds);
    if (i < 1 && kind !== 'food') kind = 'food';
    const max = KINDS[kind].dirt * (0.85 + r() * 0.3);
    spots.push({ x, z, r: sr, kind, dirt: max, max, tint: Math.floor(r() * 4), shape: Math.floor(r() * 3), rot: r() * 6.28 });
  }
  return { i, type, R: D.R, pts: D.pts, fragile: !!D.fragile, spots };
}

export function dirtLeft(d) { let s = 0; for (const p of d.spots) s += Math.max(0, p.dirt); return s; }
export function dirtTotal(d) { let s = 0; for (const p of d.spots) s += p.max; return s; }
export function isClean(d) { return d.spots.every(p => p.dirt <= 0); }

/* par time: finish under this for +1 */
export function par(d) { return 0.6 + dirtTotal(d) * 0.95; }

export function scoreDish(d, secs) {
  const fast = secs <= par(d);
  return { pts: d.pts + (fast ? 1 : 0), fast };
}

/* How hard a rub on a spot counts: grease without soap barely moves. */
export function rubMult(kind, soap) {
  const K = KINDS[kind];
  if (K.soap && soap <= 0) return K.dry;
  return K.mult;
}

/* soap used per unit of dirt removed */
export function soapCost(kind) { return kind === 'grease' ? 0.16 : 0.05; }

/* AI: choose the next spot to scrub: nearest dirty one (NOBLE also weighs dirt). */
export function aiTarget(d, sx, sz, lvl) {
  let best = -1, bs = 1e9;
  d.spots.forEach((s, k) => {
    if (s.dirt <= 0) return;
    let score = Math.hypot(s.x - sx, s.z - sz);
    if (lvl === 'noble') score -= s.dirt * 0.15;
    if (score < bs) { bs = score; best = k; }
  });
  return best;
}

export function stars(score) { return score >= 22 ? 3 : score >= 15 ? 2 : score >= 8 ? 1 : 0; }

export function rewards(score, win, lvl) {
  const C = CAST[lvl] || CAST.pip;
  if (!win) return { gold: 0, xp: score * 4 };
  return { gold: Math.round((10 + score) * C.gold), xp: score * 10 };
}
