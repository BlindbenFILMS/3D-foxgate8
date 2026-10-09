// 8 GATES — GO CLUB [goClub] · rules + CPU. Pure JS, no imports, no DOM.
// Japanese rules: 9×9, 13×13 or 19×19; Black plays first; komi 6.5 to White; stones with no liberties are captured;
// suicide is not allowed; simple ko (you may not retake a single stone right away). Two passes in a row end the game:
// dead stones are marked (the CPU suggests which), then territory + prisoners (+ komi) decides it.
// Colours: 'b' = BLACK, 'w' = WHITE. Results use chess style: '1-0' White wins, '0-1' Black wins.
// Points: index i = r * N + c, r = 0 is the top row from Black's side. Coordinates "D4" style (columns A–T without I, rows from the bottom).

export const COLS = 'ABCDEFGHJKLMNOPQRST';
export const COLOR_WORD = { b: 'Black', w: 'White' };
const other = c => c === 'b' ? 'w' : 'b';
export const KOMI = 6.5;
export function coord(N, i) { if (i < 0) return 'pass'; return COLS[i % N] + (N - Math.floor(i / N)); }
export function parseCoord(N, s) { if (!s || s === 'pass') return -1; const c = COLS.indexOf(s[0].toUpperCase()), r = N - parseInt(s.slice(1), 10); return r * N + c; }
export function hoshi(N) { const e = N >= 13 ? 3 : 2, m = (N - 1) / 2, f = N - 1 - e, pts = [[e, e], [e, f], [f, e], [f, f]]; if (N % 2) pts.push([m, m]); if (N >= 19) pts.push([e, m], [m, e], [f, m], [m, f]); return pts.map(([r, c]) => r * N + c); }

// ---------------- fast board (padded, chains as linked lists, pseudo-liberties) ----------------
const EMPTY = 0, BLACK = 1, WHITE = 2, EDGE = 3;
const C2N = { b: BLACK, w: WHITE }, N2C = ['', 'b', 'w'];
export class FastBoard {
  constructor(N) { this.N = N; this.W = N + 2; const L = this.W * this.W; this.L = L;
    this.col = new Uint8Array(L); this.head = new Int32Array(L); this.next = new Int32Array(L); this.size = new Int32Array(L); this.plib = new Int32Array(L); this.mark = new Int32Array(L); this.stamp = 1;
    for (let i = 0; i < L; i++) { const x = i % this.W, y = (i / this.W) | 0; if (x === 0 || y === 0 || x === this.W - 1 || y === this.W - 1) this.col[i] = EDGE; }
    this.D = [1, -1, this.W, -this.W]; this.DG = [this.W + 1, this.W - 1, -this.W + 1, -this.W - 1]; this.ko = -1; this.caps = [0, 0, 0]; this.lastMove = -1; this.passes = 0;
    this.empties = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) this.empties.push((r + 1) * this.W + c + 1); }
  p2i(p) { const r = (p / this.W | 0) - 1, c = p % this.W - 1; return r * this.N + c; }
  i2p(i) { return ((i / this.N | 0) + 1) * this.W + (i % this.N) + 1; }
  copyFrom(b) { this.col.set(b.col); this.head.set(b.head); this.next.set(b.next); this.size.set(b.size); this.plib.set(b.plib); this.ko = b.ko; this.caps = b.caps.slice(); this.lastMove = b.lastMove; this.passes = b.passes; return this; }
  clone() { return new FastBoard(this.N).copyFrom(this); }
  libsOf(h, max = 99) { // exact liberties of the chain with head h (stops counting at max)
    const st = ++this.stamp; let n = 0, s = h; const col = this.col, mark = this.mark, D = this.D;
    do { for (let k = 0; k < 4; k++) { const q = s + D[k]; if (col[q] === EMPTY && mark[q] !== st) { mark[q] = st; if (++n >= max) return n; } } s = this.next[s]; } while (s !== h);
    return n; }
  libOf(h) { // one liberty of the chain (for atari moves)
    let s = h; const col = this.col, D = this.D; do { for (let k = 0; k < 4; k++) { const q = s + D[k]; if (col[q] === EMPTY) return q; } s = this.next[s]; } while (s !== h); return -1; }
  legal(p, c) {
    if (this.col[p] !== EMPTY || p === this.ko) return false; const D = this.D, col = this.col, o = 3 - c;
    for (let k = 0; k < 4; k++) if (col[p + D[k]] === EMPTY) return true;
    for (let k = 0; k < 4; k++) { const q = p + D[k], qc = col[q]; if (qc === c) { if (this.libsOf(this.head[q], 2) > 1) return true; } else if (qc === o) { if (this.libsOf(this.head[q], 2) === 1) return true; } }
    return false; }
  play(p, c) { // assumes legal; returns number of stones captured
    if (p < 0) { this.ko = -1; this.passes++; this.lastMove = -1; return 0; }
    const D = this.D, col = this.col, head = this.head, next = this.next, size = this.size, plib = this.plib, o = 3 - c; this.passes = 0;
    col[p] = c; head[p] = p; next[p] = p; size[p] = 1; plib[p] = 0;
    for (let k = 0; k < 4; k++) { const q = p + D[k], qc = col[q]; if (qc === EMPTY) plib[p]++; else if (qc === BLACK || qc === WHITE) plib[head[q]]--; }
    for (let k = 0; k < 4; k++) { const q = p + D[k]; if (col[q] !== c) continue; const hq = head[q], hp = head[p]; if (hq === hp) continue;
      // merge the smaller chain into the larger
      let big = hq, small = hp; if (size[hp] > size[hq]) { big = hp; small = hq; }
      let s = small; do { head[s] = big; s = next[s]; } while (s !== small);
      const t = next[big]; next[big] = next[small]; next[small] = t; size[big] += size[small]; plib[big] += plib[small]; }
    let capt = 0, capPt = -1;
    for (let k = 0; k < 4; k++) { const q = p + D[k]; if (col[q] !== o) continue; const h = head[q]; if (plib[h] !== 0) continue;
      let s = h; const n0 = size[h]; capt += n0; capPt = s;
      do { const nx = next[s]; col[s] = EMPTY; for (let j = 0; j < 4; j++) { const r = s + D[j]; if (col[r] === BLACK || col[r] === WHITE) plib[head[r]]++; } s = nx; } while (s !== h); }
    this.caps[c] += capt;
    this.ko = (capt === 1 && size[head[p]] === 1 && this.libsOf(head[p], 2) === 1) ? capPt : -1;
    this.lastMove = p; return capt; }
  isEyeish(p, c) { // empty point surrounded by c (a real-ish eye for playouts)
    const col = this.col, D = this.D, DG = this.DG; for (let k = 0; k < 4; k++) { const q = col[p + D[k]]; if (q !== c && q !== EDGE) return false; }
    let bad = 0, edge = 0; for (let k = 0; k < 4; k++) { const q = col[p + DG[k]]; if (q === EDGE) edge = 1; else if (q === 3 - c) bad++; }
    return edge ? bad === 0 : bad < 2; }
  // area score from Black's view (stones + single-colour-bordered empties), used by playouts and the AI
  areaScore(komi) { let s = 0; const col = this.col, D = this.D; for (const p of this.empties) { const v = col[p]; if (v === BLACK) s++; else if (v === WHITE) s--; else { let b = 0, w = 0; for (let k = 0; k < 4; k++) { const q = col[p + D[k]]; if (q === BLACK) b = 1; else if (q === WHITE) w = 1; } if (b && !w) s++; else if (w && !b) s--; } } return s - komi; }
}

// ---------------- the game (history, undo, notation, scoring) ----------------
export class Go {
  constructor(o = {}) { if (o.state) o = { ...o.state, ...o }; this.N = o.N || 9; this.komi = o.komi ?? KOMI; this.reset(o); }
  reset(o = {}) { this.fb = new FastBoard(this.N); this.turn = 'b'; this.history = []; this.phase = 'play'; this.dead = new Set(); this.reps = new Set([this.key()]);
    if (o.moves) for (const m of o.moves) if (!this.play(m)) break; if (o.dead) this.dead = new Set(o.dead); return this; }
  toJSON() { return { N: this.N, komi: this.komi, moves: this.history.map(h => h.text), dead: [...this.dead] }; }
  key() { let s = ''; const fb = this.fb; for (const p of fb.empties) s += fb.col[p]; return s; }
  at(i) { const v = this.fb.col[this.fb.i2p(i)]; return v === BLACK ? 'b' : v === WHITE ? 'w' : ''; }
  get board() { const out = []; for (let i = 0; i < this.N * this.N; i++) out.push(this.at(i)); return out; }
  get caps() { return { b: this.fb.caps[BLACK], w: this.fb.caps[WHITE] }; }
  get ko() { return this.fb.ko < 0 ? -1 : this.fb.p2i(this.fb.ko); }
  isLegal(i, c = this.turn) { if (this.phase !== 'play') return false; if (i < 0) return true; return this.fb.legal(this.fb.i2p(i), C2N[c]); }
  whyIllegal(i, c = this.turn) { const p = this.fb.i2p(i); if (this.fb.col[p] !== EMPTY) return 'occupied'; if (p === this.fb.ko) return 'ko'; return 'suicide'; }
  legalMoves(c = this.turn) { const L = []; for (let i = 0; i < this.N * this.N; i++) if (this.isLegal(i, c)) L.push(i); return L; }
  // play: an index, -1 / 'pass', or a coordinate string. Returns the record or null.
  play(m) {
    if (this.phase !== 'play') return null; let i = typeof m === 'string' ? parseCoord(this.N, m) : m; const c = this.turn;
    if (i >= 0 && !this.isLegal(i, c)) return null;
    const before = { snap: this.fb.clone(), dead: null };
    const capBefore = this.fb.caps.slice(); this.fb.play(i < 0 ? -1 : this.fb.i2p(i), C2N[c]);
    const captured = []; if (i >= 0) { for (const p of before.snap.empties) if (before.snap.col[p] === C2N[other(c)] && this.fb.col[p] === EMPTY) captured.push(this.fb.p2i(p)); }
    const rec = { color: c, i, text: coord(this.N, i), caps: captured, before: before.snap };
    this.history.push(rec); this.turn = other(c); this.reps.add(this.key());
    if (this.fb.passes >= 2) { this.phase = 'scoring'; this.dead = this.estimateDead(); }
    return rec; }
  undo() { const h = this.history.pop(); if (!h) return null; this.fb.copyFrom(h.before); this.turn = h.color; this.phase = 'play'; this.dead = new Set(); return h; }
  resume() { if (this.phase !== 'scoring') return; this.phase = 'play'; this.dead = new Set(); this.fb.passes = 0; }   // dispute: keep playing
  groupOf(i) { const fb = this.fb, p = fb.i2p(i), c = fb.col[p]; if (c !== BLACK && c !== WHITE) return []; const h = fb.head[p], out = []; let s = h; do { out.push(fb.p2i(s)); s = fb.next[s]; } while (s !== h); return out; }
  toggleDead(i) { const g = this.groupOf(i); if (!g.length) return; const on = !this.dead.has(g[0]); for (const x of g) on ? this.dead.add(x) : this.dead.delete(x); }
  // ownership by random playouts: +1 black … −1 white per point
  ownership(n = 160) {
    const N = this.N, own = new Float32Array(N * N), fb0 = this.fb, wk = new FastBoard(N);
    for (let k = 0; k < n; k++) { wk.copyFrom(fb0); playout(wk, C2N[this.turn], N * N * 3); const col = wk.col, D = wk.D;
      for (let i = 0; i < N * N; i++) { const p = wk.i2p(i), v = col[p]; if (v === BLACK) own[i]++; else if (v === WHITE) own[i]--; else { let b = 0, w = 0; for (let j = 0; j < 4; j++) { const q = col[p + D[j]]; if (q === BLACK) b = 1; else if (q === WHITE) w = 1; } if (b && !w) own[i]++; else if (w && !b) own[i]--; } } }
    for (let i = 0; i < N * N; i++) own[i] /= n; return own; }
  estimateDead() { const own = this.ownership(this.N <= 9 ? 220 : this.N <= 13 ? 140 : 80), dead = new Set(), seen = new Set();
    for (let i = 0; i < this.N * this.N; i++) { const c = this.at(i); if (!c || seen.has(i)) continue; const g = this.groupOf(i); let m = 0; for (const x of g) { seen.add(x); m += own[x]; } m /= g.length; if ((c === 'b' && m < -0.35) || (c === 'w' && m > 0.35)) for (const x of g) dead.add(x); }
    return dead; }
  // Japanese count: territory + prisoners + dead stones, komi to White. Returns { b, w, terr:{b:[],w:[]}, winner, margin, result }
  score() {
    const N = this.N, B = this.board, dead = this.dead, alive = i => B[i] && !dead.has(i) ? B[i] : '', terr = { b: [], w: [] }, seen = new Uint8Array(N * N);
    for (let i = 0; i < N * N; i++) { if (alive(i) || seen[i]) continue; const reg = [], st = [i]; seen[i] = 1; let tb = 0, tw = 0;
      while (st.length) { const x = st.pop(); reg.push(x); const r = x / N | 0, c = x % N; for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue; const y = rr * N + cc, a = alive(y); if (a === 'b') tb = 1; else if (a === 'w') tw = 1; else if (!seen[y]) { seen[y] = 1; st.push(y); } } }
      if (tb && !tw) terr.b.push(...reg); else if (tw && !tb) terr.w.push(...reg); }
    let deadB = 0, deadW = 0; for (const i of dead) { if (B[i] === 'b') deadB++; else if (B[i] === 'w') deadW++; }
    const caps = this.caps, b = terr.b.length + caps.b + deadW, w = terr.w.length + caps.w + deadB + this.komi;
    const winner = b > w ? 'b' : 'w', margin = Math.abs(b - w);
    return { b, w, terr, deadB, deadW, caps, komi: this.komi, winner, margin, result: winner === 'w' ? '1-0' : '0-1' }; }
  lastMove() { const h = this.history[this.history.length - 1]; return h ? h.i : -2; }
}

// ---------------- playouts (light, with capture / escape heuristics) ----------------
let seed = (Math.random() * 2 ** 31) | 0; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
function heuristicMove(b, c) {
  const last = b.lastMove; if (last < 0) return -1; const D = b.D, col = b.col, o = 3 - c;
  // capture a chain next to the last move that is in atari
  for (let k = 0; k < 4; k++) { const q = last + D[k]; if (col[q] === o) { const h = b.head[q]; if (b.libsOf(h, 2) === 1) { const l = b.libOf(h); if (b.legal(l, c)) return l; } } }
  if (col[last] === o) { const h = b.head[last]; if (b.libsOf(h, 2) === 1) { const l = b.libOf(h); if (b.legal(l, c)) return l; } }
  // escape: my chain next to the last move now in atari → extend (if that gives 2+ liberties)
  for (let k = 0; k < 4; k++) { const q = last + D[k]; if (col[q] === c) { const h = b.head[q]; if (b.libsOf(h, 2) === 1) { const l = b.libOf(h); if (b.legal(l, c)) { let n = 0; for (let j = 0; j < 4; j++) if (col[l + D[j]] === EMPTY) n++; if (n >= 2) return l; } } } }
  return -1;
}
export function playout(b, c, maxMoves) {
  const E = b.empties, n = E.length; let moves = 0;
  while (moves < maxMoves) {
    let mv = rnd(10) < 9 ? heuristicMove(b, c) : -1;
    if (mv < 0) { const start = rnd(n); for (let k = 0; k < n; k++) { const p = E[(start + k) % n]; if (b.col[p] === EMPTY && !b.isEyeish(p, c) && b.legal(p, c)) { mv = p; break; } } }
    if (mv < 0) { b.play(-1, c); if (b.passes >= 2) break; } else b.play(mv, c);
    c = 3 - c; moves++;
  }
  return b;
}

// ---------------- the CPU: UCT tree search over playouts ----------------
export const LEVELS = [
  { id: 'rookie', name: 'ROOKIE', ms: 300, playouts: 250, greedy: 0.35 },
  { id: 'club', name: 'CLUB', ms: 1200, playouts: 4000 },
  { id: 'master', name: 'MASTER', ms: 2600, playouts: 14000 }];
// returns { i (index or -1 pass), resign, winrate }
export function think(game, level = 1, opts = {}) {
  const g = game instanceof Go ? game : new Go({ state: game }); const N = g.N, me = C2N[g.turn], L0 = LEVELS[level === 'hint' ? 2 : level] || LEVELS[1];
  const root = g.fb, komi = g.komi, nPts = N * N;
  // opponent just passed and I'm ahead on the board → pass to end it
  const estimate = () => { const own = g.ownership(60); let s = 0; for (const v of own) s += v > 0.2 ? 1 : v < -0.2 ? -1 : 0; s -= komi; return me === BLACK ? s : -s; };
  const lastWasPass = g.history.length && g.history[g.history.length - 1].i < 0;
  if (lastWasPass && g.history.length > 6 && estimate() > 0) return { i: -1, winrate: 0.8 };
  // candidate moves: legal, not my own eye
  const cands = []; for (const p of root.empties) if (root.col[p] === EMPTY && !root.isEyeish(p, me) && root.legal(p, me)) cands.push(p);
  if (!cands.length) return { i: -1, winrate: 0.5 };
  if (L0.greedy && Math.random() < L0.greedy) { const h = heuristicMove(root.clone(), me); if (h >= 0) return { i: root.p2i(h), winrate: 0.5 }; return { i: root.p2i(cands[(Math.random() * cands.length) | 0]), winrate: 0.5 }; }
  // tree: nodes keyed by move sequence; children per move with stats
  function Node(p, parent, c) { return { p, parent, c, n: 0, w: 0, kids: null, untried: null }; }
  const rootN = Node(-2, null, 3 - me), wk = new FastBoard(N), t0 = Date.now(); let iters = 0;
  const expandList = (b, c) => { const L = []; for (const p of b.empties) if (b.col[p] === EMPTY && !b.isEyeish(p, c) && b.legal(p, c)) L.push(p); for (let k = L.length - 1; k > 0; k--) { const j = rnd(k + 1); const t = L[k]; L[k] = L[j]; L[j] = t; } if (!L.length) L.push(-1); return L; };
  rootN.untried = cands.slice(); for (let k = rootN.untried.length - 1; k > 0; k--) { const j = rnd(k + 1); const t = rootN.untried[k]; rootN.untried[k] = rootN.untried[j]; rootN.untried[j] = t; } rootN.kids = [];
  while (iters < L0.playouts && Date.now() - t0 < (opts.ms || L0.ms)) {
    wk.copyFrom(root); let node = rootN, c = me;
    // select
    while (node.untried && node.untried.length === 0 && node.kids.length) { let best = null, bv = -1; const ln = Math.log(node.n + 1);
      for (const k of node.kids) { const v = k.w / (k.n + 1e-9) + 0.75 * Math.sqrt(ln / (k.n + 1e-9)); if (v > bv) { bv = v; best = k; } }
      node = best; wk.play(node.p, node.c); c = 3 - node.c; }
    // expand
    if (!node.untried) { node.untried = expandList(wk, c); node.kids = []; }
    if (node.untried.length) { let p = node.untried.pop(); if (p >= 0 && !wk.legal(p, c)) p = -1; const k = Node(p, node, c); node.kids.push(k); wk.play(p, c); node = k; c = 3 - c; }
    // simulate
    playout(wk, c, nPts * 2); const s = wk.areaScore(komi), blackWins = s > 0 ? 1 : 0;
    // back up (w counts wins for the player who made the node's move)
    for (let x = node; x; x = x.parent) { x.n++; if (x.c === BLACK ? blackWins : !blackWins) x.w++; }
    iters++;
  }
  let best = null; for (const k of rootN.kids) if (!best || k.n > best.n) best = k;
  if (!best) return { i: root.p2i(cands[0]), winrate: 0.5 };
  const wr = best.w / best.n;
  if (opts.resign !== false && level === 2 && wr < 0.06 && g.history.length > nPts * 0.45) return { i: -1, resign: true, winrate: wr };
  if (wr > 0.985 && g.history.length > nPts * 0.6 && lastWasPass) return { i: -1, winrate: wr };
  return { i: best.p < 0 ? -1 : root.p2i(best.p), winrate: wr, iters };
}

// ---------------- Worker mode ----------------
if (typeof WorkerGlobalScope !== 'undefined' && typeof self !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.onmessage = e => { const { id, state, level, kind } = e.data || {}; let out = null;
    try { const g = new Go({ state }); if (kind === 'dead') out = { dead: [...g.estimateDead()] }; else if (kind === 'own') out = { own: Array.from(g.ownership(g.N <= 9 ? 300 : g.N <= 13 ? 180 : 110)) }; else out = think(g, level); } catch (er) { out = { error: String(er) }; }
    self.postMessage({ id, m: out }); };
}
