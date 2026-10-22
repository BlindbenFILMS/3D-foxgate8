/* 8 GATES 3D : TRACK & FIELD : pure rules + AI (no three.js) */

export const M = 1.4;          /* world units per metre along the ground */
export const G = 9.81;         /* m/s^2 */
export const VMAX = 11.8;      /* top running speed, m/s */
export const JOG = 2.0;        /* speed a racer drifts to when nobody taps, m/s */

export const EVENTS = [
  { key: 'dash',    name: '100M DASH',    short: '100M',    kind: 'race',  dist: 100, better: 'low',
    tip: 'Tap RUN as fast as you can. Wait for the gun.' },
  { key: 'long',    name: 'LONG JUMP',    short: 'LONG',    kind: 'field', attempts: 2, better: 'high', best: 34,
    tip: 'Tap RUN. Hold JUMP before the board, release near 34 degrees.' },
  { key: 'jav',     name: 'JAVELIN',      short: 'JAVELIN', kind: 'field', attempts: 2, better: 'high', best: 38,
    tip: 'Tap RUN. Hold THROW well before the line, release near 38 degrees.' },
  { key: 'hurdles', name: '110M HURDLES', short: 'HURDLES', kind: 'race',  dist: 110, better: 'low',
    tip: 'Tap RUN. Tap JUMP about two steps before each hurdle.' },
];
export const eventByKey = (k) => EVENTS.find((e) => e.key === k) || EVENTS[0];

/* hurdles: metres from the start line */
export const HURDLES = Array.from({ length: 10 }, (_, k) => 13.72 + 9.14 * k);

/* cast: torso = [torso, arms/outfit, legs] */
export const CAST = {
  PIP:   { name: 'PIP',   title: 'ROOKIE',     skill: 0.42, torso: ['#ffd23a', '#f2b705', '#6b5a2e'], outfit: 'tee',  mood: 'happy' },
  HOPE:  { name: 'HOPE',  title: 'CLUB LEVEL', skill: 0.70, torso: ['#f4efe4', '#ffffff', '#2f6fd6'], outfit: 'vest', mood: 'calm', glasses: true, cane: true },
  NOBLE: { name: 'NOBLE', title: 'MASTER',     skill: 0.93, torso: ['#3a3836', '#24202e', '#7a1d10'], outfit: 'coat', mood: 'cool', chair: true, eyes: '#ff2a2a' },
};
export const PLAYERS = [
  { name: 'YOU', torso: ['#ec3013', '#ffffff', '#1a1626'], outfit: 'tee' },
  { name: 'P2',  torso: ['#16a3a0', '#ffffff', '#1a1626'], outfit: 'tee' },
  { name: 'P3',  torso: ['#7b4fd6', '#ffffff', '#1a1626'], outfit: 'tee' },
  { name: 'P4',  torso: ['#3fae3a', '#ffffff', '#1a1626'], outfit: 'tee' },
];
export const LEVELS = [
  { name: 'EASY',   rivals: ['PIP'] },
  { name: 'MEDIUM', rivals: ['PIP', 'HOPE'] },
  { name: 'HARD',   rivals: ['PIP', 'HOPE', 'NOBLE'] },
];
export const PLACE_POINTS = [5, 3, 2, 1];
export const MEDALS = ['GOLD', 'SILVER', 'BRONZE'];

/* ---------- running ---------- */
/* human: tap rate (decaying tap counter) -> target speed */
export const RATE_DECAY = 2.5;
export function humanTarget(rate) {
  return VMAX * Math.pow(Math.min(1, rate / 2.9), 0.75);
}
export function aiEffort(skill) { return 0.70 + 0.28 * skill; }
export function aiReaction(skill, r) { return 0.12 + (1 - skill) * 0.2 + r * 0.06; }
export function accelK(target, v) { return target > v ? 1.5 : 2.6; }

/* ---------- long jump ---------- */
export const ANGLE_RATE = 90;  /* degrees per second while holding */
export const ANGLE_MAX = 62;
export function longJumpLaunch(v, deg) {
  const loss = 1 - 0.006 * Math.max(0, deg - 20);
  return v * 0.96 * loss;
}
export function aiLongJumpPlan(skill, r1, r2, r3) {
  const foul = r1 < (1 - skill) * 0.22;
  const safety = foul ? -(0.05 + r2 * 0.35) : 0.04 + r2 * (1 - skill) * 1.1;
  const angle = clamp(34 + (r3 - 0.5) * (1 - skill) * 30, 12, 55);
  return { safety, angle };
}

/* ---------- javelin ---------- */
export const BRAKE = 20;       /* m/s^2 after release */
export const JAV_DRAG = 0.0035;
export function javelinSpeed(v) { return 12 + v * 1.6; }
export function brakeDistance(v) { return (v * v) / (2 * BRAKE); }
export function aiJavelinPlan(skill, r1, r2, r3) {
  const foul = r1 < (1 - skill) * 0.18;
  const margin = foul ? -(0.2 + r2 * 0.8) : 0.15 + r2 * (1 - skill) * 3.5;
  const angle = clamp(38 + (r3 - 0.5) * (1 - skill) * 32, 14, 58);
  return { margin, angle };
}

/* ---------- hurdles ---------- */
export function aiHurdleLead(skill, r) {
  /* metres before the hurdle the AI takes off */
  return 3.1 + (r - 0.5) * (1 - skill) * 6.5;
}

/* ---------- results ---------- */
export function rank(entries, better) {
  /* entries: [{ id, mark }] ; mark null = no mark */
  const ok = entries.filter((e) => e.mark != null);
  const bad = entries.filter((e) => e.mark == null);
  ok.sort((a, b) => (better === 'low' ? a.mark - b.mark : b.mark - a.mark));
  return ok.concat(bad).map((e, i) => ({ ...e, place: i }));
}
export function fmtTime(s) { return s == null ? 'DNF' : s.toFixed(2); }
export function fmtDist(m) { return m == null ? 'FOUL' : m.toFixed(2) + ' M'; }
export function fmtMark(ev, m) {
  if (ev.kind === 'race') return m == null ? 'DQ' : m.toFixed(2) + ' S';
  return fmtDist(m);
}
export function isBetter(ev, a, b) {
  if (a == null) return false;
  if (b == null) return true;
  return ev.better === 'low' ? a < b : a > b;
}
export function placeName(i) { return ['1ST', '2ND', '3RD', '4TH'][i] || (i + 1) + 'TH'; }

/* ---------- rewards ---------- */
export function meetGold(level, place, golds) {
  const win = [25, 45, 80][level] || 25;
  return (place === 0 ? win : 0) + golds * 5;
}
export function meetStars(place, fieldSize) {
  if (place === 0) return 3;
  if (place === 1) return fieldSize > 2 ? 2 : 1;
  if (place === 2) return 1;
  return 0;
}

/* ---------- demo captions (20 words or fewer) ---------- */
export const DEMO = {
  dash:    ['HOPE and NOBLE line up. Tap RUN fast after the gun.', 'Tapping before the gun is a false start.'],
  long:    ['Run up fast. Hold JUMP just before the white board.', 'Release near 34 degrees. Past the board is a foul.'],
  jav:     ['Hold THROW a few steps before the line.', 'Release near 38 degrees. You need room to stop.'],
  hurdles: ['Tap RUN for speed. Tap JUMP early for each hurdle.', 'Hitting a hurdle costs speed.'],
};

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
