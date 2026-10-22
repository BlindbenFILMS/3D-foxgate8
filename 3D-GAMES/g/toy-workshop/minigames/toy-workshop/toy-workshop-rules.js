/* TOY WORKSHOP: pure rules + AI. No three.js in here.
   A toy order = parts in order, then PAINT, then HAMMER (hold and release). */

export const PARTS = {
  BLOCK: { id: 'BLOCK', label: 'BLOCK', key: '1', wood: '#d9a066' },
  WHEEL: { id: 'WHEEL', label: 'WHEEL', key: '2', wood: '#3b3340' },
  BALL:  { id: 'BALL',  label: 'BALL',  key: '3', wood: '#e8b878' },
  CONE:  { id: 'CONE',  label: 'CONE',  key: '4', wood: '#c98a52' },
  PLANK: { id: 'PLANK', label: 'PLANK', key: '5', wood: '#b9824c' },
  PEG:   { id: 'PEG',   label: 'PEG',   key: '6', wood: '#a8703f' },
};
export const PART_ORDER = ['BLOCK', 'WHEEL', 'BALL', 'CONE', 'PLANK', 'PEG'];

export const PAINTS = [
  { id: 'RED',    label: 'RED',    key: 'Q', hex: '#ec3013' },
  { id: 'BLUE',   label: 'BLUE',   key: 'W', hex: '#2f6bff' },
  { id: 'YELLOW', label: 'YELLOW', key: 'E', hex: '#ffd23a' },
  { id: 'GREEN',  label: 'GREEN',  key: 'R', hex: '#2fbf5b' },
];

/* Slots: t = part, p = position (toy base = 0,0,0), s = size, r = rotation (rad),
   mir = 'x' | 'z' | 'xz' mirrored copies, nat = keeps its own color (not painted). */
export const TOYS = [
  { id: 'CAR', name: 'TOY CAR', tier: 1, slots: [
    { t: 'BLOCK', p: [0, 0.3, 0], s: [0.9, 0.28, 0.46] },
    { t: 'WHEEL', p: [0.28, 0.15, 0.26], s: [0.3, 0.3, 0.1], mir: 'xz', nat: 1 },
    { t: 'BLOCK', p: [-0.06, 0.55, 0], s: [0.46, 0.24, 0.4] },
  ] },
  { id: 'DUCK', name: 'PULL DUCK', tier: 1, slots: [
    { t: 'BALL', p: [0, 0.36, 0], s: [0.62, 0.46, 0.5] },
    { t: 'BALL', p: [0.22, 0.74, 0], s: [0.34, 0.34, 0.34] },
    { t: 'CONE', p: [0.47, 0.72, 0], s: [0.14, 0.2, 0.14], r: [0, 0, -1.5708], nat: 1, col: '#f08a3a' },
  ] },
  { id: 'ROBOT', name: 'TIN ROBOT', tier: 2, slots: [
    { t: 'BLOCK', p: [0, 0.33, 0], s: [0.5, 0.52, 0.36] },
    { t: 'BALL', p: [0, 0.8, 0], s: [0.36, 0.36, 0.36] },
    { t: 'PEG', p: [0.33, 0.42, 0], s: [0.09, 0.42, 0.09], r: [0, 0, 0.45], mir: 'x' },
    { t: 'CONE', p: [0, 1.06, 0], s: [0.1, 0.18, 0.1], nat: 1, col: '#ec3013' },
  ] },
  { id: 'BOAT', name: 'SAIL BOAT', tier: 2, slots: [
    { t: 'PLANK', p: [0, 0.12, 0], s: [0.95, 0.22, 0.42] },
    { t: 'BLOCK', p: [-0.22, 0.33, 0], s: [0.3, 0.2, 0.3] },
    { t: 'PEG', p: [0.14, 0.62, 0], s: [0.06, 0.82, 0.06], nat: 1 },
    { t: 'CONE', p: [0.27, 0.62, 0], s: [0.3, 0.6, 0.05], nat: 1, col: '#f4efe6' },
  ] },
  { id: 'ROCKET', name: 'ROCKET', tier: 3, slots: [
    { t: 'PLANK', p: [0, 0.05, 0], s: [0.62, 0.1, 0.62] },
    { t: 'BLOCK', p: [0, 0.45, 0], s: [0.34, 0.7, 0.34] },
    { t: 'CONE', p: [0, 0.95, 0], s: [0.34, 0.32, 0.34] },
    { t: 'BALL', p: [0, 0.56, 0.17], s: [0.15, 0.15, 0.08], nat: 1, col: '#a9d4f0' },
    { t: 'PEG', p: [0.21, 0.24, 0], s: [0.06, 0.3, 0.06], r: [0, 0, -0.35], mir: 'x', nat: 1 },
  ] },
  { id: 'TRAIN', name: 'TOY TRAIN', tier: 3, slots: [
    { t: 'PLANK', p: [0, 0.14, 0], s: [0.98, 0.12, 0.44] },
    { t: 'WHEEL', p: [0.28, 0.1, 0.25], s: [0.22, 0.22, 0.08], mir: 'xz', nat: 1 },
    { t: 'BLOCK', p: [0.13, 0.36, 0], s: [0.56, 0.3, 0.36] },
    { t: 'BLOCK', p: [-0.3, 0.44, 0], s: [0.3, 0.46, 0.4] },
    { t: 'PEG', p: [0.3, 0.64, 0], s: [0.11, 0.28, 0.11], nat: 1 },
  ] },
];

export const LEVELS = [
  { id: 0, name: 'PIP',   rank: 'ROOKIE',     step: 1.25, err: 0.17, hammer: [0.12, 0.55] },
  { id: 1, name: 'HOPE',  rank: 'CLUB LEVEL', step: 0.85, err: 0.08, hammer: [0.35, 0.5] },
  { id: 2, name: 'NOBLE', rank: 'MASTER',     step: 0.5,  err: 0.03, hammer: [0.6, 0.35] },
];

export const HAMMER = { zone: [0.68, 0.94], perfect: [0.78, 0.86], speed: 1.15 };

/* deterministic-ish RNG so the demo is repeatable */
export function makeRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/* pick the next toy: harder toys unlock as you finish more */
export function nextOrder(rng, done) {
  const maxTier = done < 2 ? 1 : done < 5 ? 2 : 3;
  const pool = TOYS.filter(t => t.tier <= maxTier);
  const toy = pool[Math.floor(rng() * pool.length)];
  const paint = PAINTS[Math.floor(rng() * PAINTS.length)];
  const steps = toy.slots.map((s, i) => ({ kind: 'part', id: s.t, slot: i }));
  steps.push({ kind: 'paint', id: paint.id });
  steps.push({ kind: 'hammer', id: 'HAMMER' });
  return { toy, paint, steps };
}

/* hammer meter: ping-pong 0..1 while held */
export function hammerPower(heldSec) {
  const x = (heldSec * HAMMER.speed) % 2;
  return x <= 1 ? x : 2 - x;
}
export function hammerGrade(p) {
  if (p >= HAMMER.perfect[0] && p <= HAMMER.perfect[1]) return 'PERFECT';
  if (p >= HAMMER.zone[0] && p <= HAMMER.zone[1]) return 'GOOD';
  return 'MISS';
}

export function scoreToy({ order, seconds, mistakes, grade }) {
  const parts = order.toy.slots.length;
  const base = 100 + parts * 10;
  const speed = Math.max(0, Math.round(60 - seconds * 6));
  const hammer = grade === 'PERFECT' ? 60 : grade === 'GOOD' ? 30 : 0;
  const pen = mistakes * 15;
  return { total: Math.max(20, base + speed + hammer - pen), base, speed, hammer, pen };
}

export function starsFor(score, shiftSec) {
  const k = shiftSec / 90;
  if (score >= 2400 * k) return 3;
  if (score >= 1600 * k) return 2;
  if (score >= 800 * k) return 1;
  return 0;
}

export function rewardFor({ score, toys, stars, win }) {
  const gold = (win ? 15 : 3) + toys * 4 + stars * 5;
  const xp = Math.round(score / 10) + (win ? 25 : 5);
  return { gold, xp };
}

/* AI: what to do for the current step, and how long to think first */
export function aiThink(level, rng) {
  const L = LEVELS[level] || LEVELS[1];
  return L.step * (0.7 + rng() * 0.6);
}
export function aiChoose(level, rng, step) {
  const L = LEVELS[level] || LEVELS[1];
  if (step.kind === 'hammer') {
    const r = rng();
    const g = r < L.hammer[0] ? 'PERFECT' : r < L.hammer[0] + L.hammer[1] ? 'GOOD' : 'MISS';
    const p = g === 'PERFECT' ? (HAMMER.perfect[0] + HAMMER.perfect[1]) / 2
      : g === 'GOOD' ? (rng() < 0.5 ? 0.72 : 0.9) : (rng() < 0.5 ? 0.45 : 0.99);
    return { kind: 'hammer', power: p };
  }
  const list = step.kind === 'part' ? PART_ORDER : PAINTS.map(p => p.id);
  if (rng() < L.err) {
    const wrong = list.filter(x => x !== step.id);
    return { kind: step.kind, id: wrong[Math.floor(rng() * wrong.length)] };
  }
  return { kind: step.kind, id: step.id };
}

/* demo captions (20 words or fewer each) */
export const CAPTIONS = {
  part: 'Each order shows a blueprint. Pick the parts in order from the bins.',
  paint: 'All parts on? Dip the toy in the color on the order card.',
  hammer: 'Hold the hammer, then let go in the yellow band. Gold band is perfect.',
  hope: 'HOPE plays by feel. The charge tone rises and chimes in the perfect band.',
  noble: 'NOBLE never misses a beat. Beat her shift score to earn the most gold.',
};

export const RULES_TEXT = [
  'Build each toy the order card shows, part by part.',
  'Paint it the order color.',
  'Hold the hammer and release in the yellow band. Gold is perfect.',
  'Fast, clean toys score more. Wrong picks cost points.',
  'Most points when the shift bell rings wins.',
];
