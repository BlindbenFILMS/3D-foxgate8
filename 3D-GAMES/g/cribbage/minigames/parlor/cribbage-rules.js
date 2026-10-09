// 8 GATES — CRIBBAGE RULES [cribbage]. Pure game logic (no 3D, no DOM): deal, discard to the crib, the cut, pegging with GO and 31,
// counting hands and the crib, 2, 3 or 4 players (4 = two teams of partners), CPU discard + pegging, and what each player may see online.
// Cards are numbers 0–51: rank = id % 13 + 1 (A=1 … K=13), suit = floor(id / 13): 0 spades · 1 hearts · 2 diamonds · 3 clubs. Count value: face cards = 10.

export const RANK_TXT = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const RANK_WORD = ['', 'ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king'];
export const SUIT_WORD = ['spades', 'hearts', 'diamonds', 'clubs'];
export const rank = c => c % 13 + 1, suit = c => Math.floor(c / 13), val = c => Math.min(10, c % 13 + 1);
export const cardSay = c => RANK_WORD[rank(c)] + ' of ' + SUIT_WORD[suit(c)];
export const cardTxt = c => RANK_TXT[rank(c)] + ' ' + ['♠', '♥', '♦', '♣'][suit(c)];
const sumV = a => a.reduce((s, c) => s + val(c), 0);
export const handSize = n => (n === 2 ? 6 : 5), discardN = n => (n === 2 ? 2 : 1);

// ---------------- counting a hand (4 cards + the starter, or the crib) ----------------
export function scoreHand(hand, starter, isCrib = false) {
  const all = starter == null ? hand.slice() : [...hand, starter], items = [];
  // fifteens: every set of cards that adds to 15
  for (let m = 1; m < 1 << all.length; m++) { let s = 0; const cs = []; for (let i = 0; i < all.length; i++) if (m & 1 << i) { s += val(all[i]); cs.push(all[i]); } if (s === 15) items.push({ kind: '15', pts: 2, cards: cs }); }
  // pairs
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (rank(all[i]) === rank(all[j])) items.push({ kind: 'pair', pts: 2, cards: [all[i], all[j]] });
  // runs: the longest run of ranks, once for every way to pick it
  const by = {}; all.forEach(c => (by[rank(c)] = by[rank(c)] || []).push(c));
  let best = null; for (let r = 1; r <= 13; r++) { if (!by[r]) continue; let L = 0; while (by[r + L]) L++; if (L >= 3 && (!best || L > best.L)) best = { r, L }; r += L - 1; }
  if (best) { let combos = [[]]; for (let k = 0; k < best.L; k++) combos = combos.flatMap(cs => by[best.r + k].map(c => [...cs, c])); combos.forEach(cs => items.push({ kind: 'run', pts: best.L, cards: cs })); }
  // flush: 4 in the hand (crib needs all 5)
  if (hand.length >= 4 && hand.every(c => suit(c) === suit(hand[0]))) { const five = starter != null && suit(starter) === suit(hand[0]); if (five) items.push({ kind: 'flush', pts: hand.length + 1, cards: all.slice() }); else if (!isCrib) items.push({ kind: 'flush', pts: hand.length, cards: hand.slice() }); }
  // nobs: the jack of the starter's suit
  if (starter != null) hand.forEach(c => { if (rank(c) === 11 && suit(c) === suit(starter)) items.push({ kind: 'nobs', pts: 1, cards: [c] }); });
  let run = 0; items.forEach(it => { run += it.pts; it.total = run; it.label = itemLabel(it); });
  return { total: run, items };
}
export function itemLabel(it) { return it.kind === '15' ? 'FIFTEEN' : it.kind === 'pair' ? 'PAIR' : it.kind === 'run' ? 'RUN OF ' + it.pts : it.kind === 'flush' ? 'FLUSH' : it.kind === 'nobs' ? 'NOBS' : it.kind.toUpperCase(); }

// ---------------- pegging: points for the card just played ----------------
export function pegPoints(seq, count) {
  const out = []; if (count === 15) out.push(['FIFTEEN', 2]); if (count === 31) out.push(['THIRTY-ONE', 2]);
  let k = 1; while (k < seq.length && rank(seq[seq.length - 1 - k]) === rank(seq[seq.length - 1])) k++;
  if (k >= 2) out.push([['', '', 'PAIR', 'PAIR ROYAL', 'DOUBLE PAIR ROYAL'][k], [0, 0, 2, 6, 12][k]]);
  for (let L = seq.length; L >= 3; L--) { const rs = seq.slice(-L).map(rank).sort((a, b) => a - b); if (rs.every((r, i) => !i || r === rs[i - 1] + 1)) { out.push(['RUN OF ' + L, L]); break; } }
  return { pts: out.reduce((s, x) => s + x[1], 0), items: out };
}

// ---------------- the match ----------------
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// players: [{ name, col, kind: 'me'|'local'|'cpu'|'net', cpu?, id? }]. teams: 4 players as partners (0+2 vs 1+3).
export function newMatch({ players, target = 121, mode = 'cpu', teams = true }) {
  const n = players.length, tm = n === 4 && teams;
  const P = players.map((p, i) => ({ gone: false, ...p, side: tm ? i % 2 : i }));
  const sides = (tm ? [0, 1] : P.map((_, i) => i)).map(s => ({ score: 0, prev: 0, members: P.map((p, i) => p.side === s ? i : -1).filter(i => i >= 0) }));
  const G = { v: 1, mid: Math.floor(Math.random() * 1e9), seq: 0, mode, target, teams: tm, players: P, sides, dealer: Math.floor(Math.random() * n), dealNo: 0,
    phase: 'discard', hands: [], held: [], disc: [], crib: [], deck: [], starter: null, peg: null, show: null, ev: [], evId: 0, winner: -1, skunk: 0, last: null };
  startDeal(G); return G;
}
export function startDeal(G, rig) {
  const n = G.players.length, hs = handSize(n); G.dealNo++; G.hands = G.players.map(() => []); G.disc = G.players.map(() => false); G.crib = []; G.starter = null; G.peg = null; G.show = null; G.held = G.players.map(() => []);
  if (rig) { G.hands = rig.hands.map(h => h.slice()); const used = new Set([...rig.hands.flat(), rig.starter, ...(rig.crib || [])]); G.deck = shuffle([...Array(52).keys()].filter(c => !used.has(c))); G.deck.push(rig.starter); G.crib = (rig.crib || []).slice(); }
  else { G.deck = shuffle([...Array(52).keys()]); for (let k = 0; k < hs; k++) for (let i = 1; i <= n; i++) G.hands[(G.dealer + i) % n].push(G.deck.shift()); if (n === 3) G.crib.push(G.deck.shift()); }
  G.hands.forEach(h => h.sort((a, b) => rank(a) - rank(b) || suit(a) - suit(b)));
  G.phase = 'discard'; G.players.forEach((p, i) => { if (p.gone) autoDiscard(G, i); });
}
function event(G, e) { G.evId++; G.ev.push({ id: G.evId, ...e }); if (G.ev.length > 8) G.ev.shift(); }
function award(G, p, pts, why, extra) { if (G.phase === 'end' || !pts) return; const s = G.sides[G.players[p].side]; s.prev = s.score; s.score = Math.min(G.target, s.score + pts); event(G, { kind: 'pts', p, side: G.players[p].side, pts, why, ...extra });
  if (s.score >= G.target) { G.winner = G.players[p].side; G.phase = 'end'; const skL = G.target === 121 ? 91 : 31; G.skunk = G.sides.every((o, k) => k === G.winner || o.score < skL) ? (G.sides.every((o, k) => k === G.winner || o.score < skL - 30) ? 2 : 1) : 0; } }
const discDone = G => G.disc.every(Boolean);
function autoDiscard(G, p) { const n = G.players.length, d = cpuDiscard(G.hands[p], discardN(n), G.dealer === p || G.players[G.dealer].side === G.players[p].side, 0.5, n); applyAct(G, p, { a: 'disc', cards: d }); }
export const playable = (G, p) => G.peg ? G.hands[p].filter(c => val(c) + G.peg.count <= 31) : [];

// apply one action for player p. Only the authority (the device, or the online host) calls this. Returns true if anything changed.
export function applyAct(G, p, a) {
  const n = G.players.length;
  if (a.a === 'disc') { if (G.phase !== 'discard' || G.disc[p] || !Array.isArray(a.cards)) return false; const cs = [...new Set(a.cards.map(Number))]; if (cs.length !== discardN(n) || !cs.every(c => G.hands[p].includes(c))) return false;
    G.hands[p] = G.hands[p].filter(c => !cs.includes(c)); G.crib.push(...cs); G.disc[p] = true; event(G, { kind: 'disc', p });
    if (discDone(G)) cut(G); return true; }
  if (a.a === 'play') { const c = +a.card; if (G.phase !== 'peg' || G.peg.turn !== p || !G.hands[p].includes(c) || val(c) + G.peg.count > 31) return false;
    const P = G.peg; G.hands[p] = G.hands[p].filter(x => x !== c); P.count += val(c); P.seq.push(c); P.pile.push({ p, c }); P.last = p; const pp = pegPoints(P.seq, P.count);
    event(G, { kind: 'play', p, c, count: P.count }); if (pp.pts) award(G, p, pp.pts, pp.items.map(x => x[0]).join(' + '), { peg: true, count: P.count });
    if (G.phase === 'end') return true; if (P.count === 31) { P.count = 0; P.seq = []; P.reset = (P.reset || 0) + 1; } advance(G, p); return true; }
  if (a.a === 'next') { if (a.at != null && a.at !== G.seq) return false; if (G.phase !== 'show') return false;
    G.show.i++; if (G.show.i < G.show.order.length) enterShow(G); else { G.dealer = (G.dealer + 1) % n; startDeal(G); } return true; }
  return false;
}
function cut(G) { G.starter = G.deck.pop(); G.held = G.hands.map(h => h.slice()); event(G, { kind: 'cut', c: G.starter });
  if (rank(G.starter) === 11) award(G, G.dealer, 2, 'HIS HEELS'); if (G.phase === 'end') return;
  G.phase = 'peg'; G.peg = { count: 0, seq: [], pile: [], turn: (G.dealer + 1) % G.players.length, last: -1, reset: 0, go: [] }; skipGone(G); }
function skipGone(G) { /* a player who left plays automatically, handled by the driver */ }
function advance(G, p) { const n = G.players.length, P = G.peg; P.go = [];
  if (G.hands.every(h => !h.length)) { if (P.count > 0) award(G, P.last, 1, 'LAST CARD'); if (G.phase !== 'end') toShow(G); return; }
  for (let k = 1; k <= n; k++) { const q = (p + k) % n; if (G.hands[q].some(c => val(c) + P.count <= 31)) { P.turn = q; return; } if (G.hands[q].length && q !== p) P.go.push(q); }
  // nobody can play: the last player scores GO, the count starts again
  if (P.count > 0) award(G, P.last, 1, 'GO'); if (G.phase === 'end') return; P.count = 0; P.seq = []; P.reset = (P.reset || 0) + 1; P.go = [];
  for (let k = 1; k <= n; k++) { const q = (P.last + k) % n; if (G.hands[q].length) { P.turn = q; return; } } }
function toShow(G) { const n = G.players.length, order = []; for (let k = 1; k <= n; k++) order.push({ kind: 'hand', p: (G.dealer + k) % n }); order.push({ kind: 'crib', p: G.dealer });
  G.phase = 'show'; G.show = { order, i: 0, cur: null }; enterShow(G); }
function enterShow(G) { const o = G.show.order[G.show.i], cards = o.kind === 'crib' ? G.crib : G.held[o.p], sc = scoreHand(cards, G.starter, o.kind === 'crib');
  G.show.cur = { kind: o.kind, p: o.p, cards: cards.slice(), total: sc.total, items: sc.items.map(it => ({ kind: it.kind, pts: it.pts, cards: it.cards, total: it.total, label: it.label })) };
  if (sc.total) award(G, o.p, sc.total, o.kind === 'crib' ? 'CRIB' : 'HAND', { show: true }); }
export function standings(G) { return G.sides.map((s, i) => ({ ...s, i })).sort((a, b) => b.score - a.score || a.i - b.i); }

// what player `me` may see online: other hands and the crib stay face down until the show
export function viewFor(G, me) {
  const V = JSON.parse(JSON.stringify(G)), reveal = G.phase === 'show' || G.phase === 'end';
  V.hands = G.hands.map((h, i) => i === me ? h.slice() : h.map(() => -1));
  V.held = G.held.map((h, i) => i === me || reveal ? h.slice() : h.map(() => -1));
  const cribShown = G.phase === 'end' || (G.phase === 'show' && G.show.order[G.show.i].kind === 'crib');
  V.crib = cribShown ? G.crib.slice() : G.crib.map(() => -1); V.deck = G.deck.map(() => -1); return V;
}

// ---------------- CPU ----------------
function combos(a, k) { if (k === 0) return [[]]; if (a.length < k) return []; const [h, ...t] = a; return [...combos(t, k - 1).map(c => [h, ...c]), ...combos(t, k)]; }
function cribGuess(d) { let v = 0; d.forEach(c => { if (rank(c) === 5) v += 1.6; else if (val(c) === 10) v += 0.4; }); if (d.length === 2) { const [a, b] = d; if (rank(a) === rank(b)) v += 2.4; if (val(a) + val(b) === 15) v += 2; if (Math.abs(rank(a) - rank(b)) === 1) v += 0.9; if (Math.abs(rank(a) - rank(b)) === 2) v += 0.4; } return v; }
export function cpuDiscard(hand, discN, ownCrib, skill = 0.8, nPlayers = 2) {
  const seen = new Set(hand), deck = [...Array(52).keys()].filter(c => !seen.has(c)); let best = null;
  for (const d of combos(hand, discN)) { const keep = hand.filter(c => !d.includes(c)); let ev = 0; for (const s of deck) ev += scoreHand(keep, s).total; ev /= deck.length;
    const v = ev + (ownCrib ? 1 : -1) * cribGuess(d) * (nPlayers === 2 ? 1 : 0.6) + (Math.random() - 0.5) * 6 * (1 - skill); if (!best || v > best.v) best = { v, d }; }
  return best.d;
}
export function cpuPlay(hand, count, seq, skill = 0.8) {
  const opts = hand.filter(c => val(c) + count <= 31); if (!opts.length) return null; let best = null;
  for (const c of opts) { const nc = count + val(c), pts = pegPoints([...seq, c], nc).pts; let risk = 0;
    if (nc === 5 || nc === 21) risk += 2; else if (nc < 15 && 15 - nc <= 10) risk += 15 - nc === 10 ? 1.1 : 0.5; if (nc < 31 && 31 - nc <= 10) risk += 31 - nc === 10 ? 1 : 0.4;
    if (hand.some(x => x !== c && rank(x) === rank(c))) risk -= 0.6; else risk += 0.5;   // they may pair it (unless we can answer with three of a kind)
    if (!count && rank(c) === 5) risk += 1.5; if (!count && val(c) < 5) risk -= 0.4;
    const v = pts * 3 - risk + (rank(c) === 5 ? -0.4 : 0) + val(c) * 0.03 + (Math.random() - 0.5) * 5 * (1 - skill); if (!best || v > best.v) best = { v, c }; }
  return best.c;
}
