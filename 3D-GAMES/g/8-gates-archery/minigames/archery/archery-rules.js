/* 8 GATES 3D · ARCHERY · pure rules + AI (no three.js)
   Units: 1 unit = 1 metre-ish. The sight is "set" for full draw at the current distance,
   so a full-draw arrow with no wind lands exactly where you aim. */

export const ENDS = 4;
export const ARROWS = 3;
export const DISTANCES = [12, 18, 24, 30];
export const FACE_R = 1.0;          /* target face radius */
export const V_FULL = 30;           /* arrow speed at full draw, units/s */
export const GRAVITY = 9.8;
export const MAX_SCORE = ENDS * ARROWS * 10;
export const WIND_MAX = [0.9, 1.3, 1.7, 2.1]; /* lateral push, units/s^2, per end */

export const LEVELS = {
  pip:   { id: 'pip',   name: 'PIP',   title: 'ROOKIE',     aimErr: 0.40, powErr: 0.14, windRead: 0.30, think: 1.0, gold: 10 },
  hope:  { id: 'hope',  name: 'HOPE',  title: 'CLUB LEVEL', aimErr: 0.19, powErr: 0.05, windRead: 0.80, think: 1.7, gold: 20 },
  noble: { id: 'noble', name: 'NOBLE', title: 'MASTER',     aimErr: 0.075, powErr: 0.015, windRead: 0.97, think: 0.9, gold: 40 },
};

export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(r) {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ring value for a hit at distance r from the centre */
export function ringOf(r, faceR = FACE_R) {
  if (r > faceR) return 0;
  return clamp(10 - Math.floor(r / (faceR / 10)), 1, 10);
}
export function isX(r, faceR = FACE_R) { return r <= faceR * 0.05; }
export function label(a) { return a.v === 0 ? 'M' : (a.x ? 'X' : String(a.v)); }
export function ringColor(v) {
  if (v >= 9) return '#ffd23a';
  if (v >= 7) return '#ec3013';
  if (v >= 5) return '#2f7fd8';
  if (v >= 3) return '#1c1b1f';
  if (v >= 1) return '#f4f1ea';
  return '#6d6a66';
}

export function speedScale(power) { return 0.55 + 0.45 * clamp(power, 0, 1); }

/* wind for an end: lateral acceleration (negative = blows to the left) */
export function windFor(end, r) {
  const max = WIND_MAX[clamp(end, 0, ENDS - 1)];
  let s = (0.25 + r() * 0.75) * max;
  if (r() < 0.12) s = 0;
  return (r() < 0.5 ? -1 : 1) * Math.round(s * 10) / 10;
}
export function windKmh(w) { return Math.round(Math.abs(w) * 6); }

/* where an arrow aimed dead centre lands, for this distance, wind and draw */
export function predictOffset(dist, wind, power) {
  const T = dist / V_FULL;
  const s = speedScale(power);
  const Tp = T / s;
  return { x: 0.5 * wind * Tp * Tp, y: 0.5 * GRAVITY * T * T * (1 - 1 / (s * s)) };
}

/* CPU plan: where to hold the sight, how far to draw, how long to think */
export function cpuPlan(level, ctx, r) {
  const L = LEVELS[level] || LEVELS.hope;
  const power = clamp(1 - Math.abs(gauss(r)) * L.powErr, 0.55, 1);
  const off = predictOffset(ctx.dist, ctx.wind, power);
  const far = 0.6 + (ctx.dist / 30) * 0.6;
  const ax = -off.x * L.windRead + gauss(r) * L.aimErr * far;
  const ay = -off.y * (0.4 + 0.6 * L.windRead) + gauss(r) * L.aimErr * far;
  return {
    ax: clamp(ax, -2, 2), ay: clamp(ay, -2, 2), power,
    think: L.think * (0.8 + r() * 0.5),
    hold: 0.25 + r() * 0.6,
  };
}

/* ---- match state ---- */
export function newMatch(players) {
  return {
    players: players.map((p) => ({
      ...p, ends: Array.from({ length: ENDS }, () => []), total: 0, xs: 0, tens: 0,
    })),
    end: 0, shooter: 0, arrow: 0, done: false,
  };
}

export function record(m, v, x) {
  const p = m.players[m.shooter];
  p.ends[m.end].push({ v, x: !!x });
  p.total += v;
  if (x) p.xs++;
  if (v === 10) p.tens++;
}

/* advance after an arrow: 'arrow' | 'shooter' | 'end' | 'match' */
export function nextStep(m) {
  m.arrow++;
  if (m.arrow < ARROWS) return 'arrow';
  m.arrow = 0;
  m.shooter++;
  if (m.shooter < m.players.length) return 'shooter';
  m.shooter = 0;
  m.end++;
  if (m.end < ENDS) return 'end';
  m.done = true;
  m.end = ENDS - 1;
  return 'match';
}

export function endTotal(p, e) { return (p.ends[e] || []).reduce((s, a) => s + a.v, 0); }

export function standings(m) {
  const rows = m.players.map((p, i) => ({ i, name: p.name, color: p.color, total: p.total, xs: p.xs, tens: p.tens }));
  rows.sort((a, b) => b.total - a.total || b.xs - a.xs || b.tens - a.tens || a.i - b.i);
  let place = 1;
  rows.forEach((r, k) => {
    if (k > 0) {
      const q = rows[k - 1];
      if (!(q.total === r.total && q.xs === r.xs && q.tens === r.tens)) place = k + 1;
    }
    r.place = place;
  });
  return rows;
}

export function stars(total) {
  const pct = total / MAX_SCORE;
  return pct >= 0.85 ? 3 : pct >= 0.7 ? 2 : pct >= 0.5 ? 1 : 0;
}

export function rewards({ mode, level, won, tie, total }) {
  if (mode === 'demo') return { gold: 0, xp: 0 };
  if (mode === 'local') return { gold: 5, xp: Math.round(total / 2) };
  const L = LEVELS[level] || LEVELS.hope;
  if (won) return { gold: L.gold + Math.floor(total / 10), xp: total + 20 };
  if (tie) return { gold: Math.floor(L.gold / 2), xp: total };
  return { gold: 0, xp: Math.round(total / 2) };
}
