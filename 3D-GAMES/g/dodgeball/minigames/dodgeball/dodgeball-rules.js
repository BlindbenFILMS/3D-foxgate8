/* DODGEBALL rules + AI brain. Pure JS, no three.js. All numbers in world units (fox is ~2.8 tall). */

export const COURT = {
  w: 14,            /* x: -7 .. 7 */
  l: 22,            /* z: -11 .. 11 ; +z is the home (player) side */
  half: 11,
  edgeX: 6.4,       /* how far a fox may walk sideways */
  backZ: 10.3,      /* how deep a fox may walk */
  lineGap: 0.75,    /* foxes stay this far from the centre line */
  boundX: 9.6,      /* low barrier around the court (balls bounce off it) */
  boundZ: 13.4,
};

export const BALL = { r: 0.38, g: 18, bounce: 0.52, roll: 0.985, air: 0.999 };
export const FOX = { radius: 0.55, top: 2.55, run: 6.6, dash: 15, dashTime: 0.26, dashCool: 0.8, catchWin: 0.3, catchWinFast: 0.19, catchCool: 0.55 };

export const ROUND_TIME = 75;
export const ROUNDS_TO_WIN = 2;
export const TEAM_SIZE = 2;

/* Opponent cast: easy / medium / hard */
export const LEVELS = [
  { id: 0, name: 'PIP',   title: 'ROOKIE', react: 0.42, catch: 0.14, dodge: 0.32, spread: 1.05, aimWait: [1.1, 2.4], power: [0.35, 0.8], perfect: 0.08, speed: 0.82, gold: 20 },
  { id: 1, name: 'HOPE',  title: 'CLUB',   react: 0.26, catch: 0.42, dodge: 0.36, spread: 0.6,  aimWait: [0.7, 1.6], power: [0.55, 0.92], perfect: 0.25, speed: 0.95, gold: 40 },
  { id: 2, name: 'NOBLE', title: 'MASTER', react: 0.16, catch: 0.5,  dodge: 0.42, spread: 0.3,  aimWait: [0.35, 1.0], power: [0.7, 1.0], perfect: 0.5, speed: 1.08, gold: 75 },
];
/* the player's AI teammate plays at roughly club level */
export const MATE = { react: 0.28, catch: 0.32, dodge: 0.38, spread: 0.65, aimWait: [0.6, 1.5], power: [0.55, 0.9], perfect: 0.22, speed: 0.95 };

/* power meter: ping-pong 0..1, the yellow PERFECT band near the top */
export const METER = { period: 0.85, perfectLo: 0.78, perfectHi: 0.92 };
export function meterAt(t) {
  const p = (t / METER.period) % 2;
  return p < 1 ? p : 2 - p;
}
export function isPerfect(power) { return power >= METER.perfectLo && power <= METER.perfectHi; }
export function throwSpeed(power) { return isPerfect(power) ? 30 : 15 + 12 * power; }
/* aim error (radius in units at the target) */
export function aimError(power, skillSpread) {
  if (isPerfect(power)) return 0.12 * skillSpread;
  return (0.35 + power * power * 1.1) * skillSpread;
}

export const rnd = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* clamp a fox position to its own half */
export function clampToSide(team, x, z) {
  const zMin = team === 0 ? COURT.lineGap : -COURT.backZ;
  const zMax = team === 0 ? COURT.backZ : -COURT.lineGap;
  return [clamp(x, -COURT.edgeX, COURT.edgeX), clamp(z, zMin, zMax)];
}

/* closest approach of a moving ball (xz) to a point. returns {t, miss} */
export function approach(bx, bz, vx, vz, px, pz) {
  const v2 = vx * vx + vz * vz;
  if (v2 < 1e-4) return { t: -1, miss: 99 };
  const t = ((px - bx) * vx + (pz - bz) * vz) / v2;
  const cx = bx + vx * t - px, cz = bz + vz * t - pz;
  return { t, miss: Math.hypot(cx, cz) };
}

/* AI: what to do about a ball that is coming. returns 'catch' | 'dodge' | 'none' */
export function reactChoice(skill, ballSpeed, holding) {
  const fast = ballSpeed > 26 ? 0.55 : 1;
  const r = Math.random();
  const c = holding ? skill.catch * 0.9 : skill.catch * fast;
  if (r < c) return 'catch';
  if (r < c + skill.dodge) return 'dodge';
  return 'none';
}

/* AI: pick a target. prefers foxes that are close to the line and not dashing */
export function pickTarget(me, foes) {
  let best = null, bs = -1e9;
  for (const f of foes) {
    const d = Math.hypot(f.x - me.x, f.z - me.z);
    const s = -d + (f.dashing ? -6 : 0) + (f.holding ? 1.5 : 0) + Math.random() * 3;
    if (s > bs) { bs = s; best = f; }
  }
  return best;
}

/* round result: 0 home, 1 away, -1 draw */
export function roundWinner(aliveHome, aliveAway, timeUp) {
  if (aliveHome === 0 && aliveAway === 0) return -1;
  if (aliveAway === 0) return 0;
  if (aliveHome === 0) return 1;
  if (!timeUp) return null;
  if (aliveHome > aliveAway) return 0;
  if (aliveAway > aliveHome) return 1;
  return -1;
}

/* points for the home player; used for BEST and XP */
export const POINTS = { out: 100, catch: 150, perfect: 50, round: 250, win: 500, flawless: 300 };

export function stars(won, roundsFor, roundsAgainst, flawless) {
  if (!won) return roundsFor > 0 ? 1 : 0;
  let s = 2;
  if (roundsAgainst === 0) s = 3;
  if (flawless && s < 3) s = 3;
  return s;
}

export function rewards(level, won, starCount, score) {
  const L = LEVELS[level] || LEVELS[0];
  const gold = won ? L.gold + starCount * 5 : Math.round(starCount * 4);
  const xp = Math.round(score / 10) + (won ? 25 : 5);
  return { gold, xp };
}

/* teaching captions for DEMO, 20 words or fewer each */
export const DEMO_TIPS = [
  'Rush the centre line and grab a ball. Each team starts with a chance.',
  'Hold THROW. Release in the yellow band for a perfect, fast throw.',
  'Tap CATCH just before the ball hits you. A catch knocks out the thrower.',
  'A catch also brings one teammate back from the bench.',
  'DODGE dashes you sideways. Use it when a throw is too fast to catch.',
  'A ball that bounces first is dead. It cannot get anyone out.',
  'Holding a ball? CATCH becomes BLOCK and knocks throws away.',
  'Knock out the whole team to win the round. First to two rounds wins.',
];

export const RULES_TEXT = [
  'Two teams of two foxes. Stay on your side of the red line.',
  'Hit a fox with a ball on the full and they are out.',
  'Catch a throw: the thrower is out and a teammate returns.',
  'Bounced balls are dead. Release THROW in the yellow band for a perfect shot.',
  'Clear the other team to win a round. First to two rounds wins the match.',
];
