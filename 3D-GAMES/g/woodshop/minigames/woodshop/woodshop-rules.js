/* WOODSHOP rules + AI. Pure logic, no three.js. */

export const STAGES = [
  { id: 'cut',   label: 'CUT',   verb: 'CUT',           hold: false,
    tip: 'Tap when the saw sits on the red line.',
    teach: 'CUT: the saw sweeps the plank. Tap when it sits on the red line.' },
  { id: 'sand',  label: 'SAND',  verb: 'HOLD TO SAND',  hold: true,
    tip: 'Hold to sand. Let go inside the green band.',
    teach: 'SAND: hold to sand. The bar speeds up. Let go in the green band.' },
  { id: 'join',  label: 'JOIN',  verb: 'HAMMER',        hold: false,
    tip: 'Tap when the yellow ring closes on the peg.',
    teach: 'JOIN: a ring shrinks around each peg. Hammer when it touches the peg.' },
  { id: 'stain', label: 'STAIN', verb: 'HOLD TO STAIN', hold: true,
    tip: 'Hold to darken the stain. Let go on the white mark.',
    teach: 'STAIN: hold and the wood darkens. Let go on the white order mark.' },
];

/* Stain stops along the stain bar, t = 0 (raw pine) .. 1 (darkest). */
export const STAIN_STOPS = [
  { t: 0.00, hex: '#f0cf96' },
  { t: 0.25, hex: '#d9a05c' },
  { t: 0.50, hex: '#b0602f' },
  { t: 0.75, hex: '#6e3c22' },
  { t: 1.00, hex: '#2a1a12' },
];
export const STAINS = {
  honey:  { name: 'HONEY',  t: 0.22 },
  oak:    { name: 'OAK',    t: 0.36 },
  cherry: { name: 'CHERRY', t: 0.52 },
  walnut: { name: 'WALNUT', t: 0.70 },
  ebony:  { name: 'EBONY',  t: 0.88 },
};

export const ORDERS = [
  { id: 'stool',  name: 'STOOL' },
  { id: 'table',  name: 'TABLE' },
  { id: 'shelf',  name: 'SHELF' },
  { id: 'chair',  name: 'CHAIR' },
  { id: 'bench',  name: 'GARDEN BENCH' },
];

export const LEVELS = {
  pip:   { id: 'pip',   name: 'PIP',   rank: 'ROOKIE', sigma: 0.8, think: 1.1 },
  hope:  { id: 'hope',  name: 'HOPE',  rank: 'CLUB',   sigma: 0.45, think: 0.8 },
  noble: { id: 'noble', name: 'NOBLE', rank: 'MASTER', sigma: 0.15, think: 0.55 },
};

/* Scoring windows, in each stage's own units. tol = full marks, range = falloff to zero. */
export const WINDOWS = {
  cut:   { tol: 0.04, range: 0.50 },  /* world units along the plank */
  sand:  { tol: 0.05, range: 0.36, target: 0.84 }, /* meter 0..1 */
  join:  { tol: 0.03, range: 0.30, target: 0.17 }, /* ring radius */
  stain: { tol: 0.03, range: 0.30 },  /* stain t */
};

export function accuracy(err, w) {
  const e = Math.max(0, Math.abs(err) - w.tol);
  return Math.round(Math.max(0, 1 - e / w.range) * 100);
}

export function grade(acc) {
  if (acc >= 90) return 'PERFECT';
  if (acc >= 70) return 'GREAT';
  if (acc >= 40) return 'GOOD';
  if (acc > 0) return 'ROUGH';
  return 'MISS';
}

export function stainHex(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < STAIN_STOPS.length; i++) {
    const a = STAIN_STOPS[i - 1], b = STAIN_STOPS[i];
    if (t <= b.t) {
      const k = (t - a.t) / (b.t - a.t);
      return mixHex(a.hex, b.hex, k);
    }
  }
  return STAIN_STOPS[STAIN_STOPS.length - 1].hex;
}

export function mixHex(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const m = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * k);
  return '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1);
}

export function gauss(rng = Math.random) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* CPU aim: target plus a skill-scaled miss. */
export function cpuAim(levelId, stageId, target) {
  const L = LEVELS[levelId] || LEVELS.hope;
  const w = WINDOWS[stageId];
  return target + gauss() * L.sigma * w.range;
}

export function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Build an order for one round: furniture, stain, and the three cut lengths. */
export function makeOrder(furnId) {
  const f = ORDERS.find(o => o.id === furnId) || ORDERS[0];
  const stainKeys = Object.keys(STAINS);
  const sk = stainKeys[Math.floor(Math.random() * stainKeys.length)];
  const cuts = [0, 0, 0].map(() => +(0.6 + Math.random() * 0.4).toFixed(2));
  return { id: f.id, name: f.name, stain: sk, stainName: STAINS[sk].name,
    stainT: STAINS[sk].t, stainHex: stainHex(STAINS[sk].t), cuts };
}

/* Match: seats, rounds, turns. Every player builds the same order each round. */
export function newMatch({ seats, rounds }) {
  const furn = shuffle(ORDERS.map(o => o.id));
  const orders = [];
  for (let i = 0; i < rounds; i++) orders.push(makeOrder(furn[i % furn.length]));
  return {
    seats: seats.map(s => ({ ...s, total: 0, pieces: [] })),
    rounds, round: 0, turn: 0, orders, done: false,
  };
}

export function currentSeat(m) { return m.seats[(m.turn + m.round) % m.seats.length]; }
export function currentOrder(m) { return m.orders[m.round]; }

export function recordPiece(m, stageScores) {
  const seat = currentSeat(m);
  const total = stageScores.reduce((a, b) => a + b, 0);
  seat.pieces.push({ order: currentOrder(m).id, stages: stageScores.slice(), total });
  seat.total += total;
  return total;
}

/* Returns true when the match is over. Seat order rotates each round so nobody always goes first. */
export function advance(m) {
  m.turn++;
  if (m.turn >= m.seats.length) { m.turn = 0; m.round++; }
  if (m.round >= m.rounds) { m.done = true; m.round = m.rounds - 1; m.turn = m.seats.length - 1; }
  return m.done;
}

export function standings(m) {
  const rows = m.seats.map((s, i) => ({ i, name: s.name, total: s.total, cpu: !!s.cpu }))
    .sort((a, b) => b.total - a.total);
  let place = 0, last = null;
  rows.forEach((r, k) => { if (r.total !== last) { place = k + 1; last = r.total; } r.place = place; });
  return rows;
}

/* Stars from the average piece score (0..400). */
export function stars(avgPiece) {
  if (avgPiece >= 340) return 3;
  if (avgPiece >= 260) return 2;
  if (avgPiece >= 160) return 1;
  return 0;
}

export function rewards(won, starCount) {
  return won ? { gold: 20 + 10 * starCount, xp: 30 + 10 * starCount } : { gold: 0, xp: 10 };
}
