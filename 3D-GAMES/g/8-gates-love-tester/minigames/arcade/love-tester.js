// 8 GATES — LOVE TESTER [loveTester] · MINIGAMES_MASTER #39 (ARCADE CABINETS).
// An arcade corner that fits inside any building on any world: one red cabinet with a heart dome, a 10-lamp love meter and two brass grips.
// The player and the person closest to them (their date, a friend, Hope, Noble…) grab a grip each and the machine tests them:
//   1 HEARTBEAT  tap the big heart on the beat (you hear it, see it and, on Android, feel it). Scored on your timing AND how close your timing is to theirs.
//   2 GRIP       hold to squeeze, let go in the sweet spot. Three squeezes. Scored on the sweet spot AND how close your squeeze is to theirs.
//   3 SPARKS     four quick "this or that" picks. Every pick you both make the same is a spark.
// The meter climbs to a LOVE % and a rating: COLD FISH · JUST FRIENDS · SWEET ON YOU · HOT STUFF · RED HOT · SOULMATES.
// SOLO: the partner comes from the world (?with=hope / noble / a name, or a postMessage) or is picked on the intro card. Their answers come from a hidden
//       "chemistry" so the same pair tends to score alike, but play still matters most.
// ONLINE (2–5 phones, peer to peer through engine/duel-net.js, game 'loveTester'; falls back to same-device tabs for testing):
//       everyone plays the same machine (same tempo, sweet spots and questions from a shared seed) at the same time; at the end the
//       machine scores EVERY pair and names the best match.
// Saves only through engine/save.js and only under 'loveTester.*' keys.
import * as THREE from '../../vendor/three/three.module.js';
import { foxKit, PLAYER_MALE, PLAYER_FEMALE } from '../../fox-kit.js';
import { crestTex, canvasTex, FONT } from '../../engine/textures.js';
import { castKit, loadCastRigs } from '../../engine/cast.js';
import { save } from '../../engine/save.js';

export const GAME = 'loveTester';
export const LOVE_TESTER = { name: 'LOVE TESTER', room: 'loveTester', number: 39 };
export const PRICE = 2;                       // DRAFT for Ben: gold per go (plays free, "ON THE HOUSE", when you are short)
export const MAX_PLAYERS = 5;
export const NET_COLS = [['RED', '#ec3013'], ['BLUE', '#38bdf8'], ['GOLD', '#ffd23a'], ['GREEN', '#22c55e'], ['PINK', '#f472b6']];
export const RATINGS = [
  { at: 0, name: 'COLD FISH', col: '#7dd3fc', mood: 'sad' },
  { at: 20, name: 'JUST FRIENDS', col: '#a3e635', mood: 'curious' },
  { at: 40, name: 'SWEET ON YOU', col: '#ffd23a', mood: 'happy' },
  { at: 60, name: 'HOT STUFF', col: '#fb923c', mood: 'happy' },
  { at: 80, name: 'RED HOT', col: '#ec3013', mood: 'excited' },
  { at: 95, name: 'SOULMATES', col: '#f472b6', mood: 'excited' },
];
export const ratingOf = pct => { let r = RATINGS[0]; for (const x of RATINGS) if (pct >= x.at) r = x; return r; };
// DRAFT for Ben: the "this or that" questions (4 are drawn per game)
export const QUESTIONS = [
  { q: 'BEST DATE SPOT', o: ['THE BEACH', 'THE ARCADE', 'STARGAZING'] },
  { q: 'SHARE A SNACK', o: ['BURGERS', 'GELATO', 'RAMEN'] },
  { q: 'DATE MUSIC', o: ['THE JUKEBOX', 'LIVE DRUMS', 'QUIET'] },
  { q: 'ADVENTURE', o: ['DEEP SPACE', 'THE OCEAN', 'THE FOREST'] },
  { q: 'PERFECT HOUR', o: ['SUNRISE', 'SUNSET', 'MIDNIGHT'] },
  { q: 'WEEKEND', o: ['A QUEST', 'A NAP', 'A PARTY'] },
  { q: 'GIFT', o: ['FLOWERS', 'A SONG', 'A MAP'] },
  { q: 'RIDE', o: ['SKATEBOARD', 'SPEEDBOAT', 'STARSHIP'] },
];
// Partners you can pick on the card when the world did not send one. Hope and Noble come from engine/cast.js; the others are DRAFT arcade regulars.
export const PARTNERS = {
  hope: { key: 'hope', name: 'HOPE', cast: 'hope', chem: 0.82, lines: { hi: 'I can hear the beat. Follow it with me.', hb: 'Feel that? We were right together.', lo: 'Ha! The machine must be broken.', mid: 'Not bad. Not bad at all.', hiR: 'I knew it. Did you hear it hum?' } },
  noble: { key: 'noble', name: 'NOBLE', cast: 'noble', chem: 0.72, lines: { hi: 'Grip it like you mean it.', hb: 'Steady. Keep the rhythm.', lo: 'Rematch. Right now.', mid: 'Respectable numbers.', hiR: 'Told you. Best team in the gates.' } },
  ruby: { key: 'ruby', name: 'RUBY', look: { ...PLAYER_FEMALE, fur: '#b8432a', furDark: '#7c2d12', tailBase: '#9a3412', tailMid: '#b8432a', paw: '#b8432a' }, outfit: 'dress', torso: '#f472b6', eyes: ['#22c55e', '#22c55e'], chem: 0.66, draft: true },
  milo: { key: 'milo', name: 'MILO', look: { ...PLAYER_MALE, fur: '#9aa3ad', furDark: '#5b6470', tailBase: '#6b7480', tailMid: '#9aa3ad', paw: '#9aa3ad', muzzle: '#f4f4f6', chin: '#ffffff' }, outfit: 'vest', torso: '#38bdf8', eyes: ['#f59e0b', '#f59e0b'], chem: 0.58, draft: true },
  juniper: { key: 'juniper', name: 'JUNIPER', look: { ...PLAYER_FEMALE, fur: '#f4f1ec', furDark: '#cbd5e1', tailBase: '#e2e8f0', tailMid: '#f4f1ec', paw: '#f4f1ec', earInner: '#f9a8d4' }, outfit: 'coat', torso: '#a78bfa', eyes: ['#38bdf8', '#38bdf8'], chem: 0.62, draft: true },
};
const LINES = { hi: 'Ready when you are.', hb: 'Was that us? We were close!', lo: 'Huh. Cold machine.', mid: 'That was fun.', hiR: 'Wow. The whole thing lit up!' };
const PICKABLE = ['hope', 'noble', 'stranger'];

// ---------- small helpers (own copies, so this module only needs the shared files that ship in the kit) ----------
const rr = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)], clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const gauss = R => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// ---------- the plan every player shares (same seed → same tempo, sweet spots, questions) ----------
export function makePlan(seed) {
  const R = rng(seed), bpm = Math.round(76 + R() * 20), qs = [], pool = QUESTIONS.map((_, i) => i);
  for (let i = 0; i < 4; i++) qs.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  return { seed, bpm, iv: 60000 / bpm, lead: 4, beats: 8, targets: [0, 1, 2].map(() => Math.round(48 + R() * 34)), band: 6, qs };
}
// ---------- scoring (pure, the same on every phone) ----------
export const beatAcc = o => o == null ? 0 : clamp(1 - Math.max(0, Math.abs(o) - 45) / 210, 0, 1);
export const gripAcc = (v, c) => v == null || v > 100 ? 0 : clamp(1 - Math.max(0, Math.abs(v - c) - 2) / 28, 0, 1);
export function pairScore(plan, A, B, salt = '') {
  let hb = 0, gr = 0, sp = 0, hbMine = 0, sync = 0;
  for (let i = 0; i < plan.beats; i++) { const a = A.offs[i], b = B.offs[i], s = a == null || b == null ? 0 : clamp(1 - Math.abs(a - b) / 260, 0, 1); hb += 0.55 * Math.sqrt(beatAcc(a) * beatAcc(b)) + 0.45 * s; sync += s; hbMine += beatAcc(a); }
  hb /= plan.beats; sync /= plan.beats; hbMine /= plan.beats;
  for (let i = 0; i < plan.targets.length; i++) { const a = A.sq[i], b = B.sq[i], c = plan.targets[i], close = a == null || b == null || a > 100 || b > 100 ? 0 : clamp(1 - Math.abs(a - b) / 30, 0, 1); gr += 0.5 * (gripAcc(a, c) + gripAcc(b, c)) / 2 + 0.5 * close; }
  gr /= plan.targets.length;
  let same = 0; for (let i = 0; i < plan.qs.length; i++) if (A.picks[i] != null && A.picks[i] === B.picks[i]) same++; sp = same / plan.qs.length;
  const flair = (hashStr(plan.seed + '|' + salt) % 9) - 4, raw = 0.4 * hb + 0.35 * gr + 0.25 * sp;
  const pct = clamp(Math.round(raw * 100 + (raw > 0.05 ? flair : 0)), 1, 100);
  return { pct, hb: Math.round(hb * 100), sync: Math.round(sync * 100), hbMine: Math.round(hbMine * 100), grip: Math.round(gr * 100), sparks: same, sparkN: plan.qs.length, rating: ratingOf(pct) };
}
// the solo partner's answers, from hidden chemistry + what you did
function partnerAnswers(plan, me, chem, R) {
  const offs = me.offs.map(o => { if (R() > 0.55 + chem * 0.42) return null; const own = gauss(R) * (150 - chem * 110); return Math.round(o == null ? own : o * (0.25 + chem * 0.6) + own * 0.7); });
  const sq = plan.targets.map((c, i) => { const mine = me.sq[i], err = gauss(R) * (19 - chem * 15); let v = c + err; if (mine != null && mine <= 100) v = v * (1 - chem * 0.35) + mine * chem * 0.35; return clamp(Math.round(v), 5, 100); });
  const picks = plan.qs.map((q, i) => { const mine = me.picks[i]; if (mine != null && R() < 0.18 + chem * 0.5) return mine; return Math.floor(R() * 3); });
  return { offs, sq, picks };
}

// ---------- audio: a small synth studio (no files). Master → compressor; a reverb send; a music bus that ducks per phase.
//   music: a lounge loop (Fmaj7 · Em7 · Dm7 · Cmaj7 at 88 bpm: soft pad, walking bass, plucked arpeggio, brushed hat)
//   heartbeat: pitched-down sine thump + felt click, lub-dub · coin clink · power-up sweep · bells for PERFECT/GOOD · wood block for EARLY/LATE
//   grip: a strained spring (saw through a moving band-pass, tremolo) · release clunk · sweet-spot chime · TOO HARD buzzer
//   sparks: pick click · match sparkle · miss boop · tally: rising pentatonic plucks · a fanfare for every rating (SOULMATES gets the big one, COLD FISH the sad trombone)
function makeAudio() {
  let ctx = null, master, sfx, musicBus, verbIn, whine = null, muted = false, musicLvl = 0, seqT = 0, seqNext = 0, seqStep = 0, noiseBuf = null;
  try { muted = !!save.stat('loveTester.muted'); } catch (e) {}
  const N = n => 440 * Math.pow(2, (n - 69) / 12);
  function ok() { if (ctx) return true; try { ctx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; comp.connect(master); master.connect(ctx.destination);
      sfx = ctx.createGain(); sfx.connect(comp); musicBus = ctx.createGain(); musicBus.gain.value = 0.0001; musicBus.connect(comp);
      const verb = ctx.createConvolver(), len = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      verb.buffer = ir; verbIn = ctx.createGain(); verbIn.gain.value = 0.32; const vlp = ctx.createBiquadFilter(); vlp.type = 'lowpass'; vlp.frequency.value = 5200; verbIn.connect(verb); verb.connect(vlp); vlp.connect(comp);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; } return !!ctx; }
  // one voice: oscillator → (filter) → envelope → bus (+ reverb send)
  function tone({ type = 'sine', f = 440, f2 = 0, t = 0, a = 0.005, d = 0.2, v = 0.2, bus, wet = 0, filt = 0, fq = 1, ftype = 'lowpass', detune = 0, vib = 0 }) {
    if (!ok()) return; t = t || ctx.currentTime; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.5; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + a + d + 0.1); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    let src = o; if (filt) { const fl = ctx.createBiquadFilter(); fl.type = ftype; fl.frequency.value = filt; fl.Q.value = fq; o.connect(fl); src = fl; }
    src.connect(g); g.connect(bus || sfx); if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(verbIn); }
    o.start(t); o.stop(t + a + d + 0.05); return o; }
  function noise({ t = 0, a = 0.002, d = 0.08, v = 0.2, filt = 2000, fq = 0.8, ftype = 'bandpass', bus, wet = 0 }) {
    if (!ok()) return; t = t || ctx.currentTime; const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf; fl.type = ftype; fl.frequency.value = filt; fl.Q.value = fq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); s.connect(fl); fl.connect(g); g.connect(bus || sfx);
    if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(verbIn); } s.start(t, Math.random() * 0.5); s.stop(t + a + d + 0.05); }
  const bell = (f, t, v = 0.16, d = 0.9) => { tone({ f, t, a: 0.003, d, v, wet: 0.5 }); tone({ f: f * 2.76, t, a: 0.002, d: d * 0.4, v: v * 0.35, wet: 0.5 }); tone({ f: f * 5.4, t, a: 0.001, d: d * 0.18, v: v * 0.15, wet: 0.4 }); };
  // ---- the lounge loop (scheduled ahead on the audio clock) ----
  const BPM = 88, EIGHTH = 60 / BPM / 2, CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], BASS = [[41, 48], [40, 47], [38, 45], [36, 43]];
  function schedule() { if (!ctx || musicLvl < 0.01 || muted) { seqNext = 0; return; } const now = ctx.currentTime; if (!seqNext || seqNext < now) seqNext = now + 0.08;
    while (seqNext < now + 0.35) { const st = seqStep % 32, bar = Math.floor(st / 8), e = st % 8, ch = CHORDS[bar], t = seqNext, M = musicBus;
      if (e === 0) ch.forEach((n, i) => { tone({ type: 'triangle', f: N(n), t, a: 0.35, d: EIGHTH * 8 - 0.2, v: 0.045, bus: M, wet: 0.6, filt: 1400, detune: -6 }); tone({ type: 'sawtooth', f: N(n), t, a: 0.5, d: EIGHTH * 8 - 0.3, v: 0.012, bus: M, wet: 0.6, filt: 900, detune: 7 }); });
      if (e === 0 || e === 4) tone({ type: 'sine', f: N(BASS[bar][e ? 1 : 0] - 12 + 12), t, a: 0.01, d: EIGHTH * 3, v: 0.16, bus: M, filt: 600 });
      if (e === 6) tone({ type: 'sine', f: N(BASS[bar][1] - 12 + 14), t, a: 0.01, d: EIGHTH * 1.6, v: 0.09, bus: M, filt: 600 });
      const arp = [0, 2, 1, 3, 2, 1, 3, 2][e]; if (e % 2 === 0 || (st * 7) % 5 === 0) tone({ type: 'triangle', f: N(ch[arp] + 12), t: t + 0.004, a: 0.004, d: 0.32, v: e % 2 ? 0.035 : 0.05, bus: M, wet: 0.7, filt: 2600 });
      if (e % 2 === 1) noise({ t, d: 0.05, v: 0.035, filt: 7500, fq: 0.6, ftype: 'highpass', bus: M }); if (e === 4) noise({ t, d: 0.16, v: 0.04, filt: 1800, fq: 0.5, bus: M, wet: 0.3 });
      seqNext += EIGHTH * (e % 2 ? 0.92 : 1.08); seqStep++; } }   // a lazy swing
  function music(lvl) { musicLvl = lvl; if (!ok()) return; musicBus.gain.setTargetAtTime(Math.max(0.0001, lvl), ctx.currentTime, 0.35); if (!seqT && lvl > 0) seqT = setInterval(schedule, 90); schedule(); }
  return {
    unlock() { if (ok() && ctx.state === 'suspended') ctx.resume(); if (musicLvl) music(musicLvl); },
    get ctx() { return ctx; }, get muted() { return muted; },
    setMuted(m) { muted = !!m; try { save.setStat('loveTester.muted', muted ? 1 : 0); } catch (e) {} if (ctx) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05); },
    music,
    now() { return ok() ? ctx.currentTime : 0; },
    latency() { return ctx ? (ctx.outputLatency || ctx.baseLatency || 0) : 0; },
    thump(t, loud = 1) { if (!ok()) return; t = t || ctx.currentTime; const v = loud;
      tone({ f: 96, f2: 38, t, a: 0.006, d: 0.2, v: 0.95 * v, wet: 0.12 }); noise({ t, d: 0.03, v: 0.12 * v, filt: 900, fq: 1.2 });
      tone({ f: 80, f2: 34, t: t + 0.16, a: 0.006, d: 0.17, v: 0.65 * v, wet: 0.12 }); tone({ type: 'triangle', f: 170, f2: 85, t, a: 0.003, d: 0.06, v: 0.1 * v }); },
    tick(f = 880, v = 0.14) { if (!ok()) return; bell(f, 0, v, 0.35); },
    count(n) { if (!ok()) return; const f = n > 0 ? N(72 + (3 - n) * 4) : N(84); bell(f, 0, 0.18, n > 0 ? 0.4 : 0.8); tone({ type: 'square', f: f / 2, a: 0.003, d: 0.05, v: 0.05, filt: 1800 }); },
    coin() { if (!ok()) return; const t = ctx.currentTime; tone({ f: 2093, t, a: 0.001, d: 0.25, v: 0.12, wet: 0.3 }); tone({ f: 2637, t: t + 0.07, a: 0.001, d: 0.35, v: 0.1, wet: 0.3 }); tone({ f: 3136, t: t + 0.07, a: 0.001, d: 0.2, v: 0.04 });
      for (let i = 0; i < 5; i++) noise({ t: t + 0.18 + i * 0.045 + Math.random() * 0.02, d: 0.03, v: 0.08 / (i + 1), filt: 4200, fq: 3 }); tone({ f: 90, f2: 60, t: t + 0.42, a: 0.004, d: 0.12, v: 0.4 }); noise({ t: t + 0.42, d: 0.06, v: 0.1, filt: 500 });
      tone({ type: 'sawtooth', f: 110, f2: 880, t: t + 0.5, a: 0.02, d: 0.55, v: 0.07, filt: 1600, fq: 6, wet: 0.4 }); bell(N(84), t + 1.05, 0.12, 0.6); },
    good(q) { if (!ok()) return; const t = ctx.currentTime; if (q === 2) { bell(N(84), t, 0.15, 0.7); bell(N(88), t + 0.05, 0.11, 0.6); bell(N(91), t + 0.1, 0.09, 0.6); } else if (q === 1) bell(N(79), t, 0.15, 0.5); else tone({ type: 'triangle', f: 640, t, a: 0.002, d: 0.07, v: 0.16, filt: 2400, ftype: 'bandpass', fq: 3 }); },
    bad() { if (!ok()) return; tone({ type: 'square', f: 150, f2: 92, a: 0.004, d: 0.2, v: 0.07, filt: 700 }); },
    whine(on, v = 0) { if (!ok()) return; const t = ctx.currentTime;
      if (on && !whine) { const o = ctx.createOscillator(), o2 = ctx.createOscillator(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
        o.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = 12; bp.type = 'bandpass'; bp.Q.value = 4; g.gain.value = 0.0001; l.frequency.value = 9; lg.gain.value = 0.035; l.connect(lg); lg.connect(g.gain);
        o.connect(bp); o2.connect(bp); bp.connect(g); g.connect(sfx); o.start(); o2.start(); l.start(); whine = { o, o2, bp, g, l }; }
      if (!whine) return; const W = whine;
      if (on) { const f = 120 + v * 7; W.o.frequency.setTargetAtTime(f, t, 0.03); W.o2.frequency.setTargetAtTime(f * 0.5, t, 0.03); W.bp.frequency.setTargetAtTime(500 + v * 28, t, 0.04); W.g.gain.setTargetAtTime(0.05 + v * 0.0006, t, 0.04); if (Math.random() < 0.12) noise({ d: 0.03, v: 0.03, filt: 3000 + v * 30, fq: 5 }); }
      else { W.g.gain.setTargetAtTime(0.0001, t, 0.03); setTimeout(() => { try { W.o.stop(); W.o2.stop(); W.l.stop(); } catch (e) {} }, 250); whine = null; } },
    release(kind) { if (!ok()) return; const t = ctx.currentTime; tone({ f: 120, f2: 55, t, a: 0.003, d: 0.12, v: 0.35 }); noise({ t, d: 0.05, v: 0.12, filt: 700 });
      if (kind === 'sweet') { bell(N(79), t + 0.05, 0.14, 0.8); bell(N(83), t + 0.12, 0.12, 0.8); bell(N(86), t + 0.19, 0.12, 1); }
      else if (kind === 'over') { tone({ type: 'square', f: 98, t, a: 0.005, d: 0.45, v: 0.09, filt: 900, vib: 4 }); tone({ type: 'square', f: 104, t, a: 0.005, d: 0.45, v: 0.07, filt: 900 }); }
      else tone({ type: 'triangle', f: N(67), f2: N(64), t: t + 0.05, a: 0.005, d: 0.25, v: 0.12, wet: 0.3 }); },
    blip() { if (!ok() || musicLvl < 0.05) return; const t = ctx.currentTime, b = 400 + Math.random() * 900, n = 2 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) tone({ type: 'square', f: b * [1, 1.25, 1.5, 2][i % 4], t: t + i * 0.06, a: 0.002, d: 0.05, v: 0.018, filt: 2400, wet: 0.5 }); },
    pick() { if (!ok()) return; tone({ type: 'triangle', f: 1200, f2: 900, a: 0.002, d: 0.05, v: 0.12 }); noise({ d: 0.02, v: 0.06, filt: 5000 }); },
    match() { if (!ok()) return; const t = ctx.currentTime; [76, 79, 83, 88, 91].forEach((n, i) => bell(N(n), t + i * 0.06, 0.12, 0.7)); noise({ t, d: 0.5, v: 0.03, filt: 9000, ftype: 'highpass', wet: 0.6 }); },
    noMatch() { if (!ok()) return; const t = ctx.currentTime; tone({ type: 'triangle', f: N(64), t, a: 0.005, d: 0.18, v: 0.14, wet: 0.2 }); tone({ type: 'triangle', f: N(59), t: t + 0.16, a: 0.005, d: 0.3, v: 0.14, wet: 0.2 }); },
    climb(k) { if (!ok()) return; const P = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84], n = P[Math.min(P.length - 1, Math.round(k * 10))]; tone({ type: 'triangle', f: N(n), a: 0.003, d: 0.22, v: 0.13, wet: 0.35 }); tone({ type: 'sine', f: N(n + 12), a: 0.002, d: 0.1, v: 0.05 }); },
    fanfare(pct) { if (!ok()) return; const t = ctx.currentTime + 0.05, brass = (n, tt, d, v = 0.06) => { tone({ type: 'sawtooth', f: N(n), t: tt, a: 0.03, d, v, filt: 2200, wet: 0.45, detune: -5 }); tone({ type: 'sawtooth', f: N(n), t: tt, a: 0.03, d, v: v * 0.8, filt: 2200, wet: 0.45, detune: 6 }); };
      if (pct >= 95) { [60, 64, 67, 72].forEach((n, i) => brass(n, t + i * 0.1, 0.25)); [60, 64, 67, 72, 76].forEach(n => brass(n, t + 0.45, 1.5, 0.05)); for (let i = 0; i < 10; i++) bell(N(84 + [0, 4, 7, 12, 16][i % 5]), t + 0.5 + i * 0.07, 0.07, 1.2); tone({ f: 55, t: t + 0.45, a: 0.01, d: 1.2, v: 0.3 }); }
      else if (pct >= 60) { [67, 72, 76].forEach((n, i) => brass(n, t + i * 0.12, 0.2)); [72, 76, 79].forEach(n => brass(n, t + 0.4, 0.9, 0.05)); bell(N(88), t + 0.45, 0.1, 1); }
      else if (pct >= 40) { bell(N(72), t, 0.14, 0.6); bell(N(76), t + 0.14, 0.14, 0.6); bell(N(79), t + 0.28, 0.16, 1); }
      else if (pct >= 20) { tone({ type: 'triangle', f: N(67), t, a: 0.01, d: 0.3, v: 0.15, wet: 0.3 }); tone({ type: 'triangle', f: N(67), t: t + 0.3, a: 0.01, d: 0.6, v: 0.15, wet: 0.3 }); }
      else { [58, 57, 56].forEach((n, i) => tone({ type: 'sawtooth', f: N(n), t: t + i * 0.42, a: 0.03, d: 0.36, v: 0.07, filt: 1100, vib: 3 })); tone({ type: 'sawtooth', f: N(55), f2: N(53), t: t + 1.26, a: 0.03, d: 1.0, v: 0.07, filt: 1000, vib: 9 }); } },
    close() { clearInterval(seqT); seqT = 0; try { ctx && ctx.close(); } catch (e) {} },
  };
}
let demoOn = false; const buzz = ms => { if (demoOn) return; try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };   // no buzzing while the demo plays itself

// ---------- textures ----------
const heartPath = (g, cx, cy, s) => { g.beginPath(); g.moveTo(cx, cy + s * 0.35); g.bezierCurveTo(cx, cy, cx - s * 0.5, cy - s * 0.05, cx - s * 0.5, cy + s * 0.32); g.bezierCurveTo(cx - s * 0.5, cy + s * 0.6, cx - s * 0.1, cy + s * 0.78, cx, cy + s * 0.95); g.bezierCurveTo(cx + s * 0.1, cy + s * 0.78, cx + s * 0.5, cy + s * 0.6, cx + s * 0.5, cy + s * 0.32); g.bezierCurveTo(cx + s * 0.5, cy - s * 0.05, cx, cy, cx, cy + s * 0.35); g.closePath(); };
function heartShape(s = 1) { const h = new THREE.Shape(); h.moveTo(0, -0.95 * s + 0.6 * s); h.bezierCurveTo(0, 0.6 * s - 0.35 * s + 0.35 * s, -0.5 * s, 0.65 * s, -0.5 * s, 0.28 * s); h.bezierCurveTo(-0.5 * s, 0, -0.1 * s, -0.18 * s, 0, -0.35 * s); h.bezierCurveTo(0.1 * s, -0.18 * s, 0.5 * s, 0, 0.5 * s, 0.28 * s); h.bezierCurveTo(0.5 * s, 0.65 * s, 0, 0.6 * s, 0, 0.25 * s); return h; }

// shrink a canvas font until the text fits its box (keeps a margin on every side, whichever font actually loaded)
function fitText(g, text, maxW, size, weight = 900, min = 10) { let s = size; g.font = `${weight} ${s}px ${FONT}`; while (s > min && g.measureText(text).width > maxW) { s -= 1; g.font = `${weight} ${s}px ${FONT}`; } return s; }
export async function createLoveTester({ container, onState = () => {}, world = '', partner = null, onSend = null }) {
  try { await Promise.race([Promise.all([document.fonts.load(`900 64px ${FONT}`), document.fonts.load(`800 24px ${FONT}`)]), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  const touch = matchMedia('(pointer: coarse)').matches, W = () => container.clientWidth || 1, H = () => container.clientHeight || 1;
  const renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'low-power' }); renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touch ? 1.6 : 2)); renderer.setSize(W(), H());
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = !touch;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none'; container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#140a1f'); scene.fog = new THREE.Fog('#140a1f', 7, 16);
  const camera = new THREE.PerspectiveCamera(38, W() / H(), 0.05, 40);
  const grad = (() => { const d = new Uint8Array([95, 95, 95, 255, 175, 175, 175, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
  const cache = new Map(), toon = (c, extra) => { const k = c + (extra ? JSON.stringify(extra) : ''); if (!cache.has(k)) cache.set(k, new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...extra })); return cache.get(k); };
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1a1626, side: THREE.BackSide });
  function addOutline(mesh, t = 0.02, radius) { const g = mesh.geometry; g.computeBoundingBox(); const s = new THREE.Vector3(); g.boundingBox.getSize(s); const o = new THREE.Mesh(g, outlineMat); if (radius) o.scale.setScalar(1 + t / radius); else o.scale.set(1 + 2 * t / Math.max(s.x, 0.01), 1 + 2 * t / Math.max(s.y, 0.01), 1 + 2 * t / Math.max(s.z, 0.01)); mesh.add(o); return mesh; }
  function M(geo, mat, x = 0, y = 0, z = 0, parent, outline = 0.02, radius) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = !touch; if (outline) addOutline(m, outline, radius); (parent || scene).add(m); return m; }
  const kit = foxKit({ THREE, scene, toon, M, grad, outlineMat, crestTex, rr, pick, clamp, smooth, damp });
  let rigs = {}; try { rigs = await loadCastRigs(); } catch (e) {}
  const CK = castKit({ THREE, M, toon, makeFox: kit.makeFox }, rigs);
  const audio = makeAudio();

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0xffe6f2, 0x3a1d3a, 1.25));
  const key = new THREE.DirectionalLight(0xfff0e0, 1.25); key.position.set(2.5, 6, 5); key.castShadow = !touch; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -2 }); scene.add(key);
  const pinkL = new THREE.PointLight(0xff4f9a, 6, 5, 1.6); pinkL.position.set(0, 3.2, 1.0); scene.add(pinkL);

  // ---------- the arcade corner (walls, floor, two neighbour cabinets, neon) ----------
  const floorTex = canvasTex(256, 256, (g) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#2a1838' : '#3d2350'; g.fillRect(x * 32, y * 32, 32, 32); } }, [15, 13]);
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(30, 26), new THREE.MeshToonMaterial({ map: floorTex, gradientMap: grad })); f.rotation.x = -Math.PI / 2; f.position.z = 11; f.receiveShadow = !touch; scene.add(f); }
  { const rug = new THREE.Mesh(new THREE.CircleGeometry(1.75, 40), toon('#7a1f45')); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.005, 0.55); rug.receiveShadow = !touch; scene.add(rug);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.62, 1.75, 48), new THREE.MeshBasicMaterial({ color: '#ff7ab6' })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.008, 0.55); scene.add(ring); }
  const wallTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#21102f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2d1840'; g.lineWidth = 4; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } });
  { const wl = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshToonMaterial({ map: wallTex, gradientMap: grad })); wl.position.set(0, 6, -1.2); scene.add(wl); }
  const neonMat = col => new THREE.MeshBasicMaterial({ color: col });
  const heartLine = (sz, col, x, y, z) => { const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60 * Math.PI * 2; pts.push(new THREE.Vector3(16 * Math.pow(Math.sin(t), 3) / 17 * sz, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 * sz, 0)); } const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, 0.025, 6, true), neonMat(col)); m.position.set(x, y, z); scene.add(m); return m; };
  const neonA = heartLine(0.55, '#ff4f9a', -2.5, 3.5, -1.15), neonB = heartLine(0.38, '#7dd3fc', 2.6, 3.8, -1.15);
  { const sign = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#21102f'; g.fillRect(0, 0, w, h); g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ffd23a'; g.shadowBlur = 18; g.fillStyle = '#ffe680'; g.fillText('ARCADE', w / 2, h / 2 + 4); });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ map: sign })); s.position.set(2.6, 2.85, -1.18); scene.add(s); }
  const sideCabs = [];
  for (const sx of [-3.4, 3.4]) { const g = new THREE.Group(); g.position.set(sx, 0, -0.55); g.rotation.y = sx < 0 ? 0.35 : -0.35; scene.add(g);
    M(new THREE.BoxGeometry(0.8, 1.9, 0.7), toon(sx < 0 ? '#1e3a8a' : '#14532d'), 0, 0.95, 0, g, 0.02);
    M(new THREE.BoxGeometry(0.82, 0.25, 0.4), toon('#0f172a'), 0, 1.95, 0.12, g, 0.015);
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 48; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.magFilter = THREE.NearestFilter; const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), new THREE.MeshBasicMaterial({ map: tx })); scr.userData = { cv, tx, hue: sx < 0 ? 200 : 130 }; scr.position.set(0, 1.45, 0.36); g.add(scr); sideCabs.push(scr);
    M(new THREE.BoxGeometry(0.8, 0.08, 0.3), toon('#0f172a'), 0, 1.02, 0.45, g, 0.01); }

  let scrT = 0; const drawScreens = t => { for (const sc of sideCabs) { const { cv, tx, hue } = sc.userData, g = cv.getContext('2d'); g.fillStyle = '#05060f'; g.fillRect(0, 0, 64, 48);
      for (let i = 0; i < 14; i++) { g.fillStyle = '#ffffff55'; g.fillRect((i * 37 + Math.floor(t * 20)) % 64, (i * 13) % 48, 1, 1); }
      const ox = Math.round(Math.sin(t * 1.4 + hue) * 8); for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { g.fillStyle = `hsl(${hue + r * 40},90%,60%)`; const fr = Math.floor(t * 3) % 2; g.fillRect(10 + c * 9 + ox, 6 + r * 7, 6, 4); g.fillRect(10 + c * 9 + ox + (fr ? 0 : 4), 10 + r * 7, 2, 1); }
      g.fillStyle = '#ffd23a'; g.fillRect(28 + Math.round(Math.sin(t * 2.2 + hue) * 18), 41, 7, 3); g.fillRect(31 + Math.round(Math.sin(t * 2.2 + hue) * 18), 39, 1, 2); tx.needsUpdate = true; } };

  // ---------- THE LOVE TESTER cabinet ----------
  const cab = new THREE.Group(); cab.scale.setScalar(1.3); scene.add(cab);   // foxes are ~2.8 tall; the machine stands taller
  const red = toon('#b3132f'), redD = toon('#7a0c22'), wood = toon('#3b1f2b'), brass = toon('#e6b45a', { emissive: new THREE.Color('#5a3e10'), emissiveIntensity: 0.3 }), rubber = toon('#1c1917'), cream = toon('#fbe9d0');
  M(new THREE.BoxGeometry(1.05, 0.26, 0.74), wood, 0, 0.13, 0, cab, 0.02);
  M(new THREE.BoxGeometry(0.88, 1.72, 0.6), red, 0, 1.12, 0, cab, 0.025);
  M(new THREE.BoxGeometry(0.94, 0.08, 0.66), redD, 0, 1.99, 0, cab, 0.015);
  // the front panel: lamp column on the left, rating names beside it
  const LAMPS = 10, lampY0 = 0.62, lampDy = 0.128, lamps = [];
  const panelTex = canvasTex(512, 1024, (g, w, h) => { g.fillStyle = '#1a0f14'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e6b45a'; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12); g.strokeStyle = '#5a3e10'; g.lineWidth = 3; g.strokeRect(22, 22, w - 44, h - 44);
    const x0 = Math.round(w * 0.37), maxW = w - x0 - 44; g.textAlign = 'left'; g.textBaseline = 'middle';
    for (const r of RATINGS) { const yw = lampY0 + Math.min(9, Math.floor(r.at / 10)) * lampDy, y = (1.18 + 0.72 - yw) / 1.44 * h; g.fillStyle = r.col; fitText(g, r.name, maxW, 44); g.fillText(r.name, x0, y); g.fillRect(x0 - 26, y - 3, 16, 6); }
    g.fillStyle = '#5a3e10'; g.font = `800 20px ${FONT}`; g.fillText('PULL TOGETHER', x0, h - 46); });
  panelTex.anisotropy = 8;
  { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.44), new THREE.MeshBasicMaterial({ map: panelTex })); p.position.set(0, 1.18, 0.305); cab.add(p); }
  const lampCols = ['#7dd3fc', '#7dd3fc', '#a3e635', '#a3e635', '#ffd23a', '#ffd23a', '#fb923c', '#fb923c', '#ec3013', '#f472b6'];
  for (let i = 0; i < LAMPS; i++) { const c = new THREE.Color(lampCols[i]); const m = new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(0.18) }); const l = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.03), m); l.position.set(-0.22, lampY0 + i * lampDy, 0.32); cab.add(l); lamps.push({ m, on: c, off: c.clone().multiplyScalar(0.18), k: 0 }); }
  // marquee
  const marqTex = canvasTex(1024, 320, (g, w, h) => { g.fillStyle = '#fbe9d0'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3132f'; g.fillRect(14, 14, w - 28, h - 28);
    for (let i = 0; i < 18; i++) { const x = 40 + i * (w - 80) / 17; g.fillStyle = i % 2 ? '#ffd23a' : '#fbe9d0'; g.beginPath(); g.arc(x, 40, 10, 0, 7); g.fill(); g.beginPath(); g.arc(x, h - 40, 10, 0, 7); g.fill(); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fbe9d0'; g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowOffsetY = 6; fitText(g, 'LOVE TESTER', w - 140, 132); g.fillText('LOVE TESTER', w / 2, h / 2 - 14); g.shadowColor = 'transparent';
    const sub = (world ? String(world).toUpperCase() + ' \u00b7 ' : '') + 'GRIP \u00b7 TAP \u00b7 FIND OUT'; g.fillStyle = '#ffd23a'; fitText(g, sub, w - 200, 34, 800); g.fillText(sub, w / 2, h - 82); });
  marqTex.anisotropy = 8;
  { M(new THREE.BoxGeometry(1.02, 0.36, 0.2), redD, 0, 2.2, 0.16, cab, 0.02); const mq = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.31), new THREE.MeshBasicMaterial({ map: marqTex })); mq.position.set(0, 2.2, 0.265); cab.add(mq); }
  // the glass dome + beating heart
  M(new THREE.CylinderGeometry(0.33, 0.36, 0.08, 28), brass, 0, 2.42, -0.02, cab, 0.012, 0.36);
  const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape(0.42), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }), new THREE.MeshToonMaterial({ color: '#ff2d6f', gradientMap: grad, emissive: new THREE.Color('#ff2d6f'), emissiveIntensity: 0.3 }));
  heart.geometry.center(); heart.rotation.z = Math.PI; heart.position.set(0, 2.68, -0.02); cab.add(heart); addOutline(heart, 0.02);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: '#ffd6e7', transparent: true, opacity: 0.22, shininess: 90, depthWrite: false })); dome.position.set(0, 2.45, -0.02); dome.scale.y = 1.25; cab.add(dome);
  // grips (left = slot 0, right = slot 1)
  const grips = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.44, 1.18, 0.05); cab.add(g);
    const bar = M(new THREE.CylinderGeometry(0.035, 0.035, 0.28, 12), brass, s * 0.14, 0, 0, g, 0.01, 0.035); bar.rotation.z = Math.PI / 2;
    const sl = M(new THREE.CylinderGeometry(0.055, 0.055, 0.18, 14), rubber, s * 0.2, 0, 0, g, 0.01, 0.055); sl.rotation.z = Math.PI / 2;
    M(new THREE.SphereGeometry(0.065, 14, 10), brass, s * 0.31, 0, 0, g, 0.01, 0.065);
    M(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 16), brass, s * 0.005, 0, 0, g, 0.008, 0.09).rotation.z = Math.PI / 2; return g; });
  // coin slot
  { const ct = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#e6b45a'; g.fillRect(0, 0, w, h); g.fillStyle = '#1c1917'; g.fillRect(56, 10, 16, 26); g.font = `900 20px ${FONT}`; g.textAlign = 'center'; g.fillText(PRICE + 'g', w / 2, 54); });
    const cp = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.11), new THREE.MeshBasicMaterial({ map: ct })); cp.position.set(0.22, 0.48, 0.302); cab.add(cp); }
  // ---------- dressing: glass over the meter, chrome trim, heart decals on the sides, a patterned rug ----------
  { const sheen = canvasTex(256, 512, (g, w, h) => { const lg = g.createLinearGradient(0, 0, w, h); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.42, 'rgba(255,255,255,0)'); lg.addColorStop(0.47, 'rgba(255,255,255,0.22)'); lg.addColorStop(0.53, 'rgba(255,255,255,0.05)'); lg.addColorStop(0.6, 'rgba(255,255,255,0.14)'); lg.addColorStop(0.64, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(0, 0, w, h); });
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.44), new THREE.MeshBasicMaterial({ map: sheen, transparent: true, depthWrite: false })); gl.position.set(0, 1.18, 0.345); gl.renderOrder = 3; cab.add(gl);
    const chrome = toon('#d7dbe3', { emissive: new THREE.Color('#2a2e38'), emissiveIntensity: 0.4 });
    for (const sx of [-0.4, 0.4]) M(new THREE.BoxGeometry(0.03, 1.5, 0.03), chrome, sx, 1.18, 0.33, cab, 0.006);
    for (const y of [0.44, 1.92]) M(new THREE.BoxGeometry(0.83, 0.03, 0.03), chrome, 0, y, 0.33, cab, 0.006);
    const decal = canvasTex(256, 256, (g, w) => { g.fillStyle = '#fbe9d0'; heartPath(g, w / 2, 30, 200); g.fill(); g.fillStyle = '#b3132f'; heartPath(g, w / 2, 52, 152); g.fill(); g.fillStyle = '#fbe9d0'; g.textAlign = 'center'; g.textBaseline = 'middle'; fitText(g, 'LOVE', 110, 44); g.fillText('LOVE', w / 2, 118); });
    for (const sx of [-1, 1]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: decal, transparent: true })); d.position.set(sx * 0.442, 1.45, 0); d.rotation.y = sx * Math.PI / 2; cab.add(d); }
    const rugT = canvasTex(512, 512, (g, w) => { g.fillStyle = '#7a1f45'; g.fillRect(0, 0, w, w); g.strokeStyle = '#9d2a5a'; g.lineWidth = 6; for (const r of [120, 180, 236]) { g.beginPath(); g.arc(w / 2, w / 2, r, 0, 7); g.stroke(); }
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, x = w / 2 + Math.cos(a) * 208, y = w / 2 + Math.sin(a) * 208; g.fillStyle = i % 2 ? '#ff7ab6' : '#ffd23a'; heartPath(g, x, y - 10, 26); g.fill(); } });
    const rug2 = new THREE.Mesh(new THREE.CircleGeometry(1.74, 48), new THREE.MeshToonMaterial({ map: rugT, gradientMap: grad })); rug2.rotation.x = -Math.PI / 2; rug2.position.set(0, 0.007, 0.55); rug2.receiveShadow = !touch; scene.add(rug2); }

  // ---------- polish: bulbs, glows, soft shadows, dust, confetti, sparks ----------
  const glowTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const blobTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,0.6)'); r.addColorStop(0.55, 'rgba(0,0,0,0.28)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const addGlow = (col, sc, parent = scene) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); sp.scale.setScalar(sc); parent.add(sp); return sp; };
  const blob = (x, z, r, o = 1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: o })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.018, z); m.renderOrder = 2; scene.add(m); return m; };
  blob(0, 0.05, 1.05);
  lamps.forEach((L, i) => { L.halo = addGlow(L.on, 0.42, cab); L.halo.position.set(-0.22, lampY0 + i * lampDy, 0.36); });
  const bulbs = [], bulbGeo = new THREE.SphereGeometry(0.024, 8, 6), addBulb = (x, y, z) => { const m = new THREE.MeshBasicMaterial({ color: '#4a2418' }), b = new THREE.Mesh(bulbGeo, m); b.position.set(x, y, z); cab.add(b); bulbs.push({ m, k: 0 }); };
  for (let i = 0; i < 12; i++) { const y = 0.4 + i * 0.13; addBulb(-0.425, y, 0.31); addBulb(0.425, y, 0.31); }
  for (let i = 0; i < 11; i++) addBulb(-0.48 + i * 0.096, 2.405, 0.27);
  const bulbOn = new THREE.Color('#fff2c4'), bulbOff = new THREE.Color('#4a2418'), HEART0 = new THREE.Color('#ff2d6f');
  const heartGlow = addGlow('#ff2d6f', 1.1, cab); heartGlow.position.set(0, 2.68, 0.06);
  const wave = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), new THREE.MeshBasicMaterial({ color: '#ff7ab6', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); wave.visible = false; scene.add(wave);
  const heartW = new THREE.Vector3(0, 2.68 * 1.3, 0.12), tmpW = new THREE.Vector3();
  const lightPool = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), new THREE.MeshBasicMaterial({ map: glowTex, color: '#ff4f9a', transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })); lightPool.rotation.x = -Math.PI / 2; lightPool.position.set(0, 0.016, 0.7); lightPool.renderOrder = 1; scene.add(lightPool);
  { const rim = new THREE.DirectionalLight(0x7dd3fc, 0.9); rim.position.set(-3, 5, -5); scene.add(rim); }
  const DN = touch ? 40 : 80, dGeo = new THREE.BufferGeometry(), dPos = new Float32Array(DN * 3); for (let i = 0; i < DN; i++) { dPos[i * 3] = rr(-4, 4); dPos[i * 3 + 1] = rr(0, 5); dPos[i * 3 + 2] = rr(-1, 3); } dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  scene.add(new THREE.Points(dGeo, new THREE.PointsMaterial({ map: glowTex, size: 0.07, color: '#ffc6e0', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })));
  const sqTex = canvasTex(16, 16, g => { g.fillStyle = '#fff'; g.fillRect(2, 4, 12, 8); });
  function makePool(tex, n, add) { const a = []; for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); sp.visible = false; scene.add(sp); a.push({ s: sp, life: 0, v: new THREE.Vector3(), spin: 0, sz: 0.1, g: 1, decay: 1 }); } a.i = 0; return a; }
  const confs = makePool(sqTex, 60, false), sparkP = makePool(glowTex, 30, true), CONF = ['#ff2d6f', '#ffd23a', '#7dd3fc', '#22c55e', '#f472b6', '#ffffff'];
  function emit(P, x, y, z, n, o) { for (let i = 0; i < n; i++) { const q = P[P.i = (P.i + 1) % P.length]; q.s.visible = true; q.s.position.set(x + rr(-0.2, 0.2), y + rr(-0.05, 0.1), z + rr(-0.1, 0.1)); q.life = 1; q.decay = o.decay; q.g = o.g; q.sz = rr(o.s0, o.s1); q.spin = rr(-8, 8); q.s.material.color.set(o.col()); q.v.set(rr(-1, 1) * o.spd, rr(o.up0, o.up1) * o.spd, rr(-0.4, 0.8) * o.spd); } }
  const confetti = (x, y, z, n, spd = 1) => emit(confs, x, y, z, n, { decay: 0.45, g: 2.2, s0: 0.07, s1: 0.11, spd, up0: 1.2, up1: 2.6, col: () => pick(CONF) });
  const sparks = (x, y, z, n) => emit(sparkP, x, y, z, n, { decay: 2.2, g: 5, s0: 0.05, s1: 0.12, spd: 1.4, up0: 0.4, up1: 1.4, col: () => pick(['#ffd23a', '#fff2c4', '#fb923c']) });
  const fx = { wave: 0, punch: 0, flash: 0, shake: 0, coinFlash: 0, rateCol: new THREE.Color('#ff2d6f') };
  // the verdict sign that drops onto the marquee, and a heart that rides up the meter
  const signCv = document.createElement('canvas'); signCv.width = 512; signCv.height = 160; const signTx = new THREE.CanvasTexture(signCv); signTx.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.47), new THREE.MeshBasicMaterial({ map: signTx, transparent: true, depthWrite: false })); sign.visible = false; sign.renderOrder = 5; scene.add(sign);
  const signGlow = addGlow('#ff2d6f', 1.7); signGlow.renderOrder = 4;
  function drawSign(pct, rt) { const g = signCv.getContext('2d'), w = 512, h = 160; g.clearRect(0, 0, w, h); g.fillStyle = '#140a1f'; g.fillRect(6, 6, w - 12, h - 12); g.strokeStyle = rt.col; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? rt.col : '#fff2c4'; g.beginPath(); g.arc(24 + i * (w - 48) / 15, 26, 5, 0, 7); g.fill(); g.beginPath(); g.arc(24 + i * (w - 48) / 15, h - 26, 5, 0, 7); g.fill(); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = rt.col; g.shadowBlur = 22; g.fillStyle = '#ffffff'; fitText(g, rt.name, w - 96, 64); g.fillText(rt.name, w / 2, h / 2 + 2); g.shadowBlur = 0; signTx.needsUpdate = true; }
  const puck = new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape(0.12), { depth: 0.03, bevelEnabled: false }), new THREE.MeshBasicMaterial({ color: '#ffffff' })); puck.geometry.center(); puck.rotation.z = Math.PI; puck.visible = false; cab.add(puck);
  const puckGlow = addGlow('#ffffff', 0.5, cab);
  const brassMat = brass; let roomBlipT = 2;

  // ---------- floating hearts ----------
  const heartTex = canvasTex(64, 64, (g) => { g.fillStyle = '#ffffff'; heartPath(g, 32, 6, 56); g.fill(); });
  const parts = []; for (let i = 0; i < 36; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, color: 0xff4f9a, transparent: true, opacity: 0, depthWrite: false })); s.visible = false; scene.add(s); parts.push({ s, life: 0, v: new THREE.Vector3() }); }
  let pI = 0; const burst = (x, y, z, n = 6, col = 0xff4f9a, spd = 1) => { for (let i = 0; i < n; i++) { const p = parts[pI = (pI + 1) % parts.length]; p.s.visible = true; p.s.position.set(x + rr(-0.12, 0.12), y + rr(-0.05, 0.1), z + rr(-0.1, 0.1)); p.s.material.color.set(col); p.life = 1; p.sz = rr(0.09, 0.17); p.v.set(rr(-0.5, 0.5) * spd, rr(0.6, 1.3) * spd, rr(-0.2, 0.4)); } };

  // ---------- the people at the machine ----------
  let foxes = [];   // { f, id, name, col, slot, me, x, z }
  function clearFoxes() { for (const p of foxes) { scene.remove(p.f); scene.remove(p.shadow); } foxes = []; }
  function spawn(spec, i, n) {
    let f;
    if (spec.cast) f = CK.make(spec.cast, spec.me ? {} : { mood: 'happy' });
    else f = kit.makeFox({ key: spec.id || ('fox' + i), torso: spec.torso || ['#ffffff', '#e7edf4', '#6b7d93'], crest: spec.crest || '', outfit: spec.outfit || 'armor', look: spec.look || PLAYER_MALE, eyes: spec.eyes || ['#38bdf8', '#38bdf8'], mood: 'happy', glasses: spec.glasses, bow: spec.bow });
    // the first two hold the grips; the rest stand at the sides of the machine, cheering
    const CROWD = [[-2.3, -0.1], [2.3, -0.1], [-2.1, 1.1]]; let x, z;
    if (i < 2) { x = (i === 0 ? -1 : 1) * 1.3; z = 0.5; f.rotation.y = (i === 0 ? 1 : -1) * 0.95; }
    else { [x, z] = CROWD[(i - 2) % 3]; f.rotation.y = x < 0 ? 0.75 : -0.75; }
    f.position.set(x, 0, z); const ty = 1.6;
    f.userData.wagMul = 1; f.userData.base0 = { x, z, ry: f.rotation.y, ty };
    const shadow = blob(x, z, 0.8, 0.95);
    return { f, shadow, id: spec.id, name: spec.name, col: spec.col, slot: i, me: !!spec.me, x, z, grip: i < 2 ? grips[i] : null, squeeze: 0, hop: 0 };
  }
  function setPeople(list) { clearFoxes(); foxes = list.map((s, i) => { const p = spawn(s, i, list.length); p.spec0 = s; return p; }); fitKey = ''; }

  // ---------- camera fitting with a safe area (UI panels) ----------
  const SAFE = { top: 0, bottom: 0, left: 0, right: 0 }; let fitKey = '', camDist = 6, camY = 1.45, camLook = new THREE.Vector3(0, 1.35, 0.4);
  function fit() { const w = W(), h = H(), k = [w, h, SAFE.top, SAFE.bottom, SAFE.left, SAFE.right, foxes.length].join('|'); if (k === fitKey) return; fitKey = k;
    renderer.setSize(w, h); camera.aspect = w / h;
    const fw = Math.max(80, w - SAFE.left - SAFE.right), fh = Math.max(80, h - SAFE.top - SAFE.bottom), tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const crowd = foxes.length > 2, halfW = crowd ? 2.95 : 2.15, halfH = 2.02;
    camDist = Math.max(halfH / tan * (h / fh), halfW / (tan * camera.aspect) * (w / fw)) * 1.04;
    camLook.set(0, 1.84, crowd ? 0.5 : 0.35);
    camera.position.set(0, camLook.y + camDist * 0.12, camLook.z + camDist); camera.lookAt(camLook); camera.far = camDist + 30;
    scene.fog.near = camDist + 1; scene.fog.far = camDist + 10;   // fog only eats the far room, never the machine
    const cx = SAFE.left + fw / 2, cy = SAFE.top + fh / 2; camera.setViewOffset(w, h, w / 2 - cx, h / 2 - cy, w, h); camera.updateProjectionMatrix(); }

  // ---------- game state ----------
  const S = { phase: 'intro', mode: 'solo', partnerKey: null, partner: null, plan: null, me: null, them: null, online: null, results: {}, t: 0, say: '', sayT: 0, flash: null, flashT: 0,
    count: 0, beat: null, sq: null, sp: null, card: null, cardT: 0, next: null, meter: 0, meterTo: 0, meterT: 0, result: null, free: false, sawHelp: false };
  let lastEmit = 0, dirty = true;
  const mark = () => { dirty = true; };
  const sayLine = (txt, t = 3) => { S.say = txt; S.sayT = t; const pf = foxes.find(p => !p.me); if (pf && txt) pf.f.userData.say = { text: txt, t: 0 }; mark(); };
  const flash = (txt, col = '#ffd23a', t = 0.8) => { S.flash = { txt, col }; S.flashT = t; mark(); };
  const linesOf = () => (S.partner && S.partner.lines) || LINES;

  function partnerSpec(p) { if (!p) return null;
    if (p.cast) return { id: 'partner', name: p.name, cast: p.cast };
    return { id: 'partner', name: p.name || 'YOUR DATE', look: p.look || PLAYER_FEMALE, outfit: p.outfit || 'dress', torso: p.torso || '#f472b6', eyes: p.eyes || ['#22c55e', '#22c55e'] }; }
  function resolvePartner(p) {
    if (!p) return null; if (typeof p === 'string') p = { key: p };
    const k = String(p.key || p.cast || '').toLowerCase();
    if (k === 'stranger') { const k2 = pick(['ruby', 'milo', 'juniper']); return { ...PARTNERS[k2] }; }
    if (PARTNERS[k] && !p.name && !p.look) return { ...PARTNERS[k] };
    if (PARTNERS[k]) return { ...PARTNERS[k], ...p, key: k };
    const name = String(p.name || k || 'YOUR DATE').toUpperCase().slice(0, 12), key = (p.key || name).toString().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'date';
    let look = PLAYER_FEMALE; if (p.look && typeof p.look === 'object') look = { ...(p.female === false ? PLAYER_MALE : PLAYER_FEMALE), ...p.look }; else if (p.female === false) look = PLAYER_MALE;
    if (p.fur) look = { ...look, fur: p.fur, paw: p.fur, tailMid: p.fur };
    return { key, name, look, outfit: p.outfit || 'dress', torso: p.torso || '#f472b6', eyes: p.eyes ? [p.eyes, p.eyes].flat().slice(0, 2) : ['#22c55e', '#22c55e'], chem: p.chem != null ? +p.chem : 0.5 + (hashStr(name + '|love') % 1000) / 1000 * 0.35, lines: p.lines || null, fromWorld: true };
  }
  function setPartner(p) { if (S.phase !== 'intro' && S.phase !== 'result') return; S.partner = resolvePartner(p); S.partnerKey = S.partner ? S.partner.key : null; S.mode = 'solo'; S.result = null; S.phase = 'intro';
    setPeople([{ id: 'me', name: 'YOU', cast: 'player', me: true, col: '#ec3013' }, ...(S.partner ? [partnerSpec(S.partner)] : [])]);
    if (S.partner) sayLine(linesOf().hi, 3.5); mark(); }

  // ---------- flow ----------
  function begin({ seed, online = null, demo = false } = {}) { S.demo = demo; demoOn = demo; S.dm = { done: new Set(), t: 0, want: 0 };
    audio.unlock(); S.plan = makePlan(seed != null ? seed : (Math.random() * 2 ** 31) >>> 0); S.online = online; S.mode = online ? 'online' : 'solo';
    S.me = { offs: Array(S.plan.beats).fill(null), sq: Array(S.plan.targets.length).fill(null), picks: Array(S.plan.qs.length).fill(null) }; S.them = null; S.results = {}; S.result = null; S.meter = 0; S.meterTo = 0;
    if (demo) S.free = true; else { S.free = !save.spend(PRICE); save.setStat('loveTester.plays', save.stat('loveTester.plays') + 1); }
    lamps.forEach(l => l.k = 0); for (const p of foxes) { p.f.userData.mood = 'happy'; p.f.userData.lookAt = null; }
    S.phase = 'count'; S.count = 3; S.t = -0.6; audio.coin(); fx.coinFlash = 1; flash(S.free ? 'ON THE HOUSE' : '-' + PRICE + 'g · COIN IN', '#ffd23a', 1.2); mark();
  }
  function startBeat() { const P = S.plan, delay = 0.9, lat = audio.latency(), at = audio.now() + delay; S.phase = 'beat';
    const t0 = performance.now() + (delay + lat) * 1000; S.beat = { t0, times: [], hit: Array(P.beats).fill(false), i: -1, judge: '', judgeCol: '#ffffff', pulse: 0, done: false, aiT: [] };
    for (let i = 0; i < P.lead + P.beats; i++) { S.beat.times.push(t0 + i * P.iv); audio.thump(at + i * P.iv / 1000, i < P.lead ? 0.75 : 1); }
    if (S.mode === 'solo') { const R = rng(S.plan.seed ^ 0x51ed); S.beat.ai = { R }; }
    sayLine(S.mode === 'solo' ? linesOf().hb === LINES.hb ? 'Listen first, then tap with me.' : 'Listen first… then tap with me.' : '', 2.5); mark(); }
  function tap() { if (S.phase !== 'beat' || !S.beat) return; const P = S.plan, B = S.beat, now = performance.now(); audio.unlock();
    let best = -1, bd = 1e9; for (let i = 0; i < P.beats; i++) { const tt = B.times[P.lead + i], d = now - tt; if (!B.hit[i] && Math.abs(d) < bd && Math.abs(d) < P.iv * 0.5) { bd = Math.abs(d); best = i; } }
    const me = foxes.find(p => p.me);
    if (best < 0) { flash(now < B.times[P.lead] - P.iv * 0.5 ? 'LISTEN FIRST' : 'OFF BEAT', '#7dd3fc', 0.5); audio.bad(); return; }
    const off = Math.round(now - B.times[P.lead + best]); B.hit[best] = true; S.me.offs[best] = off;
    const a = Math.abs(off), q = a < 70 ? 2 : a < 140 ? 1 : 0; B.judge = q === 2 ? 'PERFECT' : q === 1 ? 'GOOD' : off < 0 ? 'EARLY' : 'LATE'; B.judgeCol = q === 2 ? '#f472b6' : q === 1 ? '#22c55e' : '#ffd23a';
    audio.good(q); buzz(q ? 25 : 10); if (me && q) { me.f.userData.hop = 0.5; burst(me.x * 0.6, 2.7, me.z, q === 2 ? 3 : 1); } mark(); }
  function endBeat() { const P = S.plan; S.beat.done = true;
    if (S.mode === 'solo') S.them = partnerAnswers(P, S.me, S.partner ? S.partner.chem : 0.6, rng(P.seed ^ 0xbeef));
    const mine = Math.round(S.me.offs.reduce((a, o) => a + beatAcc(o), 0) / P.beats * 100);
    const rows = [{ k: 'YOUR TIMING', v: mine + '%' }, { k: 'BEATS HIT', v: S.me.offs.filter(o => o != null).length + ' / ' + P.beats }];
    if (S.them) { let s = 0; for (let i = 0; i < P.beats; i++) { const a = S.me.offs[i], b = S.them.offs[i]; s += a == null || b == null ? 0 : clamp(1 - Math.abs(a - b) / 260, 0, 1); } rows.push({ k: 'IN SYNC WITH ' + (S.partner ? S.partner.name : 'THEM'), v: Math.round(s / P.beats * 100) + '%' }); }
    showCard('HEARTBEAT', rows, mine >= 70 ? 'Your hearts kept time.' : mine >= 40 ? 'A little off the beat.' : 'Two left paws.', startGrip); }
  function showCard(title, rows, sub, next) { S.phase = 'card'; S.card = { title, rows, sub }; S.cardT = 2.6; S.next = next; mark(); }
  function skipCard() { if (S.phase === 'card' && S.cardT < 2.2) { S.cardT = 0; } }
  function startGrip() { S.phase = 'grip'; S.sq = { i: 0, st: 'ready', v: 0, hold: 0, wait: 0, lockT: 0, ai: 0, aiV: 0, res: '' }; sayLine(S.mode === 'solo' ? 'Squeeze together. Let go in the gold.' : '', 2.5); mark(); }
  function gripDown() { if (S.phase !== 'grip' || !S.sq || S.sq.st !== 'ready') return; audio.unlock(); S.sq.st = 'hold'; S.sq.v = 0; S.sq.hold = 0; audio.whine(true, 0); buzz(15); mark(); }
  function gripUp() { if (S.phase !== 'grip' || !S.sq || S.sq.st !== 'hold') return; lockGrip(Math.round(S.sq.v)); }
  function lockGrip(v) { const Q = S.sq, c = S.plan.targets[Q.i]; Q.st = 'lock'; Q.lockT = 1.3; audio.whine(false); S.me.sq[Q.i] = v;
    const acc = gripAcc(v, c); Q.res = v == null ? 'NO SQUEEZE' : v > 100 ? 'TOO HARD!' : Math.abs(v - c) <= S.plan.band ? 'SWEET SPOT' : v < c ? 'TOO SOFT' : 'TOO HARD';
    Q.resCol = Q.res === 'SWEET SPOT' ? '#22c55e' : v == null || v > 100 ? '#ec3013' : '#ffd23a'; audio.release(v != null && v > 100 ? 'over' : acc > 0.75 ? 'sweet' : 'meh'); if (acc > 0.75) { burst(0, 1.9, 0.6, 7); confetti(0, 1.6, 0.6, 10, 0.8); } if (v != null && v > 100) { fx.shake = 1; sparks(0, 1.55, 0.3, 14); }
    if (S.them) Q.aiV = S.them.sq[Q.i]; mark(); }
  function endGrip() { const P = S.plan, mine = Math.round(S.me.sq.reduce((a, v, i) => a + gripAcc(v, P.targets[i]), 0) / P.targets.length * 100);
    const rows = [{ k: 'YOUR GRIP', v: mine + '%' }, { k: 'SWEET SPOTS', v: S.me.sq.filter((v, i) => v != null && v <= 100 && Math.abs(v - P.targets[i]) <= P.band).length + ' / ' + P.targets.length }];
    if (S.them) { let s = 0; for (let i = 0; i < P.targets.length; i++) { const a = S.me.sq[i], b = S.them.sq[i]; s += a == null || b == null || a > 100 ? 0 : clamp(1 - Math.abs(a - b) / 30, 0, 1); } rows.push({ k: 'SQUEEZED ALIKE', v: Math.round(s / P.targets.length * 100) + '%' }); }
    showCard('GRIP', rows, mine >= 70 ? 'Firm, not crushing. Nice.' : mine >= 40 ? 'Getting the feel of it.' : 'The machine winced.', startSparks); }
  function startSparks() { S.phase = 'sparks'; S.sp = { i: 0, st: 'ask', left: 7, picked: null, them: null, showT: 0, sparks: 0 }; sayLine(S.mode === 'solo' ? 'Quick! Pick what you love.' : '', 2); mark(); }
  function choose(k) { if (S.phase !== 'sparks' || !S.sp || S.sp.st !== 'ask') return; audio.unlock(); const Sp = S.sp; Sp.picked = k; S.me.picks[Sp.i] = k; Sp.st = 'show'; Sp.showT = S.mode === 'solo' ? 1.5 : 0.7; audio.pick();
    if (S.them) { Sp.them = S.them.picks[Sp.i]; if (Sp.them === k) { Sp.sparks++; setTimeout(() => { audio.match(); burst(0, 2.4, 0.6, 9); fx.flash = 0.8; }, 450); } else setTimeout(() => audio.noMatch(), 450); } mark(); }
  function endSparks() { if (S.mode === 'solo') finishSolo(); else finishOnline(); }
  function finishSolo() { const P = S.plan, sc = pairScore(P, S.me, S.them, 'me|' + (S.partner ? S.partner.key : ''));
    S.result = { ...sc, partner: S.partner ? S.partner.name : '', pairs: null }; startTally(sc.pct); }
  function startTally(pct) { S.phase = 'tally'; S.meter = 0; S.meterTo = pct; S.meterT = 0; S.tick = -1; mark(); }
  function tallyDone() { const r = S.result, pct = S.meterTo, rt = ratingOf(pct); S.phase = 'result'; S.resT = S.t; drawSign(pct, rt); signGlow.material.color.set(rt.col); audio.fanfare(pct); fx.flash = pct >= 60 ? 1.4 : 0.6; fx.rateCol.set(rt.col); if (pct >= 60) confetti(0, 3.4, 0.2, pct >= 95 ? 40 : 24, 1.4); buzz(pct >= 80 ? [40, 60, 40, 60, 120] : 60);
    const xp = Math.max(1, Math.round(pct / 10)); r.xp = xp; if (S.demo) { r.xp = 0; r.best = 0; r.newBest = false; } else { save.addXp(xp); save.setFlag('loveTester.played');
    const bk = 'loveTester.best.' + (S.mode === 'online' ? 'online' : (S.partner ? S.partner.key : 'solo')); r.newBest = save.best(bk, pct); r.best = save.stat(bk); save.best('loveTester.best', pct);
    if (pct >= 95) save.setFlag('loveTester.soulmates'); if (pct >= 95 && S.partner) save.setFlag('loveTester.soulmates.' + S.partner.key); }
    for (const p of foxes) { p.f.userData.mood = rt.mood; if (pct >= 60) p.f.userData.hop = 1; }
    const a = foxes[0], b = foxes[1]; if (a && b) { a.f.userData.lookAt = b.f.position.clone().setY(1.6); b.f.userData.lookAt = a.f.position.clone().setY(1.6); }
    if (pct >= 80) for (let i = 0; i < 4; i++) setTimeout(() => burst(0, 3.5, 0, 8, i % 2 ? 0xffd23a : 0xff4f9a, 1.3), i * 260);
    if (S.mode === 'solo') sayLine(pct >= 80 ? linesOf().hiR : pct >= 40 ? linesOf().mid : linesOf().lo, 4);
    mark(); if (window.parent !== window) try { window.parent.postMessage({ type: '8g-minigame', game: GAME, event: 'result', pct, rating: rt.name, partner: S.partner ? S.partner.key : null, online: S.mode === 'online' }, '*'); } catch (e) {} }

  // ---------- online (the page owns the room; this module runs the match) ----------
  // netBegin({ seed, me, players: [{ id, name, col, slot }], send(type, data, to?) })
  function netBegin({ seed, me, players, send, mid }) { S.online = { me, players, send, mid, t0: performance.now() };
    setPeople(players.map((p, i) => p.id === me ? { id: p.id, name: p.name, cast: 'player', me: true, col: p.col } : { id: p.id, name: p.name, look: { ...(i % 2 ? PLAYER_FEMALE : PLAYER_MALE), armorAccent: p.col }, outfit: 'armor', torso: ['#ffffff', '#e7edf4', '#6b7d93'], crest: String(i + 1), eyes: [p.col, p.col], col: p.col }));
    S.partner = null; begin({ seed, online: S.online }); }
  function netRecv(type, d, id) { if (!S.online || !d) return; if (d.k === 'res' && d.mid === S.online.mid && d.res) { S.results[id] = d.res; if (S.phase === 'wait') checkAll(); mark(); } }
  function netDrop(id) { if (!S.online) return; S.online.players = S.online.players.filter(p => p.id !== id); if (S.phase === 'wait') checkAll(); mark(); }
  function netEnd() { S.online = null; if (S.phase !== 'intro') { audio.whine(false); S.phase = 'intro'; } setPartner(S.partner ? S.partner.key : null); }
  function finishOnline() { const O = S.online; if (!O) return finishSolo(); S.results[O.me] = S.me; try { O.send('ev', { k: 'res', mid: O.mid, res: S.me }); } catch (e) {} S.phase = 'wait'; S.waitT = 0; checkAll(); mark(); }
  function checkAll(force) { const O = S.online; if (!O) return; const missing = O.players.filter(p => !S.results[p.id]); if (missing.length && !force) { S.missing = missing.map(p => p.name); return; }
    const got = O.players.filter(p => S.results[p.id]), pairs = [];
    for (let i = 0; i < got.length; i++) for (let j = i + 1; j < got.length; j++) { const A = got[i], B = got[j], sc = pairScore(S.plan, S.results[A.id], S.results[B.id], [A.id, B.id].sort().join('|')); pairs.push({ a: A, b: B, ...sc, mine: A.id === O.me || B.id === O.me }); }
    pairs.sort((x, y) => y.pct - x.pct); const mine = pairs.filter(p => p.mine), best = mine[0] || pairs[0];
    if (!best) { S.result = { pct: 1, rating: ratingOf(1), pairs: [], hb: 0, grip: 0, sparks: 0, sparkN: 4 }; startTally(1); return; }
    S.result = { ...best, partner: (best.a.id === O.me ? best.b : best.a).name, pairs, top: pairs[0] };
    // move my best match onto the other grip so the machine shows the two of us
    const meIdx = foxes.findIndex(p => p.me), other = best.a.id === O.me ? best.b.id : best.a.id, oi = foxes.findIndex(p => p.id === other);
    if (meIdx > -1 && oi > -1 && foxes.length > 2) { const order = [foxes[meIdx], foxes[oi], ...foxes.filter((_, k) => k !== meIdx && k !== oi)]; const specs = order.map(p => p.spec0); if (specs.every(Boolean)) setPeople(specs); }
    startTally(best.pct); }

  // ---------- DEMO: the machine plays itself (no gold, no saves) and loops until someone taps ----------
  function demoTick(now, dt) { const D = S.dm; D.t += dt;
    if (S.phase === 'beat' && S.beat) { const P = S.plan; for (let i = 0; i < P.beats; i++) { if (D.done.has(i)) continue; if (!D.off) D.off = []; if (D.off[i] == null) D.off[i] = Math.random() < 0.1 ? 9999 : rr(-70, 90);
        const tt = S.beat.times[P.lead + i] + D.off[i]; if (now >= tt) { D.done.add(i); if (D.off[i] < 9000) tap(); } } }
    else if (S.phase === 'grip' && S.sq) { const Q = S.sq; if (Q.st === 'ready') { if (Q.wait > 0.7) { D.want = S.plan.targets[Q.i] + rr(-7, 5) + (Math.random() < 0.12 ? 30 : 0); gripDown(); } } else if (Q.st === 'hold' && Q.v >= D.want) gripUp(); }
    else if (S.phase === 'sparks' && S.sp && S.sp.st === 'ask') { if (S.sp.left < 5.4) choose(S.them && Math.random() < 0.6 ? S.them.picks[S.sp.i] : Math.floor(Math.random() * 3)); }
    else if (S.phase === 'card' && S.cardT < 1.4) skipCard();
    else if (S.phase === 'result' && S.t - (S.resT || 0) > 6) { const keys = ['hope', 'noble', 'stranger']; setPartner(keys[(keys.indexOf(S.partnerKey) + 1) % 3] || 'hope'); begin({ demo: true }); } }
  function demoStart() { if (S.online) return false; if (S.phase !== 'intro' && S.phase !== 'result') return false; if (!S.partner) setPartner('hope'); S.phase = 'intro'; begin({ demo: true }); return true; }
  function demoStop() { if (!S.demo) return; S.demo = false; demoOn = false; audio.whine(false); S.phase = 'intro'; S.result = null; S.say = ''; for (const p of foxes) { p.f.userData.mood = 'happy'; p.f.userData.lookAt = null; } mark(); }

  // ---------- frame loop ----------
  let raf = 0, last = performance.now(), dead = false, hidden = false; const onVis = () => { hidden = document.hidden; last = performance.now(); }; document.addEventListener('visibilitychange', onVis);
  function step() { if (dead) return; raf = requestAnimationFrame(step); if (hidden) return; const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; S.t += dt; fit();
    if (S.sayT > 0) { S.sayT -= dt; if (S.sayT <= 0) { S.say = ''; mark(); } }
    if (S.flashT > 0) { S.flashT -= dt; if (S.flashT <= 0) { S.flash = null; mark(); } }
    let pulse = 0;
    if (S.demo) demoTick(now, dt);
    if (S.phase === 'count') { const c = 3 - Math.floor(S.t / 0.7); if (c !== S.count && S.t >= 0) { S.count = c; audio.count(c); mark(); } if (S.t > 2.1) startBeat(); }
    else if (S.phase === 'beat') { const B = S.beat, P = S.plan; let bi = -1; for (let i = 0; i < B.times.length; i++) if (now >= B.times[i] - 30) bi = i; if (bi !== B.i) { B.i = bi; if (bi >= 0) { buzz(bi < P.lead ? 12 : 20); fx.wave = 1; fx.punch = 1; } mark(); }
      if (bi >= 0) { const since = (now - B.times[bi]) / 1000; pulse = Math.max(0, 1 - since * 4); }
      B.pulse = pulse;
      // the solo partner taps along (shown as their hop + a heart)
      if (S.them) {} else if (S.mode === 'solo' && S.partner && bi >= P.lead) { const k = bi - P.lead; if (!B.aiT[k]) { B.aiT[k] = 1; const pf = foxes.find(p => !p.me); if (pf && Math.random() < 0.55 + (S.partner.chem || 0.6) * 0.4) setTimeout(() => { if (dead) return; pf.f.userData.hop = 0.45; burst(pf.x * 0.6, 2.7, pf.z, 1, 0xffd23a); }, rr(-40, 110) + 60); } }
      if (now > B.times[B.times.length - 1] + P.iv * 0.6 && !B.done) endBeat(); }
    else if (S.phase === 'card') { S.cardT -= dt; if (S.cardT <= 0) { const n = S.next; S.next = null; n && n(); } }
    else if (S.phase === 'grip') { const Q = S.sq, c = S.plan.targets[Q.i];
      if (Q.st === 'ready') { Q.wait += dt; if (Q.wait > 7) { lockGrip(null); } }
      else if (Q.st === 'hold') { Q.hold += dt; const sp = 26 + Math.min(1, Q.hold / 1.6) * 58; Q.v += (sp + Math.sin(Q.hold * 11) * 16) * dt; if (Q.v >= 100) { Q.v = 101; lockGrip(101); } else audio.whine(true, Q.v); mark(); }
      else if (Q.st === 'lock') { Q.lockT -= dt; if (Q.lockT <= 0) { Q.i++; if (Q.i >= S.plan.targets.length) { S.sq.st = 'done'; endGrip(); } else { Q.st = 'ready'; Q.v = 0; Q.wait = 0; Q.res = ''; mark(); } } }
      // AI ghost needle for the partner
      if (S.mode === 'solo' && Q.st === 'hold') Q.ai = Math.min(100, Q.ai + dt * 55); else if (Q.st === 'ready') Q.ai = 0;
      void c; }
    else if (S.phase === 'sparks') { const Sp = S.sp; if (Sp.st === 'ask') { Sp.left -= dt; if (Sp.left <= 0) { Sp.picked = null; S.me.picks[Sp.i] = null; Sp.st = 'show'; Sp.showT = 0.9; Sp.them = S.them ? S.them.picks[Sp.i] : null; audio.bad(); mark(); } else if (Math.ceil(Sp.left) !== Sp.lastSec) { Sp.lastSec = Math.ceil(Sp.left); mark(); } }
      else if (Sp.st === 'show') { Sp.showT -= dt; if (Sp.showT <= 0) { Sp.i++; if (Sp.i >= S.plan.qs.length) { Sp.st = 'done'; if (S.mode === 'solo') { const rows = [{ k: 'SPARKS', v: Sp.sparks + ' / ' + S.plan.qs.length }]; showCard('SPARKS', rows, Sp.sparks >= 3 ? 'You like the same things!' : Sp.sparks ? 'A few things in common.' : 'Opposites attract?', endSparks); } else endSparks(); } else { Sp.st = 'ask'; Sp.left = 7; Sp.picked = null; Sp.them = null; mark(); } } } }
    else if (S.phase === 'wait') { S.waitT += dt; if (S.waitT > 25) checkAll(true); }
    else if (S.phase === 'tally') { S.meterT += dt; const k = smooth(0, 1, S.meterT / 3.2), v = S.meterTo * k; S.meter = v; const lit = Math.ceil(v / 10); if (lit !== S.tick) { S.tick = lit; if (lit > 0) audio.climb(lit / 10); mark(); } if (S.meterT > 3.6) tallyDone(); }
    // lamps: during GRIP they follow your squeeze, during the tally they climb, after the result they chase
    for (let i = 0; i < LAMPS; i++) { const L = lamps[i]; let on = 0;
      if (S.phase === 'grip' && S.sq) on = (S.sq.st === 'hold' || S.sq.st === 'lock') && (S.sq.st === 'lock' ? (S.me.sq[S.sq.i] || 0) : S.sq.v) > i * 10 ? 1 : 0;
      else if (S.phase === 'tally') on = S.meter > i * 10 ? 1 : 0;
      else if (S.phase === 'result') on = (S.meterTo > i * 10 ? 1 : 0) * (S.meterTo >= 80 ? 0.6 + 0.4 * Math.sin(S.t * 8 - i) : 1);
      else if (S.phase === 'intro' || S.phase === 'wait') on = Math.max(0, Math.sin(S.t * 2.2 - i * 0.6)) * 0.8;
      else if (S.phase === 'beat') on = pulse * (i < 3 ? 1 : 0.2);
      L.k = damp(L.k, on, 18, dt); L.m.color.copy(L.off).lerp(L.on, L.k); }
    // heart dome beats
    const hb = S.phase === 'beat' ? pulse : S.phase === 'result' ? 0.5 + 0.5 * Math.sin(S.t * (S.meterTo >= 60 ? 9 : 3)) : 0.3 + 0.3 * Math.max(0, Math.sin(S.t * 3.3)) * Math.max(0, Math.sin(S.t * 6.6));
    heart.scale.setScalar(1 + hb * 0.22); heart.material.emissiveIntensity = 0.25 + hb * 1.1; heart.rotation.y = Math.sin(S.t * 0.7) * 0.4; pinkL.intensity = 4 + hb * 9 + fx.flash * 10; pinkL.color.copy(heart.material.color);
    neonA.material.color.setHSL(0.93, 1, 0.55 + 0.1 * Math.sin(S.t * 3)); 
    // foxes
    const gripping = S.phase === 'grip' && S.sq && S.sq.st === 'hold';
    for (const p of foxes) { const u = p.f.userData; kit.animFox(p.f, dt, 0, false);
      if (p.slot < 2 && !u.chair) { const sq = gripping ? 1 : S.phase === 'grip' ? 0.6 : S.phase === 'beat' || S.phase === 'count' || S.phase === 'card' || S.phase === 'sparks' ? 0.55 : 0; p.squeeze = damp(p.squeeze, sq, 10, dt);
        if (p.squeeze > 0.02) { const shake = gripping ? Math.sin(S.t * 40 + p.slot) * 0.04 : 0; const arm = u.P.arms[p.slot === 0 ? 1 : 0]; arm.rotation.x = arm.rotation.x * (1 - p.squeeze) + (-1.35 + shake) * p.squeeze; arm.rotation.z = arm.rotation.z * (1 - p.squeeze) + (p.slot === 0 ? 0.2 : -0.2) * p.squeeze; } }
      if (p.slot >= 2 && (S.phase === 'result' && S.meterTo >= 60 || S.phase === 'tally')) { const a = u.P.arms; a[0].rotation.x = -2.6 + Math.sin(S.t * 9 + p.slot) * 0.3; a[1].rotation.x = -2.6 + Math.sin(S.t * 9 + p.slot + 1) * 0.3; }
      if (u.hopY != null) p.f.position.y = 0; }
    grips.forEach((g, i) => { g.position.x = (i ? 1 : -1) * 0.44 + (gripping ? Math.sin(S.t * 50 + i) * 0.006 : 0); });
    for (const p of parts) { if (p.life <= 0) continue; p.life -= dt * 0.8; p.s.position.addScaledVector(p.v, dt); p.v.y -= dt * 0.4; p.s.material.opacity = Math.min(1, p.life * 1.6); p.s.scale.setScalar(p.sz * (1 + (1 - p.life) * 0.6)); if (p.life <= 0) p.s.visible = false; }
    // ---- polish fx ----
    fx.wave = Math.max(0, fx.wave - dt * 1.6); fx.punch = Math.max(0, fx.punch - dt * 5); fx.flash = Math.max(0, fx.flash - dt * 1.5); fx.shake = Math.max(0, fx.shake - dt * 2.5); fx.coinFlash = Math.max(0, fx.coinFlash - dt * 1.2);
    { const k = 1 - fx.wave; wave.visible = fx.wave > 0.01; wave.position.copy(heartW); wave.quaternion.copy(camera.quaternion); wave.scale.setScalar(0.35 + k * 1.9); wave.material.opacity = fx.wave * 0.8; wave.material.color.copy(heart.material.color); }
    heart.material.color.lerp(S.phase === 'result' ? fx.rateCol : HEART0, 1 - Math.exp(-4 * dt)); heart.material.emissive.copy(heart.material.color);
    heartGlow.material.color.copy(heart.material.color); heartGlow.material.opacity = 0.22 + hb * 0.4; heartGlow.scale.setScalar(0.9 + hb * 0.35);
    lightPool.material.opacity = 0.2 + hb * 0.22 + fx.flash * 0.3; lightPool.material.color.copy(heart.material.color);
    lamps.forEach(L => { L.halo.material.opacity = L.k * 0.85; });
    { const nB = bulbs.length, fr = Math.floor(S.t * (S.phase === 'result' && S.meterTo >= 60 ? 16 : 6)); bulbs.forEach((b, i) => { let on;
        if (S.phase === 'beat') on = pulse > 0.3 ? 1 : 0.15;
        else if (S.phase === 'grip') on = gripping ? (i + Math.floor(S.t * 30)) % 2 : i % 2 ? 0.2 : 0.8;
        else if (S.phase === 'tally') on = i / nB < S.meter / 100 ? 1 : 0.1;
        else if (S.phase === 'result') on = (i + fr) % 3 === 0 ? 1 : 0.2;
        else on = (i + Math.floor(S.t * 5)) % 4 === 0 ? 1 : 0.25;
        b.k = damp(b.k, Math.max(on, fx.coinFlash), 25, dt); b.m.color.copy(bulbOff).lerp(S.phase === 'result' ? fx.rateCol : bulbOn, b.k); }); }
    { const a = dGeo.attributes.position.array; for (let i = 0; i < DN; i++) { a[i * 3 + 1] += dt * 0.08; if (a[i * 3 + 1] > 5) a[i * 3 + 1] = 0; a[i * 3] += Math.sin(S.t * 0.3 + i) * dt * 0.03; } dGeo.attributes.position.needsUpdate = true; }
    for (const P of [confs, sparkP]) for (const q of P) { if (q.life <= 0) continue; q.life -= dt * q.decay; q.v.y -= dt * q.g; q.v.multiplyScalar(1 - dt * 0.6); q.s.position.addScaledVector(q.v, dt); if (q.s.position.y < 0.03) { q.s.position.y = 0.03; q.v.set(0, 0, 0); }
      q.s.material.rotation += q.spin * dt; q.s.material.opacity = Math.min(1, q.life * 2); q.s.scale.set(q.sz, q.sz * (P === confs ? 0.35 + 0.65 * Math.abs(Math.sin(S.t * 6 + q.spin)) : 1), 1); if (q.life <= 0) q.s.visible = false; }
    if (gripping && Math.random() < dt * 14) { grips[Math.random() < 0.5 ? 0 : 1].getWorldPosition(tmpW); sparks(tmpW.x, tmpW.y, tmpW.z + 0.1, 1); }
    scrT -= dt; if (scrT <= 0) { scrT = 0.12; drawScreens(S.t); }
    { const showS = S.phase === 'result', k = showS ? smooth(0, 1, (S.t - (S.resT || 0)) * 2.2) : 0, bounce = showS ? Math.sin(Math.min(1, (S.t - (S.resT || 0)) * 2.2) * Math.PI) * 0.12 : 0;
      sign.visible = k > 0.01; sign.position.set(0, 3.4 + (1 - k) * 0.7 + bounce + Math.sin(S.t * 2) * 0.02, 0.78); sign.quaternion.copy(camera.quaternion); sign.material.opacity = k; sign.scale.setScalar(0.55 + k * 0.3);
      signGlow.position.copy(sign.position).z -= 0.05; signGlow.material.opacity = k * (0.45 + 0.2 * Math.sin(S.t * 5));
      const mv = S.phase === 'tally' ? S.meter : S.phase === 'result' ? S.meterTo : -1; puck.visible = mv >= 0; puckGlow.material.opacity = mv >= 0 ? 0.7 : 0;
      if (mv >= 0) { const y = lampY0 - 0.05 + Math.min(100, mv) / 100 * (LAMPS * lampDy); puck.position.set(-0.36, y, 0.34); puck.scale.setScalar(1 + (S.phase === 'result' ? 0.15 * Math.sin(S.t * 8) : 0)); puck.material.color.copy(S.phase === 'result' ? fx.rateCol : bulbOn); puckGlow.position.copy(puck.position); puckGlow.material.color.copy(puck.material.color); }
      brassMat.emissiveIntensity = 0.3 + (gripping ? 0.5 + 0.3 * Math.sin(S.t * 30) : 0);
      if (S.phase === 'intro' || S.phase === 'result') { roomBlipT -= dt; if (roomBlipT <= 0) { roomBlipT = rr(2.5, 6); audio.blip(); } } }
    // camera life: slow sway, a punch on each beat, a slow push-in for the verdict, a shake for TOO HARD
    { const sw = touch ? 0.6 : 1, push = S.phase === 'result' ? 0.07 * smooth(0, 1, (S.t - (S.resT || 0)) * 0.6) : 0, d = camDist * (1 - fx.punch * 0.012 - push), sh = fx.shake * 0.07;
      camera.position.set(Math.sin(S.t * 0.23) * 0.22 * sw + rr(-sh, sh), camLook.y + d * 0.12 + Math.sin(S.t * 0.31) * 0.06 * sw + rr(-sh, sh), camLook.z + d); camera.lookAt(camLook); }
    renderer.render(scene, camera);
        // music follows the phase (silent while you listen for the heartbeat)
    if (S.phase !== S.lastPh) { S.lastPh = S.phase; audio.music({ intro: 0.55, count: 0.18, beat: 0, card: 0.4, grip: 0.22, sparks: 0.38, wait: 0.4, tally: 0.12, result: 0.55 }[S.phase] ?? 0.3); }
    if (dirty || (now - lastEmit > 120 && S.phase !== 'intro' && S.phase !== 'result')) { dirty = false; lastEmit = now; onState(hud()); } }

  function hud() { const P = S.plan, me = foxes.find(p => p.me), them = foxes.find(p => !p.me);
    const h = { demo: !!S.demo, muted: audio.muted, phase: S.phase, mode: S.mode, gold: save.data.gold, price: PRICE, free: S.free, say: S.say, sayWho: S.say ? (them ? them.name : '') : '', flash: S.flash, count: S.count,
      partner: S.partner ? { key: S.partner.key, name: S.partner.name, fromWorld: !!S.partner.fromWorld, draft: !!S.partner.draft } : null, partnerPick: PICKABLE, bestSolo: S.partner ? save.stat('loveTester.best.' + S.partner.key) : 0, plays: save.stat('loveTester.plays'),
      names: { me: 'YOU', them: S.mode === 'online' ? (S.result && S.result.partner) || 'THE ROOM' : S.partner ? S.partner.name : '' }, players: foxes.map(p => ({ name: p.me ? 'YOU' : p.name, col: p.col || '#ffffff', me: p.me })) };
    if (S.phase === 'beat' && S.beat) { const B = S.beat, i = B.i, listen = i < P.lead; h.beat = { listen, n: P.beats, i: Math.max(0, i - P.lead + 1), lead: Math.max(0, P.lead - i), judge: B.judge, judgeCol: B.judgeCol, pulse: B.pulse || 0, bpm: P.bpm, hits: S.me.offs.filter(o => o != null).length }; }
    if (S.phase === 'grip' && S.sq) { const Q = S.sq; h.grip = { i: Q.i + 1, n: P.targets.length, st: Q.st, v: Math.min(100, Q.st === 'lock' ? (S.me.sq[Q.i] == null ? 0 : S.me.sq[Q.i]) : Q.v), c: P.targets[Math.min(Q.i, P.targets.length - 1)], band: P.band, res: Q.res, resCol: Q.resCol || '#ffd23a', them: Q.st === 'lock' && S.them ? S.them.sq[Q.i] : null, wait: Math.max(0, 7 - Q.wait) }; }
    if (S.phase === 'sparks' && S.sp) { const Sp = S.sp, qi = Math.min(Sp.i, P.qs.length - 1), Q = QUESTIONS[P.qs[qi]]; h.sparks = { i: qi + 1, n: P.qs.length, q: Q.q, o: Q.o, st: Sp.st, picked: Sp.picked, them: Sp.them, left: Math.max(0, Sp.left), sparks: Sp.sparks, solo: S.mode === 'solo' }; }
    if (S.phase === 'card') h.card = S.card;
    if (S.phase === 'wait') h.wait = { missing: S.missing || [] };
    if (S.phase === 'tally' || S.phase === 'result') { const r = S.result || {}; h.meter = Math.round(S.meter); h.result = S.phase === 'result' ? { ...r, rating: ratingOf(S.meterTo), pct: S.meterTo, pairs: (r.pairs || []).map(p => ({ a: p.a.id === (S.online && S.online.me) ? 'YOU' : p.a.name, b: p.b.id === (S.online && S.online.me) ? 'YOU' : p.b.name, ac: p.a.col, bc: p.b.col, pct: p.pct, rating: p.rating.name, col: p.rating.col, mine: p.mine })) } : null; }
    return h; }

  if (/[?&]debug=1/.test(location.search)) window.__loveDbg = { scene, camera, foxes: () => foxes, THREE, SAFE, renderer, S };
  setPartner(partner); fit(); step();
  return {
    hud, setPartner, start: () => { if (S.demo) demoStop(); if ((S.phase !== 'intro' && S.phase !== 'result') || S.online || !S.partner) return false; begin({}); return true; },
    toIntro() { if (S.phase === 'result' || S.phase === 'intro') { S.phase = 'intro'; S.result = null; for (const p of foxes) { p.f.userData.mood = 'happy'; p.f.userData.lookAt = null; } mark(); } },
    demoStart, demoStop, tap, gripDown, gripUp, choose, skipCard, netBegin, netRecv, netDrop, netEnd, netOn: () => !!S.online,
    setSafe(top, bottom, left = 0, right = 0) { if ([top - SAFE.top, bottom - SAFE.bottom, left - SAFE.left, right - SAFE.right].some(d => Math.abs(d) > 3)) { Object.assign(SAFE, { top, bottom, left, right }); fitKey = ''; } },
    resize() { fitKey = ''; },
    unlockAudio: () => audio.unlock(),
    setMuted(m) { audio.setMuted(m); mark(); }, muted: () => audio.muted,
    destroy() { dead = true; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); audio.whine(false); audio.close(); renderer.dispose(); renderer.domElement.remove(); },
  };
}

// ---------- ONLINE ROOM (2–5 phones). Uses the repo's engine/duel-net.js (peer to peer, game 'loveTester');
// when that file is not there (this kit) it falls back to BroadcastChannel so two tabs on one device can test it. ----------
async function connect({ code, onMsg, onLeave, onStatus }) {
  try { const mod = await import(new URL('../../engine/duel-net.js', import.meta.url).href); if (mod && mod.connectDuel) return await mod.connectDuel({ game: GAME, code, onJoin: () => {}, onLeave, onMsg, onStatus }); } catch (e) {}
  // local fallback (same browser, different tabs)
  const id = Math.random().toString(36).slice(2, 10), bc = new BroadcastChannel('8g-' + GAME + '-' + code);
  bc.onmessage = e => { const m = e.data || {}; if (m.from === id || (m.to && m.to !== id)) return; onMsg(m.t, m.d, m.from); };
  setTimeout(() => onStatus('local'), 0);
  return { id, send(t, d, to) { try { bc.postMessage({ from: id, to: to || null, t, d }); } catch (e) {} }, leave() { try { bc.close(); } catch (e) {} } };
}
export function createRoom({ onChange = () => {}, onStart = () => {}, onRecv = () => {}, onDrop = () => {} } = {}) {
  let net = null, tok = 0, timer = 0, mid = 0, matchIds = null;
  const st = { st: 'menu', code: '', status: '', peers: {}, ready: false, j: 0, msg: '', ping: null, name: '', playing: false };
  try { st.name = (save.data.stats['loveTester.name'] || '').toString(); } catch (e) {}
  const lastSeen = {}; const emit = () => onChange(view());
  function members() { if (!net) return []; const all = [{ id: net.id, j: st.j, ready: st.ready, playing: st.playing, name: st.name, me: true }, ...Object.entries(st.peers).map(([id, p]) => ({ id, ...p, me: false }))]; all.sort((a, b) => a.j - b.j || (a.id < b.id ? -1 : 1)); return all.slice(0, MAX_PLAYERS); }
  const hostId = () => { const m = members(); return m.length ? m[0].id : null; };
  function view() { const m = members(), full = st.st === 'room' && !!net && m.length >= MAX_PLAYERS && !m.some(x => x.me);
    return { ...st, full, host: !!net && hostId() === net.id, members: m.map((x, i) => ({ id: x.id, me: x.me, ready: !!x.ready, playing: !!x.playing, name: (x.name || NET_COLS[i][0]).toUpperCase().slice(0, 10), col: NET_COLS[i][1], tag: NET_COLS[i][0] })), allReady: m.length >= 2 && m.every(x => x.ready) }; }
  const hello = to => { if (net) net.send('hi', { v: 1, j: st.j, ready: st.ready, playing: st.playing, name: st.name }, to); };
  function onMsg(t, d, id) { if (!d || !net) return; const now = performance.now(), known = !!lastSeen[id];
    if (t === 'hi') { lastSeen[id] = now; st.peers[id] = { ...(st.peers[id] || {}), j: +d.j || Date.now(), ready: !!d.ready, playing: !!d.playing, name: String(d.name || '').slice(0, 10) }; if (!known) hello(id); emit(); setTimeout(maybeStart, 0); return; }
    if (!known) return; lastSeen[id] = now;
    if (t === 'pg') { if (d.t != null) net.send('pg', { e: d.t }, id); else if (d.e != null) { st.ping = Math.max(1, Math.round(now - d.e)); emit(); } return; }
    if (t !== 'ev') return;
    if (d.k === 'ready') { if (st.peers[id]) st.peers[id].ready = !!d.on; emit(); setTimeout(maybeStart, 0); }
    else if (d.k === 'name') { if (st.peers[id]) st.peers[id].name = String(d.n || '').slice(0, 10); emit(); }
    else if (d.k === 'playing') { if (st.peers[id]) st.peers[id].playing = !!d.on; emit(); }
    else if (d.k === 'start') startMatch(d);
    else if (d.k === 'bye') gone(id);
    else if (matchIds && matchIds.includes(id)) onRecv('ev', d, id); }
  function gone(id) { if (!lastSeen[id]) return; delete lastSeen[id]; delete st.peers[id]; emit(); if (matchIds && matchIds.includes(id)) onDrop(id); }
  function tick() { if (!net) return; net.send('pg', { t: performance.now() }); const now = performance.now(); for (const id of Object.keys(lastSeen)) if (now - lastSeen[id] > 20000) gone(id); hello(); }
  function maybeStart() { if (!net || st.st !== 'room' || hostId() !== net.id) return; const m = members(); if (m.length < 2 || !m.every(x => x.ready && !x.playing)) return;
    const d = { k: 'start', seed: (Math.random() * 2 ** 31) >>> 0, ids: m.map(x => x.id), names: m.map((x, i) => (x.name || NET_COLS[i][0]).toUpperCase().slice(0, 10)), mid: Date.now() % 1e9 }; net.send('ev', d); startMatch(d); }
  function startMatch(d) { if (!net || !Array.isArray(d.ids)) return; if (!d.ids.includes(net.id)) { st.msg = 'A test started without you. You join the next one.'; emit(); return; }
    matchIds = d.ids.slice(); mid = d.mid; st.ready = false; st.playing = true; st.msg = ''; for (const id of d.ids) if (st.peers[id]) { st.peers[id].ready = false; st.peers[id].playing = true; }
    const players = d.ids.map((id, i) => ({ id, slot: i, name: d.names[i] || NET_COLS[i][0], col: NET_COLS[i][1] })); emit();
    onStart({ seed: d.seed, me: net.id, players, mid: d.mid, send: (t, x, to) => net && net.send(t, x, to) }); }
  return {
    view,
    open() { st.st = 'menu'; st.msg = ''; emit(); },
    async join(code) { code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); if (code.length < 4) { st.msg = 'Type the 4-letter room code from your friend.'; emit(); return; }
      this.leave(true); Object.assign(st, { st: 'room', code, status: 'connecting', peers: {}, ready: false, playing: false, j: Date.now(), msg: '', ping: null }); emit();
      const my = ++tok; const N = await connect({ code, onMsg, onLeave: id => gone(id), onStatus: s => { st.status = s; emit(); } }); if (my !== tok) { N.leave(); return; }
      net = N; hello(); emit(); clearInterval(timer); timer = setInterval(tick, 2000);
      try { const u = new URL(location.href); u.searchParams.set('room', code); history.replaceState(null, '', u.href); } catch (e) {} },
    create() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)]; return this.join(c); },
    leave(keep) { tok++; clearInterval(timer); if (net) { try { net.send('ev', { k: 'bye' }); } catch (e) {} net.leave(); } net = null; matchIds = null; for (const k in lastSeen) delete lastSeen[k];
      if (!keep) { Object.assign(st, { st: 'menu', code: '', peers: {}, ready: false, playing: false, msg: '' }); try { const u = new URL(location.href); if (u.searchParams.has('room')) { u.searchParams.delete('room'); history.replaceState(null, '', u.href); } } catch (e) {} emit(); } },
    ready() { if (!net) return; st.ready = !st.ready; net.send('ev', { k: 'ready', on: st.ready }); emit(); setTimeout(maybeStart, 0); },
    setName(n) { st.name = String(n || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 10); save.setStat('loveTester.name', st.name); if (net) net.send('ev', { k: 'name', n: st.name }); emit(); },
    matchOver() { st.playing = false; matchIds = null; if (net) net.send('ev', { k: 'playing', on: false }); emit(); },
    get id() { return net ? net.id : null; },
  };
}
