/* PLAYGROUND: pure rules + AI. No three.js in this file. */

export const EVENTS = [
  { key: 'swings', name: 'SWINGS', verb: 'PUMP',
    hint: 'Tap when the marker hits yellow, at the back of the swing.',
    goal: 'Highest swing in 15 seconds wins.' },
  { key: 'bars', name: 'MONKEY BARS', verb: 'GRAB',
    hint: 'Tap in the yellow as you swing forward to grab the next bar.',
    goal: 'Fastest across the bars wins.' },
  { key: 'spin', name: 'MERRY-GO-ROUND', verb: 'PULL',
    hint: 'Tap to pull in when the marker reaches yellow. Pull too early and you slip.',
    goal: 'Last fox holding on wins.' },
  { key: 'sand', name: 'SANDBOX', verb: 'PACK',
    hint: 'Tap in the yellow to pack each bucket. Sloppy layers make the castle wobble.',
    goal: 'Best sandcastle wins.' },
];

export const RANK_POINTS = [5, 3, 2, 1];

export const CAST = {
  you:   { id: 'you',   name: 'YOU',   torso: ['#e8692c', '#fff1df', '#2b2d42'], outfit: 'tee' },
  pip:   { id: 'pip',   name: 'PIP',   torso: ['#ffd23a', '#fff6d6', '#c99400'], outfit: 'tee',  title: 'ROOKIE' },
  hope:  { id: 'hope',  name: 'HOPE',  torso: ['#d9773a', '#f6ecdc', '#2f5fd0'], outfit: 'vest', title: 'CLUB', glasses: true, cane: true },
  noble: { id: 'noble', name: 'NOBLE', torso: ['#4b3a78', '#e6dcf5', '#22202a'], outfit: 'coat', title: 'MASTER', redEyes: true, chair: true },
};

export const LOCAL = [
  { id: 'p1', name: 'FOX 1', torso: ['#e8692c', '#fff1df', '#2b2d42'], outfit: 'tee' },
  { id: 'p2', name: 'FOX 2', torso: ['#2bb3a3', '#effaf8', '#1d4f4a'], outfit: 'vest' },
  { id: 'p3', name: 'FOX 3', torso: ['#b04fd0', '#f7ecfb', '#3a2147'], outfit: 'dress' },
  { id: 'p4', name: 'FOX 4', torso: ['#5aa83c', '#f0f8e8', '#25401b'], outfit: 'coat' },
];

export const LEVELS = [
  { name: 'EASY',   rival: 'pip',   top: 0.45, rest: 0.3 },
  { name: 'MEDIUM', rival: 'hope',  top: 0.72, rest: 0.5 },
  { name: 'HARD',   rival: 'noble', top: 0.94, rest: 0.72 },
];

/* who plays: [{ name, human, skill, look }] */
export function roster(mode, level, n) {
  n = Math.max(2, Math.min(4, n | 0 || 4));
  const L = LEVELS[level] || LEVELS[1];
  if (mode === 'local') return LOCAL.slice(0, n).map(c => ({ name: c.name, human: true, skill: 0, look: c }));
  if (mode === 'demo') return [
    { name: 'PIP', human: false, skill: 0.55, look: CAST.pip },
    { name: 'HOPE', human: false, skill: 0.8, look: CAST.hope },
  ];
  const others = ['pip', 'hope', 'noble'].filter(k => k !== L.rival);
  const list = [{ name: 'YOU', human: true, skill: 0, look: CAST.you },
    { name: CAST[L.rival].name, human: false, skill: L.top, look: CAST[L.rival] }];
  for (const k of others) if (list.length < n) list.push({ name: CAST[k].name, human: false, skill: L.rest, look: CAST[k] });
  return list;
}

const TAU = Math.PI * 2;
export const wrap = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

/* ---------- tuning ---------- */
export const SW = { dur: 15, period: 2.3, win: 0.5, gain: 11, miss: 5, damp: 0.03, max: 82, a0: 12 };
export const BR = { n: 8, period: 1.25, win: 0.6, amp: 24, move: 0.32, slip: 0.6, max: 30 };
export const SP = { max: 30, w0: 1.1, acc: 0.09, k: 0.14, imp: 0.55, lo: 0.68, hi: 0.95 };
export const SD = { layers: 6, target: 0.8, band: 0.09, tol: 0.32, per: 1.8, perK: 0.9, max: 32, drop: 0.45 };
const BACK = 1.5 * Math.PI, FWD = 0.5 * Math.PI;

const IMPL = {
  swings: {
    init: () => ({ A: SW.a0, phi: 0, peak: SW.a0, lastWin: -99, ang: 0 }),
    update(r, dt, fx, i) {
      r.phi += TAU / SW.period * dt;
      r.A = Math.max(4, r.A * Math.exp(-SW.damp * dt));
      r.ang = r.A * Math.sin(r.phi);
      if (r.t >= SW.dur) { r.done = true; fx.push({ i, type: 'finish' }); }
    },
    tap(r, fx, i) {
      const d = wrap(r.phi - BACK), id = Math.round((r.phi - BACK) / TAU);
      if (Math.abs(d) < SW.win && id !== r.lastWin) {
        const q = 1 - Math.abs(d) / SW.win;
        r.lastWin = id; r.A = Math.min(SW.max, r.A + SW.gain * (0.35 + 0.65 * q));
        r.peak = Math.max(r.peak, r.A); fx.push({ i, type: 'good', q });
      } else { r.A = Math.max(4, r.A - SW.miss); fx.push({ i, type: 'bad' }); }
    },
    meter: r => ({ v: 1 - Math.abs(wrap(r.phi - BACK)) / Math.PI, lo: 1 - SW.win / Math.PI, hi: 1 }),
    rank: r => r.peak,
    text: r => Math.round(r.peak) + '°',
    clock: r => Math.max(0, SW.dur - r.t).toFixed(1),
  },
  bars: {
    init: () => ({ rung: 0, phi: -0.5 * Math.PI, st: 'swing', sx: 0, theta: 0, fin: 0, lead: 0, slips: 0 }),
    update(r, dt, fx, i) {
      if (r.st === 'swing') { r.phi += TAU / BR.period * dt; r.theta = BR.amp * Math.sin(r.phi); }
      else if (r.st === 'move') {
        r.sx += dt / BR.move; r.theta *= Math.exp(-6 * dt);
        if (r.sx >= 1) {
          r.rung++; r.sx = 0; r.lead ^= 1;
          if (r.rung >= BR.n - 1) { r.st = 'done'; r.done = true; r.fin = r.t; fx.push({ i, type: 'finish' }); }
          else { r.st = 'swing'; r.phi = -0.5 * Math.PI + 0.35; }
        }
      } else if (r.st === 'slip') {
        r.sx += dt / BR.slip; r.phi += TAU / BR.period * dt * 0.5; r.theta = BR.amp * 0.5 * Math.sin(r.phi);
        if (r.sx >= 1) { r.sx = 0; r.st = 'swing'; r.phi = -0.5 * Math.PI; }
      }
      if (!r.done && r.t >= BR.max) { r.done = true; r.st = 'done'; r.fin = 0; fx.push({ i, type: 'timeout' }); }
    },
    tap(r, fx, i) {
      if (r.st !== 'swing') return;
      const d = Math.abs(wrap(r.phi - FWD));
      if (d < BR.win) { r.st = 'move'; r.sx = 0; fx.push({ i, type: 'good', q: 1 - d / BR.win }); }
      else { r.st = 'slip'; r.sx = 0; r.slips++; fx.push({ i, type: 'bad' }); }
    },
    meter: r => r.st === 'swing'
      ? { v: 1 - Math.abs(wrap(r.phi - FWD)) / Math.PI, lo: 1 - BR.win / Math.PI, hi: 1 }
      : { v: 0, lo: 1 - BR.win / Math.PI, hi: 1, idle: true },
    rank: r => r.fin > 0 ? 1000 - r.fin : r.rung,
    text: r => r.fin > 0 ? r.fin.toFixed(1) + 's' : r.rung + '/' + (BR.n - 1),
    clock: r => r.t.toFixed(1),
  },
  spin: {
    init: rand => ({ b: 0, out: false, wob: rand() * TAU, held: 0, w: SP.w0, outDir: 0 }),
    update(r, dt, fx, i) {
      r.w = SP.w0 + SP.acc * r.t;
      const drift = SP.k * r.w * r.w * (1 + 0.35 * Math.sin(r.t * 1.9 + r.wob));
      r.b += drift * dt; r.held = r.t;
      if (r.b > 1) { r.out = true; r.outDir = 1; r.done = true; fx.push({ i, type: 'out', dir: 1 }); }
      else if (r.t >= SP.max) { r.done = true; r.held = SP.max; fx.push({ i, type: 'finish' }); }
    },
    tap(r, fx, i) {
      const before = r.b; r.b -= SP.imp;
      if (r.b < -1) { r.out = true; r.outDir = -1; r.done = true; fx.push({ i, type: 'out', dir: -1 }); }
      else { const ok = before >= 0.36; fx.push({ i, type: ok ? 'good' : 'bad', q: ok ? 1 : 0 }); }
    },
    meter: r => ({ v: Math.max(0, Math.min(1, (r.b + 1) / 2)), lo: SP.lo, hi: SP.hi }),
    rank: r => r.held + (r.out ? 0 : 0.001),
    text: r => r.held >= SP.max ? 'HELD ON' : r.held.toFixed(1) + 's',
    clock: r => r.t.toFixed(1),
  },
  sand: {
    init: () => ({ ph: 0, m: 0, layer: 0, pts: 0, wob: 0, st: 'aim', sx: 0, per: SD.per, qs: [], crumbled: false }),
    update(r, dt, fx, i) {
      if (r.st === 'aim') { r.ph += dt / r.per; const f = r.ph % 1; r.m = f < 0.5 ? f * 2 : 2 - f * 2; }
      else if (r.st === 'drop') {
        r.sx += dt / SD.drop;
        if (r.sx >= 1) {
          r.sx = 0;
          if (r.wob >= 1) { r.st = 'crumble'; r.crumbled = true; r.pts = Math.round(r.pts * 0.5); fx.push({ i, type: 'crumble' }); }
          else if (r.layer >= SD.layers) { r.st = 'done'; r.done = true; fx.push({ i, type: 'finish', castle: true }); }
          else { r.st = 'aim'; r.ph = 0; r.per *= SD.perK; }
        }
      } else if (r.st === 'crumble') {
        r.sx += dt / 1.2;
        if (r.sx >= 1) { r.st = 'done'; r.done = true; fx.push({ i, type: 'finish' }); }
      }
      if (!r.done && r.t >= SD.max && r.st === 'aim') { r.done = true; r.st = 'done'; fx.push({ i, type: 'timeout' }); }
    },
    tap(r, fx, i) {
      if (r.st !== 'aim') return;
      const d = Math.abs(r.m - SD.target);
      const q = d <= SD.band ? 1 - 0.25 * d / SD.band : Math.max(0, 0.75 * (1 - (d - SD.band) / SD.tol));
      r.qs.push(q); r.layer++; r.pts += Math.round(q * 100); r.wob += (1 - q) * 0.5;
      r.st = 'drop'; r.sx = 0;
      fx.push({ i, type: q >= 0.7 ? 'good' : 'bad', q, layer: r.layer });
    },
    meter: r => ({ v: r.m, lo: SD.target - SD.band, hi: SD.target + SD.band, idle: r.st !== 'aim' }),
    rank: r => r.pts,
    text: r => r.pts + ' PTS',
    clock: r => r.layer + '/' + SD.layers,
  },
};

/* One event for n runners. start(i) begins a runner (all at once in VS CPU, one by one in PASS & PLAY). */
export function makeEvent(key, n, rand = Math.random) {
  const impl = IMPL[key];
  const runners = [];
  for (let i = 0; i < n; i++) runners.push({ active: false, done: false, started: false, t: 0, sweet: false });
  const ev = {
    key, n, runners,
    start(i) {
      const r = runners[i];
      Object.assign(r, impl.init(rand), { active: true, done: false, started: true, t: 0, sweet: false });
    },
    update(dt) {
      const fx = [];
      runners.forEach((r, i) => {
        if (!r.active || r.done) return;
        r.t += dt; impl.update(r, dt, fx, i);
        if (r.done) { r.sweet = false; return; }
        const m = impl.meter(r);
        const s = !m.idle && m.v >= m.lo && m.v <= m.hi;
        if (s && !r.sweet) fx.push({ i, type: 'cue' });
        r.sweet = s;
      });
      return fx;
    },
    tap(i) {
      const r = runners[i]; const fx = [];
      if (!r || !r.active || r.done) return fx;
      impl.tap(r, fx, i); return fx;
    },
    meter(i) { const r = runners[i]; return r && r.active && !r.done ? impl.meter(r) : null; },
    rankValue(i) { const r = runners[i]; return r.started ? impl.rank(r) : -1; },
    scoreText(i) { const r = runners[i]; return r.started ? impl.text(r) : ''; },
    clock(i) { const r = runners[i]; return r && r.started ? impl.clock(r) : ''; },
    allDone(list) { return list.every(i => runners[i].done); },
  };
  return ev;
}

/* Places + points for one event (higher value is better; ties share). */
export function rankEvent(values) {
  const idx = values.map((v, i) => i).sort((a, b) => values[b] - values[a]);
  const place = new Array(values.length), pts = new Array(values.length);
  idx.forEach((i, k) => {
    const prev = idx[k - 1];
    place[i] = k > 0 && Math.abs(values[prev] - values[i]) < 1e-6 ? place[prev] : k + 1;
  });
  values.forEach((v, i) => { pts[i] = RANK_POINTS[place[i] - 1] || 0; });
  return { place, pts };
}

/* Overall standings: places from points. */
export function standings(pts) { return rankEvent(pts).place; }

/* ---------- AI ---------- */
export function makeAI(skill, rand = Math.random) {
  const s = Math.max(0, Math.min(1, skill));
  const gauss = () => { let u = 0; while (!u) u = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rand()); };
  let plan = null;
  return {
    reset() { plan = null; },
    /* returns true when the AI taps this frame */
    step(ev, i, dt) {
      const r = ev.runners[i];
      if (!r.active || r.done) return false;
      if (ev.key === 'swings') {
        const id = Math.round((r.phi - BACK) / TAU);
        if (!plan || plan.id !== id) plan = { id, off: Math.max(-1.1, Math.min(1.1, gauss() * (0.06 + (1 - s) * 0.55))), skip: rand() < (1 - s) * 0.3, done: false };
        const d = wrap(r.phi - BACK);
        if (!plan.done && !plan.skip && d >= plan.off && d < plan.off + 0.35) { plan.done = true; return true; }
        return false;
      }
      if (ev.key === 'bars') {
        if (r.st !== 'swing') return false;
        const id = Math.round((r.phi - FWD) / TAU), key = r.rung * 1000 + r.slips * 10 + id;
        if (!plan || plan.key !== key) plan = { key, off: Math.max(-1.3, Math.min(1.3, gauss() * (0.05 + (1 - s) * 0.7))), done: false };
        const d = wrap(r.phi - FWD);
        if (!plan.done && d >= plan.off && d < plan.off + 0.35) { plan.done = true; return true; }
        return false;
      }
      if (ev.key === 'spin') {
        if (plan && plan.dbl > 0) { plan.dbl -= dt; if (plan.dbl <= 0) { plan = null; return true; } return false; }
        if (!plan) plan = { th: Math.min(1.25, 0.62 + gauss() * (0.03 + (1 - s) * 0.22)), delay: 0.08 + (1 - s) * 0.3, wait: -1, dbl: 0 };
        if (r.b >= plan.th) {
          if (plan.wait < 0) plan.wait = plan.delay;
          plan.wait -= dt;
          if (plan.wait <= 0) {
            if (rand() < (1 - s) * 0.05) plan = { dbl: 0.12 }; else plan = null;
            return true;
          }
        }
        return false;
      }
      if (ev.key === 'sand') {
        if (r.st !== 'aim') { plan = null; return false; }
        if (!plan || plan.layer !== r.layer) plan = { layer: r.layer, tgt: SD.target + gauss() * (0.012 + (1 - s) * 0.14), minPh: rand() * 0.9, prev: r.m };
        const hit = (plan.prev < plan.tgt && r.m >= plan.tgt) || (plan.prev > plan.tgt && r.m <= plan.tgt);
        plan.prev = r.m;
        if (hit && r.ph >= plan.minPh) { plan.layer = -1; return true; }
        return false;
      }
      return false;
    },
  };
}

/* Short lines, 20 words or fewer. */
export const LINES = {
  swings: { pip: 'Swings first! Pump at the back. I bet I go higher!', hope: 'Listen for the tick, then pump. Feel the swing.', noble: 'Swings. Timing is everything. Try to keep up.' },
  bars:   { pip: 'Monkey bars! Grab when you swing forward. Go go go!', hope: 'Swing forward, then reach. Do not rush the grab.', noble: 'My chair waits below. My hands do not miss.' },
  spin:   { pip: 'Merry-go-round! Hold on tight, it gets faster!', hope: 'Feel the pull outward. Tug back in, right on time.', noble: 'Faster and faster. Only the patient stay on.' },
  sand:   { pip: 'Sandcastles! Pack each bucket on the yellow.', hope: 'Six buckets high. Steady hands build tall castles.', noble: 'A master builds one perfect tower. Watch.' },
};
export const TEACH = {
  swings: ['The marker moves with the swing. Yellow means you are at the back.', 'One pump per swing. A second tap slows you down.', 'Each good pump adds height. Biggest swing wins.'],
  bars:   ['Each swing forward opens the yellow. Tap to reach the next bar.', 'Miss the timing and you slip. That costs time.', 'Seven grabs reach the end. Fastest fox wins.'],
  spin:   ['The ride pulls you outward. The marker shows it.', 'Tap in the yellow to pull back in.', 'Tap too early and you lose your grip. Last fox on wins.'],
  sand:   ['The marker sweeps up and down. Tap in the yellow.', 'Sloppy buckets make the castle wobble. Too much wobble and it crumbles.', 'Six good buckets earn a flag on top.'],
};

export const RULES_TEXT = [
  'Four events, up to four foxes. Win an event for 5 points, then 3, 2 and 1.',
  ...EVENTS.map(e => e.name + ': ' + e.hint + ' ' + e.goal),
  'Controls: tap the screen, the big button, or press Space.',
];
