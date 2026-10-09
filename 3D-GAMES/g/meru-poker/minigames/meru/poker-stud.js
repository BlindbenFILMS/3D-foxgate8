// 8 GATES — MERU POKER [meruCasino · POKER TABLE]. Minigame #157 (3D rebuild): FIVE-CARD STUD. Phones first.
// NO STATIC IMPORTS on purpose: the page passes THREE (vendor/three r160) and save (engine/save.js), so this one file runs
// in the repo AND in a Design canvas (where ../../ links between packed files break and leave a black screen).
// Cards: J = NOBLE · Q = HOPE · K = KING MIGHT (fox face cards) · A = THE SHUTTLE. Dealer: LYRA. Rivals: KANE + Meru regulars (DRAFT names).
// Rules: ante, 1 hole card (down) + 1 up card, bet; then 3 more up cards, a bet after each. Best hand SHOWING acts first.
// Fixed limit: small bet on the 2- and 3-card rounds, big bet on the 4- and 5-card rounds; a bet + 3 raises per round. Side pots at showdown.
// TREASURE WHEEL: win a showdown with TWO PAIR or better = 1 spin (max 3). Solo + gold table only.
// Online: up to 5 players (engine/duel-net.js, game 'meruPoker'); the host deals and runs the table, empty seats can be filled with foxes.
// Save keys (all prefixed meruPoker.): stats meruPoker.hands · .wins · .bestPot · .bestHand · .spins · .seat (chips still at the table) · flags meruPoker.royal · .fourColor · .mute

export const MERU_POKER = { key: 'meruPoker', name: 'MERU POKER', room: 'meruCasino', game: 'FIVE-CARD STUD' };
export const STAKES = { ante: 1, small: 2, big: 4, buyIn: 40, minBuy: 10 };
export const NET_COLS = [['RED', '#ec3013'], ['BLUE', '#38bdf8'], ['GOLD', '#ffd23a'], ['GREEN', '#22c55e'], ['PURPLE', '#a78bfa']];
export const RIVALS = [ // DRAFT: KANE is from the Meru casino; the others are Meru tavern / lanes regulars
  { name: 'KANE', fur: '#c8642a', chest: '#f4e6d4', coat: '#1e293b', trim: '#e6b45a', eye: '#1c1917', hat: 'visor', ai: { tight: 0.5, aggr: 0.75, bluff: 0.2 } },
  { name: 'ZIGGY', fur: '#ef8a3c', chest: '#fff4e6', coat: '#6d28d9', trim: '#ffd23a', eye: '#1c1917', hat: 'cap', ai: { tight: 0.2, aggr: 0.5, bluff: 0.35 } },
  { name: 'NIX', fur: '#e9e7e2', chest: '#ffffff', coat: '#0f766e', trim: '#a7f3d0', eye: '#1e3a8a', hat: null, ai: { tight: 0.8, aggr: 0.3, bluff: 0.05 } },
  { name: 'UTHA', fur: '#8a4b26', chest: '#e8c9a8', coat: '#14532d', trim: '#e6b45a', eye: '#1c1917', hat: 'shades', ai: { tight: 0.4, aggr: 0.4, bluff: 0.15 } },
  { name: 'GRISH', fur: '#7d838f', chest: '#e5e7eb', coat: '#7f1d1d', trim: '#fca5a5', eye: '#1c1917', hat: 'bowler', ai: { tight: 0.6, aggr: 0.6, bluff: 0.1 } },
  { name: 'ROOK', fur: '#3f3a36', chest: '#cbd5e1', coat: '#334155', trim: '#e6b45a', eye: '#fbbf24', hat: null, ai: { tight: 0.3, aggr: 0.8, bluff: 0.3 } },
];
const LYRA = { name: 'LYRA', fur: '#e07b39', chest: '#fff7ed', coat: '#111827', trim: '#e6b45a', eye: '#1c1917', hat: 'visor', bow: true };
export const WHEEL = [
  { t: '5', g: 5 }, { t: '15', g: 15 }, { t: 'XP 10', xp: 10 }, { t: '10', g: 10 }, { t: '25', g: 25 }, { t: '5', g: 5 },
  { t: '50', g: 50 }, { t: '10', g: 10 }, { t: 'XP 25', xp: 25 }, { t: '15', g: 15 }, { t: '100', g: 100, jack: true }, { t: '5', g: 5 },
];

// ---------------------------------------------------------------- cards + hand ranks
const RANKS = '23456789TJQKA', SUITS = 'shdc';
const FULL = []; for (const s of SUITS) for (const r of RANKS) FULL.push(r + s);
const WORD = ['', '', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'JACK', 'QUEEN', 'KING', 'ACE'];
const PLUR = ['', '', 'TWOS', 'THREES', 'FOURS', 'FIVES', 'SIXES', 'SEVENS', 'EIGHTS', 'NINES', 'TENS', 'JACKS', 'QUEENS', 'KINGS', 'ACES'];
export const SUIT_CH = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const SUIT_NAME = { s: 'SPADES', h: 'HEARTS', d: 'DIAMONDS', c: 'CLUBS' };
export const suitCol = (s, four) => four ? ({ s: '#201e1d', h: '#c42d3c', d: '#1d4ed8', c: '#15803d' })[s] : (s === 'h' || s === 'd' ? '#c42d3c' : '#201e1d');
export const rankTxt = r => r === 'T' ? '10' : r;
const rv = c => RANKS.indexOf(c[0]) + 2;
export const FACE_NAME = { J: 'NOBLE', Q: 'HOPE', K: 'KING MIGHT', A: 'SHUTTLE' };
export const cardName = c => (c[0] === 'T' ? 'TEN' : WORD[rv(c)]) + ' OF ' + SUIT_NAME[c[1]] + (FACE_NAME[c[0]] ? ' (' + FACE_NAME[c[0]] + ')' : '');
export const CAT_NAME = ['HIGH CARD', 'PAIR', 'TWO PAIR', 'THREE OF A KIND', 'STRAIGHT', 'FLUSH', 'FULL HOUSE', 'FOUR OF A KIND', 'STRAIGHT FLUSH'];

export function evalHand(codes) {
  const v = codes.map(rv).sort((a, b) => b - a), cnt = {};
  v.forEach(x => { cnt[x] = (cnt[x] || 0) + 1; });
  const g = Object.entries(cnt).map(([r, n]) => [+r, n]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  let flush = false, hi = 0;
  if (codes.length === 5) {
    flush = codes.every(c => c[1] === codes[0][1]);
    if (g.length === 5) { if (v[0] - v[4] === 4) hi = v[0]; else if (v[0] === 14 && v[1] === 5) hi = 5; }
  }
  let cat = 0;
  if (!g.length) return { cat: -1, tb: [], name: '' };
  if (hi && flush) cat = 8; else if (g[0][1] === 4) cat = 7; else if (g[0][1] === 3 && g[1] && g[1][1] === 2) cat = 6;
  else if (flush) cat = 5; else if (hi) cat = 4; else if (g[0][1] === 3) cat = 3; else if (g[0][1] === 2 && g[1] && g[1][1] === 2) cat = 2; else if (g[0][1] === 2) cat = 1;
  const tb = hi ? [hi] : g.map(x => x[0]);
  return { cat, tb, name: handName(cat, tb), royal: cat === 8 && hi === 14 };
}
function handName(cat, t) {
  switch (cat) {
    case 8: return t[0] === 14 ? 'ROYAL FLUSH' : 'STRAIGHT FLUSH · ' + WORD[t[0]] + ' HIGH';
    case 7: return 'FOUR ' + PLUR[t[0]];
    case 6: return 'FULL HOUSE · ' + PLUR[t[0]] + ' OVER ' + PLUR[t[1]];
    case 5: return 'FLUSH · ' + WORD[t[0]] + ' HIGH';
    case 4: return 'STRAIGHT · ' + WORD[t[0]] + ' HIGH';
    case 3: return 'THREE ' + PLUR[t[0]];
    case 2: return 'TWO PAIR · ' + PLUR[t[0]] + ' & ' + PLUR[t[1]];
    case 1: return 'PAIR OF ' + PLUR[t[0]];
    default: return WORD[t[0]] + ' HIGH';
  }
}
export function cmpHand(a, b) { if (a.cat !== b.cat) return a.cat - b.cat; const n = Math.max(a.tb.length, b.tb.length); for (let i = 0; i < n; i++) { const d = (a.tb[i] || 0) - (b.tb[i] || 0); if (d) return d; } return 0; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------------------------------------------------------------- THE TABLE (rules engine; solo + online host)
export class Table {
  constructor({ seats, stakes = STAKES, onChange, onHandEnd, onOver, turnMs = 0, aiFast = false }) {
    this.seats = seats.map(s => ({ chips: 0, cards: [], folded: false, allin: false, out: false, bet: 0, inPot: 0, acted: false, last: '', won: 0, show: '', ...s }));
    this.ante = stakes.ante; this.small = stakes.small; this.big = stakes.big; this.maxRaises = 3;
    this.onChange = onChange || (() => {}); this.onHandEnd = onHandEnd || (() => {}); this.onOver = onOver || (() => {});
    this.turnMs = turnMs; this.aiFast = aiFast;
    this.hand = 0; this.dealer = -1; this.phase = 'idle'; this.street = 0; this.pot = 0; this.toAct = -1; this.curBet = 0; this.raises = 0;
    this.msg = ''; this.reveal = false; this.winners = []; this.deadline = 0; this.timers = new Set(); this.ev = {};
  }
  later(ms, fn) { const t = setTimeout(() => { this.timers.delete(t); fn(); }, ms); this.timers.add(t); return t; }
  clearTimers() { this.timers.forEach(clearTimeout); this.timers.clear(); }
  destroy() { this.clearTimers(); this.dead = true; }
  change() { if (!this.dead) this.onChange(this); }
  say(m) { this.msg = m; }
  nm(s, a, b) { return s.name + ' ' + (s.name === 'YOU' ? b : a); }
  N() { return this.seats.length; }
  orderFrom(start) { const n = this.N(), o = []; for (let k = 0; k < n; k++) o.push(((start % n) + n + k) % n); return o; }
  inHand() { return this.seats.map((s, i) => i).filter(i => !this.seats[i].out && this.seats[i].cards.length); }
  live() { return this.inHand().filter(i => !this.seats[i].folded); }
  betSize() { return this.street <= 3 ? this.small : this.big; }
  newHand() {
    if (this.phase === 'bet' || this.phase === 'deal' || this.phase === 'settle') return false;
    this.clearTimers();
    this.seats.forEach(s => { if (!s.gone) s.out = s.chips < this.ante; Object.assign(s, { cards: [], folded: false, allin: false, bet: 0, inPot: 0, acted: false, last: '', won: 0, show: '' }); });
    const inn = this.seats.map((s, i) => i).filter(i => !this.seats[i].out);
    this.reveal = false; this.winners = []; this.ev = {}; this.pot = 0; this.curBet = 0; this.raises = 0; this.toAct = -1; this.street = 0; this.deadline = 0;
    if (inn.length < 2) { this.phase = 'over'; this.say(inn.length ? this.seats[inn[0]].name + ' TAKES EVERY CHIP AT THE TABLE.' : 'TABLE CLOSED.'); this.change(); this.onOver(this, inn[0]); return false; }
    this.hand++;
    let d = this.dealer; for (let k = 0; k < this.N(); k++) { d = (d + 1) % this.N(); if (!this.seats[d].out) break; } this.dealer = d;
    this.deck = shuffle(FULL.slice());
    inn.forEach(i => { const s = this.seats[i], a = Math.min(this.ante, s.chips); s.chips -= a; s.inPot = a; this.pot += a; if (!s.chips) s.allin = true; });
    this.phase = 'deal'; this.say('LYRA DEALS · ANTE ' + this.ante + ' EACH');
    const order = this.orderFrom(this.dealer + 1).filter(i => inn.includes(i)); let t = 250;
    for (let r = 0; r < 2; r++) for (const i of order) { this.later(t, () => { this.seats[i].cards.push({ c: this.deck.pop(), up: r === 1 }); this.change(); }); t += 210; }
    this.later(t + 200, () => { this.street = 2; this.startRound(); });
    this.change(); return true;
  }
  startRound() {
    this.phase = 'bet'; this.curBet = 0; this.raises = 0; this.seats.forEach(s => { s.bet = 0; s.acted = false; s.last = s.folded ? 'FOLDED' : s.allin ? 'ALL IN' : ''; });
    const live = this.live(), can = live.filter(i => !this.seats[i].allin);
    if (live.length < 2) { this.winByFold(live[0]); return; }
    if (can.length < 2) { this.phase = 'settle'; this.toAct = -1; this.say('ALL IN · THE CARDS RUN OUT'); this.change(); this.later(900, () => this.endRound()); return; }
    let best = -1, be = null;
    for (const i of this.orderFrom(this.dealer + 1)) { if (!can.includes(i)) continue; const e = evalHand(this.seats[i].cards.filter(c => c.up).map(c => c.c)); if (best < 0 || cmpHand(e, be) > 0) { best = i; be = e; } }
    this.toAct = best; this.say(this.nm(this.seats[best], 'SHOWS ', 'SHOW ') + (be && be.cat > 0 ? be.name : 'THE HIGH CARD') + ' · FIRST TO ACT');
    this.prompt();
  }
  legal(i) {
    const s = this.seats[i], toCall = Math.max(0, this.curBet - s.bet), size = this.betSize();
    return { toCall, call: toCall > 0 ? Math.min(toCall, s.chips) : 0, check: toCall === 0, fold: toCall > 0, bet: this.curBet === 0 && s.chips > 0, raise: this.curBet > 0 && this.raises < this.maxRaises && s.chips > toCall, size, raiseTo: this.curBet + size, chips: s.chips };
  }
  prompt() {
    const s = this.seats[this.toAct]; if (!s) return;
    this.deadline = 0;
    if (s.kind === 'ai') this.later(this.aiFast ? 60 : 650 + Math.random() * 750, () => { if (this.phase === 'bet' && this.seats[this.toAct] === s) this.act(this.toAct, aiMove(this, this.toAct)); });
    else if (this.turnMs) { this.deadline = Date.now() + this.turnMs; const i = this.toAct, h = this.hand; this.later(this.turnMs, () => { if (this.phase === 'bet' && this.toAct === i && this.hand === h) { const L = this.legal(i); this.act(i, L.check ? 'check' : 'fold'); } }); }
    this.change();
  }
  act(i, a) {
    if (this.phase !== 'bet' || i !== this.toAct) return false;
    const s = this.seats[i], L = this.legal(i);
    const pay = x => { x = Math.max(0, Math.min(x, s.chips)); s.chips -= x; s.bet += x; s.inPot += x; this.pot += x; if (!s.chips) s.allin = true; return x; };
    if (a === 'fold') { if (!L.fold) return false; s.folded = true; s.last = 'FOLDED'; this.say(this.nm(s, 'FOLDS', 'FOLD')); }
    else if (a === 'check') { if (!L.check) return false; s.last = 'CHECKS'; this.say(this.nm(s, 'CHECKS', 'CHECK')); }
    else if (a === 'call') { if (!L.call) return false; pay(L.toCall); s.last = s.allin ? 'ALL IN · CALLS' : 'CALLS ' + L.toCall; this.say(this.nm(s, 'CALLS ', 'CALL ') + L.toCall); }
    else if (a === 'bet') { if (!L.bet) return false; pay(L.size); this.curBet = Math.max(this.curBet, s.bet); this.seats.forEach(o => { if (o !== s) o.acted = false; }); s.last = s.allin ? 'ALL IN ' + s.bet : 'BETS ' + s.bet; this.say(this.nm(s, 'BETS ', 'BET ') + s.bet); }
    else if (a === 'raise') { if (!L.raise) return false; pay(L.toCall + L.size); if (s.bet > this.curBet) { this.curBet = s.bet; this.raises++; this.seats.forEach(o => { if (o !== s) o.acted = false; }); } s.last = s.allin ? 'ALL IN ' + s.bet : 'RAISES TO ' + s.bet; this.say(this.nm(s, 'RAISES TO ', 'RAISE TO ') + s.bet); }
    else return false;
    s.acted = true; this.deadline = 0;
    const live = this.live();
    if (live.length === 1) { this.phase = 'settle'; this.toAct = -1; this.change(); this.later(500, () => this.winByFold(live[0])); return true; }
    const can = live.filter(k => !this.seats[k].allin);
    if (can.every(k => this.seats[k].acted && this.seats[k].bet === this.curBet) || (can.length === 1 && this.seats[can[0]].bet >= this.curBet && this.seats[can[0]].acted) || !can.length) {
      this.phase = 'settle'; this.toAct = -1; this.change(); this.later(700, () => this.endRound()); return true;
    }
    let n = i; for (let k = 0; k < this.N(); k++) { n = (n + 1) % this.N(); if (can.includes(n)) break; }
    this.toAct = n; this.prompt(); return true;
  }
  endRound() {
    this.seats.forEach(s => { s.bet = 0; }); this.curBet = 0;
    if (this.street >= 5) { this.showdown(); return; }
    this.phase = 'deal'; const live = this.live(); let t = 0;
    for (const i of this.orderFrom(this.dealer + 1)) { if (!live.includes(i)) continue; this.later(t, () => { this.seats[i].cards.push({ c: this.deck.pop(), up: true }); this.change(); }); t += 230; }
    this.later(t + 250, () => { this.street++; this.startRound(); });
    this.change();
  }
  winByFold(i) {
    const s = this.seats[i]; if (!s) return; s.chips += this.pot; s.won = this.pot; this.winners = [i];
    this.say(this.nm(s, 'WINS ', 'WIN ') + this.pot + ' · EVERYONE ELSE FOLDED'); this.pot = 0; this.phase = 'done'; this.toAct = -1;
    this.change(); this.onHandEnd(this, { winners: [i], byFold: true, ev: {} });
  }
  showdown() {
    this.phase = 'done'; this.reveal = true; this.toAct = -1; const live = this.live(), ev = {};
    live.forEach(i => { ev[i] = evalHand(this.seats[i].cards.map(c => c.c)); this.seats[i].show = ev[i].name; });
    const contrib = this.seats.map(s => s.inPot), levels = [...new Set(contrib.filter(x => x > 0))].sort((a, b) => a - b), pos = this.orderFrom(this.dealer + 1);
    let prev = 0;
    for (const lvl of levels) {
      let part = 0; contrib.forEach(c => { part += Math.max(0, Math.min(c, lvl) - prev); }); prev = lvl; if (!part) continue;
      let elig = live.filter(i => contrib[i] >= lvl); if (!elig.length) elig = live;
      let best = []; for (const i of elig) { if (!best.length) best = [i]; else { const c = cmpHand(ev[i], ev[best[0]]); if (c > 0) best = [i]; else if (!c) best.push(i); } }
      best.sort((a, b) => pos.indexOf(a) - pos.indexOf(b)); const share = Math.floor(part / best.length); let rem = part - share * best.length;
      best.forEach(i => { const g = share + (rem > 0 ? 1 : 0); if (rem > 0) rem--; this.seats[i].chips += g; this.seats[i].won += g; });
    }
    this.pot = 0; this.ev = ev; this.winners = this.seats.map((s, i) => i).filter(i => this.seats[i].won > 0);
    const w = this.winners.map(i => this.seats[i]);
    this.say(w.length > 1 ? 'SPLIT POT · ' + w.map(s => s.name + ' ' + s.won).join(' · ') + ' · ' + w[0].show : this.nm(w[0], 'WINS ', 'WIN ') + w[0].won + ' WITH ' + w[0].show);
    this.change(); this.onHandEnd(this, { winners: this.winners, byFold: false, ev });
  }
  // what one seat may see (others' hole cards stay hidden until a showdown)
  snap(viewer) {
    return {
      hand: this.hand, phase: this.phase, street: this.street, pot: this.pot, toAct: this.toAct, curBet: this.curBet, raises: this.raises, maxRaises: this.maxRaises,
      ante: this.ante, small: this.small, big: this.big, dealer: this.dealer, msg: this.msg, reveal: this.reveal, winners: this.winners.slice(), deadline: this.deadline, mySeat: viewer,
      seats: this.seats.map((s, i) => ({ name: s.name, kind: s.kind, look: s.look, chips: s.chips, bet: s.bet, folded: s.folded, allin: s.allin, out: s.out, last: s.last, won: s.won, show: s.show,
        cards: s.cards.map(c => ({ c: c.up || i === viewer || (this.reveal && !s.folded) ? c.c : null, up: c.up })) })),
    };
  }
}

// ---------------------------------------------------------------- fox AI (Monte Carlo odds + personality)
function equity(T, i, N) {
  const S = T.seats, mine = S[i].cards.map(c => c.c), known = new Set(mine);
  S.forEach(s => s.cards.forEach(c => { if (c.up) known.add(c.c); }));
  const deck = FULL.filter(c => !known.has(c)), opps = T.live().filter(j => j !== i);
  if (!opps.length) return 1;
  let win = 0;
  for (let n = 0; n < N; n++) {
    let k = deck.length; const draw = () => { const j = (Math.random() * k) | 0; const c = deck[j]; deck[j] = deck[k - 1]; deck[k - 1] = c; k--; return c; };
    const m = mine.slice(); while (m.length < 5) m.push(draw());
    const me = evalHand(m); let lose = false, ties = 0;
    for (const o of opps) { const oc = S[o].cards.filter(c => c.up).map(c => c.c); while (oc.length < 5) oc.push(draw()); const c = cmpHand(evalHand(oc), me); if (c > 0) { lose = true; break; } if (!c) ties++; }
    if (!lose) win += 1 / (1 + ties);
  }
  return win / N;
}
function aiMove(T, i) {
  const s = T.seats[i], L = T.legal(i), st = s.ai || { tight: 0.5, aggr: 0.5, bluff: 0.15 };
  const e = equity(T, i, T.aiFast ? 40 : 140), n = T.live().length - 1, fair = 1 / (n + 1), r = Math.random();
  if (L.check) {
    if (L.bet && (e > fair + 0.16 - st.aggr * 0.1 || (r < st.bluff * 0.45 && T.street <= 3))) return 'bet';
    return 'check';
  }
  const odds = L.toCall / (T.pot + L.toCall);
  if (L.raise && e > fair + 0.28 - st.aggr * 0.14 && r < 0.85) return 'raise';
  if (e >= odds * (0.8 + st.tight * 0.5) || r < st.bluff * 0.22) return 'call';
  if (T.street <= 2 && L.toCall <= T.small && r < 0.45 - st.tight * 0.3) return 'call';
  return 'fold';
}

// ---------------------------------------------------------------- sound (tiny synth, no files)
const AU = { ctx: null, on: true };
function actx() { if (!AU.ctx) { try { AU.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AU.ctx = null; } } if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume().catch(() => {}); return AU.ctx; }
function tone(f, d = 0.08, type = 'triangle', v = 0.07, when = 0) { const c = AU.on && actx(); if (!c) return; const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.03); }
function hiss(d = 0.05, v = 0.05) { const c = AU.on && actx(); if (!c) return; const b = c.createBuffer(1, Math.max(1, (c.sampleRate * d) | 0), c.sampleRate), a = b.getChannelData(0); for (let k = 0; k < a.length; k++) a[k] = (Math.random() * 2 - 1) * (1 - k / a.length); const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'highpass'; f.frequency.value = 1800; g.gain.value = v; s.buffer = b; s.connect(f).connect(g).connect(c.destination); s.start(); }
const SFX = {
  card: () => hiss(0.05, 0.06), chip: () => { tone(2300, 0.035, 'square', 0.025); tone(3000, 0.03, 'square', 0.02, 0.035); },
  fold: () => tone(170, 0.14, 'sine', 0.06), turn: () => { tone(880, 0.07, 'sine', 0.05); tone(1320, 0.09, 'sine', 0.04, 0.07); },
  win: () => [523, 659, 784, 1046].forEach((f, k) => tone(f, 0.18, 'triangle', 0.06, k * 0.09)), lose: () => [392, 330, 262].forEach((f, k) => tone(f, 0.18, 'sine', 0.05, k * 0.1)),
  tick: () => tone(1500, 0.02, 'square', 0.02), jack: () => [523, 659, 784, 1046, 1318, 1568].forEach((f, k) => tone(f, 0.22, 'square', 0.035, k * 0.08)),
};

// ---------------------------------------------------------------- card art (canvas)
const FONT = '"Archivo", "Arial Black", Arial, sans-serif';
function rrect(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
function drawSuit(x, s, cx, cy, sz, col) {
  x.save(); x.translate(cx, cy); x.scale(sz / 100, sz / 100); x.fillStyle = col; x.beginPath();
  if (s === 'h') { x.moveTo(0, 38); x.bezierCurveTo(-60, -8, -46, -52, 0, -22); x.bezierCurveTo(46, -52, 60, -8, 0, 38); }
  else if (s === 'd') { x.moveTo(0, -48); x.lineTo(36, 0); x.lineTo(0, 48); x.lineTo(-36, 0); x.closePath(); }
  else if (s === 's') { x.moveTo(0, -46); x.bezierCurveTo(-58, 2, -46, 44, -6, 18); x.lineTo(-16, 48); x.lineTo(16, 48); x.lineTo(6, 18); x.bezierCurveTo(46, 44, 58, 2, 0, -46); }
  else { x.arc(0, -22, 20, 0, 7); x.moveTo(-20, 10); x.arc(-22, 10, 20, 0, 7); x.moveTo(42, 10); x.arc(22, 10, 20, 0, 7); x.moveTo(-6, 14); x.lineTo(-14, 48); x.lineTo(14, 48); x.lineTo(6, 14); }
  x.fill(); x.restore();
}
const PIPS = { 2: [[.5, 0], [.5, 1]], 3: [[.5, 0], [.5, .5], [.5, 1]], 4: [[0, 0], [1, 0], [0, 1], [1, 1]], 5: [[0, 0], [1, 0], [.5, .5], [0, 1], [1, 1]],
  6: [[0, 0], [1, 0], [0, .5], [1, .5], [0, 1], [1, 1]], 7: [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [0, 1], [1, 1]], 8: [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [.5, .75], [0, 1], [1, 1]],
  9: [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [.5, .5], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1]], 10: [[0, 0], [1, 0], [.5, 1 / 6], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [.5, 5 / 6], [0, 1], [1, 1]] };
// fox portraits for the court cards (top half; the card mirrors it like a real court card)
const FACES = {
  J: { who: 'NOBLE', fur: '#e8742c', cheek: '#fff3e6', eye: '#ef1d1d', glow: true, coat: '#475569', trim: '#38bdf8', ear: '#1e293b' },
  Q: { who: 'HOPE', fur: '#f2741f', cheek: '#ffffff', eye: '#1c1917', shades: true, coat: '#e2e8f0', trim: '#38bdf8', ear: '#1c1917', bowArc: true },
  K: { who: 'KING MIGHT', fur: '#d9733a', cheek: '#f4f1ec', eye: '#1c1917', crown: true, beard: true, coat: '#c42d3c', trim: '#ffd23a', ear: '#1e293b' },
};
function drawFoxHead(x, f, cx, cy, s) {
  x.save(); x.translate(cx, cy); x.scale(s, s); x.lineJoin = 'round'; x.lineWidth = 3; x.strokeStyle = '#1c1917';
  // shoulders + outfit
  x.fillStyle = f.coat; x.beginPath(); x.moveTo(-62, 70); x.quadraticCurveTo(-58, 40, -26, 34); x.lineTo(26, 34); x.quadraticCurveTo(58, 40, 62, 70); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = f.trim; x.fillRect(-26, 36, 52, 7); x.strokeRect(-26, 36, 52, 7);
  if (f.who === 'NOBLE') { x.fillStyle = '#cbd5e1'; x.beginPath(); x.moveTo(-14, 46); x.lineTo(14, 46); x.lineTo(10, 66); x.lineTo(-10, 66); x.closePath(); x.fill(); x.stroke(); x.fillStyle = '#0f172a'; x.font = '900 16px ' + FONT; x.textAlign = 'center'; x.fillText('8', 0, 62); }
  if (f.bowArc) { x.strokeStyle = '#ffffff'; x.lineWidth = 4; x.beginPath(); x.arc(46, 20, 44, -1.9, 1.2); x.stroke(); x.strokeStyle = '#1c1917'; x.lineWidth = 3; }
  // ears
  for (const sd of [-1, 1]) { x.fillStyle = f.fur; x.beginPath(); x.moveTo(sd * 18, -26); x.lineTo(sd * 40, -66); x.lineTo(sd * 44, -14); x.closePath(); x.fill(); x.stroke(); x.fillStyle = f.ear; x.beginPath(); x.moveTo(sd * 26, -26); x.lineTo(sd * 39, -54); x.lineTo(sd * 40, -22); x.closePath(); x.fill(); }
  // head
  x.fillStyle = f.fur; x.beginPath(); x.ellipse(0, -2, 40, 36, 0, 0, 7); x.fill(); x.stroke();
  x.fillStyle = f.cheek; x.beginPath(); x.moveTo(-40, 2); x.quadraticCurveTo(-30, 30, 0, 38); x.quadraticCurveTo(30, 30, 40, 2); x.quadraticCurveTo(20, 14, 0, 12); x.quadraticCurveTo(-20, 14, -40, 2); x.fill();
  if (f.beard) { x.fillStyle = '#eef0f4'; x.beginPath(); x.moveTo(-26, 18); x.quadraticCurveTo(0, 62, 26, 18); x.quadraticCurveTo(0, 30, -26, 18); x.fill(); x.stroke(); }
  // snout + nose
  x.fillStyle = f.cheek; x.beginPath(); x.ellipse(0, 14, 15, 11, 0, 0, 7); x.fill();
  x.fillStyle = '#0b0a12'; x.beginPath(); x.ellipse(0, 8, 6.5, 5, 0, 0, 7); x.fill();
  x.beginPath(); x.moveTo(0, 13); x.lineTo(0, 19); x.moveTo(-7, 22); x.quadraticCurveTo(0, 26, 7, 22); x.stroke();
  // eyes
  if (f.shades) { x.fillStyle = '#0b0a12'; rrect(x, -32, -16, 27, 14, 5); x.fill(); rrect(x, 5, -16, 27, 14, 5); x.fill(); x.fillRect(-6, -13, 12, 3); x.fillStyle = '#38bdf8'; x.fillRect(-27, -14, 8, 3); x.fillRect(10, -14, 8, 3); }
  else { for (const sd of [-1, 1]) { if (f.glow) { x.fillStyle = 'rgba(239,29,29,0.35)'; x.beginPath(); x.arc(sd * 16, -8, 11, 0, 7); x.fill(); } x.fillStyle = f.eye; x.beginPath(); x.ellipse(sd * 16, -8, 6, 7.5, 0, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(sd * 16 + 2, -11, 2.2, 0, 7); x.fill(); } }
  if (f.beard) { x.strokeStyle = '#f8fafc'; x.lineWidth = 4; x.beginPath(); x.moveTo(-26, -20); x.lineTo(-8, -18); x.moveTo(8, -18); x.lineTo(26, -20); x.stroke(); x.strokeStyle = '#1c1917'; x.lineWidth = 3; }
  if (f.crown) { x.fillStyle = '#ffd23a'; x.beginPath(); x.moveTo(-26, -30); x.lineTo(-30, -58); x.lineTo(-14, -44); x.lineTo(0, -64); x.lineTo(14, -44); x.lineTo(30, -58); x.lineTo(26, -30); x.closePath(); x.fill(); x.stroke(); x.fillStyle = '#c42d3c'; for (const px of [-15, 0, 15]) { x.beginPath(); x.arc(px, -36, 3.5, 0, 7); x.fill(); } }
  x.restore();
}
function drawShuttle(x, cx, cy, s) {
  x.save(); x.translate(cx, cy); x.scale(s, s); x.lineJoin = 'round'; x.lineWidth = 3; x.strokeStyle = '#1c1917';
  x.fillStyle = '#ffb020'; x.beginPath(); x.moveTo(-10, 62); x.quadraticCurveTo(0, 104, 10, 62); x.fill(); x.fillStyle = '#ec3013'; x.beginPath(); x.moveTo(-6, 62); x.quadraticCurveTo(0, 88, 6, 62); x.fill();
  x.fillStyle = '#f8fafc'; x.beginPath(); x.moveTo(-14, -20); x.lineTo(-48, 46); x.lineTo(-14, 52); x.lineTo(14, 52); x.lineTo(48, 46); x.lineTo(14, -20); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = '#1c1917'; x.beginPath(); x.moveTo(-14, -20); x.lineTo(-48, 46); x.lineTo(-42, 47); x.lineTo(-11, -8); x.closePath(); x.fill(); x.beginPath(); x.moveTo(14, -20); x.lineTo(48, 46); x.lineTo(42, 47); x.lineTo(11, -8); x.closePath(); x.fill();
  x.fillStyle = '#f8fafc'; x.beginPath(); x.moveTo(-14, 60); x.lineTo(-14, -40); x.quadraticCurveTo(0, -78, 14, -40); x.lineTo(14, 60); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = '#1c1917'; x.beginPath(); x.moveTo(-9, -52); x.quadraticCurveTo(0, -78, 9, -52); x.closePath(); x.fill();
  x.fillStyle = '#38bdf8'; x.fillRect(-8, -44, 16, 6);
  x.fillStyle = '#e2e8f0'; x.beginPath(); x.moveTo(-3, 20); x.lineTo(0, -6); x.lineTo(3, 20); x.lineTo(3, 56); x.lineTo(-3, 56); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = '#ec3013'; x.font = '900 13px ' + FONT; x.textAlign = 'center'; x.fillText('8', 0, 36);
  x.restore();
}
function paintCard(code, four, W, H) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'), k = W / 256; x.scale(k, k);
  const r = code[0], s = code[1], col = suitCol(s, four);
  x.fillStyle = '#fbfaf5'; rrect(x, 2, 2, 252, 356, 18); x.fill(); x.lineWidth = 4; x.strokeStyle = '#c9a227'; rrect(x, 8, 8, 240, 344, 13); x.stroke();
  const idx = (flip) => { x.save(); if (flip) { x.translate(256, 360); x.rotate(Math.PI); } x.fillStyle = col; x.textAlign = 'center'; x.font = '900 ' + (r === 'T' ? 46 : 56) + 'px ' + FONT; x.fillText(rankTxt(r), 36, 66); drawSuit(x, s, 36, 96, 38, col); x.restore(); };
  idx(false); idx(true);
  if (PIPS[rv(code)]) {
    const P = PIPS[rv(code)], X0 = 84, X1 = 172, Y0 = 70, Y1 = 290;
    for (const [px, py] of P) { const cx = X0 + px * (X1 - X0), cy = Y0 + py * (Y1 - Y0); x.save(); x.translate(cx, cy); if (py > 0.5) x.rotate(Math.PI); drawSuit(x, s, 0, 0, 46, col); x.restore(); }
  } else if (r === 'A') {
    x.fillStyle = '#0b1530'; rrect(x, 66, 60, 124, 240, 8); x.fill(); x.strokeStyle = col; x.lineWidth = 3; x.stroke();
    x.fillStyle = '#ffffff'; for (let k2 = 0; k2 < 22; k2++) { const sx = 72 + ((k2 * 53) % 112), sy = 68 + ((k2 * 97) % 224); x.fillRect(sx, sy, 2, 2); }
    drawShuttle(x, 128, 168, 1.05); drawSuit(x, s, 128, 270, 30, s === 's' || s === 'c' ? '#f8fafc' : col);
    x.fillStyle = '#ffd23a'; x.font = '900 15px ' + FONT; x.textAlign = 'center'; x.fillText('SHUTTLE', 128, 82);
  } else {
    const F = FACES[r];
    x.fillStyle = col; rrect(x, 62, 56, 132, 248, 6); x.fill();
    x.fillStyle = '#fbf3dc'; rrect(x, 66, 60, 124, 240, 4); x.fill();
    const half = document.createElement('canvas'); half.width = 124; half.height = 120; const h = half.getContext('2d');
    h.fillStyle = s === 'h' || s === 'd' ? '#fde2e2' : (four && s === 'c' ? '#dcfce7' : four && s === 'd' ? '#dbeafe' : '#e7e5e4'); h.fillRect(0, 0, 124, 120);
    drawFoxHead(h, F, 62, 66, 0.82); drawSuit(h, s, 16, 18, 20, col);
    x.drawImage(half, 66, 60); x.save(); x.translate(190, 300); x.rotate(Math.PI); x.drawImage(half, 0, 0); x.restore();
    x.fillStyle = '#1c1917'; x.fillRect(66, 172, 124, 16); x.fillStyle = '#ffd23a'; x.font = '900 ' + (F.who.length > 6 ? 11 : 13) + 'px ' + FONT; x.textAlign = 'center'; x.fillText(F.who, 128, 185);
  }
  return cv;
}
function paintBack(W, H) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'), k = W / 256; x.scale(k, k);
  x.fillStyle = '#fbfaf5'; rrect(x, 2, 2, 252, 356, 18); x.fill();
  x.fillStyle = '#13213f'; rrect(x, 14, 14, 228, 332, 10); x.fill();
  x.strokeStyle = 'rgba(230,180,90,0.45)'; x.lineWidth = 2; for (let d = -360; d < 360; d += 26) { x.beginPath(); x.moveTo(14 + d, 14); x.lineTo(14 + d + 332, 346); x.moveTo(242 - d, 14); x.lineTo(242 - d - 332, 346); x.stroke(); }
  x.strokeStyle = '#e6b45a'; x.lineWidth = 5; rrect(x, 22, 22, 212, 316, 8); x.stroke();
  x.fillStyle = '#13213f'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; x.lineTo(128 + Math.cos(a) * 58, 180 + Math.sin(a) * 58); } x.closePath(); x.fill(); x.lineWidth = 5; x.stroke();
  x.fillStyle = '#ffd23a'; x.textAlign = 'center'; x.font = '900 64px ' + FONT; x.fillText('8', 128, 202); x.font = '900 18px ' + FONT; x.fillText('MERU', 128, 104); x.fillText('CASINO', 128, 272);
  return cv;
}
function paintFelt(RX, RZ) {
  const W = 1024, H = Math.round(1024 * RZ / RX), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  const g = x.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.6); g.addColorStop(0, '#1b7a4d'); g.addColorStop(1, '#0b3d26'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#e6b45a'; x.lineWidth = 6; x.beginPath(); x.ellipse(W / 2, H / 2, W * 0.43, H * 0.43, 0, 0, 7); x.stroke();
  x.lineWidth = 2; x.beginPath(); x.ellipse(W / 2, H / 2, W * 0.41, H * 0.41, 0, 0, 7); x.stroke();
  x.strokeStyle = 'rgba(230,180,90,0.55)'; x.lineWidth = 4; x.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; x.lineTo(W / 2 + Math.cos(a) * W * 0.09, H / 2 + Math.sin(a) * W * 0.09); } x.closePath(); x.stroke();
  x.fillStyle = 'rgba(230,180,90,0.8)'; x.textAlign = 'center'; const fs = Math.round(W * 0.045); x.font = '900 ' + fs + 'px ' + FONT;
  x.fillText('MERU CASINO', W / 2, H / 2 - W * 0.14); x.font = '800 ' + Math.round(fs * 0.55) + 'px ' + FONT; x.fillText('FIVE-CARD STUD · ANTE 1 · BETS 2 / 4', W / 2, H / 2 + W * 0.17);
  return cv;
}
function paintCarpet() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  x.fillStyle = '#4a0f1a'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#b8862e'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(64, 8); x.lineTo(120, 64); x.lineTo(64, 120); x.lineTo(8, 64); x.closePath(); x.stroke();
  x.fillStyle = '#1f3a2e'; x.beginPath(); x.arc(64, 64, 10, 0, 7); x.fill(); x.fillStyle = '#b8862e'; x.fillRect(0, 0, 6, 6); x.fillRect(122, 122, 6, 6); x.fillRect(122, 0, 6, 6); x.fillRect(0, 122, 6, 6);
  return cv;
}
function paintWheel() {
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d'), c = S / 2, R = S / 2 - 4, n = WHEEL.length;
  for (let j = 0; j < n; j++) {
    const a0 = -Math.PI / 2 + j * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n, w = WHEEL[j];
    x.fillStyle = w.jack ? '#ffd23a' : w.xp ? '#1d4ed8' : j % 2 ? '#1c1917' : '#c42d3c'; x.beginPath(); x.moveTo(c, c); x.arc(c, c, R, a0, a1); x.closePath(); x.fill();
    x.strokeStyle = '#e6b45a'; x.lineWidth = 4; x.stroke();
    x.save(); x.translate(c, c); x.rotate((a0 + a1) / 2); x.fillStyle = w.jack ? '#1c1917' : '#ffffff'; x.textAlign = 'right'; x.font = '900 ' + (w.t.length > 3 ? 30 : 40) + 'px ' + FONT; x.fillText(w.t, R - 22, 13); x.restore();
  }
  x.fillStyle = '#e6b45a'; x.beginPath(); x.arc(c, c, 52, 0, 7); x.fill(); x.fillStyle = '#1c1917'; x.beginPath(); x.arc(c, c, 42, 0, 7); x.fill();
  x.fillStyle = '#ffd23a'; x.font = '900 46px ' + FONT; x.textAlign = 'center'; x.fillText('8', c, c + 16);
  return cv;
}
function paintSign(t, w = 512, h = 96, bg = '#1c1917', fg = '#ffd23a') {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = fg; x.lineWidth = 6; x.strokeRect(5, 5, w - 10, h - 10);
  x.fillStyle = fg; x.textAlign = 'center'; x.font = '900 ' + Math.round(h * 0.48) + 'px ' + FONT; x.fillText(t, w / 2, h * 0.66); return cv;
}

// ---------------------------------------------------------------- 3D helpers
function toonRamp(T) { const d = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]); const t = new T.DataTexture(d, 3, 1, T.RGBAFormat); t.minFilter = t.magFilter = T.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; }
function inkMat(T, w) { const m = new T.MeshBasicMaterial({ color: 0x15110e, side: T.BackSide }); m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normal * ' + w.toFixed(4) + ';'); }; return m; }
function merge(T, parts) {
  let n = 0; const gs = parts.map(p => { const g = (p.geo.index ? p.geo.toNonIndexed() : p.geo.clone()); g.applyMatrix4(p.m); n += g.attributes.position.count; return g; });
  const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
  gs.forEach((g, k) => { const c = parts[k].col, cnt = g.attributes.position.count; P.set(g.attributes.position.array, o * 3); Nn.set(g.attributes.normal.array, o * 3); for (let i = 0; i < cnt; i++) { C[(o + i) * 3] = c.r; C[(o + i) * 3 + 1] = c.g; C[(o + i) * 3 + 2] = c.b; } o += cnt; g.dispose(); });
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(Nn, 3)); geo.setAttribute('color', new T.BufferAttribute(C, 3)); geo.computeBoundingSphere(); return geo;
}

// ---------------------------------------------------------------- the game
export async function createMeruPoker({ THREE: T, container, save = null, onState = () => {}, opts = {} }) {
  const phone = opts.phone ?? (matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 500);
  try { if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load('900 40px "Archivo"'), new Promise(r => setTimeout(r, 1200))]); } catch (e) {}
  const S = save, stat = (k, d = 0) => S ? S.stat('meruPoker.' + k, d) : d, setStat = (k, v) => S && S.setStat('meruPoker.' + k, v), flag = k => S ? S.flag('meruPoker.' + k) : false;
  AU.on = !flag('mute');
  let restored = 0; const left = stat('seat'); if (left > 0 && S) { S.addGold(left); setStat('seat', 0); restored = left; }

  // renderer + scene
  const R = new T.WebGLRenderer({ antialias: !phone, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1.75 : 2)); R.shadowMap.enabled = !phone; R.shadowMap.type = T.PCFSoftShadowMap;
  R.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  container.appendChild(R.domElement);
  const scene = new T.Scene(); scene.background = new T.Color('#120a08'); scene.fog = new T.Fog('#120a08', 14, 30);
  const cam = new T.PerspectiveCamera(40, 1, 0.1, 80);
  const ramp = toonRamp(T), toon = (c, o = {}) => new T.MeshToonMaterial({ color: c, gradientMap: ramp, ...o }), ink = inkMat(T, 0.012), inkTable = inkMat(T, 0.02);
  scene.add(new T.HemisphereLight('#ffe6c4', '#3a1610', 1.1));
  const key = new T.DirectionalLight('#fff1d6', 1.6); key.position.set(3, 9, 4); scene.add(key);
  if (!phone) { key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 }); key.shadow.bias = -0.0015; }
  const spot = new T.PointLight('#ffcf8a', 14, 9, 1.6); spot.position.set(0, 3.6, 0); scene.add(spot);
  const G = { sph: new T.SphereGeometry(1, 14, 10), cone: new T.ConeGeometry(1, 1, 12), cyl: new T.CylinderGeometry(1, 1, 1, 14), box: new T.BoxGeometry(1, 1, 1), chip: new T.CylinderGeometry(0.075, 0.075, 0.03, 16), card: new T.PlaneGeometry(0.42, 0.59) };
  const texs = [];
  const tex = cv => { const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; texs.push(t); return t; };

  // room (fixed)
  const room = new T.Group(); scene.add(room);
  const carpet = tex(paintCarpet()); carpet.wrapS = carpet.wrapT = T.RepeatWrapping; carpet.repeat.set(14, 14);
  const floor = new T.Mesh(new T.PlaneGeometry(40, 40), new T.MeshLambertMaterial({ map: carpet })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; room.add(floor);
  const wallM = toon('#3b1d12'), goldM = toon('#d4a23a', { emissive: '#3a2600' }), darkM = toon('#1c1310');
  const backZ = -7;
  const wall = new T.Mesh(new T.PlaneGeometry(40, 9), wallM); wall.position.set(0, 4.5, backZ); room.add(wall);
  for (const sx of [-1, 1]) { const w2 = new T.Mesh(new T.PlaneGeometry(30, 9), wallM); w2.position.set(sx * 9, 4.5, 4); w2.rotation.y = -sx * Math.PI / 2; room.add(w2); }
  for (const y of [0.9, 4.9]) { const b = new T.Mesh(G.box, goldM); b.scale.set(40, 0.08, 0.06); b.position.set(0, y, backZ + 0.03); room.add(b); }
  for (const px of [-6.8, -3.4, 3.4, 6.8]) { const p = new T.Mesh(G.cyl, darkM); p.scale.set(0.28, 6, 0.28); p.position.set(px, 3, backZ + 0.35); room.add(p); const cap = new T.Mesh(G.cyl, goldM); cap.scale.set(0.36, 0.2, 0.36); cap.position.set(px, 5.9, backZ + 0.35); room.add(cap); const lamp = new T.Mesh(G.sph, new T.MeshBasicMaterial({ color: '#ffd28a' })); lamp.scale.setScalar(0.17); lamp.position.set(px, 3.4, backZ + 0.7); room.add(lamp); }
  // slot machines along the back wall (decoration)
  const slotScreen = tex(paintSign('7  8  7', 256, 128, '#0b1530', '#ffd23a'));
  for (const px of [-5.1, -4.2, 4.2, 5.1]) { const g2 = new T.Group(); const body = new T.Mesh(G.box, toon('#9f1239')); body.scale.set(0.75, 1.7, 0.6); body.position.y = 0.85; g2.add(body); const top = new T.Mesh(G.box, goldM); top.scale.set(0.8, 0.22, 0.64); top.position.y = 1.8; g2.add(top); const scr = new T.Mesh(new T.PlaneGeometry(0.56, 0.34), new T.MeshBasicMaterial({ map: slotScreen })); scr.position.set(0, 1.25, 0.31); g2.add(scr); g2.position.set(px, 0, backZ + 0.6); room.add(g2); }
  // the TREASURE WHEEL
  const wheel = new T.Group(); wheel.position.set(0, 3.15, backZ + 0.25); room.add(wheel);
  const wheelDisc = new T.Group(); wheel.add(wheelDisc);
  const WR = 1.2; const face = new T.Mesh(new T.CircleGeometry(WR, 48), new T.MeshBasicMaterial({ map: tex(paintWheel()) })); face.position.z = 0.07; wheelDisc.add(face);
  const rim = new T.Mesh(new T.TorusGeometry(WR, 0.07, 8, 48), goldM); rim.position.z = 0.07; wheelDisc.add(rim);
  for (let j = 0; j < WHEEL.length; j++) { const a = Math.PI / 2 - j * 2 * Math.PI / WHEEL.length; const peg = new T.Mesh(G.sph, goldM); peg.scale.setScalar(0.045); peg.position.set(Math.cos(a) * (WR - 0.02), Math.sin(a) * (WR - 0.02), 0.13); wheelDisc.add(peg); }
  const back = new T.Mesh(G.cyl, darkM); back.scale.set(WR + 0.12, 0.1, WR + 0.12); back.rotation.x = Math.PI / 2; wheel.add(back);
  const pointer = new T.Mesh(G.cone, toon('#ec3013')); pointer.scale.set(0.13, 0.3, 0.08); pointer.rotation.z = Math.PI; pointer.position.set(0, WR + 0.18, 0.18); wheel.add(pointer);
  const sign = new T.Mesh(new T.PlaneGeometry(2.6, 0.48), new T.MeshBasicMaterial({ map: tex(paintSign('TREASURE WHEEL')) })); sign.position.set(0, WR + 0.75, 0.1); wheel.add(sign);
  wheelDisc.rotation.z = 0;
  // table (rebuilt per orientation)
  const tableG = new T.Group(); scene.add(tableG);
  let RX = 2.7, RZ = 1.65, portrait = false, feltTex = null;
  const TOP = 0.8;
  class Ell extends T.Curve { constructor(a, b, y) { super(); this.a = a; this.b = b; this.y = y; } getPoint(t, o = new T.Vector3()) { const a = t * Math.PI * 2; return o.set(Math.sin(a) * this.a, this.y, Math.cos(a) * this.b); } }
  function buildTable() {
    tableG.children.slice().forEach(c => { tableG.remove(c); if (c.geometry && c.geometry !== G.cyl && c.geometry !== G.box) c.geometry.dispose(); });
    if (feltTex) { feltTex.dispose(); texs.splice(texs.indexOf(feltTex), 1); }
    feltTex = tex(paintFelt(RX, RZ));
    const felt = new T.Mesh(new T.CircleGeometry(1, 64), new T.MeshLambertMaterial({ map: feltTex })); felt.rotation.x = -Math.PI / 2; felt.scale.set(RX, RZ, 1); felt.position.y = TOP; felt.receiveShadow = true; tableG.add(felt);
    const railGeo = new T.TubeGeometry(new Ell(RX + 0.04, RZ + 0.04, TOP + 0.04), 96, 0.14, 10, true);
    const railM = toon('#2a1712'); const rail = new T.Mesh(railGeo, railM); rail.castShadow = !phone; tableG.add(rail); tableG.add(new T.Mesh(railGeo, inkTable));
    const trim = new T.Mesh(new T.TubeGeometry(new Ell(RX - 0.12, RZ - 0.12, TOP + 0.01), 96, 0.025, 6, true), goldM); tableG.add(trim);
    const apron = new T.Mesh(new T.CylinderGeometry(1, 1, 0.16, 48, 1, true), toon('#5b2e14', { side: T.DoubleSide })); apron.scale.set(RX + 0.1, 1, RZ + 0.1); apron.position.y = TOP - 0.12; tableG.add(apron);
    const ped = new T.Mesh(G.cyl, toon('#3b1d12')); ped.scale.set(0.35, TOP - 0.15, 0.35); ped.position.y = (TOP - 0.15) / 2; tableG.add(ped);
    const foot = new T.Mesh(G.cyl, goldM); foot.scale.set(0.8, 0.08, 0.6); foot.position.y = 0.04; tableG.add(foot);
    const shoe = new T.Mesh(G.box, toon('#1c1917')); shoe.scale.set(0.34, 0.16, 0.5); shoe.position.copy(shoePos()); shoe.position.y = TOP + 0.08; tableG.add(shoe);
    const shoeTop = new T.Mesh(G.box, goldM); shoeTop.scale.set(0.36, 0.03, 0.52); shoeTop.position.copy(shoe.position); shoeTop.position.y += 0.09; tableG.add(shoeTop);
  }
  const shoePos = () => new T.Vector3(0.55, TOP + 0.1, -RZ + 0.4);

  // foxes
  function buildFox(L, seated = true) {
    const C = h => new T.Color(h), body = [], head = [], tail = [];
    const add = (arr, g, col, p, r = [0, 0, 0], s = [1, 1, 1]) => arr.push({ geo: g, col: C(col), m: new T.Matrix4().compose(new T.Vector3(...p), new T.Quaternion().setFromEuler(new T.Euler(...r)), new T.Vector3(...s)) });
    const coat2 = '#1f2937', y0 = seated ? 0 : 0.35;
    add(body, G.sph, L.coat, [0, 1.02 + y0, 0], [0, 0, 0], [0.34, 0.42, 0.28]);
    add(body, G.sph, L.chest, [0, 1.1 + y0, 0.16], [0, 0, 0], [0.19, 0.27, 0.14]);
    add(body, G.cyl, L.trim, [0, 1.36 + y0, 0], [0, 0, 0], [0.2, 0.05, 0.17]);
    if (L.bow) { add(body, G.cone, '#e11d48', [-0.07, 1.35 + y0, 0.18], [0, 0, Math.PI / 2], [0.05, 0.1, 0.035]); add(body, G.cone, '#e11d48', [0.07, 1.35 + y0, 0.18], [0, 0, -Math.PI / 2], [0.05, 0.1, 0.035]); }
    for (const sd of [-1, 1]) {
      if (seated) { add(body, G.sph, coat2, [sd * 0.15, 0.68, 0.16], [0, 0, 0], [0.13, 0.12, 0.26]); add(body, G.cyl, coat2, [sd * 0.15, 0.36, 0.36], [0, 0, 0], [0.08, 0.6, 0.08]); add(body, G.sph, '#0f172a', [sd * 0.15, 0.06, 0.42], [0, 0, 0], [0.09, 0.06, 0.14]); }
      else { add(body, G.cyl, coat2, [sd * 0.13, 0.55, 0], [0, 0, 0], [0.09, 1.0, 0.09]); add(body, G.sph, '#0f172a', [sd * 0.13, 0.06, 0.05], [0, 0, 0], [0.1, 0.06, 0.15]); }
      add(body, G.sph, L.coat, [sd * 0.3, 1.0 + y0, 0.18], [-0.9, 0, sd * 0.2], [0.09, 0.26, 0.09]);
      add(body, G.sph, L.fur, [sd * 0.27, 0.9 + y0, 0.42], [0, 0, 0], [0.09, 0.07, 0.11]);
    }
    if (seated) { add(body, G.cyl, '#5b3a22', [0, 0.52, 0], [0, 0, 0], [0.3, 0.06, 0.3]); add(body, G.cyl, '#2b1d14', [0, 0.26, 0], [0, 0, 0], [0.05, 0.5, 0.05]); add(body, G.cyl, '#c9a227', [0, 0.02, 0], [0, 0, 0], [0.22, 0.03, 0.22]); }
    add(tail, G.sph, L.fur, [0, 0, -0.18], [0.6, 0, 0], [0.14, 0.14, 0.3]); add(tail, G.sph, L.fur, [0, 0.14, -0.42], [0.95, 0, 0], [0.15, 0.15, 0.24]); add(tail, G.sph, '#ffffff', [0, 0.3, -0.56], [1.2, 0, 0], [0.11, 0.11, 0.14]);
    add(head, G.sph, L.fur, [0, 0.22, 0], [0, 0, 0], [0.27, 0.25, 0.25]);
    for (const sd of [-1, 1]) {
      add(head, G.sph, L.chest, [sd * 0.15, 0.12, 0.1], [0, 0, 0], [0.13, 0.1, 0.11]);
      add(head, G.sph, L.eye, [sd * 0.1, 0.27, 0.2], [0, 0, 0], [0.045, 0.055, 0.03]); add(head, G.sph, '#ffffff', [sd * 0.09 + 0.012, 0.29, 0.226], [0, 0, 0], [0.014, 0.014, 0.01]);
      add(head, G.cone, L.fur, [sd * 0.15, 0.48, -0.02], [0, 0, -sd * 0.35], [0.1, 0.25, 0.07]); add(head, G.cone, '#3f1d1d', [sd * 0.15, 0.46, 0.02], [0, 0, -sd * 0.35], [0.06, 0.17, 0.03]);
    }
    add(head, G.cone, L.chest, [0, 0.14, 0.28], [Math.PI / 2, 0, 0], [0.11, 0.24, 0.09]); add(head, G.sph, '#111111', [0, 0.15, 0.4], [0, 0, 0], [0.035, 0.03, 0.03]);
    if (L.hat === 'visor') { add(head, G.cyl, '#15803d', [0, 0.38, 0.16], [0.35, 0, 0], [0.24, 0.015, 0.17]); add(head, G.cyl, '#14532d', [0, 0.38, 0], [0, 0, 0], [0.26, 0.04, 0.24]); }
    if (L.hat === 'cap') { add(head, G.sph, L.trim, [0, 0.4, 0], [0, 0, 0], [0.25, 0.12, 0.24]); add(head, G.cyl, L.trim, [0, 0.37, 0.22], [0.15, 0, 0], [0.15, 0.02, 0.12]); }
    if (L.hat === 'bowler') { add(head, G.cyl, '#111111', [0, 0.5, 0], [0, 0, 0], [0.17, 0.16, 0.17]); add(head, G.cyl, '#111111', [0, 0.42, 0], [0, 0, 0], [0.27, 0.02, 0.27]); }
    if (L.hat === 'shades') { for (const sd of [-1, 1]) add(head, G.box, '#0b0a12', [sd * 0.1, 0.27, 0.235], [0, 0, 0], [0.12, 0.06, 0.03]); add(head, G.box, '#0b0a12', [0, 0.28, 0.24], [0, 0, 0], [0.08, 0.015, 0.02]); }
    const mat = toon('#ffffff', { vertexColors: true }), root = new T.Group();
    const mk = parts => { const g = merge(T, parts), m = new T.Mesh(g, mat), o = new T.Mesh(g, ink); m.castShadow = !phone; const gr = new T.Group(); gr.add(m, o); return gr; };
    const B = mk(body), H = mk(head), Tl = mk(tail); H.position.set(0, 1.42 + y0, 0.02); Tl.position.set(0, 0.62 + y0, -0.2);
    root.add(B, H, Tl); root.userData = { head: H, tail: Tl, body: B, mat, yaw: 0, bob: Math.random() * 6 };
    return root;
  }
  const seatG = new T.Group(); scene.add(seatG);
  let foxes = [], foxKey = '', dealer = null;
  const dealerLook = LYRA;

  // layout helpers
  const ANG = { 1: [0], 2: [0, 140], 3: [0, 120, 240], 4: [0, 80, 150, 280], 5: [0, 80, 140, 220, 280] };
  const slotAng = (slot, n) => (ANG[n] || ANG[5])[slot] * Math.PI / 180;
  const ell = (a, f) => new T.Vector3(Math.sin(a) * RX * f, TOP, Math.cos(a) * RZ * f);
  const outward = (a, d) => { const p = ell(a, 1), n = new T.Vector3(Math.sin(a) / RX, 0, Math.cos(a) / RZ).normalize(); return p.addScaledVector(n, d); };
  const tangent = a => new T.Vector3(Math.cos(a) * RX, 0, -Math.sin(a) * RZ).normalize();

  // cards
  const W = phone ? 200 : 256, H = Math.round(W * 360 / 256);
  let four = flag('fourColor');
  const cardTex = new Map(); const backTex = tex(paintBack(W, H));
  const frontTex = c => { const k = c + (four ? '4' : ''); if (!cardTex.has(k)) cardTex.set(k, tex(paintCard(c, four, W, H))); return cardTex.get(k); };
  const backMat = new T.MeshLambertMaterial({ map: backTex, alphaTest: 0.5 });
  const cards = new Map(); // key -> {g, flip, front, code, pose:{p,yaw,tilt,flip}, dead}
  const cardsG = new T.Group(); scene.add(cardsG);
  function newCard() {
    const g = new T.Group(), flip = new T.Group(); g.add(flip); g.rotation.order = 'YXZ';
    const front = new T.Mesh(G.card, new T.MeshLambertMaterial({ map: backTex, alphaTest: 0.5 })), bk = new T.Mesh(G.card, backMat); bk.rotation.y = Math.PI;
    front.castShadow = bk.castShadow = !phone; flip.add(front, bk); const sp = shoePos(); g.position.copy(sp); g.rotation.set(-Math.PI / 2, 0, 0); flip.rotation.y = Math.PI; cardsG.add(g);
    return { g, flip, front, code: null, yaw: 0, tilt: -Math.PI / 2, fl: Math.PI, p: sp.clone(), tp: sp.clone() };
  }
  // chips
  const chipM = ['#c42d3c', '#1d4ed8', '#e6b45a', '#f5f5f4', '#1c1917'].map(c => toon(c));
  const stacks = new Map(); // key -> {g, n}
  const chipsG = new T.Group(); scene.add(chipsG);
  function stack(key, n, pos, cols = 4, perCol = 8) {
    let s = stacks.get(key); if (!s) { s = { g: new T.Group(), n: -1 }; stacks.set(key, s); chipsG.add(s.g); }
    s.g.position.copy(pos);
    if (s.n === n) return; s.n = n; s.g.clear();
    for (let i = 0; i < n; i++) { const col = (i / perCol) | 0, h = i % perCol, c = new T.Mesh(G.chip, chipM[(col + (h > 4 ? 1 : 0)) % 5]); const a = col * 2.4; c.position.set(Math.cos(a) * (col ? 0.17 : 0), 0.016 + h * 0.031, Math.sin(a) * (col ? 0.17 : 0)); c.rotation.y = i; s.g.add(c); if (col >= cols) break; }
  }

  // ---------------------------------------------------------------- state
  const st = {
    mode: 'menu', snap: null, practice: false, buyIn: 0, rivals: 3, table: null, net: null, peek: false, wheel: null, spins: stat('spins'),
    msg: restored ? 'WELCOME BACK · ' + restored + ' CHIPS FROM LAST TIME WENT BACK TO YOUR GOLD' : 'LYRA · PULL UP A STOOL. FIVE-CARD STUD, FOXES AND SHUTTLES.', result: null, overMsg: '', lastHand: 0,
  };
  let insets = { top: 60, bottom: 200, left: 0, right: 0 }, labelPos = [], dirty = true, raf = 0, last = performance.now(), Wpx = 1, Hpx = 1, camShift = [0, 0];
  const camBase = { p: new T.Vector3(0, 8, 8), t: new T.Vector3(0, TOP, 0) }, camCur = { p: new T.Vector3(0, 8, 8), t: new T.Vector3(0, TOP, 0) };
  const emit = () => { dirty = true; };

  function layoutFoxes(snap) {
    const n = snap ? snap.seats.length : 1, my = snap ? snap.mySeat : 0;
    const k2 = snap ? snap.seats.map((s, i) => i === my ? 'ME' : s.name + (s.look ? s.look.coat : '')).join('|') + (portrait ? 'P' : 'L') : 'none' + (portrait ? 'P' : 'L');
    if (!dealer) { dealer = buildFox(dealerLook, false); scene.add(dealer); }
    const da = Math.PI; dealer.position.copy(outward(da, 0.55)); dealer.position.y = 0; dealer.rotation.y = 0; dealer.userData.yaw0 = 0;
    if (k2 === foxKey) return; foxKey = k2;
    foxes.forEach(f => { if (f) { seatG.remove(f); f.traverse(o => { if (o.isMesh && o.material !== ink) { /* geometry shared with outline */ } }); f.children.forEach(c => c.children.forEach(m => { if (m.geometry && m.material !== ink) m.geometry.dispose(); })); } });
    foxes = [];
    if (!snap) return;
    snap.seats.forEach((s, i) => {
      if (i === my) { foxes.push(null); return; }
      const slot = (i - my + n) % n, a = slotAng(slot, n), f = buildFox(s.look || RIVALS[i % RIVALS.length]);
      const p = outward(a, 0.5); f.position.set(p.x, 0, p.z); f.rotation.y = a + Math.PI; f.userData.yaw0 = a + Math.PI; seatG.add(f); foxes.push(f);
    });
  }
  function fitCamera() {
    const w = Wpx, h = Hpx; cam.aspect = w / h; cam.fov = portrait ? 44 : 36; cam.updateProjectionMatrix();
    const sideM = portrait ? 0.1 : 0.04, xl = -1 + 2 * insets.left / w + sideM, xr = 1 - 2 * insets.right / w - sideM, yb = -1 + 2 * insets.bottom / h, yt = 1 - 2 * insets.top / h;
    const pts = []; for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; pts.push(ell(a, 1.08)); }
    const n = st.snap ? st.snap.seats.length : 4;
    for (let s = 1; s < n; s++) { const p = outward(slotAng(s, n), 0.75); pts.push(new T.Vector3(p.x, 2.05, p.z), new T.Vector3(p.x, 0.6, p.z)); }
    pts.push(new T.Vector3(0, 2.3, -RZ - 0.55)); const me = ell(0, 1.0); pts.push(new T.Vector3(-1.1, TOP, me.z + 0.25), new T.Vector3(1.1, TOP, me.z + 0.25));
    const pitch = (portrait ? 54 : 46) * Math.PI / 180, dir = new T.Vector3(0, Math.sin(pitch), Math.cos(pitch)), tgt = new T.Vector3(0, TOP, portrait ? 0.15 : 0.1);
    let d = 9, bb = null; const v = new T.Vector3();
    const measure = () => { cam.position.copy(tgt).addScaledVector(dir, d); cam.lookAt(tgt); cam.updateMatrixWorld(); let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for (const p of pts) { v.copy(p).project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); } return { x0, x1, y0, y1 }; };
    for (let it = 0; it < 5; it++) { bb = measure(); const s = Math.max((bb.x1 - bb.x0) / (xr - xl), (bb.y1 - bb.y0) / (yt - yb)); d = Math.max(3, Math.min(40, d * (1 + (s - 1) * 0.92))); }
    bb = measure(); camShift = [(xl + xr) / 2 - (bb.x0 + bb.x1) / 2, (yb + yt) / 2 - (bb.y0 + bb.y1) / 2];
    camBase.p.copy(cam.position); camBase.t.copy(tgt); applyShift();
  }
  function applyShift() { cam.updateProjectionMatrix(); cam.projectionMatrix.elements[8] -= camShift[0]; cam.projectionMatrix.elements[9] -= camShift[1]; cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert(); }
  function resize() {
    const r = container.getBoundingClientRect(); Wpx = Math.max(1, r.width | 0); Hpx = Math.max(1, r.height | 0); R.setSize(Wpx, Hpx, false);
    const p = Hpx > Wpx * 1.05; if (p !== portrait || !feltTex) { portrait = p; RX = p ? 1.55 : 2.7; RZ = p ? 2.45 : 1.65; buildTable(); foxKey = ''; layoutFoxes(st.snap); }
    fitCamera(); camCur.p.copy(camBase.p); camCur.t.copy(camBase.t); emit();
  }

  // ---------------------------------------------------------------- sync the 3D table to a snapshot
  let prevPot = 0, prevWin = '', prevTurn = -2;
  function sync(snap) {
    const old = st.snap; st.snap = snap; if (!snap) return;
    const n = snap.seats.length, my = snap.mySeat;
    if (!old || old.seats.length !== n) { foxKey = ''; layoutFoxes(snap); fitCamera(); } else layoutFoxes(snap);
    if (snap.hand !== st.lastHand) { st.lastHand = snap.hand; cards.forEach(c => { c.dead = performance.now(); c.tp = shoePos(); c.tp.y += 0.3; c.fl = Math.PI; }); st.result = null; }
    let newCards = 0;
    snap.seats.forEach((s, i) => {
      const slot = (i - my + n) % n, a = slotAng(slot, n), mine = i === my, tg = tangent(a);
      const base = ell(a, mine ? 0.58 : 0.55), sp = mine ? 0.47 : 0.44;
      s.cards.forEach((c, k) => {
        const key = snap.hand + ':' + i + ':' + k; let m = cards.get(key); if (!m) { m = newCard(); cards.set(key, m); newCards++; }
        if (c.c && m.code !== c.c) { m.code = c.c; m.front.material.map = frontTex(c.c); m.front.material.needsUpdate = true; }
        const p = base.clone().addScaledVector(tg, (k - 2) * sp); p.y = TOP + 0.012 + k * 0.002;
        let tilt = -Math.PI / 2, fl = c.c && (c.up || snap.reveal || mine) ? 0 : Math.PI;
        if (mine && !c.up && !snap.reveal && c.c && !s.folded) { tilt = -Math.PI / 2 + 0.75; p.y += 0.16; p.addScaledVector(new T.Vector3(Math.sin(a), 0, Math.cos(a)), 0.12); }
        if (s.folded) { fl = Math.PI; p.lerp(ell(a, 0.3), 0.35); p.y = TOP + 0.01 + k * 0.002; }
        m.tp = p; m.yaw = a; m.tilt = tilt; m.fl = fl;
      });
    });
    if (newCards) SFX.card();
    // chips
    const pot = snap.pot + snap.seats.reduce((t, s) => t + s.bet, 0);
    stack('pot', Math.min(32, snap.pot), new T.Vector3(0, TOP, 0), 4, 8);
    snap.seats.forEach((s, i) => { const slot = (i - my + n) % n, a = slotAng(slot, n); stack('bet' + i, Math.min(8, s.bet), ell(a, 0.8).addScaledVector(tangent(a), -0.75), 1, 8); stack('bank' + i, Math.min(24, Math.ceil(s.chips / 4)), ell(a, 0.86).addScaledVector(tangent(a), 0.95), 3, 8); });
    for (const [k] of stacks) { const m = /^(bet|bank)(\d+)$/.exec(k); if (m && +m[2] >= n) { stacks.get(k).g.clear(); stacks.get(k).n = 0; } }
    if (pot > prevPot) SFX.chip(); prevPot = pot;
    const wk = snap.hand + ':' + snap.winners.join(',');
    if (snap.phase === 'done' && snap.winners.length && wk !== prevWin) { prevWin = wk; (snap.winners.includes(my) ? SFX.win : SFX.lose)(); }
    if (snap.toAct === my && snap.phase === 'bet' && prevTurn !== snap.hand * 100 + snap.street) { prevTurn = snap.hand * 100 + snap.street; SFX.turn(); }
    if (old && old.seats.some((s, i) => !s.folded && snap.seats[i] && snap.seats[i].folded)) SFX.fold();
    emit();
  }

  // ---------------------------------------------------------------- SOLO
  function startSolo({ rivals = 3, practice = false } = {}) {
    stopAll(); actx();
    let buy = STAKES.buyIn, gold = S ? S.data.gold : 0;
    if (!practice) { buy = Math.min(STAKES.buyIn, gold); if (buy < STAKES.minBuy || !S) practice = true; else { S.spend(buy); setStat('seat', buy); } }
    if (practice) buy = STAKES.buyIn;
    st.mode = 'solo'; st.practice = practice; st.buyIn = buy; st.rivals = Math.max(1, Math.min(4, rivals)); st.result = null; st.overMsg = '';
    const pool = shuffle(RIVALS.slice()); st.pool = pool.slice(st.rivals);
    const seats = [{ id: 'me', name: 'YOU', kind: 'me', chips: buy, look: null }, ...pool.slice(0, st.rivals).map(r => ({ id: r.name, name: r.name, kind: 'ai', chips: STAKES.buyIn, look: r, ai: r.ai }))];
    st.table = new Table({ seats, onChange: t => { sync(t.snap(0)); if (!st.practice) setStat('seat', t.seats[0].chips); }, onHandEnd: soloHandEnd, aiFast: !!opts.fast });
    st.table.newHand();
  }
  function soloHandEnd(t, r) {
    const me = t.seats[0], won = r.winners.includes(0);
    if (S) { S.setStat('meruPoker.hands', stat('hands') + 1); if (won) { S.setStat('meruPoker.wins', stat('wins') + 1); S.best('meruPoker.bestPot', me.won); if (!st.practice) S.addXp(2); } }
    const ev = r.ev[0];
    if (ev && won) { if (S) S.best('meruPoker.bestHand', ev.cat + 1); if (ev.royal && S) S.setFlag('meruPoker.royal'); if (!st.practice && ev.cat >= 2 && !r.byFold) { st.spins = Math.min(3, st.spins + 1); setStat('spins', st.spins); st.result = { kicker: 'TREASURE WHEEL', line: ev.name + ' EARNS A SPIN' }; } }
    if (!st.result) st.result = won ? { kicker: 'YOU WIN ' + me.won, line: r.byFold ? 'EVERYONE FOLDED' : (ev ? ev.name : '') } : { kicker: me.folded ? 'YOU FOLDED' : 'NOT THIS TIME', line: t.msg };
    if (me.chips < t.ante) st.overMsg = 'OUT OF CHIPS';
    emit();
  }
  function nextHand() {
    const t = st.table; if (!t || st.mode !== 'solo') return;
    if (t.seats[0].chips < t.ante) return;
    const gone = [];
    t.seats.forEach((s, i) => { if (i && s.chips < t.ante) { const r = st.pool.shift() || RIVALS[(Math.random() * RIVALS.length) | 0]; st.pool.push(RIVALS.find(x => x.name === s.name) || r); gone.push(s.name + ' TAPS OUT · ' + r.name + ' SITS DOWN'); Object.assign(s, { id: r.name, name: r.name, look: r, ai: r.ai, chips: STAKES.buyIn, out: false }); } });
    st.result = null; t.newHand(); if (gone.length) { t.say(gone.join(' · ')); t.change(); }
  }
  function cashOut() {
    const t = st.table; if (st.mode === 'solo' && t && !st.practice && S) { const c = t.seats[0].chips; if (c > 0) S.addGold(c); setStat('seat', 0); st.msg = 'CASHED OUT ' + c + ' GOLD'; }
    else st.msg = st.mode === 'solo' ? 'PRACTICE TABLE CLOSED' : st.msg;
    stopAll(); st.mode = 'menu'; st.snap = null; clearTable(); emit();
  }
  function rebuy() { const r = st.rivals, p = st.practice; cashOut(); startSolo({ rivals: r, practice: p }); }
  function clearTable() { cards.forEach(c => { cardsG.remove(c.g); c.front.material.dispose(); }); cards.clear(); stacks.forEach(s => { s.g.clear(); s.n = -1; }); foxKey = ''; layoutFoxes(null); prevPot = 0; }
  function stopAll() { if (st.table) st.table.destroy(); st.table = null; st.wheel = null; st.peek = false; }
  function act(a) { actx(); const t = st.table, sn = st.snap; if (!sn) return false;
    if (st.mode === 'net' && st.net && !st.net.host) { if (sn.toAct !== sn.mySeat || sn.phase !== 'bet') return false; st.net.send('ev', { k: 'act', a, h: sn.hand }, st.net.hostId()); return true; }
    return t ? t.act(sn.mySeat, a) : false; }

  // ---------------------------------------------------------------- TREASURE WHEEL
  function spin(demo) { // demo = a show spin for the demo: no spin used, nothing paid out
    if (st.wheel || st.mode !== 'solo' || (!demo && (st.spins <= 0 || st.practice))) return false;
    const sn = st.snap; if (sn && sn.phase !== 'done' && sn.phase !== 'idle') return false;
    actx(); if (!demo) { st.spins--; setStat('spins', st.spins); }
    const j = (Math.random() * WHEEL.length) | 0, seg = 2 * Math.PI / WHEEL.length, c = (j + 0.5) * seg + (Math.random() - 0.5) * seg * 0.6;
    const r0 = wheelDisc.rotation.z, base = r0 - (r0 % (2 * Math.PI)), target = base + 2 * Math.PI * 5 + c;
    st.wheel = { j, r0, target, t: 0, dur: 4.4, done: false, lastTick: -1, demo: !!demo }; st.peek = false; emit(); return true;
  }
  function wheelDone() {
    const w = WHEEL[st.wheel.j];
    if (S && !st.wheel.demo) { if (w.g) S.addGold(w.g); if (w.xp) S.addXp(w.xp); }
    st.result = { kicker: st.wheel.demo ? 'DEMO SPIN · NOTHING PAID' : w.jack ? 'JACKPOT' : 'TREASURE WHEEL', line: w.g ? '+' + w.g + ' GOLD' : '+' + w.xp + ' XP' };
    (w.jack ? SFX.jack : SFX.win)(); st.wheel.done = true; setTimeout(() => { st.wheel = null; emit(); }, 1800); emit();
  }

  // ---------------------------------------------------------------- ONLINE (host deals; peers send actions)
  function netBegin({ me, players, isHost, send, hostId, fill = true }) {
    stopAll(); clearTable(); actx();
    const ids = players.map(p => p.id); st.mode = 'net'; st.practice = true; st.result = null; st.overMsg = '';
    st.net = { me, isHost, host: isHost, send, hostId, ids, players };
    if (isHost) {
      const seats = players.map((p, k) => ({ id: p.id, name: p.id === me ? p.name : p.name, kind: p.id === me ? 'me' : 'net', chips: STAKES.buyIn, look: { name: p.name, fur: '#f2741f', chest: '#fff4e6', coat: p.col, trim: '#ffd23a', eye: '#1c1917', hat: null } }));
      if (fill) { const pool = shuffle(RIVALS.slice()); while (seats.length < 5 && seats.length < players.length + 2) { const r = pool.shift(); seats.push({ id: r.name, name: r.name, kind: 'ai', chips: STAKES.buyIn, look: r, ai: r.ai }); } }
      const T2 = st.table = new Table({ seats, turnMs: 30000, onChange: t => { netBroadcast(t); }, onHandEnd: (t) => { t.later(6500, () => { if (st.table === t) t.newHand(); }); }, onOver: (t, i) => { st.overMsg = (t.seats[i] ? t.seats[i].name : '') + ' WINS THE TABLE'; emit(); } });
      T2.newHand();
    }
    emit();
  }
  function netBroadcast(t) {
    const n = st.net; if (!n) return; const meIdx = t.seats.findIndex(s => s.id === n.me);
    t.seats.forEach((s, i) => { if (s.kind === 'net' && !s.gone) { const sn = t.snap(i); sn.names = t.seats.map(x => x.id === s.id ? 'YOU' : x.name); n.send('sn', sn, s.id); } });
    const mine = t.snap(meIdx); sync(mine);
  }
  function netRecv(type, d, id) {
    const n = st.net; if (!n || !d) return;
    if (n.host) { if (type === 'ev' && d.k === 'act' && st.table) { const i = st.table.seats.findIndex(s => s.id === id); if (i >= 0 && d.h === st.table.hand) st.table.act(i, d.a); } return; }
    if (type === 'sn' && id === n.hostId()) { const sn = { ...d }; if (sn.names) sn.seats = sn.seats.map((s, i) => ({ ...s, name: sn.names[i] })); sync(sn); if (sn.phase === 'over') { const w = sn.seats.find(s => s.chips > 0 && !s.out); st.overMsg = (w ? w.name : '') + ' WINS THE TABLE'; } }
  }
  function netDrop(id) {
    const n = st.net; if (!n) return;
    if (n.host && st.table) { const t = st.table, i = t.seats.findIndex(s => s.id === id); if (i < 0) return; const s = t.seats[i]; s.gone = true; s.name = s.name + ' (LEFT)'; if (t.toAct === i && t.phase === 'bet') { const L = t.legal(i); t.act(i, L.check ? 'check' : 'fold'); } s.folded = true; s.out = true; s.kind = 'ai'; t.change(); }
    else if (!n.host && id === n.hostId()) { st.overMsg = 'THE HOST LEFT · HAND ENDED'; emit(); }
  }
  function netEnd() { stopAll(); st.net = null; st.mode = 'menu'; st.snap = null; clearTable(); emit(); }

  // ---------------------------------------------------------------- HUD for the page
  function hud() {
    const sn = st.snap, n = sn ? sn.seats.length : 0, my = sn ? sn.mySeat : 0, me = sn ? sn.seats[my] : null;
    const street = sn ? (sn.phase === 'done' ? (sn.reveal ? 'SHOWDOWN' : 'HAND OVER') : sn.phase === 'over' ? 'TABLE OVER' : ['', '', '2ND CARD', '3RD CARD', '4TH CARD', '5TH CARD'][sn.street] || 'DEALING') : '';
    const cardChip = c => c.c ? { t: rankTxt(c.c[0]), s: SUIT_CH[c.c[1]], col: suitCol(c.c[1], four), bg: '#fbfaf5', hole: !c.up, aria: cardName(c.c) } : { t: '', s: '', col: '#e6b45a', bg: '#13213f', hole: true, aria: 'face down' };
    const seats = sn ? sn.seats.map((s, i) => {
      const up = s.cards.filter(c => c.up).map(c => c.c), showing = up.length >= 2 ? evalHand(up) : null, lp = labelPos[i] || { x: -100, y: -100 };
      const active = sn.toAct === i && sn.phase === 'bet', won = s.won > 0 && sn.phase === 'done';
      let status = active ? (i === my ? 'YOUR TURN' : 'THINKING') : won ? 'WINS ' + s.won : s.out ? 'OUT' : s.last || '';
      if (sn.reveal && s.show && !s.folded) status = (won ? 'WINS ' + s.won + ' · ' : '') + s.show;
      return { i, name: s.name, chips: s.chips, bet: s.bet, betTxt: s.bet ? 'BET ' + s.bet : '', me: i === my, x: lp.x + '%', y: lp.y + '%', vis: lp.vis && !st.peek && !st.wheel, active, won, folded: s.folded, out: s.out,
        bd: won ? '#22c55e' : active ? '#ffd23a' : '#3a3836', op: s.folded || s.out ? 0.55 : 1, status, showTxt: !sn.reveal && showing && showing.cat > 0 ? showing.name + ' SHOWING' : '', cards: s.cards.map(cardChip),
        aria: s.name + ', ' + s.chips + ' chips. ' + (s.folded ? 'Folded. ' : '') + 'Showing ' + (up.length ? up.map(cardName).join(', ') : 'nothing') + '. ' + status };
    }) : [];
    let acts = [], waitTxt = '';
    if (sn && st.mode !== 'menu') {
      if (sn.phase === 'bet' && sn.toAct === my) {
        const toCall = Math.max(0, sn.curBet - me.bet), size = sn.street <= 3 ? sn.small : sn.big;
        if (toCall > 0) acts.push({ k: 'fold', label: 'FOLD', sub: 'GIVE UP THE HAND', kind: 'ghost' });
        if (toCall === 0) acts.push({ k: 'check', label: 'CHECK', sub: 'BET NOTHING', kind: 'plain' });
        else acts.push({ k: 'call', label: 'CALL ' + Math.min(toCall, me.chips), sub: me.chips <= toCall ? 'ALL IN' : 'MATCH THE BET', kind: 'plain' });
        if (sn.curBet === 0 && me.chips > 0) acts.push({ k: 'bet', label: 'BET ' + Math.min(size, me.chips), sub: me.chips <= size ? 'ALL IN' : 'OPEN THE BETTING', kind: 'hot' });
        else if (sn.curBet > 0 && sn.raises < sn.maxRaises && me.chips > toCall) acts.push({ k: 'raise', label: 'RAISE TO ' + Math.min(sn.curBet + size, me.bet + me.chips), sub: (sn.maxRaises - sn.raises) + ' RAISE' + (sn.maxRaises - sn.raises > 1 ? 'S' : '') + ' LEFT', kind: 'hot' });
      } else if (sn.phase === 'bet' && sn.seats[sn.toAct]) waitTxt = sn.seats[sn.toAct].name + ' IS THINKING';
      else if (sn.phase === 'deal' || sn.phase === 'settle') waitTxt = 'LYRA IS DEALING';
      else if (sn.phase === 'done') {
        if (st.mode === 'solo') { if (me.chips >= sn.ante) acts.push({ k: 'next', label: 'NEXT HAND', sub: 'ANTE ' + sn.ante, kind: 'hot' }); else acts.push({ k: 'rebuy', label: st.practice ? 'NEW STACK' : 'BUY IN AGAIN', sub: st.practice ? 'PRACTICE CHIPS' : 'UP TO ' + STAKES.buyIn + ' GOLD', kind: 'hot' }); if (st.spins > 0 && !st.practice) acts.push({ k: 'spin', label: 'SPIN THE WHEEL', sub: st.spins + ' SPIN' + (st.spins > 1 ? 'S' : ''), kind: 'gold' }); acts.push({ k: 'cash', label: st.practice ? 'LEAVE' : 'CASH OUT ' + me.chips, sub: st.practice ? 'BACK TO THE MENU' : 'CHIPS BACK TO GOLD', kind: 'ghost' }); }
        else waitTxt = st.overMsg || 'NEXT HAND IN A MOMENT';
      } else if (sn.phase === 'over') waitTxt = st.overMsg || 'TABLE OVER';
    }
    const myCards = me ? me.cards.map(cardChip) : [], myEval = me && me.cards.length && me.cards.every(c => c.c) ? evalHand(me.cards.map(c => c.c)) : null;
    const secs = sn && sn.deadline ? Math.max(0, Math.ceil((sn.deadline - Date.now()) / 1000)) : 0;
    return {
      mode: st.mode, phase: sn ? sn.phase : 'idle', hand: sn ? sn.hand : 0, pot: sn ? sn.pot + sn.seats.reduce((t, s) => t + s.bet, 0) : 0, street, msg: sn ? sn.msg : st.msg,
      seats, rivals: seats.filter(s => !s.me), me: me ? { chips: me.chips, bet: me.bet, folded: me.folded, cards: myCards, handName: me.folded ? 'FOLDED' : myEval ? myEval.name : '', name: me.name } : null,
      acts, waitTxt, myTurn: !!(sn && sn.phase === 'bet' && sn.toAct === my), secs, spins: st.spins, wheel: st.wheel ? { busy: !st.wheel.done } : null, result: st.result, overMsg: st.overMsg,
      practice: st.practice, gold: S ? S.data.gold : 0, peek: st.peek, four, mute: !AU.on, portrait, net: !!st.net, host: !!(st.net && st.net.host), stakesTxt: 'ANTE ' + STAKES.ante + ' · BETS ' + STAKES.small + ' / ' + STAKES.big,
      best: { hands: stat('hands'), wins: stat('wins'), pot: stat('bestPot'), hand: stat('bestHand') ? CAT_NAME[stat('bestHand') - 1] : '—' },
    };
  }
  function labels() {
    const sn = st.snap; labelPos = []; if (!sn) return; const n = sn.seats.length, my = sn.mySeat, v = new T.Vector3();
    sn.seats.forEach((s, i) => {
      if (i === my) { labelPos[i] = { x: 50, y: 100, vis: false }; return; }
      const slot = (i - my + n) % n, p = outward(slotAng(slot, n), 0.5); v.set(p.x, 2.25, p.z).project(cam);
      labelPos[i] = { x: Math.round((v.x + 1) * 50 * 10) / 10, y: Math.round((1 - v.y) * 50 * 10) / 10, vis: v.z < 1 };
    });
  }

  // ---------------------------------------------------------------- loop
  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  let emitT = 0, lastSecs = -1;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const tsec = now / 1000;
    // cards
    for (const [k, c] of cards) {
      c.p.x = damp(c.p.x, c.tp.x, 9, dt); c.p.y = damp(c.p.y, c.tp.y, 9, dt); c.p.z = damp(c.p.z, c.tp.z, 9, dt);
      const lift = Math.max(0, 0.18 * Math.sin(Math.min(1, c.p.distanceTo(c.tp) / 1.5) * Math.PI));
      c.g.position.set(c.p.x, c.p.y + lift, c.p.z);
      c.g.rotation.y = damp(c.g.rotation.y, c.yaw, 10, dt); c.g.rotation.x = damp(c.g.rotation.x, c.tilt, 10, dt); c.flip.rotation.y = damp(c.flip.rotation.y, c.fl, 8, dt);
      if (c.dead && now - c.dead > 700) { cardsG.remove(c.g); c.front.material.dispose(); cards.delete(k); }
    }
    // foxes look at whoever acts; winners bounce, folders slump
    const sn = st.snap, n = sn ? sn.seats.length : 0, my = sn ? sn.mySeat : 0;
    foxes.forEach((f, i) => {
      if (!f) return; const u = f.userData, s = sn.seats[i];
      let yaw = 0; if (sn.toAct >= 0 && sn.toAct !== i) { const ts = (sn.toAct - my + n) % n, a1 = slotAng(ts, n), a0 = slotAng((i - my + n) % n, n); const pa = outward(a1, 0.3), pb = outward(a0, 0.5); const ang = Math.atan2(pa.x - pb.x, pa.z - pb.z); yaw = Math.max(-0.7, Math.min(0.7, ((ang - u.yaw0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI)); }
      u.head.rotation.y = damp(u.head.rotation.y, yaw, 4, dt);
      u.head.rotation.x = damp(u.head.rotation.x, s.folded ? 0.45 : (sn.toAct === i ? -0.1 : 0), 4, dt);
      const hop = s.won > 0 && sn.phase === 'done' ? Math.abs(Math.sin(tsec * 7 + u.bob)) * 0.12 : 0;
      f.position.y = hop + Math.sin(tsec * 1.6 + u.bob) * 0.008; u.tail.rotation.y = Math.sin(tsec * 2 + u.bob) * 0.35;
    });
    if (dealer) { dealer.userData.tail.rotation.y = Math.sin(tsec * 1.7) * 0.3; dealer.userData.head.rotation.y = damp(dealer.userData.head.rotation.y, sn && sn.toAct >= 0 ? (((sn.toAct - my + n) % n) / Math.max(1, n) - 0.5) * -1.2 : Math.sin(tsec * 0.4) * 0.3, 3, dt); }
    // wheel
    if (st.wheel && !st.wheel.done) { const w = st.wheel; w.t += dt; const k = Math.min(1, w.t / w.dur), e = 1 - Math.pow(1 - k, 3); wheelDisc.rotation.z = w.r0 + (w.target - w.r0) * e; const tick = Math.floor(wheelDisc.rotation.z / (2 * Math.PI / WHEEL.length)); if (tick !== w.lastTick) { w.lastTick = tick; SFX.tick(); } if (k >= 1) wheelDone(); }
    // camera: table view · peek at your cards · wheel
    let wantP = camBase.p, wantT = camBase.t;
    if (st.wheel) { wantT = new T.Vector3(0, wheel.position.y, backZ); wantP = new T.Vector3(0, wheel.position.y + 0.3, backZ + (portrait ? 6.2 : 4.6)); }
    else if (st.peek && sn) { const c = ell(0, 0.58); wantT = new T.Vector3(0, TOP + 0.05, c.z - 0.05); wantP = new T.Vector3(0, TOP + (portrait ? 2.1 : 1.35), c.z + (portrait ? 0.9 : 1.05)); }
    const moving = camCur.p.distanceToSquared(wantP) > 1e-5 || camCur.t.distanceToSquared(wantT) > 1e-5;
    camCur.p.x = damp(camCur.p.x, wantP.x, 4, dt); camCur.p.y = damp(camCur.p.y, wantP.y, 4, dt); camCur.p.z = damp(camCur.p.z, wantP.z, 4, dt);
    camCur.t.x = damp(camCur.t.x, wantT.x, 4, dt); camCur.t.y = damp(camCur.t.y, wantT.y, 4, dt); camCur.t.z = damp(camCur.t.z, wantT.z, 4, dt);
    cam.position.copy(camCur.p); cam.lookAt(camCur.t); cam.updateMatrixWorld();
    if (moving && now - emitT > 120) { labels(); dirty = true; }
    const secs = sn && sn.deadline ? Math.ceil((sn.deadline - Date.now()) / 1000) : -1; if (secs !== lastSecs) { lastSecs = secs; dirty = true; }
    R.render(scene, cam);
    if (dirty && now - emitT > 60) { dirty = false; emitT = now; labels(); try { onState(hud()); } catch (e) { console.warn(e); } }
  }
  const ro = new ResizeObserver(() => resize()); ro.observe(container);
  const onHide = () => { if (st.mode === 'solo' && !st.practice && st.table && S) { const c = st.table.seats[0].chips; S.setStat('meruPoker.seat', c); try { localStorage.setItem('8gates.save.v1', JSON.stringify(S.data)); } catch (e) {} } };
  addEventListener('pagehide', onHide);
  resize(); layoutFoxes(null); raf = requestAnimationFrame(frame);

  const api = {
    hud, startSolo, act, nextHand, cashOut, rebuy, spin: () => spin(false), demoSpin: () => spin(true), netBegin, netRecv, netDrop, netEnd, resize,
    setInsets(i) { const k = JSON.stringify(i); if (k === this._ik) return; this._ik = k; insets = { ...insets, ...i }; fitCamera(); camCur.p.copy(camBase.p); camCur.t.copy(camBase.t); emit(); },
    peek(on) { st.peek = on == null ? !st.peek : !!on; emit(); },
    fourColor(on) { four = on == null ? !four : !!on; if (S) S.setFlag('meruPoker.fourColor', four); cards.forEach(c => { if (c.code) { c.front.material.map = frontTex(c.code); c.front.material.needsUpdate = true; } }); emit(); },
    mute(on) { AU.on = on == null ? !AU.on : !on; if (S) S.setFlag('meruPoker.mute', !AU.on); emit(); },
    table: () => st.table, state: st,
    destroy() { onHide(); cashOutSilently(); cancelAnimationFrame(raf); ro.disconnect(); removeEventListener('pagehide', onHide); stopAll(); texs.forEach(t => t.dispose()); R.dispose(); R.domElement.remove(); },
  };
  function cashOutSilently() { if (st.mode === 'solo' && !st.practice && st.table && S) { const c = st.table.seats[0].chips; if (c > 0) S.addGold(c); S.setStat('meruPoker.seat', 0); } }
  emit();
  return api;
}
