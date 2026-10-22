/* 8 GATES 3D: JUGGLING, pure rules + AI (no three.js).
   Time is in seconds. Hands: 0 = screen-left, 1 = screen-right.
   The pattern runs on a beat grid: slot k lands in hand (k % 2) at slotTime(k).
   A ball caught at slot k is thrown to slot k + P (P = pattern period).
   P odd = cascade (balls cross), P even = fountain (balls stay on one side). */

export const ROUND_TIME = 30;
export const MAX_DROPS = 3;
export const MIN_BALLS = 3;
export const MAX_BALLS = 5;

/* catch windows (seconds either side of the beat) */
export const WINDOWS = { perfect: 0.055, good: 0.11, ok: 0.17 };
export const ASSIST_SCALE = 1.6;
export const EARLY_ZONE = 0.45; /* a tap this far before a ball's beat counts as TOO EARLY */

export const PROPS = [
  { kind: 'ball', value: 1, color: '#ec3013' },
  { kind: 'ball', value: 1, color: '#ffd23a' },
  { kind: 'ball', value: 1, color: '#f4f1ea' },
  { kind: 'club', value: 2, color: '#3ad1ff' },
  { kind: 'torch', value: 3, color: '#ff8a1f' }
];

export const LEVELS = {
  pip:   { key: 'pip',   name: 'PIP',   rank: 'ROOKIE', sigma: 0.072, slip: 0.030, slipPerBall: 0.018 },
  hope:  { key: 'hope',  name: 'HOPE',  rank: 'CLUB',   sigma: 0.043, slip: 0.012, slipPerBall: 0.008 },
  noble: { key: 'noble', name: 'NOBLE', rank: 'MASTER', sigma: 0.021, slip: 0.003, slipPerBall: 0.003 }
};
export const LEVEL_KEYS = ['pip', 'hope', 'noble'];

export const GRADE_POINTS = { perfect: 10, good: 6, ok: 3 };

export function windows(assist) {
  const s = assist ? ASSIST_SCALE : 1;
  return { perfect: WINDOWS.perfect * s, good: WINDOWS.good * s, ok: WINDOWS.ok * s };
}

/* err = catchTime - beatTime. Returns grade or null (outside the window). */
export function grade(err, assist) {
  const w = windows(assist), a = Math.abs(err);
  if (a <= w.perfect) return 'perfect';
  if (a <= w.good) return 'good';
  if (a <= w.ok) return 'ok';
  return null;
}

export function multiplier(combo) { return Math.min(5, 1 + Math.floor(combo / 10)); }

export function points(g, value, combo) {
  return (GRADE_POINTS[g] || 0) * value * multiplier(combo);
}

/* how many props the juggler should run for a combo */
export function wantedBalls(combo) {
  if (combo >= 30) return 5;
  if (combo >= 12) return 4;
  return 3;
}

/* the beat (seconds between catches, hands alternating). Speeds up through the round
   and with more props in the air. */
export function beatAt(elapsed, P) {
  const base = Math.max(0.37, 0.47 - elapsed * 0.0032);
  return Math.max(0.33, base - 0.018 * (P - 3));
}

/* CPU plan for one catch. rng() in [0,1). Returns { miss, err } */
export function cpuPlan(levelKey, P, rng = Math.random) {
  const L = LEVELS[levelKey] || LEVELS.hope;
  const slip = L.slip + L.slipPerBall * Math.max(0, P - 3);
  if (rng() < slip) return { miss: true, err: 0 };
  /* Box-Muller normal */
  const u = Math.max(1e-6, rng()), v = rng();
  const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  let err = n * L.sigma;
  const lim = WINDOWS.ok * 0.98;
  if (err > lim) err = lim;
  if (err < -lim) err = -lim;
  return { miss: false, err };
}

/* turn order: every player once per round */
export function turnOrder(nPlayers, rounds) {
  const out = [];
  for (let r = 0; r < rounds; r++) for (let p = 0; p < nPlayers; p++) out.push({ player: p, round: r });
  return out;
}

const COLORS = ['#ff7a1a', '#ffd23a', '#3a6ff7', '#ec3013'];

/* build the line-up for a mode */
export function makePlayers(mode, { level = 'hope', players = 2 } = {}) {
  if (mode === 'demo') {
    return [
      { name: 'PIP', cpu: true, level: 'pip', cast: 'pip' },
      { name: 'NOBLE', cpu: true, level: 'noble', cast: 'noble' }
    ];
  }
  if (mode === 'local') {
    const n = Math.max(2, Math.min(4, players | 0));
    const out = [];
    for (let i = 0; i < n; i++) out.push({ name: 'P' + (i + 1), cpu: false, cast: 'player', color: COLORS[i] });
    return out;
  }
  const L = LEVELS[level] || LEVELS.hope;
  return [
    { name: 'YOU', cpu: false, cast: 'player', color: COLORS[0] },
    { name: L.name, cpu: true, level: L.key, cast: L.key }
  ];
}

/* stars for one human's match total, scaled by rounds */
export function starsFor(total, rounds) {
  const per = total / Math.max(1, rounds);
  if (per >= 3300) return 3;
  if (per >= 2000) return 2;
  if (per >= 800) return 1;
  return 0;
}

export function goldFor({ win, level, stars, mode }) {
  if (mode === 'demo') return 0;
  const base = mode === 'cpu' ? ({ pip: 15, hope: 30, noble: 60 }[level] || 20) : 10;
  return (win ? base : 0) + stars * 5;
}

export function xpFor(total) { return Math.floor(total / 60); }

/* winner(s) by total */
export function standings(players) {
  const max = Math.max(...players.map(p => p.score));
  const winners = players.map((p, i) => (p.score === max ? i : -1)).filter(i => i >= 0);
  return { max, winners, draw: winners.length > 1 };
}

export const DEMO_CAPTIONS = [
  'Each ball lands in one hand. Tap that hand as it lands.',
  'Tap when the ball meets the ring. Dead on the beat is PERFECT.',
  'Listen: the left hand ticks low, the right hand ticks high.',
  'Keep a combo going. At 12 a club joins, at 30 a torch.',
  'Clubs score double, torches triple. The multiplier climbs every 10 catches.',
  'Three drops and the turn ends. Highest total after all rounds wins.'
];

export const RULES_TEXT = [
  'Balls fly between your two paws. Tap the hand a ball is falling to, right as it reaches the ring.',
  'PERFECT, GOOD and OK catches score 10, 6 and 3, times the prop value and your multiplier.',
  'Build a combo to add a club (x2) and a torch (x3). Tapping too early breaks the combo.',
  'Each turn lasts 30 seconds or 3 drops. Most points after every round wins.'
];
