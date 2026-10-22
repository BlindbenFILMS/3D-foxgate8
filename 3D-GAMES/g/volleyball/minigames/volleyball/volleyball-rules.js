/* 8 GATES 3D - VOLLEYBALL: pure rules, ballistic maths and AI choices.
   No three.js in here. Points are plain {x, y, z} objects.
   Coordinates: origin = centre of the court, y = 0 the sand, +z = the near team (side 0). */

export const COURT = {
  halfW: 4.5,      /* court half width (x) */
  halfL: 9,        /* court half length (z), net at z = 0 */
  netH: 3.6,       /* top of the net */
  netBand: 1.0,    /* height of the net mesh band */
  netHalfW: 5.4,   /* poles stand at x = +/- this */
  ballR: 0.32,
  g: 17
};

/* contact heights for each kind of touch */
export const H = { dig: 1.0, pass: 1.5, set: 3.4, over: 2.8, spike: 5.1 };

export const sideSign = (s) => (s === 0 ? 1 : -1);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* quality: 0 miss, 1 ok, 2 good, 3 perfect */
export const QUAL = {
  label: ['MISS', 'OK', 'GOOD', 'PERFECT'],
  err: [0, 1.7, 0.75, 0.16],
  pow: [0, 0.8, 0.93, 1.05]
};

/* cast. torso = [jersey, fur, cream] as the world fox kit expects */
export const CAST = {
  you:   { name: 'YOU',   torso: ['#ec3013', '#ef7d2d', '#fff3e3'], outfit: 'tee' },
  p1:    { name: 'P1',    torso: ['#ec3013', '#ef7d2d', '#fff3e3'], outfit: 'tee' },
  ace:   { name: 'ACE',   torso: ['#ec3013', '#c8612a', '#fff3e3'], outfit: 'tee' },
  pip:   { name: 'PIP',   torso: ['#ffd23a', '#f4b23e', '#fff6dc'], outfit: 'tee', extra: 'pip' },
  rio:   { name: 'RIO',   torso: ['#ffd23a', '#b8743a', '#fff3e3'], outfit: 'tee' },
  hope:  { name: 'HOPE',  torso: ['#3a7bff', '#e07a3a', '#fff3e3'], legs: '#2f5fe0', outfit: 'tee', extra: 'hope' },
  sky:   { name: 'SKY',   torso: ['#3a7bff', '#c46a2c', '#fff3e3'], outfit: 'tee' },
  noble: { name: 'NOBLE', torso: ['#2b2140', '#c85a28', '#f3e6d8'], outfit: 'coat', eyes: '#ff2a2a', extra: 'noble' },
  vex:   { name: 'VEX',   torso: ['#8a3cff', '#9b5a33', '#f3e6d8'], outfit: 'tee' }
};

/* opponent levels. q = chance of [miss, ok, good, perfect] on a touch */
export const DIFFS = [
  { key: 'pip', name: 'PIP', label: 'ROOKIE', captain: 'pip', partner: 'rio', team: '#ffd23a',
    run: 6.3, react: 0.34, q: [0.06, 0.32, 0.44, 0.18], spike: 13.5, block: 0.05, serveFault: 0.14,
    serveApex: 6.6, jumpServe: 0, aimErr: 1.35, judge: 0.7, tip: 0.1, gold: 10, xp: 20 },
  { key: 'hope', name: 'HOPE', label: 'CLUB', captain: 'hope', partner: 'sky', team: '#3a7bff',
    run: 7.3, react: 0.2, q: [0.03, 0.18, 0.45, 0.34], spike: 17, block: 0.13, serveFault: 0.08,
    serveApex: 6.1, jumpServe: 0.2, aimErr: 0.95, judge: 0.9, tip: 0.15, gold: 20, xp: 40 },
  { key: 'noble', name: 'NOBLE', label: 'MASTER', captain: 'noble', partner: 'vex', team: '#8a3cff',
    run: 8.6, react: 0.1, q: [0.0, 0.08, 0.38, 0.54], spike: 20.5, block: 0.26, serveFault: 0.04,
    serveApex: 5.7, jumpServe: 0.5, aimErr: 0.55, judge: 0.97, tip: 0.2, gold: 40, xp: 80 }
];

/* your AI teammate (and the AI partner of each human in pass & play) */
export const MATE = { run: 7.8, react: 0.14, q: [0.02, 0.15, 0.45, 0.38], spike: 17, block: 0.14,
  serveFault: 0.07, serveApex: 6.1, jumpServe: 0.15, aimErr: 0.9, judge: 0.92, tip: 0.1 };

/* a human fox: run speed and spike power */
export const HUMAN = { run: 8.2, spike: 18.5, aimErr: 0.6 };

export function rollQuality(dist, rnd = Math.random) {
  let r = rnd(), acc = 0;
  for (let i = 0; i < 4; i++) { acc += dist[i]; if (r < acc) return i; }
  return 3;
}

/* e = press time minus ideal time (seconds). Early presses are a little more forgiving. */
export function qualityFromError(e) {
  if (e < -0.42 || e > 0.24) return 0;
  const a = Math.abs(e);
  if (a <= 0.075) return 3;
  if (a <= 0.16) return 2;
  return 1;
}

export function gauss(rnd = Math.random) {
  return (rnd() + rnd() + rnd() - 1.5) / 1.5;
}

/* ---------------- ballistics (exact parabolas) ---------------- */

export function posAt(S, v, g, t) {
  return { x: S.x + v.x * t, y: S.y + v.y * t - 0.5 * g * t * t, z: S.z + v.z * t };
}

/* time after launch when the ball comes DOWN through height h; -1 if it never gets there */
export function timeToY(S, v, g, h) {
  const D = v.y * v.y - 2 * g * (h - S.y);
  if (D < 0) return -1;
  return (v.y + Math.sqrt(D)) / g;
}

export function apexY(S, v, g) {
  return v.y > 0 ? S.y + (v.y * v.y) / (2 * g) : S.y;
}

/* lob from S to T with the top of the arc at apex */
export function arcTo(S, T, apex, g) {
  const top = Math.max(apex, S.y + 0.2, T.y + 0.2);
  const vy = Math.sqrt(2 * g * (top - S.y));
  const t = (vy + Math.sqrt(Math.max(0, vy * vy - 2 * g * (T.y - S.y)))) / g;
  return { v: { x: (T.x - S.x) / t, y: vy, z: (T.z - S.z) / t }, t };
}

/* drive from S to T with a ground speed */
export function directTo(S, T, speed, g) {
  const d = Math.hypot(T.x - S.x, T.z - S.z);
  const t = Math.max(0.18, d / speed);
  const vy = (T.y - S.y + 0.5 * g * t * t) / t;
  return { v: { x: (T.x - S.x) / t, y: vy, z: (T.z - S.z) / t }, t };
}

/* where the ball meets the net plane */
export function netCross(S, v, g) {
  if (Math.abs(v.z) < 1e-6) return null;
  const t = -S.z / v.z;
  if (t <= 0) return null;
  const y = S.y + v.y * t - 0.5 * g * t * t;
  return { t, y, x: S.x + v.x * t, clear: y > COURT.netH + COURT.ballR * 0.6 && Math.abs(S.x + v.x * t) < COURT.halfW + 0.15 };
}

export function landing(S, v, g) {
  const t = timeToY(S, v, g, COURT.ballR);
  if (t < 0) return null;
  const p = posAt(S, v, g, t);
  p.t = t;
  return p;
}

export function inCourt(x, z, m = COURT.ballR * 0.6) {
  return Math.abs(x) <= COURT.halfW + m && Math.abs(z) <= COURT.halfL + m;
}

/* how far outside the lines a point is (0 when inside) */
export function outBy(x, z) {
  return Math.max(0, Math.abs(x) - COURT.halfW, Math.abs(z) - COURT.halfL);
}

/* ---------------- AI aiming ---------------- */

/* the most open spot on the court of the side being attacked */
export function openSpot(attackSide, foes, rnd = Math.random, err = 0) {
  const s = -sideSign(attackSide);
  let best = { x: 0, z: s * 5 }, bs = -1;
  for (let i = 0; i < 16; i++) {
    const x = (rnd() * 2 - 1) * (COURT.halfW - 0.75);
    const z = s * (1.6 + rnd() * (COURT.halfL - 2.4));
    let d = 99;
    for (const f of foes) d = Math.min(d, Math.hypot(f.x - x, f.z - z));
    d += rnd() * 0.8;
    if (d > bs) { bs = d; best = { x, z }; }
  }
  return { x: best.x + gauss(rnd) * err, z: best.z + gauss(rnd) * err };
}

export function serveTarget(serveSide, rnd = Math.random, fault = false) {
  const s = -sideSign(serveSide);
  if (fault) {
    if (rnd() < 0.5) return { x: (rnd() * 2 - 1) * 3, z: s * (COURT.halfL + 0.8 + rnd() * 1.5), kind: 'long' };
    return { x: (rnd() * 2 - 1) * 3, z: s * 1.5, kind: 'net' };
  }
  return { x: (rnd() * 2 - 1) * (COURT.halfW - 0.8), z: s * (4 + rnd() * 4.4), kind: 'in' };
}

/* human serve: power 0..1 maps to depth on the far court */
export const SERVE_ZONE = { net: 0.16, long: 0.82 };
export function serveDepth(p) {
  if (p < SERVE_ZONE.net) return 1.6;
  if (p <= SERVE_ZONE.long) return 2 + ((p - SERVE_ZONE.net) / (SERVE_ZONE.long - SERVE_ZONE.net)) * 6.9;
  return 9.5 + (p - SERVE_ZONE.long) * 12;
}

/* ---------------- match ---------------- */

export function createMatch({ target = 11, winBy = 2, first = 0 } = {}) {
  return { score: [0, 0], target, winBy, serving: first, serverIdx: [0, 0], served: [first === 0, first === 1],
    over: false, winner: -1, rally: 0, longest: 0, points: 0 };
}

/* side wins the rally. Returns { sideOut, over } */
export function awardPoint(m, side) {
  if (m.over) return { sideOut: false, over: true };
  m.score[side]++;
  m.points++;
  let sideOut = false;
  if (side !== m.serving) {
    sideOut = true;
    if (m.served[side]) m.serverIdx[side] ^= 1;
    m.served[side] = true;
    m.serving = side;
  }
  const [a, b] = m.score;
  if (Math.max(a, b) >= m.target && Math.abs(a - b) >= m.winBy) {
    m.over = true;
    m.winner = a > b ? 0 : 1;
  }
  return { sideOut, over: m.over };
}

export function matchPoint(m) {
  if (m.over) return -1;
  for (let s = 0; s < 2; s++) {
    if (m.score[s] + 1 >= m.target && m.score[s] + 1 - m.score[1 - s] >= m.winBy) return s;
  }
  return -1;
}

/* 1 star for a win, 2 for winning by 4+, 3 when the other side kept to a third of the target */
export function starsFor(m, side) {
  if (m.winner !== side) return 0;
  const mine = m.score[side], theirs = m.score[1 - side];
  if (theirs <= Math.floor(m.target / 3)) return 3;
  if (mine - theirs >= 4) return 2;
  return 1;
}
