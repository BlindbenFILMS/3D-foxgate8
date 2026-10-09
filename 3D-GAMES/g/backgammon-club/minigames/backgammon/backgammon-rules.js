// 8 GATES — BACKGAMMON CLUB [backgammonClub] · rules + CPU. Pure JS, no imports, no DOM.
// Standard backgammon: 15 checkers each, two dice, doubles play four times, hitting a lone checker sends it to the bar,
// a checker on the bar must come in first, a point with 2+ enemy checkers is closed, bear off once all 15 are home.
// You must use as many dice as you can; if only one die can be used, the larger one when possible.
// A win counts 1 · a GAMMON (loser bore off none) 2 · a BACKGAMMON (…and still has a checker on the bar or in the winner's home) 3.
// (No doubling cube in v1.)
// Colours: 'w' = WHITE, 'b' = RED. Results use chess style: '1-0' White wins, '0-1' Red wins.
// Board: p[0..23], > 0 = that many white checkers, < 0 = red. White moves 23 → 0 (home 0–5, bears off below 0);
// Red moves 0 → 23 (home 18–23, bears off above 23). From each player's own side the points are numbered 1–24 (their home is 1–6).
// A step = { from, to, die, hit }: from = 24 means the bar, to = -1 means borne off.

export const BAR = 24, OFF = -1;
export const COLOR_WORD = { w: 'White', b: 'Red' };
const other = c => c === 'w' ? 'b' : 'w';
export const pointNum = (c, i) => i === BAR ? 'bar' : i === OFF ? 'off' : String(c === 'w' ? i + 1 : 24 - i);
export function startPoints() { const p = Array(24).fill(0); p[23] = 2; p[12] = 5; p[7] = 3; p[5] = 5; p[0] = -2; p[11] = -5; p[16] = -3; p[18] = -5; return p; }

export class Backgammon {
  constructor(o = {}) { if (o.state) o = { ...o.state, ...o }; this.reset(o); }
  reset(o = {}) {
    this.p = o.p ? o.p.slice() : startPoints(); this.bar = o.bar ? { ...o.bar } : { w: 0, b: 0 }; this.off = o.off ? { ...o.off } : { w: 0, b: 0 };
    this.turn = o.turn || 'w'; this.dice = o.dice ? o.dice.slice() : null; this.history = o.history ? o.history.slice() : []; this.opened = !!o.opened; return this;
  }
  toJSON() { return { p: this.p.slice(), bar: { ...this.bar }, off: { ...this.off }, turn: this.turn, dice: this.dice ? this.dice.slice() : null, opened: this.opened }; }
  clone() { const c = new Backgammon({ state: this.toJSON() }); c.history = this.history.slice(); return c; }
  key() { return this.p.join(',') + '|' + this.bar.w + ',' + this.bar.b + '|' + this.off.w + ',' + this.off.b + '|' + this.turn; }
  own(i, c) { return c === 'w' ? this.p[i] > 0 : this.p[i] < 0; }
  count(i) { return Math.abs(this.p[i]); }
  home(c) { if (this.bar[c]) return false; for (let i = 0; i < 24; i++) if (this.own(i, c) && (c === 'w' ? i > 5 : i < 18)) return false; return true; }
  pips(c) { let n = this.bar[c] * 25; for (let i = 0; i < 24; i++) if (this.own(i, c)) n += this.count(i) * (c === 'w' ? i + 1 : 24 - i); return n; }
  // every single step for colour c with one die
  stepsFor(c, die) {
    const p = this.p, out = [], W = c === 'w', open = t => W ? p[t] >= -1 : p[t] <= 1, hit = t => W ? p[t] === -1 : p[t] === 1;
    if (this.bar[c]) { const t = W ? 24 - die : die - 1; if (open(t)) out.push({ from: BAR, to: t, die, hit: hit(t) }); return out; }
    const canOff = this.home(c);
    for (let i = 0; i < 24; i++) { if (!this.own(i, c)) continue; const t = W ? i - die : i + die;
      if (t >= 0 && t <= 23) { if (open(t)) out.push({ from: i, to: t, die, hit: hit(t) }); }
      else if (canOff) { if (t === -1 || t === 24) out.push({ from: i, to: OFF, die, hit: false });
        else { let higher = false; if (W) { for (let j = i + 1; j <= 5; j++) if (p[j] > 0) higher = true; } else { for (let j = 18; j < i; j++) if (p[j] < 0) higher = true; } if (!higher) out.push({ from: i, to: OFF, die, hit: false }); } }
    }
    return out;
  }
  apply(s, c = this.turn) { const W = c === 'w', d = W ? 1 : -1;
    if (s.from === BAR) this.bar[c]--; else this.p[s.from] -= d;
    if (s.to === OFF) this.off[c]++; else { if (s.hit) { this.p[s.to] = 0; this.bar[other(c)]++; } this.p[s.to] += d; } }
  unapply(s, c = this.turn) { const W = c === 'w', d = W ? 1 : -1;
    if (s.to === OFF) this.off[c]--; else { this.p[s.to] -= d; if (s.hit) { this.p[s.to] = -d; this.bar[other(c)]--; } }
    if (s.from === BAR) this.bar[c]++; else this.p[s.from] += d; }
  // all legal plays (lists of steps) for the dice; must use as many dice as possible, the larger one if only one can be used
  plays(dice = this.dice, c = this.turn) {
    if (!dice) return []; const ds = dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [dice[0], dice[1]], all = [], seen = new Set();
    const dfs = (rest, seq) => { let any = false; const tried = new Set();
      for (let k = 0; k < rest.length; k++) { const die = rest[k]; if (tried.has(die)) continue; tried.add(die);
        for (const s of this.stepsFor(c, die)) { any = true; this.apply(s, c); dfs(rest.slice(0, k).concat(rest.slice(k + 1)), seq.concat(s)); this.unapply(s, c); } }
      if (!any) { const code = seq.map(s => s.from + '>' + s.to + ':' + s.die).join(','); if (!seen.has(code)) { seen.add(code); all.push(seq); } } };
    dfs(ds, []);
    const max = Math.max(0, ...all.map(s => s.length)); let out = all.filter(s => s.length === max);
    if (max === 1 && dice[0] !== dice[1]) { const big = Math.max(dice[0], dice[1]); if (out.some(s => s[0].die === big)) out = out.filter(s => s[0].die === big); }
    return max ? out : [];
  }
  // plays reduced to one per distinct result (for the CPU)
  uniquePlays(dice = this.dice, c = this.turn) { const m = new Map(); for (const pl of this.plays(dice, c)) { pl.forEach(s => this.apply(s, c)); const k = this.key(); pl.slice().reverse().forEach(s => this.unapply(s, c)); if (!m.has(k)) m.set(k, pl); } return [...m.values()]; }
  text(c, dice, steps) { const d = dice ? (dice[0] >= dice[1] ? dice[0] + '' + dice[1] : dice[1] + '' + dice[0]) : ''; return d + ': ' + (steps.length ? steps.map(s => pointNum(c, s.from) + '/' + pointNum(c, s.to) + (s.hit ? '*' : '')).join(' ') : 'no move'); }
  code(dice, steps) { return dice[0] + ',' + dice[1] + ':' + steps.map(s => s.from + '>' + s.to).join(','); }
  // play a whole turn: steps (from plays()) or a code "a,b:from>to,…". Returns the record or null if illegal.
  playTurn(req) {
    let dice = this.dice, want = null;
    if (typeof req === 'string') { const [d, m] = req.split(':'); dice = d.split(',').map(Number); want = m ? m.split(',').filter(Boolean).map(x => x.split('>').map(Number)) : []; }
    else want = req.map(s => [s.from, s.to]);
    if (!dice) return null; const L = this.plays(dice);
    let pl = L.find(seq => seq.length === want.length && seq.every((s, i) => s.from === want[i][0] && s.to === want[i][1]));
    if (!pl && L.length === 0 && want.length === 0) pl = [];
    if (!pl) return null;
    const c = this.turn; pl.forEach(s => this.apply(s, c));
    const rec = { color: c, dice: dice.slice(), steps: pl.map(s => ({ ...s })), text: this.text(c, dice, pl), code: this.code(dice, pl) };
    this.history.push(rec); this.turn = other(c); this.dice = null; this.opened = true; return rec;
  }
  undo() { const h = this.history.pop(); if (!h) return null; this.turn = h.color; h.steps.slice().reverse().forEach(s => this.unapply(s, h.color)); this.dice = h.dice.slice(); return h; }
  // opening roll: each side rolls one die, the higher starts and plays both numbers (ties roll again)
  opening(rng = Math.random) { let a, b; do { a = 1 + Math.floor(rng() * 6); b = 1 + Math.floor(rng() * 6); } while (a === b); this.turn = a > b ? 'w' : 'b'; this.dice = [Math.max(a, b), Math.min(a, b)]; return { w: a, b, first: this.turn }; }
  roll(rng = Math.random) { this.dice = [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)]; return this.dice; }
  status() {
    for (const c of ['w', 'b']) if (this.off[c] === 15) { const l = other(c); let pts = 1, kind = 'single';
      if (this.off[l] === 0) { pts = 2; kind = 'gammon'; let back = this.bar[l] > 0; for (let i = 0; i < 24; i++) if (this.own(i, l) && (c === 'w' ? i <= 5 : i >= 18)) back = true; if (back) { pts = 3; kind = 'backgammon'; } }
      return { over: true, winner: c, result: c === 'w' ? '1-0' : '0-1', points: pts, kind, reason: kind === 'single' ? 'all checkers borne off' : kind === 'gammon' ? 'gammon: the loser bore off none' : 'backgammon: the loser was still in the winner\'s home' }; }
    return { over: false, winner: null, result: '*', points: 0, kind: '', reason: '' };
  }
  contact() { let wBack = -1, bBack = 24; if (this.bar.w) wBack = 24; if (this.bar.b) bBack = -1; for (let i = 0; i < 24; i++) { if (this.p[i] > 0) wBack = Math.max(wBack, i); if (this.p[i] < 0) bBack = Math.min(bBack, i); } return wBack > bBack; }
}

// ---------- CPU ----------
// shots: how many of the 36 rolls let colour `by` hit a blot on point t (direct + simple combined shots, ignoring blocks in between)
const SHOT = (() => { const n = Array(25).fill(0); for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) { const hits = new Set(a === b ? [a, 2 * a, 3 * a, 4 * a] : [a, b, a + b]); for (const d of hits) if (d <= 24) n[d]++; } return n; })();
function evaluate(g, me) {
  const op = other(me), W = me === 'w', p = g.p; if (g.off[me] === 15) return 1000; if (g.off[op] === 15) return -1000;
  let s = (g.pips(op) - g.pips(me)) * 1.0 + (g.off[me] - g.off[op]) * 2.5 - g.bar[me] * 9 + g.bar[op] * 9;
  if (!g.contact()) return s * 1.6;
  const mine = i => W ? p[i] > 0 : p[i] < 0, theirs = i => W ? p[i] < 0 : p[i] > 0, n = i => Math.abs(p[i]), myPt = i => W ? i + 1 : 24 - i;
  let run = 0, best = 0;
  for (let k = 1; k <= 24; k++) { const i = W ? k - 1 : 24 - k;
    if (mine(i) && n(i) >= 2) { s += 3.5 + (k <= 6 ? 3.5 : 0) + (k === 5 || k === 7 ? 2 : 0) + (k >= 19 ? 1.5 : 0); run++; best = Math.max(best, run); } else run = 0;
    if (mine(i) && n(i) === 1) { // a blot: how exposed is it?
      let shots = 0;
      for (let j = 0; j < 24; j++) if (theirs(j)) { const d = W ? i - j : j - i; if (d >= 1 && d <= 24) shots = Math.max(shots, SHOT[d]); }   // they move toward lower (white) or higher (red) indices
      const barShots = g.bar[op] ? SHOT[W ? 24 - i : i + 1] || 0 : 0; shots = Math.max(shots, barShots);
      s -= (shots / 36) * (6 + (25 - myPt(i)) * 0.45); }
  }
  s += best * best * 1.1;
  return s;
}
export const LEVELS = [{ id: 'rookie', name: 'ROOKIE', noise: 0.5, blunder: 0.2 }, { id: 'club', name: 'CLUB', noise: 0, blunder: 0.02 }, { id: 'master', name: 'MASTER', look: 6 }];
function after(g, pl, c) { pl.forEach(s => g.apply(s, c)); const v = evaluate(g, c); pl.slice().reverse().forEach(s => g.unapply(s, c)); return v; }
export function think(game, level = 1) {
  const g = game instanceof Backgammon ? game.clone() : new Backgammon({ state: game }); const c = g.turn, L = g.uniquePlays(g.dice, c);
  if (!L.length) return []; if (L.length === 1) return L[0];
  const L0 = LEVELS[level === 'hint' ? 2 : level] || LEVELS[1];
  if (L0.blunder && Math.random() < L0.blunder) return L[Math.floor(Math.random() * L.length)];
  const scored = L.map(pl => [pl, after(g, pl, c)]).sort((a, b) => b[1] - a[1]);
  if (L0.noise) { const top = scored[0][1], pool = scored.filter(([, v]) => v >= top - 8); return pool[Math.floor(Math.random() * Math.min(pool.length, 4))][0]; }
  if (!L0.look) return scored[0][0];
  // MASTER: look one roll ahead — the opponent's best reply to each of the 21 rolls, weighted by chance
  const t0 = Date.now(); let best = scored[0][0], bestV = -Infinity;
  for (const [pl] of scored.slice(0, L0.look)) { pl.forEach(s => g.apply(s, c)); let ev = 0;
    for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) { const w = a === b ? 1 : 2, R = g.uniquePlays([a, b], other(c)); let worst = Infinity;
      if (!R.length) worst = evaluate(g, c); else for (const r of R) { r.forEach(s => g.apply(s, other(c))); const v = evaluate(g, c); r.slice().reverse().forEach(s => g.unapply(s, other(c))); if (v < worst) worst = v; }
      ev += w * worst; }
    pl.slice().reverse().forEach(s => g.unapply(s, c)); ev /= 36; if (ev > bestV) { bestV = ev; best = pl; } if (Date.now() - t0 > 2500) break; }
  return best;
}

// ---------- Worker mode ----------
if (typeof WorkerGlobalScope !== 'undefined' && typeof self !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.onmessage = e => { const { id, state, level } = e.data || {}; let m = null; try { const r = think(new Backgammon({ state }), level); m = r ? r.map(s => [s.from, s.to]) : null; } catch (er) {} self.postMessage({ id, m }); };
}
