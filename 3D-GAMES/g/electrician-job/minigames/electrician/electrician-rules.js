/* ELECTRICIAN JOB: pure rules + AI (no three.js).
   The board is an n x n grid of wire tiles. Directions: 0=N (row-1, toward the panel), 1=E (col+1), 2=S (row+1), 3=W (col-1).
   A tile's wires are a 4-bit mask (bit d = wire leaves through side d). Tapping turns a tile 90 degrees clockwise.
   The breaker panel sits off the board above cell (0, rootCol) and feeds it through its N side. */

export const LEVELS = [
  { id: 0, name: 'EASY', size: 4, opp: 'PIP', moveSec: 1.7, mistake: 0.22, think: 0.9 },
  { id: 1, name: 'MEDIUM', size: 5, opp: 'HOPE', moveSec: 1.05, mistake: 0.10, think: 0.6 },
  { id: 2, name: 'HARD', size: 6, opp: 'NOBLE', moveSec: 0.62, mistake: 0.03, think: 0.35 }
];

export const DR = [-1, 0, 1, 0];
export const DC = [0, 1, 0, -1];
export const OPP = d => (d + 2) & 3;

export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* rotate a mask clockwise k quarter turns */
export function rot(mask, k) {
  k &= 3;
  let m = 0;
  for (let d = 0; d < 4; d++) if (mask & (1 << d)) m |= 1 << ((d + k) & 3);
  return m;
}

export function degree(mask) {
  let c = 0;
  for (let d = 0; d < 4; d++) if (mask & (1 << d)) c++;
  return c;
}

/* shape name from mask: end | straight | corner | tee | cross | blank */
export function shapeOf(mask) {
  const g = degree(mask);
  if (g === 0) return 'blank';
  if (g === 1) return 'end';
  if (g === 3) return 'tee';
  if (g === 4) return 'cross';
  return (mask === 5 || mask === 10) ? 'straight' : 'corner';
}

const FIXTURES = ['lamp', 'lamp', 'fan', 'tv', 'fridge', 'lamp', 'toaster', 'lamp', 'fan', 'tv'];

/* Build a solved spanning tree (randomized Prim), then scramble the rotations. */
export function generate(size, seed) {
  const R = rng(seed);
  const n = size;
  const solved = new Array(n * n).fill(0);
  const inTree = new Array(n * n).fill(false);
  const rootCol = Math.floor(n / 2) - (R() < 0.5 && n % 2 === 0 ? 1 : 0);
  const root = rootCol;
  inTree[root] = true;
  const frontier = [];
  const pushEdges = (i) => {
    const r = (i / n) | 0, c = i % n;
    for (let d = 0; d < 4; d++) {
      const rr = r + DR[d], cc = c + DC[d];
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      const j = rr * n + cc;
      if (!inTree[j]) frontier.push([i, d, j]);
    }
  };
  pushEdges(root);
  let guard = 0;
  while (frontier.length && guard++ < 10000) {
    const k = Math.floor(R() * frontier.length);
    const [i, d, j] = frontier[k];
    frontier.splice(k, 1);
    if (inTree[j]) continue;
    const limit = (i === root) ? 2 : 3; /* root also carries the panel feed on N */
    if (degree(solved[i]) >= limit) continue;
    solved[i] |= 1 << d;
    solved[j] |= 1 << OPP(d);
    inTree[j] = true;
    pushEdges(j);
  }
  /* any cell left out (rare, from the degree cap): attach it to any tree neighbour */
  for (let i = 0; i < n * n; i++) {
    if (inTree[i]) continue;
    const r = (i / n) | 0, c = i % n;
    for (let d = 0; d < 4; d++) {
      const rr = r + DR[d], cc = c + DC[d];
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      const j = rr * n + cc;
      if (inTree[j]) { solved[i] |= 1 << d; solved[j] |= 1 << OPP(d); inTree[i] = true; break; }
    }
  }
  solved[root] |= 1; /* feed from the panel */

  const tiles = [];
  let fx = 0;
  for (let i = 0; i < n * n; i++) {
    const base = solved[i];
    const isRoot = i === root;
    const fixture = (!isRoot && degree(base) === 1) ? FIXTURES[(fx++ + Math.floor(R() * 3)) % FIXTURES.length] : null;
    tiles.push({ i, r: (i / n) | 0, c: i % n, solved: base, mask: base, fixture, locked: false, isRoot });
  }
  /* scramble: every tile gets a random turn; make sure plenty are wrong */
  let tries = 0;
  do {
    for (const t of tiles) t.mask = rot(t.solved, Math.floor(R() * 4));
    tries++;
  } while (tries < 20 && (wrongCount(tiles) < Math.ceil(n * n * 0.6) || computePower(tiles, n, root).solved));
  return { n, root, rootCol, tiles, seed };
}

/* clockwise taps needed to bring this tile to its solved look */
export function tapsNeeded(t) {
  for (let k = 0; k < 4; k++) if (rot(t.mask, k) === t.solved) return k;
  return 0;
}

export function wrongCount(tiles) {
  let w = 0;
  for (const t of tiles) if (t.mask !== t.solved) w++;
  return w;
}

export function minMoves(tiles) {
  let m = 0;
  for (const t of tiles) m += tapsNeeded(t);
  return m;
}

/* Flood power from the panel. Returns powered flags, loose live ends, lit fixtures. */
export function computePower(tiles, n, root) {
  const powered = new Array(n * n).fill(false);
  let loose = 0, lit = 0, fixtures = 0;
  for (const t of tiles) if (t.fixture) fixtures++;
  if (tiles[root].mask & 1) {
    const stack = [root];
    powered[root] = true;
    while (stack.length) {
      const i = stack.pop();
      const t = tiles[i];
      for (let d = 0; d < 4; d++) {
        if (!(t.mask & (1 << d))) continue;
        if (i === root && d === 0) continue; /* the panel feed */
        const rr = t.r + DR[d], cc = t.c + DC[d];
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) { loose++; continue; }
        const j = rr * n + cc;
        if (!(tiles[j].mask & (1 << OPP(d)))) { loose++; continue; }
        if (!powered[j]) { powered[j] = true; stack.push(j); }
      }
    }
  }
  let all = true;
  for (let i = 0; i < n * n; i++) {
    if (!powered[i]) all = false;
    if (powered[i] && tiles[i].fixture) lit++;
  }
  return { powered, loose, lit, fixtures, solved: all && loose === 0 };
}

/* Turn one tile clockwise. Returns true if it turned. */
export function tap(board, i) {
  const t = board.tiles[i];
  if (!t || t.locked) return false;
  t.mask = rot(t.mask, 1);
  return true;
}

export function clone(board) {
  return { n: board.n, root: board.root, rootCol: board.rootCol, seed: board.seed, tiles: board.tiles.map(t => ({ ...t })) };
}

/* AI brain: it knows the wiring plan and works across the board like a person would,
   mostly near where it last worked, sometimes slipping. Returns the tile index to tap. */
export function aiPick(board, state, R, mistake) {
  const wrong = board.tiles.filter(t => t.mask !== t.solved && !t.locked);
  if (!wrong.length) return -1;
  if (R() < mistake) {
    const right = board.tiles.filter(t => t.mask === t.solved && degree(t.solved) < 4 && t.mask !== 5 && t.mask !== 10);
    if (right.length) return right[Math.floor(R() * right.length)].i;
  }
  /* keep turning the same tile until it is right */
  if (state.cur >= 0) {
    const t = board.tiles[state.cur];
    if (t && t.mask !== t.solved) return t.i;
  }
  /* prefer the tile nearest the last one (work outward from the panel) */
  let best = wrong[0], bd = 1e9;
  const lr = state.lastR ?? 0, lc = state.lastC ?? board.rootCol;
  for (const t of wrong) {
    const d = Math.abs(t.r - lr) + Math.abs(t.c - lc) + R() * 1.5;
    if (d < bd) { bd = d; best = t; }
  }
  state.cur = best.i; state.lastR = best.r; state.lastC = best.c;
  return best.i;
}

/* A tile worth pointing the hint hand at: a wrong tile touching the powered network. */
export function hintTile(board, power) {
  const n = board.n;
  let fallback = -1;
  for (const t of board.tiles) {
    if (t.mask === t.solved || t.locked) continue;
    if (fallback < 0) fallback = t.i;
    for (let d = 0; d < 4; d++) {
      const rr = t.r + DR[d], cc = t.c + DC[d];
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      if (power.powered[rr * n + cc]) return t.i;
    }
    if (t.isRoot) return t.i;
  }
  return fallback;
}

/* scoring: par time grows with the board */
export function parTime(n) { return Math.round(n * n * 2.4); }

export function scoreJob(n, time, moves, min) {
  const par = parTime(n);
  const extra = Math.max(0, moves - min);
  const s = n * n * 40 + Math.max(0, par - time) * 15 - extra * 5;
  const stars = (time <= par && extra <= Math.ceil(min * 0.25)) ? 3 : (time <= par * 1.6 ? 2 : 1);
  return { score: Math.max(50, Math.round(s)), stars, par, extra };
}
