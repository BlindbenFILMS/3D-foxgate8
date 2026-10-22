/* 8 GATES 3D - CROQUET - pure rules, physics and AI (no three.js).
   Local coordinates: origin = centre of the court, x = left/right, z = toward the player (+z),
   y is not used here (everything rolls on the ground). */

export const COURT = { hw: 7, hl: 9 };            /* half width (x), half length (z) */
export const BALL_R = 0.22;
export const HOOP_HALF = 0.42;                      /* leg centre offset from hoop centre */
export const LEG_R = 0.05;
export const PEG = { x: 0, z: 0, r: 0.11 };
export const DECEL = 2.6;                           /* rolling friction, units / s^2 */
export const DMAX = 24;                             /* distance of a full-power stroke */
export const VMAX = Math.sqrt(2 * DECEL * DMAX);
export const DT = 1 / 120;
export const STOP_V = 0.04;
export const PEG_TARGET = 6;                        /* ball.next === 6 means: hit the peg */
export const DONE = 7;

/* dir = the way the ball must travel along z to run the hoop */
export const HOOPS = [
  { x: -3.5, z: 5.0, dir: -1 },
  { x: 3.5, z: -5.0, dir: -1 },
  { x: -3.5, z: -5.0, dir: 1 },
  { x: 3.5, z: 5.0, dir: 1 },
  { x: 0, z: -2.4, dir: 1 },
  { x: 0, z: 2.4, dir: -1 },
];
export const TEE = { x: -3.5, z: 7.7 };
export const PAR = 14;

export function speedFor(dist) { return Math.sqrt(2 * DECEL * Math.max(0, dist)); }
export function powerFor(dist) { return Math.min(1, speedFor(dist) / VMAX); }

export function targetLabel(next) {
  if (next >= DONE) return 'DONE';
  if (next === PEG_TARGET) return 'PEG';
  return 'HOOP ' + (next + 1);
}

/* ---------- match ---------- */

export function createMatch(players) {
  const balls = players.map((p, i) => ({
    id: i, x: 0, z: 0, vx: 0, vz: 0, spin: 0,
    inPlay: false, next: 0, hin: false, ps: 0, done: false,
  }));
  return {
    players: players.map((p, i) => ({ ...p, id: i, strokes: 0, hoops: 0, outs: 0, roquets: 0 })),
    balls,
    turn: 0,
    strokesLeft: 1,
    roqueted: [],          /* ball ids hit since the striker last ran a hoop */
    winner: -1,
    over: false,
    totalStrokes: 0,
    log: [],
  };
}

export function striker(m) { return m.balls[m.turn]; }

export function placeOnCourt(m, b, x, z) {
  b.x = x; b.z = z; b.vx = b.vz = 0; b.inPlay = true; b.hin = false;
  b.ps = sideOf(b);
}

function sideOf(b) {
  if (b.next >= PEG_TARGET) return 0;
  const h = HOOPS[b.next];
  return (b.z - h.z) * h.dir;
}

/* Put the striker's ball on the tee on its first turn (nearest free spot). */
export function prepareTurn(m) {
  const b = striker(m);
  if (!b.inPlay && !b.done) {
    const spots = [[0, 0], [-0.7, 0.2], [0.7, 0.2], [0, 0.7], [-1.4, 0.3], [1.4, 0.3]];
    for (const [dx, dz] of spots) {
      const x = TEE.x + dx, z = TEE.z + dz;
      if (m.balls.every(o => o === b || !o.inPlay || Math.hypot(o.x - x, o.z - z) > BALL_R * 2.4)) {
        placeOnCourt(m, b, x, z); break;
      }
    }
    if (!b.inPlay) placeOnCourt(m, b, TEE.x, TEE.z);
  }
}

export function strike(m, angle, power) {
  const b = striker(m);
  const v = Math.max(0.02, Math.min(1, power)) * VMAX;
  b.vx = Math.cos(angle) * v;
  b.vz = Math.sin(angle) * v;
  m.strokesLeft -= 1;
  m.players[m.turn].strokes += 1;
  m.totalStrokes += 1;
}

/* After every ball has stopped: apply the rules for this stroke.
   Returns a summary the 3D layer turns into messages and sounds. */
export function resolveStroke(m, events) {
  const s = m.turn;
  const sb = m.balls[s];
  const out = { hoop: -1, roquet: -1, out: false, peg: false, peels: [], pegOuts: [], turnEnds: false, winner: -1 };
  let bonus = 0;
  for (const e of events) {
    if (e.type === 'hoop') {
      m.players[e.ball].hoops = Math.min(6, m.players[e.ball].hoops + 1);
      if (e.ball === s) { out.hoop = e.hoop; bonus = Math.max(bonus, 1); m.roqueted = []; }
      else out.peels.push(e.ball);
    }
    if (e.type === 'hit' && (e.a === s || e.b === s)) {
      const other = e.a === s ? e.b : e.a;
      if (out.roquet < 0 && !m.roqueted.includes(other) && !m.balls[other].done) {
        out.roquet = other; m.roqueted.push(other); bonus = Math.max(bonus, 2);
        m.players[s].roquets++;
      }
    }
    if (e.type === 'out' && e.ball === s) out.out = true;
    if (e.type === 'peg') {
      if (e.ball === s) out.peg = true; else out.pegOuts.push(e.ball);
    }
  }
  if (out.out) { m.players[s].outs++; bonus = 0; m.strokesLeft = 0; }
  else m.strokesLeft = Math.min(2, Math.max(m.strokesLeft, bonus));
  const finished = m.balls.findIndex(b => b.done && m.winner < 0);
  if (out.peg) { m.winner = s; m.over = true; }
  else if (out.pegOuts.length) { m.winner = out.pegOuts[0]; m.over = true; }
  else if (finished >= 0) { m.winner = finished; m.over = true; }
  if (!m.over && m.totalStrokes >= 70 * m.players.length) { m.over = true; m.winner = ranking(m)[0]; }
  out.winner = m.winner;
  out.turnEnds = m.over || m.strokesLeft <= 0;
  return out;
}

export function nextTurn(m) {
  const n = m.players.length;
  for (let k = 1; k <= n; k++) {
    const t = (m.turn + k) % n;
    if (!m.balls[t].done) { m.turn = t; break; }
  }
  m.strokesLeft = 1;
  m.roqueted = [];
}

/* progress cost: lower is better (distance-ish to finishing) */
export function progressCost(b) {
  if (b.done) return -100;
  const remaining = (DONE - b.next) * 12;
  if (!b.inPlay) return remaining + posCost({ ...b, x: TEE.x, z: TEE.z });
  return remaining + posCost(b);
}

export function ranking(m) {
  return m.balls.map((b, i) => i).sort((a, c) => {
    if (m.winner === a) return -1;
    if (m.winner === c) return 1;
    return progressCost(m.balls[a]) - progressCost(m.balls[c]);
  });
}

/* ---------- physics ---------- */

export function moving(b) { return b.inPlay && (b.vx * b.vx + b.vz * b.vz) > 1e-6; }
export function allStopped(balls) { return balls.every(b => !moving(b)); }

const LEGS = [];
for (let i = 0; i < HOOPS.length; i++) {
  const h = HOOPS[i];
  LEGS.push({ x: h.x - HOOP_HALF, z: h.z, hoop: i }, { x: h.x + HOOP_HALF, z: h.z, hoop: i });
}

function bounceCircle(b, cx, cz, r, rest, ev, kind, extra) {
  const dx = b.x - cx, dz = b.z - cz;
  const min = BALL_R + r;
  const d2 = dx * dx + dz * dz;
  if (d2 >= min * min || d2 < 1e-9) return false;
  const d = Math.sqrt(d2), nx = dx / d, nz = dz / d;
  b.x = cx + nx * min; b.z = cz + nz * min;
  const vn = b.vx * nx + b.vz * nz;
  if (vn < 0) {
    b.vx -= (1 + rest) * vn * nx;
    b.vz -= (1 + rest) * vn * nz;
    if (ev && -vn > 0.3) ev.push({ type: kind, ball: b.id, v: -vn, ...extra });
    return true;
  }
  return false;
}

/* one fixed step; pushes events into ev */
export function step(balls, dt, ev) {
  for (const b of balls) {
    if (!moving(b)) continue;
    const sp = Math.hypot(b.vx, b.vz);
    const ns = sp - DECEL * dt;
    if (ns <= STOP_V) { b.vx = b.vz = 0; }
    else { b.vx *= ns / sp; b.vz *= ns / sp; }
    b.x += b.vx * dt; b.z += b.vz * dt;
    b.spin += sp * dt / BALL_R;
  }
  /* ball-ball */
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    if (!a.inPlay) continue;
    for (let j = i + 1; j < balls.length; j++) {
      const c = balls[j];
      if (!c.inPlay) continue;
      const dx = c.x - a.x, dz = c.z - a.z;
      const d2 = dx * dx + dz * dz, min = BALL_R * 2;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 1e-4, nx = dx / d, nz = dz / d;
      const pen = (min - d) / 2;
      a.x -= nx * pen; a.z -= nz * pen; c.x += nx * pen; c.z += nz * pen;
      const rel = (a.vx - c.vx) * nx + (a.vz - c.vz) * nz;
      if (rel > 0) {
        const imp = rel * (1 + 0.9) / 2;
        a.vx -= imp * nx; a.vz -= imp * nz;
        c.vx += imp * nx; c.vz += imp * nz;
        if (ev) ev.push({ type: 'hit', a: a.id, b: c.id, v: rel });
      }
    }
  }
  for (const b of balls) {
    if (!b.inPlay) continue;
    /* hoop legs */
    for (const L of LEGS) {
      if (Math.abs(b.x - L.x) > 0.5 || Math.abs(b.z - L.z) > 0.5) continue;
      bounceCircle(b, L.x, L.z, LEG_R, 0.55, ev, 'leg', { hoop: L.hoop });
    }
    /* peg */
    if (Math.abs(b.x) < 0.5 && Math.abs(b.z) < 0.5) {
      const hit = bounceCircle(b, PEG.x, PEG.z, PEG.r, 0.5, ev, 'pegtap', {});
      const touching = Math.hypot(b.x - PEG.x, b.z - PEG.z) <= BALL_R + PEG.r + 0.01;
      if ((hit || touching) && b.next === PEG_TARGET && !b.done) {
        b.done = true; b.next = DONE; b.inPlay = false; b.vx = b.vz = 0;
        if (ev) ev.push({ type: 'peg', ball: b.id });
        continue;
      }
    }
    /* running the hoop */
    if (b.next < PEG_TARGET) {
      const h = HOOPS[b.next];
      const s = (b.z - h.z) * h.dir;
      const inGap = Math.abs(b.x - h.x) < HOOP_HALF - LEG_R;
      if (b.ps < 0 && s >= 0 && inGap) b.hin = true;
      if (s < -BALL_R) b.hin = false;
      if (b.hin && s >= BALL_R) {
        b.hin = false;
        if (ev) ev.push({ type: 'hoop', ball: b.id, hoop: b.next });
        b.next++;
        b.ps = sideOf(b);
      } else b.ps = s;
    }
    /* boundary: ball is placed back on the line and stops */
    const lx = COURT.hw - BALL_R, lz = COURT.hl - BALL_R;
    if (Math.abs(b.x) > COURT.hw || Math.abs(b.z) > COURT.hl) {
      b.x = Math.max(-lx, Math.min(lx, b.x));
      b.z = Math.max(-lz, Math.min(lz, b.z));
      b.vx = b.vz = 0; b.hin = false; b.ps = sideOf(b);
      if (ev) ev.push({ type: 'out', ball: b.id });
    }
  }
}

/* run until everything stops (used by the AI) */
export function simulate(balls, maxT = 12) {
  const ev = [];
  let t = 0;
  while (t < maxT) {
    step(balls, DT, ev);
    t += DT;
    if (allStopped(balls)) break;
  }
  return ev;
}

/* ---------- AI ---------- */

/* how far a ball is from a good spot for its next target (lower = better) */
export function posCost(b) {
  if (b.done) return -50;
  if (b.next === PEG_TARGET) return Math.hypot(b.x - PEG.x, b.z - PEG.z) * 0.8;
  const h = HOOPS[b.next];
  const ax = h.x, az = h.z - h.dir * 0.9;
  const s = (b.z - h.z) * h.dir;
  const dA = Math.hypot(b.x - ax, b.z - az);
  if (b.hin) return 0.3;
  if (s < -0.25) {
    const lateral = Math.abs(b.x - h.x), depth = -s;
    return dA * 0.55 + Math.max(0, lateral - depth * 0.3 - 0.15) * 1.3;
  }
  return dA + 2.2;
}

export const LEVELS = [
  { name: 'EASY', aimErr: 0.12, powErr: 0.24, pick: 8, think: 1.2 },
  { name: 'MEDIUM', aimErr: 0.045, powErr: 0.09, pick: 3, think: 1.0 },
  { name: 'HARD', aimErr: 0.016, powErr: 0.035, pick: 1, think: 0.8 },
];

function gauss(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function evaluate(m, before, after, ev, level) {
  const s = m.turn;
  const b0 = before[s], b1 = after[s];
  let v = 0;
  let pegged = false, outd = false, hoops = 0, roq = false;
  for (const e of ev) {
    if (e.type === 'peg' && e.ball === s) pegged = true;
    if (e.type === 'peg' && e.ball !== s) v -= 900;
    if (e.type === 'out' && e.ball === s) outd = true;
    if (e.type === 'hoop' && e.ball === s) hoops++;
    if (e.type === 'hoop' && e.ball !== s) v -= 120;
    if (e.type === 'hit' && (e.a === s || e.b === s)) {
      const o = e.a === s ? e.b : e.a;
      if (!m.roqueted.includes(o)) roq = true;
    }
  }
  if (pegged) return 5000;
  v += hoops * 400;
  if (outd) v -= 260;
  if (roq && !outd) v += m.strokesLeft > 0 ? 60 : 130;
  v -= posCost(b1) * 22;
  if (level >= 2) {
    for (let i = 0; i < after.length; i++) {
      if (i === s || before[i].done) continue;
      v += Math.max(-40, Math.min(40, (posCost(after[i]) - posCost(before[i])) * 6));
    }
  }
  /* stay off the boundary a little */
  const edge = Math.min(COURT.hw - Math.abs(b1.x), COURT.hl - Math.abs(b1.z));
  if (edge < 0.6) v -= 12;
  return v;
}

/* Choose a stroke for the striker. Returns { angle, power, plan } */
export function planShot(m, levelIdx = 1, rng = Math.random) {
  const lv = LEVELS[levelIdx] || LEVELS[1];
  const b = striker(m);
  const targets = [];
  if (b.next === PEG_TARGET) targets.push({ x: PEG.x, z: PEG.z, extra: [0.2, 0.9, 2.2], plan: 'peg' });
  else {
    const h = HOOPS[b.next];
    const s = (b.z - h.z) * h.dir;
    targets.push({ x: h.x, z: h.z - h.dir * 0.9, extra: [-0.3, 0, 0.4], plan: 'approach' });
    if (s < 0 || b.hin) targets.push({ x: h.x, z: h.z + h.dir * 1.2, extra: [0, 0.8, 2.0], plan: 'run' });
    else {
      /* behind the hoop: go round the side */
      const side = b.x >= h.x ? 1 : -1;
      targets.push({ x: h.x + side * 1.3, z: h.z - h.dir * 1.0, extra: [0, 0.5], plan: 'around' });
    }
  }
  m.balls.forEach((o, i) => {
    if (i === m.turn || !o.inPlay || m.roqueted.includes(i)) return;
    if (Math.hypot(o.x - b.x, o.z - b.z) < 9) targets.push({ x: o.x, z: o.z, extra: [0.4, 1.4, 3.0], plan: 'roquet', ball: i, hitDist: BALL_R * 2 });
  });
  const cands = [];
  const offs = [-0.07, -0.035, -0.015, 0, 0.015, 0.035, 0.07];
  for (const t of targets) {
    const a0 = Math.atan2(t.z - b.z, t.x - b.x);
    const d = Math.max(0.1, Math.hypot(t.x - b.x, t.z - b.z) - (t.hitDist || 0));
    for (const off of offs) for (const ex of t.extra) cands.push({ angle: a0 + off, power: powerFor(d + ex), plan: t.plan });
  }
  for (let k = 0; k < 24; k++) cands.push({ angle: rng() * Math.PI * 2, power: 0.15 + rng() * 0.6, plan: 'random' });

  const before = m.balls.map(x => ({ ...x }));
  for (const c of cands) {
    const sim = m.balls.map(x => ({ ...x }));
    const sb = sim[m.turn];
    sb.vx = Math.cos(c.angle) * c.power * VMAX;
    sb.vz = Math.sin(c.angle) * c.power * VMAX;
    const ev = simulate(sim);
    c.score = evaluate(m, before, sim, ev, levelIdx);
  }
  cands.sort((a, c) => c.score - a.score);
  const pool = cands.slice(0, Math.max(1, lv.pick));
  const pick = pool[Math.floor(rng() * pool.length)];
  return {
    angle: pick.angle + gauss(rng) * lv.aimErr,
    power: Math.max(0.05, Math.min(1, pick.power * (1 + gauss(rng) * lv.powErr))),
    plan: pick.plan,
    score: pick.score,
  };
}
