/* FUNHOUSE DASH: pure rules, hazards, runner physics, CPU AI and scoring.
   No three.js in here. Distances are "s" = metres along the track from the entrance.
   Local space: x across the track, y up (0 = town ground), z = Z0 - s (+z = the player's side). */

export const FLOOR_Y = 1.0;          /* the funhouse floor sits on a plinth */
export const Z0 = 24;
export const zOf = (s) => Z0 - s;
export const START_S = 0.6;
export const FINISH_S = 46.2;
export const VMAX = 6.5;
export const ACC = 15;
export const DEC = 24;
export const MAX_RUN = 75;
export const BONK_TIME = 0.8;
export const DIZZY = 0.4;
export const LANE_X = 0.9;
export const GHOST_X = [-1.3, -0.55, 0.15];

export const SEGMENTS = [
  { id: 'entry',   name: 'ENTRANCE',      a: -3,   b: 4.5 },
  { id: 'hammers', name: 'HAMMER ALLEY',  a: 4.5,  b: 12 },
  { id: 'jets',    name: 'AIR JETS',      a: 12,   b: 20.3 },
  { id: 'barrel',  name: 'BARREL OF FUN', a: 20.3, b: 28.2 },
  { id: 'tilt',    name: 'TIPPY FLOOR',   a: 28.2, b: 36.5 },
  { id: 'mirror',  name: 'MIRROR HALL',   a: 36.5, b: 42.3 },
  { id: 'slide',   name: 'THE SLIDE',     a: 42.3, b: 99 },
];

export const TIPS = {
  entry:   'Hold to run. Let go to stop. Timing beats speed.',
  hammers: 'Hammers swing low. Wait for the whoosh to pass, then go.',
  jets:    'Grates hiss, then blow. Run right behind the puffs.',
  barrel:  'Inside the barrel never stop. Keep holding or you tumble.',
  tilt:    'Wait for the floor to tip down, then dash across.',
  mirror:  'Only one door is real. Listen for the chime.',
  slide:   'Slide home! Tickets add bonus points.',
};

export function segAt(s) {
  for (const g of SEGMENTS) if (s < g.b) return g;
  return SEGMENTS[SEGMENTS.length - 1];
}

/* ---------- HAMMERS: padded pendulums swinging across the track ---------- */
export const HAMMERS = [
  { s: 7.0,  period: 2.4, phase: 0.0 },
  { s: 10.2, period: 2.4, phase: 1.35 },
];
export const HAMMER_AMP = 1.15;
export const HAMMER_ARM = 4.0;
export const HAMMER_PIVOT_Y = FLOOR_Y + 5.6;
export function hammerAngle(i, t) {
  const h = HAMMERS[i];
  return HAMMER_AMP * Math.sin((t * 2 * Math.PI) / h.period + h.phase);
}
export function hammerHits(s, t) {
  for (let i = 0; i < HAMMERS.length; i++) {
    if (Math.abs(s - HAMMERS[i].s) < 0.8 && Math.abs(hammerAngle(i, t)) < 0.3) return i;
  }
  return -1;
}

/* ---------- AIR JETS: four floor grates, firing as a wave ---------- */
export const JETS = [13.4, 15.0, 16.6, 18.2];
export const JET_P = 2.4, JET_DELAY = 0.14, JET_ON = 0.45, JET_WARN = 0.5;
export function jetPhase(i, t) {
  const p = (t - i * JET_DELAY) % JET_P;
  return p < 0 ? p + JET_P : p;
}
/* 0 = off, 1 = warning (hiss), 2 = blowing */
export function jetState(i, t) {
  const p = jetPhase(i, t);
  if (p < JET_ON) return 2;
  if (p > JET_P - JET_WARN) return 1;
  return 0;
}
export function jetHits(s, t) {
  for (let i = 0; i < JETS.length; i++) {
    if (Math.abs(s - JETS[i]) < 0.55 && jetState(i, t) === 2) return i;
  }
  return -1;
}

/* ---------- BARREL: rotating barrel, stop inside and you tumble ---------- */
export const BARREL_A = 21, BARREL_B = 27, BARREL_C = 24, BARREL_R = 2.4, BARREL_SPIN = 1.5;
export const inBarrel = (s) => s > BARREL_A && s < BARREL_B;

/* ---------- TIPPY FLOOR: a plank see-sawing front up / front down ---------- */
export const PLANK_A = 29, PLANK_B = 35, PLANK_C = 32, TILT_AMP = 0.3, TILT_P = 3.4, SLIP_ANG = 0.15;
export function tiltAngle(t) { return TILT_AMP * Math.sin((t * 2 * Math.PI) / TILT_P + 0.5); }
export const onPlank = (s) => s > PLANK_A && s < PLANK_B;

/* ---------- MIRROR HALL: three doors, one real ---------- */
export const DOOR_STOP = 38.4, DOOR_S = 40.6, DOOR_X = [-1.8, 0, 1.8], DOOR_W = 1.3;

/* ---------- SLIDE + BALL PIT ---------- */
export const SLIDE_A = 42.5, SLIDE_B = 46.5, PIT_B = 48.6;

export const TICKETS = [3, 7, 8.6, 11.4, 15.8, 19.5, 24, 30.5, 33.5, 44];

export function floorY(s, t) {
  if (s < -2) return 0;
  if (s < 0) return FLOOR_Y * (s + 2) / 2;
  if (onPlank(s)) return FLOOR_Y + (s - PLANK_C) * Math.sin(tiltAngle(t));
  if (s >= SLIDE_A && s < SLIDE_B) return FLOOR_Y - ((s - SLIDE_A) / (SLIDE_B - SLIDE_A)) * (FLOOR_Y - 0.15);
  if (s >= SLIDE_B && s < PIT_B) return 0.15;
  if (s >= PIT_B) return 0;
  return FLOOR_Y;
}

/* ---------- runner physics ---------- */
export function newRunner() {
  return {
    s: START_S, v: 0, x: LANE_X, mode: 'run', still: 0, slip: false,
    bonkT: 0, bonkFrom: 0, bonkTo: 0, bonkKind: '', afterBonk: 'run', hop: 0, spin: 0,
    bonks: 0, tickets: 0, got: TICKETS.map(() => 0),
    doorDone: false, doorTried: [], doorPick: -1, toT: 0, done: false,
  };
}

function bonkTarget(r, kind) {
  if (kind === 'door') return DOOR_STOP;
  if (kind === 'barrel') return BARREL_A - 0.8;
  const g = segAt(r.s);
  return Math.max(g.a + 0.4, r.s - 3.2);
}

export function bonk(r, kind, ev) {
  r.mode = 'bonk';
  r.bonkKind = kind;
  r.bonkT = 0;
  r.bonkFrom = r.s;
  r.bonkTo = bonkTarget(r, kind);
  r.afterBonk = kind === 'door' ? 'door' : 'run';
  r.v = 0; r.still = 0; r.slip = false;
  r.bonks++;
  if (ev) ev.push({ type: 'bonk', kind });
}

const easeOut = (u) => 1 - (1 - u) * (1 - u);

/* Advance one runner. `sim` = true for the AI's look-ahead (no tickets, no side events). */
export function step(r, hold, dt, t, ev, sim) {
  if (r.mode === 'bonk') {
    r.bonkT += dt;
    const u = Math.min(1, r.bonkT / BONK_TIME);
    r.s = r.bonkFrom + (r.bonkTo - r.bonkFrom) * easeOut(u);
    r.hop = Math.sin(Math.PI * u) * 2.2;
    r.spin = u;
    if (r.bonkT >= BONK_TIME + DIZZY) {
      r.mode = r.afterBonk; r.v = 0; r.hop = 0; r.spin = 0; r.still = 0;
    }
    return;
  }
  if (r.mode !== 'run') return;
  const inSlide = r.s >= SLIDE_A;
  const barrel = inBarrel(r.s);
  const plank = onPlank(r.s);
  const ang = tiltAngle(t);
  let vmax = VMAX;
  if (barrel) vmax *= 0.8;
  if (plank && ang < -0.08) vmax *= 1.3;

  if (inSlide) r.v = Math.min(9, r.v + 18 * dt);
  else if (hold) r.v = r.v > vmax ? Math.max(vmax, r.v - DEC * dt) : Math.min(vmax, r.v + ACC * dt);
  else r.v = Math.max(0, r.v - DEC * dt);

  if (plank && ang > SLIP_ANG) {
    if (!r.slip) { r.slip = true; if (ev) ev.push({ type: 'slip' }); }
    r.v = -5.5;
  } else if (r.slip) { r.slip = false; r.v = 0; }

  r.s += r.v * dt;
  if (r.slip && r.s <= PLANK_A - 0.4) { r.s = PLANK_A - 0.4; r.v = 0; r.slip = false; }
  if (r.s < START_S) r.s = START_S;

  if (!r.doorDone && r.s >= DOOR_STOP) {
    r.s = DOOR_STOP; r.v = 0; r.mode = 'door';
    if (ev) ev.push({ type: 'door' });
    return;
  }
  const hi = hammerHits(r.s, t);
  if (hi >= 0) return bonk(r, 'hammer', ev);
  const ji = jetHits(r.s, t);
  if (ji >= 0) return bonk(r, 'jet', ev);
  if (barrel && r.v < 1.4) {
    r.still += dt;
    if (r.still > 0.35) return bonk(r, 'barrel', ev);
  } else r.still = 0;

  if (!sim) {
    for (let i = 0; i < TICKETS.length; i++) {
      if (!r.got[i] && Math.abs(r.s - TICKETS[i]) < 0.6) {
        r.got[i] = 1; r.tickets++;
        if (ev) ev.push({ type: 'ticket', i });
      }
    }
  }
  if (r.s >= FINISH_S) {
    r.mode = 'done'; r.done = true;
    if (ev) ev.push({ type: 'finish' });
  }
}

/* ---------- CPU AI: PIP (easy), HOPE (medium), NOBLE (hard) ---------- */
export const SKILL = {
  easy:   { react: 0.3,  horizon: 1.0, brave: 0.35, doorDelay: 1.4, doorSmart: 0.4 },
  medium: { react: 0.15, horizon: 1.4, brave: 0.1,  doorDelay: 1.1, doorSmart: 1.0 },
  hard:   { react: 0.06, horizon: 1.8, brave: 0.0,  doorDelay: 0.45, doorSmart: 1.0 },
};

export function newAI(level) {
  return { sk: SKILL[level] || SKILL.medium, cd: 0, hold: true, seg: '', brave: false, doorT: 0 };
}

function cloneRunner(r) {
  return {
    s: r.s, v: r.v, x: r.x, mode: r.mode, still: r.still, slip: r.slip,
    bonkT: r.bonkT, bonkFrom: r.bonkFrom, bonkTo: r.bonkTo, bonkKind: r.bonkKind, afterBonk: r.afterBonk,
    hop: 0, spin: 0, bonks: 0, tickets: 0, got: r.got, doorDone: r.doorDone, doorTried: r.doorTried,
    doorPick: -1, toT: 0, done: false,
  };
}

const _ev = [];
function simulate(r0, t0, holdFor, H, dt) {
  const r = cloneRunner(r0);
  for (let tt = 0; tt < H; tt += dt) {
    _ev.length = 0;
    step(r, tt < holdFor, dt, t0 + tt, _ev, true);
    for (const e of _ev) if (e.type === 'bonk' || e.type === 'slip') return -1e9;
    if (r.mode !== 'run') break;
  }
  return r.s;
}

/* Returns whether the CPU holds "run" this frame. */
export function aiThink(ai, r, t, dt) {
  ai.cd -= dt;
  if (ai.cd > 0) return ai.hold;
  ai.cd = ai.sk.react * (0.7 + Math.random() * 0.6);
  if (r.mode !== 'run') return (ai.hold = true);
  const seg = segAt(r.s).id;
  if (seg !== ai.seg) { ai.seg = seg; ai.brave = Math.random() < ai.sk.brave; }
  if (ai.brave || r.s >= SLIDE_A) return (ai.hold = true);
  const H = ai.sk.horizon;
  let best = -1, bestS = -1e9;
  const n = Math.round(H / 0.1);
  for (let k = n; k >= 0; k--) {
    const s = simulate(r, t, k * 0.1, H, 0.05);
    if (s > bestS + 0.01) { bestS = s; best = k; }
  }
  ai.hold = best < 0 || bestS < -1e8 ? true : best > 0;
  return ai.hold;
}

export function aiPickDoor(ai, correct, tried) {
  const open = [0, 1, 2].filter((i) => !tried.includes(i));
  if (Math.random() < ai.sk.doorSmart && open.includes(correct)) return correct;
  return open[Math.floor(Math.random() * open.length)];
}

/* ---------- scoring ---------- */
export const TICKET_PTS = 20;
export function scoreRun(time, tickets, finished) {
  if (!finished) return tickets * TICKET_PTS;
  return Math.max(0, Math.round(1000 - time * 25 + tickets * TICKET_PTS));
}
export function starsFor(score) {
  return score >= 900 ? 3 : score >= 700 ? 2 : score >= 450 ? 1 : 0;
}
