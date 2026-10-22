/* BUMPER CARS - pure rules + AI. No three.js in here: plain numbers only. */

export const ARENA = { hx: 12, hz: 9.5, cr: 3.5 };          /* inner wall half extents + corner radius */
export const CAR = {
  r: 1.45,          /* bumper ring radius (collision circle) */
  accel: 17,        /* thrust u/s^2 */
  max: 9,           /* top speed */
  boostMax: 15,     /* top speed while boosting */
  boostT: 1.1,      /* boost length (s) */
  boostCd: 4,       /* boost recharge (s) */
  turn: 3.6,        /* rad/s */
  grip: 4.5,        /* sideways slip damping */
  drag: 0.9,        /* rolling drag */
  wallE: 0.55,      /* wall bounce */
  carE: 0.85        /* car-car bounce */
};
export const ROUND = 75;       /* seconds per round */
export const COUNT = 3;        /* countdown seconds */
export const STAR_EVERY = 14;  /* seconds between gold stars */
export const STAR_TIME = 8;    /* how long a star power lasts */

export const LEVELS = [
  { key: 'easy',   label: 'EASY',   boss: 'PIP',   speed: 0.74, predict: 0.0, react: 0.9,  boost: 0.10, aimErr: 2.2, rearAim: 0.0 },
  { key: 'medium', label: 'MEDIUM', boss: 'HOPE',  speed: 0.88, predict: 0.5, react: 0.5,  boost: 0.35, aimErr: 1.1, rearAim: 0.6 },
  { key: 'hard',   label: 'HARD',   boss: 'NOBLE', speed: 1.00, predict: 1.0, react: 0.22, boost: 0.80, aimErr: 0.35, rearAim: 1.2 }
];

/* Cast. car = body paint, torso = [fur, chest, outfit] for the fox maker. */
export const CAST = {
  YOU:   { name: 'YOU',    car: '#ec3013', trim: '#ffffff', torso: ['#e8762c', '#fff3e0', '#ec3013'], outfit: 'tee',  mood: 'happy' },
  P2:    { name: 'P2',     car: '#18a999', trim: '#ffffff', torso: ['#d9632a', '#fff3e0', '#18a999'], outfit: 'vest', mood: 'happy' },
  FOX:   { name: 'RED',    car: '#ec3013', trim: '#ffffff', torso: ['#e8762c', '#fff3e0', '#ec3013'], outfit: 'tee',  mood: 'happy' },
  PIP:   { name: 'PIP',    car: '#ffd23a', trim: '#1a1626', torso: ['#f08a3c', '#fffaf0', '#ffd23a'], outfit: 'tee',  mood: 'happy', skill: -0.08 },
  HOPE:  { name: 'HOPE',   car: '#2f6fdc', trim: '#ffffff', torso: ['#c95a2b', '#fff3e0', '#2f6fdc'], outfit: 'coat', mood: 'calm', skill: 0, legs: '#2f6fdc', shades: true, cane: true, byEar: true },
  NOBLE: { name: 'NOBLE',  car: '#6a4bd8', trim: '#ec3013', torso: ['#8a3b1c', '#e9e2d6', '#3d2f6b'], outfit: 'coat', mood: 'stern', skill: 0.08, eyes: '#ff2a1a', hover: true }
};

export function lineup(mode) {
  if (mode === 'local') return ['YOU', 'P2', 'PIP', 'HOPE'];
  if (mode === 'demo') return ['FOX', 'PIP', 'HOPE', 'NOBLE'];
  return ['YOU', 'PIP', 'HOPE', 'NOBLE'];
}

/*  Score one hit.
    approach: attacker speed along the line of impact (u/s)
    facing:   dot(victim forward, direction from victim to attacker); 1 = head-on, -1 = from behind
    star:     attacker holds a gold star                                                        */
export function hitPoints(approach, facing, star) {
  let pts = 1, label = 'BUMP';
  if (facing < -0.55) { pts = 3; label = 'REAR BUMP'; }
  else if (facing < 0.35) { pts = 2; label = 'SIDE BUMP'; }
  if (approach > 10.5) { pts += 1; label = 'BIG ' + label; }
  if (star) { pts *= 2; label = 'STAR ' + label; }
  return { pts, label };
}

export function rank(players) {
  return players.map((p, i) => ({ i, s: p.score })).sort((a, b) => b.s - a.s || a.i - b.i).map(o => o.i);
}

export function rewards(score, place, levelIdx) {
  const lv = levelIdx + 1;
  const win = place === 1;
  const gold = win ? 15 * lv + score * 2 : Math.round(score * lv * 0.5);
  const xp = 10 + score * 2 + (win ? 20 * lv : 0);
  const stars = score >= 14 ? 3 : score >= 8 ? 2 : score >= 3 ? 1 : 0;
  return { gold, xp, stars: win ? Math.max(1, stars) : stars };
}

/* ---------------- AI ----------------
   me / others: { x, z, vx, vz, yaw, score, stun, hornT, boostCd, id }
   star: { x, z } | null
   returns { x, z (world dir, unit), mag, boost, brake, horn }                  */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function aiControl(me, others, star, lvl, cast, dt, rnd) {
  const m = me.ai || (me.ai = { t: 0, target: -1, err: rnd() * 6.28, stuck: 0, wander: 0, honkT: 2 + rnd() * 6 });
  const skill = clamp((cast.skill || 0), -0.2, 0.2);
  m.t -= dt; m.err += dt * 0.7; m.honkT -= dt;
  const sp = Math.hypot(me.vx, me.vz);
  m.stuck = sp < 1.2 ? m.stuck + dt : 0;

  if (m.t <= 0 || !others.find(o => o.id === m.target)) {
    let best = null, bs = -1e9;
    const lead = Math.max(...others.map(o => o.score));
    for (const o of others) {
      const d = Math.hypot(o.x - me.x, o.z - me.z);
      let s = -d;
      if (o.score === lead && lead > 0) s += 3 + lvl.predict * 3;
      if (o.stun > 0) s -= 4;
      if (cast.byEar && o.hornT > 0) s += 14;      /* HOPE drives by ear: horns pull her in */
      s += rnd() * 4;
      if (s > bs) { bs = s; best = o; }
    }
    m.target = best ? best.id : -1;
    m.t = lvl.react + rnd() * 1.2;
  }
  const tgt = others.find(o => o.id === m.target);
  let ax = 0, az = 0;
  let wantStar = false;
  if (star) {
    const ds = Math.hypot(star.x - me.x, star.z - me.z);
    if (ds < 6 + lvl.predict * 4) { ax = star.x; az = star.z; wantStar = true; }
  }
  if (!wantStar && tgt) {
    const d = Math.hypot(tgt.x - me.x, tgt.z - me.z);
    const lead = lvl.predict * clamp(d / 9, 0, 1.2);
    const tf = { x: Math.sin(tgt.yaw), z: Math.cos(tgt.yaw) };
    const rear = (lvl.rearAim + skill * 2) * clamp(d / 6, 0, 1);
    ax = tgt.x + tgt.vx * lead * 0.5 - tf.x * rear;
    az = tgt.z + tgt.vz * lead * 0.5 - tf.z * rear;
    const e = lvl.aimErr * (1 - skill * 2) * clamp(d / 8, 0.2, 1);
    ax += Math.cos(m.err) * e; az += Math.sin(m.err * 1.3) * e;
  } else if (!wantStar) {
    m.wander += dt * 0.4; ax = Math.cos(m.wander) * 6; az = Math.sin(m.wander * 1.4) * 4;
  }
  let dx = ax - me.x, dz = az - me.z;
  /* wall avoid: push back toward middle when close to the rail */
  const nx = me.x / ARENA.hx, nz = me.z / ARENA.hz;
  if (Math.abs(nx) > 0.78) dx -= Math.sign(nx) * 6 * (Math.abs(nx) - 0.78) * 4;
  if (Math.abs(nz) > 0.74) dz -= Math.sign(nz) * 6 * (Math.abs(nz) - 0.74) * 4;
  if (me.backT > 0 && tgt) {               /* just landed a hit: peel away before the next run */
    dx = me.x - tgt.x - me.x * 0.4; dz = me.z - tgt.z - me.z * 0.4;
  }
  let len = Math.hypot(dx, dz) || 1;
  dx /= len; dz /= len;
  let brake = false;
  if (m.stuck > 1.4) { dx = -me.x; dz = -me.z; len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len; brake = m.stuck < 1.7; if (m.stuck > 2.4) m.stuck = 0; }
  const fx = Math.sin(me.yaw), fz = Math.cos(me.yaw);
  const facing = fx * dx + fz * dz;
  const dist = tgt ? Math.hypot(tgt.x - me.x, tgt.z - me.z) : 99;
  const boost = me.boostCd <= 0 && facing > 0.92 && dist < 9 && dist > 3 && rnd() < (lvl.boost + skill) * dt * 4;
  let horn = false;
  if (m.honkT <= 0) { horn = true; m.honkT = 4 + rnd() * 9; }
  return { x: dx, z: dz, mag: clamp(lvl.speed + skill, 0.5, 1), boost, brake, horn };
}

export const CAPTIONS = [
  'Drive into a rival to score a bump.',
  'Hit a side for 2 points. Hit the back for 3.',
  'A fast hit adds one BIG bonus point.',
  'Grab the gold star to double your bumps for 8 seconds.',
  'BOOST gives a burst of speed. It recharges in 4 seconds.',
  'BRAKE stops you fast and swings your tail round.',
  'HOPE drives by ear. Honk and she comes for you.',
  'NOBLE aims for your back bumper. Keep turning.',
  'Most points when the clock hits zero wins.'
];
