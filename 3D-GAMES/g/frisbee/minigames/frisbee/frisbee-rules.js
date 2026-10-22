/* FRISBEE (8 GATES 3D) - pure rules, flight maths and AI. No three.js in here.
   Local field coordinates: x across (-7..7), z along (-18..18), y up.
   Team 0 starts on +z (the player's side) and attacks the -z end zone.
   Team 1 attacks the +z end zone. */

export const HALF_W = 7;          /* field half width */
export const HALF_L = 18;         /* half length including end zones */
export const GOAL = 12;           /* goal line: |z| > GOAL is an end zone */
export const RUN = 6.6;           /* base run speed (units / s) */
export const DIVE = 10.5;         /* dive burst speed */
export const DIVE_TIME = 0.45;
export const REACH = 0.95;        /* catch reach for receivers */
export const DIVE_REACH = 1.5;    /* reach while diving */
export const BLOCK_REACH = 0.8;   /* defender reach */
export const CATCH_H = 3.1;       /* highest catchable disc height (with a jump) */
export const STALL = 8;           /* seconds a holder may keep the disc */
export const RELEASE = 0.08;      /* fraction of flight protected from blocks after release */

/* Difficulty: easy / medium / hard = PIP / HOPE / NOBLE */
export const LEVELS = [
  { key: 'pip',   name: 'PIP',   partner: 'NIX',  title: 'ROOKIE', react: 0.50, spd: 0.90, err: 0.10, block: 0.50, think: 0.95, risk: 0.62, gold: 10, xp: 20 },
  { key: 'hope',  name: 'HOPE',  partner: 'LYRA', title: 'CLUB',   react: 0.32, spd: 0.97, err: 0.06, block: 0.70, think: 0.60, risk: 0.42, gold: 20, xp: 35 },
  { key: 'noble', name: 'NOBLE', partner: 'KANE', title: 'MASTER', react: 0.17, spd: 1.04, err: 0.03, block: 0.88, think: 0.32, risk: 0.26, gold: 35, xp: 60 },
];
/* profile for the AI partner on a human team */
export const PARTNER = { react: 0.30, spd: 1.0, err: 0.05, block: 0.70, think: 0.6, risk: 0.4 };
export const HUMAN = { react: 0.0, spd: 1.0, err: 0.025, block: 1.0, think: 0, risk: 1 };

export const THROWS = {
  flat:  { key: 'flat',  label: 'FLAT',  speed: 15.0, base: 0.12, peak: 0.8, bend: 0 },
  curve: { key: 'curve', label: 'CURVE', speed: 12.5, base: 0.18, peak: 1.0, bend: 0.24 },
  lob:   { key: 'lob',   label: 'LOB',   speed: 8.5,  base: 0.45, peak: 6.5, bend: 0 },
};
export const THROW_KEYS = ['flat', 'curve', 'lob'];

export const dirOf = (team) => (team === 0 ? -1 : 1);            /* attack direction along z */
export const inScoringZone = (team, z) => (team === 0 ? z < -GOAL : z > GOAL);
export const inBounds = (x, z) => Math.abs(x) <= HALF_W && Math.abs(z) <= HALF_L;
export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* Where a loose disc may be picked up by the new offense: in bounds, never in their scoring zone. */
export function pickupSpot(team, x, z) {
  let px = clamp(x, -HALF_W + 0.3, HALF_W - 0.3);
  let pz = clamp(z, -HALF_L + 0.3, HALF_L - 0.3);
  if (inScoringZone(team, pz)) pz = team === 0 ? -GOAL + 0.2 : GOAL - 0.2;
  return { x: px, z: pz };
}

/* ---------- flight ---------- */
export function makeFlight(from, to, type, side = 0, h0 = 1.5) {
  const T0 = THROWS[type] || THROWS.flat;
  const dx = to.x - from.x, dz = to.z - from.z;
  const d = Math.hypot(dx, dz) || 0.001;
  const T = T0.base + d / T0.speed;
  const px = -dz / d, pz = dx / d;
  const bulge = T0.bend * d * side;
  return {
    x0: from.x, z0: from.z, x1: to.x, z1: to.z,
    cx: (from.x + to.x) / 2 + px * bulge * 2,
    cz: (from.z + to.z) / 2 + pz * bulge * 2,
    h0, h1: 1.3, peak: T0.peak, T, type: T0.key, side, dist: d,
  };
}

export function flightPos(f, t, out = {}) {
  if (t <= f.T) {
    const u = t / f.T, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
    out.x = a * f.x0 + b * f.cx + c * f.x1;
    out.z = a * f.z0 + b * f.cz + c * f.z1;
    out.h = f.h0 + (f.h1 - f.h0) * u + f.peak * 4 * u * (1 - u);
    out.u = u; out.landed = false;
    return out;
  }
  const s = t - f.T;
  const vx = (2 * (f.x1 - f.cx)) / f.T, vz = (2 * (f.z1 - f.cz)) / f.T;
  const k = Math.min(s, 0.9);
  const g = k - (k * k) / 1.8;
  out.x = f.x1 + vx * g;
  out.z = f.z1 + vz * g;
  out.h = Math.max(0.08, f.h1 - (1.6 * s + 2.4 * s * s));
  out.u = 1 + s / f.T;
  out.landed = out.h <= 0.08;
  return out;
}

/* ---------- throw evaluation (used by AI, and to colour the player's aim reticle) ---------- */
const _p = {};
export function evaluateThrow(from, to, type, side, receiver, defenders, P) {
  const f = makeFlight(from, to, type, side);
  let risk = 0;
  const N = 22;
  for (let i = 1; i <= N; i++) {
    const t = (f.T * i) / N;
    flightPos(f, t, _p);
    if (_p.u < RELEASE || _p.h > CATCH_H) continue;
    for (const d of defenders) {
      const dd = Math.hypot(d.x - _p.x, d.z - _p.z) - BLOCK_REACH;
      const need = dd <= 0 ? 0 : dd / (RUN * (d.spd || 1)) + (P ? P.react : 0.3);
      if (need < t) risk = Math.max(risk, Math.min(1, 0.35 + (t - need) * 1.5));
    }
  }
  let rneed = 0, catchable = inBounds(to.x, to.z);
  if (receiver) {
    const rd = Math.max(0, Math.hypot(receiver.x - to.x, receiver.z - to.z) - REACH);
    rneed = rd / (RUN * (receiver.spd || 1));
    catchable = catchable && rneed <= f.T + 0.05;
  }
  return { f, risk, catchable, rneed };
}

/* Curve side that keeps the disc furthest from defenders. */
export function bestSide(from, to, defenders) {
  let best = 1, bestC = -1;
  for (const side of [-1, 1]) {
    const f = makeFlight(from, to, 'curve', side);
    let c = 99;
    for (let i = 1; i <= 16; i++) {
      flightPos(f, (f.T * i) / 16, _p);
      if (_p.u < RELEASE || _p.h > CATCH_H) continue;
      for (const d of defenders) c = Math.min(c, Math.hypot(d.x - _p.x, d.z - _p.z));
    }
    if (c > bestC) { bestC = c; best = side; }
  }
  return best;
}

/* ---------- AI ---------- */

/* Cutter: pick an open spot ahead of the holder. */
export function chooseCut(team, holder, me, guard, rnd = Math.random) {
  const dir = dirOf(team);
  let best = null, bs = -1e9;
  for (let i = 0; i < 16; i++) {
    const p = {
      x: -6.2 + 12.4 * rnd(),
      z: clamp(holder.z + dir * (rnd() * 15 - 3), -HALF_L + 0.8, HALF_L - 0.8),
    };
    const dh = dist(holder, p);
    if (dh < 3.2) continue;
    const prog = (p.z - holder.z) * dir;
    let s = (guard ? dist(guard, p) : 4) * 1.0 + prog * 0.35 - Math.abs(dh - 8.5) * 0.18;
    const dm = dist(me, p);
    if (dm > 10) s -= (dm - 10) * 0.5;
    if (inScoringZone(team, p.z)) s += 2.5;
    if (Math.abs(p.x) > 5.8) s -= 1.2;
    if (s > bs) { bs = s; best = p; }
  }
  return best || { x: me.x, z: me.z };
}

/* Holder: choose the safest catchable throw. Returns null when nothing is good enough. */
export function chooseThrow(holder, options, defenders, P, stall) {
  let best = null;
  for (const o of options) {
    for (const spot of o.spots) {
      if (!inBounds(spot.x, spot.z)) continue;
      if (dist(holder, spot) < 2.5) continue;
      for (const type of THROW_KEYS) {
        const side = type === 'curve' ? bestSide(holder, spot, defenders) : 0;
        const ev = evaluateThrow(holder, spot, type, side, o.a, defenders, P);
        if (!ev.catchable) continue;
        const prog = (spot.z - holder.z) * dirOf(o.a.team);
        let score = ev.risk + (type === 'lob' ? 0.08 : 0) + (type === 'curve' ? 0.03 : 0) - prog * 0.012;
        if (inScoringZone(o.a.team, spot.z)) score -= 0.15;
        if (!best || score < best.score) best = { score, risk: ev.risk, type, side, to: spot, receiver: o.a };
      }
    }
  }
  if (!best) return null;
  const limit = stall > 5.5 ? 2 : P.risk;
  return best.risk <= limit ? best : null;
}

/* Guard: goal-side of the cutter, using a lagged view of the cutter. */
export function guardSpot(offTeam, seen) {
  return { x: seen.x, z: clamp(seen.z + dirOf(offTeam) * 1.0, -HALF_L, HALF_L) };
}

/* Mark: stand in the lane between holder and their cutter. */
export function markSpot(offTeam, holder, cutter) {
  let vx = cutter.x - holder.x, vz = cutter.z - holder.z;
  const l = Math.hypot(vx, vz) || 1;
  vx = (vx / l) * 0.7; vz = (vz / l) * 0.7 + dirOf(offTeam) * 0.3;
  const l2 = Math.hypot(vx, vz) || 1;
  return { x: holder.x + (vx / l2) * 1.4, z: holder.z + (vz / l2) * 1.4 };
}

/* Stars for a win: 1 for any win, +1 for a margin of 2, +1 for a margin of 4 or a shutout. */
export function starsFor(my, their) {
  if (my <= their) return 0;
  const m = my - their;
  return 1 + (m >= 2 ? 1 : 0) + (m >= 4 || their === 0 ? 1 : 0);
}
