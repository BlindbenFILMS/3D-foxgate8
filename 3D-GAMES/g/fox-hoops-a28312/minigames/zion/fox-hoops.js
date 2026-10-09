// 8 GATES — ZION · FOX HOOPS [zionTavern]. Minigame #36 (Basketball arcade). The FOX HOOPS basketball cage in the Zion Tavern
// (design brief: "FOX HOOPS basketball cage (minigame)" · Barkeep Odessa · Zoran, Hoyt, Sable, Nel, Ida, Pross).
// Five arcade hoop machines side by side in a lantern-lit tavern. Swipe up to shoot (or TAP MODE: one tap on a swinging meter,
// or keyboard: hold Space, release; arrows aim). 60 s round · last 30 s the hoop moves · last 15 s every basket is 3 · 3 in a row = ON FIRE (+1).
// Modes: VS THE REGULARS (you + 2 CPU regulars) · FREE SHOOT · PASS & PLAY (2–5 on one phone) · ONLINE (2–5, peer to peer, engine/duel-net.js).
// Stand-alone: createFoxHoops({ container, onState, theme }). The tavern is self-contained so any world's building can host it:
// pass theme: 'zion' | 'meru' | 'gaya' | 'jidda' | 'kufa' | 'luxor' | 'nebo' | 'ur' | { ...custom colours }.
// MERGE: buildHoopsRoom(ST, theme) builds the room from a stage ctx, so a world map can place the same interior later.
// Lines marked DRAFT are new (not in the 2D game) and wait for Ben.
import * as THREE from '../../vendor/three/three.module.js';
import { foxKit } from '../../fox-kit.js';
import { CAST } from '../../engine/cast.js';
import { save } from '../../engine/save.js';
import { crestTex, canvasTex, bannerTex } from '../../engine/textures.js';

export const HOOPS = { key: 'zionHoops', name: 'FOX HOOPS', room: 'zionTavern', round: 60, moveAt: 30, threeAt: 15, raceTo: 40, record: 60 };
export const NET_COLS = [['RED', '#ec3013'], ['BLUE', '#38bdf8'], ['GOLD', '#ffd23a'], ['GREEN', '#22c55e'], ['PURPLE', '#a78bfa']];
export const MAX_PLAYERS = 5;
// save keys (all prefixed with the game key so games never collide)
export const SAVE_KEYS = { best: 'zionHoops.best', games: 'zionHoops.games', wins: 'zionHoops.wins', onlineWins: 'zionHoops.onlineWins', streak: 'zionHoops.bestStreak', practice: 'zionHoops.practiceBest', opts: 'zionHoops.opts', played: 'zionHoops.played', record: 'zionHoops.record', trophy: 'zionHoops.trophy' };
export const THEMES = {
  zion: { name: 'ZION TAVERN', wall: '#7a3f22', wallDark: '#4a2414', trim: '#ffd23a', floor: '#8a5a32', floorDark: '#6a4024', carpet: '#b0262a', crest: 'Z', crestRing: '#ffd23a', machine: '#1c1a2e', accent: '#ffd23a', glow: '#ffb347', bg: '#1a0e08' },
  meru: { name: 'MERU TAVERN', wall: '#a8552a', wallDark: '#6a3018', trim: '#e6b45a', floor: '#8a5a32', floorDark: '#6a4024', carpet: '#151b3d', crest: 'M', crestRing: '#e6b45a', machine: '#151b3d', accent: '#e6b45a', glow: '#ffb347', bg: '#1a0e08' },
  gaya: { name: 'GAYA TAVERN', wall: '#5a3a6a', wallDark: '#33203d', trim: '#e6b45a', floor: '#7a5a3a', floorDark: '#5a4028', carpet: '#7c3aed', crest: 'G', crestRing: '#38bdf8', machine: '#120d2a', accent: '#e6b45a', glow: '#ffc56a', bg: '#140a18' },
  jidda: { name: 'JIDDA TAVERN', wall: '#2f5d6a', wallDark: '#1a3a44', trim: '#f2d27a', floor: '#9a7a52', floorDark: '#6e563a', carpet: '#0e7fb8', crest: 'J', crestRing: '#1e3a8a', machine: '#0b2a3a', accent: '#7dd3fc', glow: '#ffd58a', bg: '#08161a' },
  kufa: { name: 'KUFA TAVERN', wall: '#b07a4a', wallDark: '#7a5030', trim: '#f2d27a', floor: '#c49a62', floorDark: '#94703e', carpet: '#9a2a2a', crest: 'K', crestRing: '#eab308', machine: '#2a1606', accent: '#eab308', glow: '#ffc56a', bg: '#1a1006' },
  luxor: { name: 'LUXOR TAVERN', wall: '#6a1a1a', wallDark: '#3a0c0c', trim: '#e6b45a', floor: '#3a3036', floorDark: '#241e22', carpet: '#c42d3c', crest: 'L', crestRing: '#eab308', machine: '#2a0a0a', accent: '#ec3013', glow: '#ff6a4a', bg: '#140606' },
  nebo: { name: 'NEBO TAVERN', wall: '#3f6a3a', wallDark: '#24401f', trim: '#e6b45a', floor: '#7a5a3a', floorDark: '#5a4028', carpet: '#2f5d2a', crest: 'N', crestRing: '#86d44e', machine: '#142410', accent: '#86d44e', glow: '#ffd58a', bg: '#0a140a' },
  ur: { name: 'UR TAVERN', wall: '#b0603a', wallDark: '#7a3a20', trim: '#7dd3fc', floor: '#a0704a', floorDark: '#74502e', carpet: '#0e7fb8', crest: 'U', crestRing: '#eab308', machine: '#1a1030', accent: '#f472b6', glow: '#ff8ad8', bg: '#160a10' },
};
// Zion Tavern regulars (names from the design brief; skill numbers + lines are DRAFT for Ben)
export const REGULARS = [
  { key: 'zoran', name: 'ZORAN', role: 'Hero of Zion', torso: '#ffd23a', outfit: 'armor', skill: 0.82, rate: 1.05 },
  { key: 'hoyt', name: 'HOYT', role: 'Regular', torso: '#3a6ea5', outfit: 'vest', skill: 0.6, rate: 0.95 },
  { key: 'sable', name: 'SABLE', role: 'Regular', torso: '#3a3836', outfit: 'coat', skill: 0.72, rate: 1.0 },
  { key: 'nel', name: 'NEL', role: 'Regular', torso: '#22a06b', outfit: 'tee', skill: 0.5, rate: 0.9 },
];
export const LINES = { // DRAFT — Barkeep Odessa
  hello: ['Fox Hoops is open. Sixty seconds, all the balls you can sink.', 'Swipe up to shoot. Watch the meter: the green band is home.', 'Beat the regulars and the drinks are on Zoran.'],
  move: 'Hoop is on the move!', three: 'Three-point time!', fire: 'ON FIRE!',
  win: ['Look at that. The tavern has a new champ.', 'Zoran is buying the next round!', 'Sweet shooting, friend.'],
  lose: ['Close one. The regulars live here, you know.', 'Shake it off and run it back.', 'Not bad. Not Zoran, but not bad.'],
  practice: 'No clock, no pressure. Find your shot.',
};

// ---------- small helpers (copies, so the game stands alone) ----------
const rr = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)), pick = a => a[Math.floor(Math.random() * a.length)];
function makeGradient() { const d = new Uint8Array([80, 80, 80, 255, 165, 165, 165, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; }
function glowTexture() { return canvasTex(64, 64, g => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }); }
const loadOpts = () => { try { return { tap: false, guide: false, audio: false, music: true, ...JSON.parse(localStorage.getItem(SAVE_KEYS.opts) || '{}') }; } catch (e) { return { tap: false, guide: false, audio: false, music: true }; } };

// ---------- sound: synth SFX + music (no files). Busses: sfx · music · ambience → room reverb → compressor ----------
// MUSIC (original, DRAFT for Ben): 'menu' = laid-back tavern groove (96 BPM, swung) · 'game' = driving arcade funk (124 BPM)
// that adds an arpeggio lead when the hoop moves (intensity 1) and 16th hats + a brighter filter at 3-point time (intensity 2).
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function AudioKit() {
  let ctx = null, master, sfx, mus, amb, verb, noiseBuf, ambSrc = null, clinkT = 3;
  const st = { on: false, music: true, cur: 'menu', want: 'menu', next: 0, step: 0, bar: 0, I: 0, timer: 0, ambLvl: 1 };
  const gain = (v, dest) => { const g = ctx.createGain(); g.gain.value = v; if (dest) g.connect(dest); return g; };
  const panTo = (pan, dest) => { if (!pan || !ctx.createStereoPanner) return dest; const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(dest); return p; };
  function impulse(sec = 1.6) { const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.4); } return b; }
  function ok() {
    if (!ctx) { try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2; comp.connect(ctx.destination);
      master = gain(0.9, comp); verb = ctx.createConvolver(); verb.buffer = impulse(); verb.connect(gain(0.32, master));
      sfx = gain(0.85, master); sfx.connect(gain(0.22, verb)); mus = gain(0, master); mus.connect(gain(0.1, verb)); amb = gain(0, master);
      const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0); let b0 = 0, b1 = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; d[i] = w; }
      // tavern murmur: brown-ish noise, low-passed, slowly breathing
      const mb = ctx.createBuffer(1, n * 2, ctx.sampleRate), md = mb.getChannelData(0); let last = 0; for (let i = 0; i < md.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; md[i] = last * 3.5; }
      ambSrc = ctx.createBufferSource(); ambSrc.buffer = mb; ambSrc.loop = true; const lp = ctx.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 380; lp.Q.value = 0.6; const ag = gain(0.5, amb);
      const lfo = ctx.createOscillator(), lg = gain(0.18); lfo.frequency.value = 0.13; lfo.connect(lg); lg.connect(ag.gain); lfo.start(); ambSrc.connect(lp); lp.connect(ag); ambSrc.start();
      amb.gain.value = 0.0001; amb.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 2);
      st.timer = setInterval(sched, 25);
      document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
    } catch (e) { ctx = null; } }
    if (ctx && ctx.state === 'suspended' && !document.hidden) ctx.resume();
    return !!ctx;
  }
  const now = () => ctx.currentTime;
  function env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  function osc(type, f, t, dur, vol, dest, o = {}) { const n = ctx.createOscillator(), g = ctx.createGain(); n.type = type; n.frequency.setValueAtTime(f, t); if (o.slide) n.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + (o.slideT || dur)); if (o.detune) n.detune.value = o.detune;
    let src = n; if (o.lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; fl.Q.value = o.q || 0.7; n.connect(fl); src = fl; } src.connect(g); env(g, t, o.a || 0.005, vol, dur); g.connect(panTo(o.pan, dest)); n.start(t); n.stop(t + dur + 0.05); }
  function noise(t, dur, vol, dest, o = {}) { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf; f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, t); if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur); f.Q.value = o.q || 0.8;
    s.connect(f); f.connect(g); env(g, t, o.a || 0.004, vol, dur); g.connect(panTo(o.pan, dest)); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); }
  // ---- sound effects ----
  const fx = {
    ok, tone: (f, d = 0.12, v = 0.2, type = 'triangle', pan = 0, slide = 0) => { if (ok()) osc(type, f, now(), d, v, sfx, { pan, slide: slide ? f * slide : 0 }); },
    shot: p => { if (!ok()) return; const t = now(); noise(t, 0.16, 0.12, sfx, { f: 500, f2: 2400, q: 1.4, pan: p }); osc('sine', 180, t, 0.08, 0.08, sfx, { slide: 110, pan: p }); },
    rim: (p, k = 1) => { if (!ok()) return; const t = now(); [[523, 0.3, 'square'], [1307, 0.2, 'triangle'], [2093, 0.13, 'triangle'], [3170, 0.07, 'sine']].forEach(([f, v, ty], i) => osc(ty, f * (1 + rr(-0.012, 0.012)), t, 0.22 + i * 0.08, v * 0.22 * k, sfx, { pan: p, lp: 7000 }));
      noise(t, 0.035, 0.18 * k, sfx, { type: 'highpass', f: 3500, pan: p }); },
    board: p => { if (!ok()) return; const t = now(); osc('sine', 120, t, 0.16, 0.32, sfx, { slide: 55, pan: p }); osc('triangle', 240, t, 0.06, 0.08, sfx, { pan: p }); noise(t, 0.08, 0.14, sfx, { type: 'lowpass', f: 900, pan: p }); },
    swish: p => { if (!ok()) return; const t = now(); noise(t, 0.34, 0.22, sfx, { f: 7000, f2: 2200, q: 1.1, pan: p, a: 0.02 }); noise(t + 0.05, 0.22, 0.08, sfx, { type: 'highpass', f: 5000, pan: p }); },
    netRattle: p => { if (!ok()) return; const t = now(); for (let i = 0; i < 3; i++) noise(t + i * 0.03, 0.06, 0.06, sfx, { f: 3200 - i * 400, q: 2, pan: p }); },
    make: (p, fire, three) => { if (!ok()) return; const t = now(), base = fire ? 1.25 : 1, ns = three ? [0, 4, 7, 12] : [0, 4, 7]; ns.forEach((s, i) => { const f = 660 * base * Math.pow(2, s / 12); osc('triangle', f, t + i * 0.055, 0.22, 0.09, sfx, { pan: p }); osc('sine', f * 2, t + i * 0.055, 0.16, 0.03, sfx, { pan: p }); });
      if (fire) noise(t + 0.15, 0.25, 0.05, sfx, { type: 'highpass', f: 6000, pan: p }); },
    miss: p => { if (!ok()) return; const t = now(); osc('sawtooth', 220, t, 0.22, 0.07, sfx, { slide: 90, lp: 600, pan: p }); },
    bounce: (p, v = 2) => { if (!ok()) return; const t = now(), k = clamp(v / 4, 0.15, 1); osc('sine', 150 + v * 12, t, 0.09, 0.26 * k, sfx, { slide: 55, pan: p }); noise(t, 0.03, 0.06 * k, sfx, { type: 'lowpass', f: 700, pan: p }); },
    rollback: p => { if (!ok()) return; const t = now(); noise(t, 0.35, 0.05, sfx, { type: 'lowpass', f: 260, f2: 180, pan: p, a: 0.05 }); osc('sine', 70, t, 0.25, 0.08, sfx, { pan: p }); },
    beep: hi => { if (!ok()) return; const t = now(); osc('square', hi ? 1320 : 880, t, hi ? 0.4 : 0.14, 0.12, sfx, { lp: 3000 }); if (hi) osc('square', 1760, t + 0.06, 0.34, 0.07, sfx, { lp: 3000 }); },
    tick: () => { if (!ok()) return; const t = now(); osc('sine', 1250, t, 0.05, 0.14, sfx); osc('triangle', 2500, t, 0.03, 0.04, sfx); },
    buzzer: () => { if (!ok()) return; const t = now(); [97, 98.5, 196].forEach((f, i) => osc('sawtooth', f, t, 1.1, i === 2 ? 0.08 : 0.16, sfx, { lp: 1400, a: 0.01 })); },
    cheer: (k = 1) => { if (!ok()) return; const t = now(); noise(t, 1.6, 0.11 * k, sfx, { f: 1300, q: 0.4, a: 0.25 }); noise(t + 0.1, 1.2, 0.06 * k, sfx, { f: 2600, q: 0.6, a: 0.2 });
      for (let i = 0; i < 3; i++) { const w = t + 0.2 + i * rr(0.15, 0.35); osc('sine', rr(1700, 2100), w, 0.35, 0.03 * k, sfx, { slide: rr(2300, 2800), pan: rr(-0.7, 0.7) }); }
      for (let i = 0; i < 10; i++) noise(t + rr(0, 0.9), 0.03, 0.05 * k, sfx, { f: rr(1500, 3000), q: 3, pan: rr(-0.8, 0.8) }); },
    fire: () => { if (!ok()) return; const t = now(); noise(t, 0.6, 0.16, sfx, { f: 300, f2: 4500, q: 1.2, a: 0.1 }); osc('sawtooth', 220, t, 0.6, 0.06, sfx, { slide: 880, lp: 2500 }); },
    coin: () => { if (!ok()) return; const t = now(); osc('square', 1318, t, 0.08, 0.06, sfx, { lp: 5000 }); osc('square', 1760, t + 0.07, 0.25, 0.06, sfx, { lp: 5000 }); },
    clink: () => { if (!ok()) return; const t = now(), p = rr(-0.8, 0.8); osc('sine', rr(2400, 3200), t, 0.25, 0.025, amb, { pan: p }); osc('sine', rr(3600, 4300), t + 0.01, 0.18, 0.015, amb, { pan: p }); },
    beacon: (p, moving) => { if (!ok()) return; osc('sine', moving ? 990 : 740, now(), 0.06, 0.06, sfx, { pan: p }); },
  };
  // ---- music ----
  const mu = {
    kick: (t, v = 1) => { osc('sine', 155, t, 0.3, 0.85 * v, mus, { slide: 42, slideT: 0.12 }); noise(t, 0.02, 0.12 * v, mus, { type: 'highpass', f: 2500 }); },
    snare: (t, v = 1) => { noise(t, 0.17, 0.32 * v, mus, { f: 1900, q: 0.7 }); osc('triangle', 195, t, 0.1, 0.18 * v, mus, { slide: 150 }); },
    clap: (t, v = 1) => { for (let i = 0; i < 3; i++) noise(t + i * 0.011, i === 2 ? 0.16 : 0.02, 0.24 * v, mus, { f: 1500, q: 1 }); },
    hat: (t, open, v = 1) => noise(t, open ? 0.16 : 0.035, 0.1 * v, mus, { type: 'highpass', f: 7600 }),
    shaker: (t, v = 1) => noise(t, 0.05, 0.05 * v, mus, { f: 6000, q: 1.5, a: 0.015 }),
    bass: (t, m, d, lp = 520) => { const f = mtof(m); osc('sawtooth', f, t, d, 0.16, mus, { lp, q: 2 }); osc('sine', f, t, d, 0.2, mus); },
    keys: (t, ns, d, v = 1) => ns.forEach((m, i) => { const f = mtof(m); osc('sine', f, t, d, 0.055 * v, mus, { a: 0.004, pan: (i - 1.5) * 0.25 }); osc('triangle', f * 2, t, d * 0.5, 0.016 * v, mus, { a: 0.002, pan: (i - 1.5) * 0.25 }); }),
    lead: (t, m, d, v = 1, lp = 2200) => { osc('square', mtof(m), t, d, 0.04 * v, mus, { lp, detune: 6 }); osc('square', mtof(m), t, d, 0.025 * v, mus, { lp, detune: -7 }); },
  };
  const SONGS = {
    menu: { bpm: 96, swing: 0.22, chords: [[57, 60, 64, 67], [54, 57, 60, 64], [53, 57, 60, 64], [52, 56, 59, 62]], roots: [45, 38, 41, 40],
      play(s, t, bar, I, d) { const c = this.chords[bar % 4], r = this.roots[bar % 4];
        if (s === 0 || s === 7 || s === 10) mu.kick(t, 0.7); if (s === 4 || s === 12) mu.snare(t, 0.55); if (s % 2 === 0) mu.hat(t, s === 14, s % 4 === 0 ? 0.6 : 0.4); else mu.shaker(t, 0.6);
        const bl = { 0: r, 3: r, 6: r + 7, 8: r + 12, 10: r, 13: r + 10, 14: r + 7 }; if (bl[s] != null) mu.bass(t, bl[s], d * (s === 0 ? 2.6 : 1.4), 420);
        if (s === 2 || s === 10) mu.keys(t, c, d * 2.2, 0.9); if (s === 7 && bar % 2) mu.keys(t, c.slice(1), d * 1.2, 0.6);
        if (bar % 4 === 3 && s === 14) mu.keys(t, c.map(n => n + 12), d * 2, 0.5); } },
    game: { bpm: 124, swing: 0, chords: [[50, 53, 57, 60], [50, 53, 58, 62], [52, 55, 60, 64], [52, 55, 57, 61]], roots: [38, 34, 36, 33],
      play(s, t, bar, I, d) { const c = this.chords[bar % 4], r = this.roots[bar % 4], fill = bar % 4 === 3 && s >= 12;
        if (s % 4 === 0) mu.kick(t, 1); if (s === 10 && bar % 2) mu.kick(t, 0.6);
        if (s === 4 || s === 12) mu.clap(t, 0.9); if (fill) mu.snare(t, 0.35 + (s - 12) * 0.12);
        if (s % 2 === 0) mu.hat(t, s % 4 === 2, s % 4 === 2 ? 0.7 : 0.5); else if (I >= 2) mu.hat(t, false, 0.35);
        if (s % 2 === 0) mu.bass(t, s % 4 === 2 ? r + 12 : r, d * 1.6, I >= 2 ? 900 : 600); else if (s === 7 || s === 15) mu.bass(t, r + 7, d * 0.9, 600);
        if (s === 3 || s === 6 || s === 11) mu.keys(t, c, d * 1.1, 0.85);
        if (I >= 1) { const arp = [c[0], c[1], c[2], c[3], c[2], c[1]]; mu.lead(t, arp[s % 6] + (I >= 2 ? 24 : 12), d * 0.9, I >= 2 ? 1 : 0.7, I >= 2 ? 3400 : 2000); } } },
  };
  function sched() { if (!ctx || !st.music || ctx.state !== 'running') return; const sg = SONGS[st.cur], d = 60 / sg.bpm / 4;
    if (st.next < ctx.currentTime) st.next = ctx.currentTime + 0.05;
    while (st.next < ctx.currentTime + 0.14) { const sw = st.step % 2 ? d * sg.swing : 0; try { sg.play(st.step, st.next + sw, st.bar, st.I, d); } catch (e) {} st.next += d; st.step++;
      if (st.step === 16) { st.step = 0; st.bar++; if (st.want !== st.cur) { st.cur = st.want; st.bar = 0; return; } } } }
  function jingle(win) { if (!ok()) return; const t = now() + 0.05, ns = win ? [72, 76, 79, 84, 88] : [67, 66, 63, 60]; ns.forEach((m, i) => { mu.lead(t + i * 0.11, m, win && i === ns.length - 1 ? 0.6 : 0.16, 1.4, 3000); mu.keys(t + i * 0.11, [m - 12], 0.2, 0.8); }); if (win) mu.kick(t + 0.44, 0.8); }
  return { ...fx, jingle,
    music(name, now2) { if (!SONGS[name]) return; st.want = name; if (now2 && ctx) { st.cur = name; st.step = 0; st.bar = 0; st.next = ctx.currentTime + 0.06; } },
    setIntensity(I) { st.I = I; },
    setMusic(on) { st.music = !!on; if (!ctx) return; const t = ctx.currentTime; mus.gain.cancelScheduledValues(t); mus.gain.setTargetAtTime(on ? 0.34 : 0, t, 0.25); if (on) st.next = t + 0.05; },
    startMusic() { if (!ok()) return; if (st.music) { const t = ctx.currentTime; mus.gain.cancelScheduledValues(t); mus.gain.setTargetAtTime(0.34, t, 0.4); } },
    duck(sec = 1.2) { if (!ctx || !st.music) return; const t = ctx.currentTime; mus.gain.cancelScheduledValues(t); mus.gain.setTargetAtTime(0.12, t, 0.05); mus.gain.setTargetAtTime(0.34, t + sec, 0.3); },
    ambience(lvl) { if (!ctx) return; amb.gain.setTargetAtTime(lvl, ctx.currentTime, 0.6); st.ambLvl = lvl; },
    close() { clearInterval(st.timer); if (ctx) { try { ctx.close(); } catch (e) {} } ctx = null; },
    update(dt) { if (!ctx) return; clinkT -= dt; if (clinkT <= 0) { clinkT = rr(3, 8); if (st.ambLvl > 0.1) fx.clink(); } },
  };
}

// ---------- geometry constants (metres; one machine per lane) ----------
const LW = 1.3, NL = 5, BALL_R = 0.1, RIM_R = 0.215, RIM_T = 0.016, RIM_Y = 2.0, RIM_Z = -2.95, BOARD_Z = -3.17, CEIL_Y = 2.95, LIP_Z = -0.72;
const HALF = 0.58, LAUNCH = new THREE.Vector3(0, 1.32, -0.42), RACK_N = 4, G = 9.8, ANG = 58 * Math.PI / 180;
const laneX = i => (i - 2) * LW;
const rampY = z => z < LIP_Z ? 0.8 + (0.98 - 0.8) * clamp((LIP_Z - z) / (LIP_Z - BOARD_Z), 0, 1) : 0.8;

// ---------- the stage ----------
function createStage(container, bg) {
  const touch = matchMedia('(pointer: coarse)').matches, CW = () => container.clientWidth || 1, CH = () => container.clientHeight || 1;
  const renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.6 : 2)); renderer.setSize(CW(), CH());
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none'; container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(bg); scene.fog = new THREE.Fog(bg, 9, 22);
  const camera = new THREE.PerspectiveCamera(50, CW() / CH(), 0.05, 60);
  const grad = makeGradient(), cache = new Map();
  const toon = (c, extra) => { const k = c + (extra ? JSON.stringify(extra) : ''); if (!cache.has(k)) cache.set(k, new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...extra })); return cache.get(k); };
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1a1626, side: THREE.BackSide });
  function addOutline(mesh, t = 0.03, radius) { const g = mesh.geometry; g.computeBoundingBox(); const s = new THREE.Vector3(); g.boundingBox.getSize(s); const o = new THREE.Mesh(g, outlineMat); if (radius) o.scale.setScalar(1 + t / radius); else o.scale.set(1 + 2 * t / Math.max(s.x, 0.01), 1 + 2 * t / Math.max(s.y, 0.01), 1 + 2 * t / Math.max(s.z, 0.01)); mesh.add(o); return mesh; }
  function M(geo, mat, x = 0, y = 0, z = 0, parent, outline = 0.02, radius) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (outline) addOutline(m, outline, radius); (parent || scene).add(m); return m; }
  const kit = foxKit({ THREE, scene, toon, M, grad, outlineMat, crestTex, rr, pick, clamp, smooth, damp });
  scene.add(new THREE.HemisphereLight(0xffe2b8, 0x5a3a2a, 1.25)); const sun = new THREE.DirectionalLight(0xffe0b0, 1.25); sun.position.set(2, 6, 4); scene.add(sun);
  return { touch, CW, CH, renderer, scene, camera, grad, toon, outlineMat, addOutline, M, kit, sun };
}

// ---------- the room: tavern shell, five hoop machines, bar + regulars ----------
export function buildHoopsRoom(ST, TH) {
  const { scene, toon, M } = ST, B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const room = new THREE.Group(); scene.add(room);
  const plank = canvasTex(256, 256, g => { g.fillStyle = TH.floor; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? TH.floorDark : TH.floor; g.globalAlpha = 0.35; g.fillRect(0, i * 32, 256, 32); g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, i * 32, 256, 2); g.fillRect(((i * 97) % 256), i * 32, 2, 32); } }, [6, 6]);
  const brick = canvasTex(256, 256, g => { g.fillStyle = TH.wallDark; g.fillRect(0, 0, 256, 256); for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) { g.fillStyle = TH.wall; g.globalAlpha = 0.85 + ((r * 7 + c * 3) % 5) * 0.03; g.fillRect(c * 56 + (r % 2 ? 28 : 0) - 28 + 3, r * 32 + 3, 50, 26); } g.globalAlpha = 1; }, [5, 2]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), new THREE.MeshToonMaterial({ map: plank, gradientMap: ST.grad })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 1.5); room.add(floor);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 7), toon(TH.carpet)); carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0.005, 3.6); room.add(carpet);
  const wallM = new THREE.MeshToonMaterial({ map: brick, gradientMap: ST.grad });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 5.2), wallM); back.position.set(0, 2.6, -3.6); room.add(back);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(14, 5.2), wallM); w.rotation.y = -s * Math.PI / 2; w.position.set(s * 7.6, 2.6, 1.5); room.add(w); }
  const front = new THREE.Mesh(new THREE.PlaneGeometry(16, 5.2), wallM); front.rotation.y = Math.PI; front.position.set(0, 2.6, 8.4); room.add(front);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), toon(TH.wallDark)); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 5.1, 1.5); room.add(ceil);
  for (let i = 0; i < 6; i++) M(B(15.2, 0.22, 0.26), toon('#4a2a16'), 0, 4.9, -3 + i * 2.2, room, 0.02);
  M(B(15.2, 0.2, 0.1), toon(TH.trim), 0, 0.1, -3.55, room, 0.015);
  // marquee
  const sign = canvasTex(1024, 192, g => { g.fillStyle = '#0b0a12'; g.fillRect(0, 0, 1024, 192); g.strokeStyle = TH.accent; g.lineWidth = 10; g.strokeRect(10, 10, 1004, 172); g.font = '900 112px "Archivo", "Arial Black", Arial'; g.textBaseline = 'middle'; g.fillStyle = '#ec3013'; g.fillText('FOX', 60, 100); g.fillStyle = TH.accent; g.fillText('HOOPS', 330, 100); g.font = '800 34px "Archivo", Arial'; g.fillStyle = '#ffffff'; g.fillText(TH.name, 760, 100); });
  const mq = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.975), new THREE.MeshBasicMaterial({ map: sign })); mq.position.set(0, 4.15, -3.55); room.add(mq);
  const crest = new THREE.Mesh(new THREE.CircleGeometry(0.42, 40), new THREE.MeshBasicMaterial({ map: crestTex(TH.crest, TH.crestRing) })); crest.position.set(-3.5, 4.15, -3.54); room.add(crest); const c2 = crest.clone(); c2.position.x = 3.5; room.add(c2);
  // lanterns (emissive, no real lights: phone budget)
  const lanternM = toon(TH.glow, { emissive: new THREE.Color(TH.glow), emissiveIntensity: 0.9 });
  for (const [x, z] of [[-4.5, -1], [4.5, -1], [-4.5, 3], [4.5, 3], [0, 5.5]]) { M(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 5), toon('#201e1d'), x, 4.5, z, room, 0); M(new THREE.CylinderGeometry(0.14, 0.18, 0.34, 8), lanternM, x, 3.9, z, room, 0.02); }
  // POLISH: warm lantern glow halos + two real warm lights over the machines (phone budget: 3 point lights, no shadows)
  const halo = glowTexture(); for (const [x, z] of [[-4.5, -1], [4.5, -1], [-4.5, 3], [4.5, 3], [0, 5.5]]) { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: TH.glow, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); h.position.set(x, 3.9, z); h.scale.setScalar(1.6); room.add(h); }
  for (const x of [-2.6, 2.6]) { const pl = new THREE.PointLight(new THREE.Color(TH.glow), 9, 9, 1.6); pl.position.set(x, 3.6, -0.6); room.add(pl); }
  { const pl = new THREE.PointLight(0xffb070, 5, 7, 1.6); pl.position.set(-3.2, 3, 6); room.add(pl); }
  // marquee chase bulbs (two alternating sets)
  const bulbA = new THREE.MeshBasicMaterial({ color: 0xfff1c4 }), bulbB = new THREE.MeshBasicMaterial({ color: 0x5a4020 }), bulbG = new THREE.SphereGeometry(0.045, 8, 6), bulbs = [];
  { const W = 5.4, H = 1.18, n = 34; for (let k = 0; k < n; k++) { const u = k / n * 2 * (W + H); let x, y; if (u < W) { x = -W / 2 + u; y = H / 2; } else if (u < W + H) { x = W / 2; y = H / 2 - (u - W); } else if (u < 2 * W + H) { x = W / 2 - (u - W - H); y = -H / 2; } else { x = -W / 2; y = -H / 2 + (u - 2 * W - H); }
    const m = new THREE.Mesh(bulbG, k % 2 ? bulbA : bulbB); m.position.set(x, 4.15 + y, -3.5); room.add(m); bulbs.push(m); } }
  // pennants on the side walls
  for (const [x, z, ry] of [[-7.55, -1.5, Math.PI / 2], [-7.55, 2.5, Math.PI / 2], [7.55, -1.5, -Math.PI / 2], [7.55, 2.5, -Math.PI / 2]]) { const pn = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), new THREE.MeshToonMaterial({ map: bannerTex(TH.crest, TH.carpet, TH.trim, TH.machine), gradientMap: ST.grad, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })); pn.position.set(x, 3.0, z); pn.rotation.y = ry; room.add(pn); }
  // dust motes drifting in the lantern light
  const dustN = ST.touch ? 70 : 140, dustP = new Float32Array(dustN * 3); const inCage = (x, y, z) => Math.abs(x) < 3.4 && z < 1.4 && y < 3.15; for (let k = 0; k < dustN; k++) { const x = rr(-6, 6), z = rr(-3, 6); let y = rr(0.5, 4.6); if (inCage(x, y, z)) y = rr(3.2, 4.6); dustP.set([x, y, z], k * 3); }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustP, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: halo, color: 0xffd9a0, size: 0.045, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending })); room.add(dust);
  // the bar (behind the players, seen in the wide shots) + jukebox + barrels + a table
  M(B(4.6, 1.05, 0.7), toon('#5a3018'), -3.2, 0.52, 6.6, room, 0.03); M(B(4.8, 0.08, 0.86), toon('#8a4a24'), -3.2, 1.08, 6.6, room, 0.02);
  M(B(4.8, 1.8, 0.3), toon('#3a2010'), -3.2, 2.2, 8.2, room, 0.03); for (let i = 0; i < 12; i++) M(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 8), toon(['#2f7d4a', '#7a1d2a', '#e6b45a', '#3a6ea5'][i % 4]), -5.2 + i * 0.36, 1.82 + (i % 2) * 0.62, 8.05, room, 0.01);
  for (let i = 0; i < 4; i++) { M(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 14), toon('#8a1d22'), -4.8 + i * 1.05, 0.78, 5.9, room, 0.01); M(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 6), toon('#2a2826'), -4.8 + i * 1.05, 0.38, 5.9, room, 0); }
  const jb = M(B(0.9, 1.6, 0.5), toon('#7a1d2a'), 5.6, 0.8, 7.6, room, 0.03); M(new THREE.CylinderGeometry(0.42, 0.42, 0.5, 20, 1, false, 0, Math.PI), toon('#ffb347', { emissive: new THREE.Color('#ff8a2a'), emissiveIntensity: 0.6 }), 0, 0.8, 0, jb, 0.02).rotation.set(Math.PI / 2, 0, Math.PI / 2);
  for (const [x, z] of [[6.6, -2.6], [6.9, -1.9], [-6.7, -2.5]]) { M(new THREE.CylinderGeometry(0.36, 0.36, 0.9, 14), toon('#8a5a2a'), x, 0.45, z, room, 0.025, 0.36); M(new THREE.TorusGeometry(0.37, 0.025, 6, 20), toon('#3a3836'), x, 0.25, z, room, 0).rotation.x = Math.PI / 2; }
  M(new THREE.CylinderGeometry(0.65, 0.65, 0.07, 22), toon('#8a4a24'), 4.6, 0.82, 4.2, room, 0.02, 0.65); M(new THREE.CylinderGeometry(0.07, 0.12, 0.8, 8), toon('#3a2010'), 4.6, 0.4, 4.2, room, 0);
  // the five machines
  const netTex = canvasTex(128, 128, g => { g.clearRect(0, 0, 128, 128); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3; for (let i = -128; i < 256; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); g.beginPath(); g.moveTo(i + 128, 0); g.lineTo(i, 128); g.stroke(); } }, [3, 3]);
  const cageNet = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const lanes = [];
  for (let i = 0; i < NL; i++) {
    const x = laneX(i), g = new THREE.Group(); g.position.x = x; room.add(g);
    // cabinet front (ball tray), ramp, side posts + cage net, back panel
    M(B(LW - 0.06, 0.8, 0.3), toon(TH.machine), 0, 0.4, LIP_Z + 0.12, g, 0.025);
    M(B(LW - 0.06, 0.06, 0.34), toon(TH.accent), 0, 0.83, LIP_Z + 0.12, g, 0.012);
    const rampLen = Math.hypot(LIP_Z - BOARD_Z, 0.18), ramp = M(B(HALF * 2, 0.05, rampLen), toon('#2f6d3a'), 0, (rampY(LIP_Z) + rampY(BOARD_Z)) / 2 - 0.03, (LIP_Z + BOARD_Z) / 2, g, 0.015); ramp.rotation.x = Math.atan2(0.18, LIP_Z - BOARD_Z);
    for (let k = 0; k < 5; k++) { const ln = new THREE.Mesh(B(HALF * 2 - 0.04, 0.052, 0.03), toon('#e8f5e9')); ln.position.set(0, 0, -rampLen / 2 + 0.25 + k * 0.55); ramp.add(ln); }
    M(B(LW - 0.06, 0.8, 0.3), toon(TH.machine), 0, 0.5, BOARD_Z - 0.18, g, 0.025);
    for (const s of [-1, 1]) { M(B(0.07, 2.25, 0.07), toon('#2a2826'), s * (LW / 2 - 0.05), 2.0, BOARD_Z - 0.05, g, 0.012); M(B(0.07, 2.25, 0.07), toon('#2a2826'), s * (LW / 2 - 0.05), 2.0, LIP_Z - 0.2, g, 0.012);
      M(B(0.06, 0.06, LIP_Z - 0.2 - BOARD_Z + 0.05), toon('#2a2826'), s * (LW / 2 - 0.05), CEIL_Y + 0.15, (LIP_Z - 0.2 + BOARD_Z) / 2, g, 0.01);
      const n = new THREE.Mesh(new THREE.PlaneGeometry(LIP_Z - 0.2 - BOARD_Z, 2.2), cageNet); n.rotation.y = Math.PI / 2; n.position.set(s * (LW / 2 - 0.05), 2.0, (LIP_Z - 0.2 + BOARD_Z) / 2); g.add(n); }
    const backNet = new THREE.Mesh(new THREE.PlaneGeometry(LW - 0.1, 2.3), cageNet); backNet.position.set(0, 2.05, BOARD_Z - 0.06); g.add(backNet);
    const topNet = new THREE.Mesh(new THREE.PlaneGeometry(LW - 0.1, -BOARD_Z - 1.2), cageNet); topNet.rotation.x = Math.PI / 2; topNet.position.set(0, CEIL_Y + 0.15, (BOARD_Z - 1.2) / 2); g.add(topNet);
    // LED score panel above the cage
    const ledCv = document.createElement('canvas'); ledCv.width = 256; ledCv.height = 96; const ledTex = new THREE.CanvasTexture(ledCv); ledTex.colorSpace = THREE.SRGBColorSpace;
    M(B(LW - 0.1, 0.5, 0.12), toon('#0b0a12'), 0, 3.38, BOARD_Z - 0.04, g, 0.015); const led = new THREE.Mesh(new THREE.PlaneGeometry(LW - 0.2, 0.42), new THREE.MeshBasicMaterial({ map: ledTex })); led.position.set(0, 3.38, BOARD_Z + 0.025); g.add(led);
    // the moving part: backboard + rim + net
    const hoop = new THREE.Group(); hoop.position.set(0, 0, 0); g.add(hoop);
    const boardTex = canvasTex(256, 176, c => { c.fillStyle = '#f6f8fb'; c.fillRect(0, 0, 256, 176); c.strokeStyle = '#ec3013'; c.lineWidth = 10; c.strokeRect(5, 5, 246, 166); c.strokeRect(84, 82, 88, 64); c.font = '900 30px "Archivo", Arial'; c.fillStyle = '#201e1d'; c.textAlign = 'center'; c.fillText('FOX HOOPS', 128, 50); });
    const board = M(B(0.92, 0.64, 0.05), [toon('#d7dde3'), toon('#d7dde3'), toon('#d7dde3'), toon('#d7dde3'), new THREE.MeshToonMaterial({ map: boardTex, gradientMap: ST.grad }), toon('#d7dde3')], 0, RIM_Y + 0.3, BOARD_Z - 0.025, hoop, 0.015);
    M(B(0.06, 0.06, RIM_Z - BOARD_Z - RIM_R + 0.02), toon('#ec3013'), 0, RIM_Y, (BOARD_Z + RIM_Z - RIM_R) / 2, hoop, 0.008);
    const rimMat = new THREE.MeshToonMaterial({ color: '#ec3013', gradientMap: ST.grad, emissive: new THREE.Color('#ffd23a'), emissiveIntensity: 0 }), rim = new THREE.Mesh(new THREE.TorusGeometry(RIM_R, RIM_T, 8, 32), rimMat); rim.rotation.x = Math.PI / 2; rim.position.set(0, RIM_Y, RIM_Z); ST.addOutline(rim, 0.008, RIM_R); hoop.add(rim);
    const netG = new THREE.CylinderGeometry(RIM_R * 0.98, RIM_R * 0.62, 0.34, 12, 3, true), net = new THREE.Mesh(netG, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.85 }));
    net.position.set(0, RIM_Y - 0.17, RIM_Z); hoop.add(net);
    // rack balls in the tray
    // neon strip along the cage top + down both front posts (lane colour; flashes on a basket, flickers orange ON FIRE)
    const neonMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(TH.accent) }), neonBase = new THREE.Color(TH.accent);
    M(new THREE.BoxGeometry(LW - 0.12, 0.035, 0.035), neonMat, 0, CEIL_Y + 0.2, LIP_Z - 0.17, g, 0.008);
    for (const s2 of [-1, 1]) M(new THREE.BoxGeometry(0.03, 2.1, 0.03), neonMat, s2 * (LW / 2 - 0.05), 2.0, LIP_Z - 0.155, g, 0);
    lanes.push({ i, x, g, hoop, board, rim, rimMat, net, ledCv, ledTex, ledKey: '', netKick: 0, neonMat, neonBase, neonK: 0 });
  }
  return { room, lanes, bulbs, bulbA, bulbB, dust, dustP };
}

// ---------- the game ----------
export async function createFoxHoops({ container, onState = () => {}, theme = 'zion', embed = false } = {}) {
  const TH = typeof theme === 'object' ? { ...THEMES.zion, ...theme } : (THEMES[theme] || THEMES.zion);
  const ST = createStage(container, TH.bg), { scene, camera, renderer, toon, M, kit } = ST, SND = AudioKit();
  const R = buildHoopsRoom(ST, TH), V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const opts = loadOpts(); const saveOpts = () => { try { localStorage.setItem(SAVE_KEYS.opts, JSON.stringify(opts)); } catch (e) {} };
  // balls
  const ballTex = canvasTex(256, 128, g => { g.fillStyle = '#f07a2a'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#1a1626'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 64); g.lineTo(256, 64); g.moveTo(64, 0); g.lineTo(64, 128); g.moveTo(192, 0); g.lineTo(192, 128); g.stroke(); g.beginPath(); g.ellipse(128, 64, 40, 70, 0, 0, 7); g.stroke(); });
  const ballM = new THREE.MeshToonMaterial({ map: ballTex, gradientMap: ST.grad }), fireM = new THREE.MeshToonMaterial({ map: ballTex, gradientMap: ST.grad, emissive: new THREE.Color('#ff5a1a'), emissiveIntensity: 0.85 });
  const ballGeo = new THREE.SphereGeometry(BALL_R, 18, 12), shadowGeo = new THREE.CircleGeometry(BALL_R * 0.95, 14).rotateX(-Math.PI / 2), shadowM = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });
  const mkBall = () => { const m = new THREE.Mesh(ballGeo, ballM); ST.addOutline(m, 0.008, BALL_R); scene.add(m); const sh = new THREE.Mesh(shadowGeo, shadowM); scene.add(sh); m.visible = sh.visible = false; return { m, sh, p: V(), v: V(), on: false, owner: -1, scored: false, rimHit: false, boardHit: false, age: 0, fire: false, lt: 0, spin: V() }; };
  const balls = []; for (let i = 0; i < NL * (RACK_N + 1); i++) balls.push(mkBall());
  const rackMeshes = R.lanes.map(L => Array.from({ length: RACK_N }, (_, k) => { const m = new THREE.Mesh(ballGeo, ballM); ST.addOutline(m, 0.008, BALL_R); m.position.set(L.x - 0.33 + k * 0.22, 0.95, LIP_Z + 0.12); scene.add(m); return m; }));
  const hand = new THREE.Mesh(ballGeo, ballM); ST.addOutline(hand, 0.008, BALL_R); scene.add(hand); hand.visible = false;
  // aim guide dots
  const guide = Array.from({ length: 16 }, () => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.85, depthTest: false })); s.renderOrder = 20; s.visible = false; scene.add(s); return s; });
  // sparks (made basket + fire trail)
  const glowT = glowTexture(), sparks = Array.from({ length: 70 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffd23a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(s); return { s, life: 0, v: V() }; }); let spI = 0;
  // POLISH: floating score pop-ups above the rim, confetti for wins, camera kick
  const popTex = new Map(), popTx = (txt, col) => { const k = txt + col; if (!popTex.has(k)) popTex.set(k, canvasTex(256, 96, g => { g.font = '900 64px "Archivo", "Arial Black", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 12; g.strokeStyle = '#1a1626'; g.strokeText(txt, 128, 52); g.fillStyle = col; g.fillText(txt, 128, 52); })); return popTex.get(k); };
  const pops = Array.from({ length: 10 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false })); s.renderOrder = 40; s.visible = false; scene.add(s); return { s, t: 0 }; }); let popI = 0;
  const popup = (p, txt, col, big) => { const q = pops[popI = (popI + 1) % pops.length]; q.s.material.map = popTx(txt, col); q.s.material.needsUpdate = true; q.s.position.copy(p); q.t = 1; q.big = big ? 0.2 : 0.13; q.s.visible = true; };
  const CONF = 110, confG = new THREE.PlaneGeometry(0.05, 0.08), conf = new THREE.InstancedMesh(confG, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CONF), confD = Array.from({ length: CONF }, () => ({ p: V(), v: V(), r: V(), w: V() }));
  conf.frustumCulled = false; conf.count = 0; scene.add(conf); const confCols = ['#ffd23a', '#ec3013', '#38bdf8', '#22c55e', '#ffffff', '#f472b6'].map(c => new THREE.Color(c)); for (let k = 0; k < CONF; k++) conf.setColorAt(k, confCols[k % confCols.length]);
  let confT = 0; const confetti = (cx = 0) => { confT = 4.5; confD.forEach(d => { d.p.set(cx + rr(-1.6, 1.6), rr(3.0, 4.2), rr(-1.5, 1.5)); d.v.set(rr(-0.6, 0.6), rr(-0.4, 0.8), rr(-0.3, 0.3)); d.r.set(rr(0, 6), rr(0, 6), rr(0, 6)); d.w.set(rr(-6, 6), rr(-6, 6), rr(-6, 6)); }); conf.count = CONF; };
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _one = V(1, 1, 1);
  let shake = 0, fovKick = 0;
  const spark = (p, col, n = 6, sp = 1.4, size = 0.12) => { for (let i = 0; i < n; i++) { const q = sparks[spI = (spI + 1) % sparks.length]; q.s.position.copy(p); q.s.material.color.set(col); q.s.scale.setScalar(size); q.life = 1; q.v.set(rr(-1, 1) * sp, rr(0.2, 1.4) * sp, rr(-1, 1) * sp * 0.6); } };
  // foxes: the player (CAST), Odessa at the bar, regulars at their machines, two watchers
  const P = kit.makeFox({ ...CAST.player }); P.position.set(0, 0, 0.35); P.rotation.y = Math.PI; scene.add(P);
  const odessa = kit.makeFox({ key: 'odessa', torso: '#7a1d2a', outfit: 'vest', mood: 'warm', look: { fur: '#d9733a', furDark: '#9a4a22', tailTip: '#ffffff' }, eyes: ['#22c55e', '#22c55e'] }); odessa.position.set(-3.2, 0, 7.5); odessa.rotation.y = Math.PI; scene.add(odessa);
  const regFox = REGULARS.map(r => { const f = kit.makeFox({ key: r.key, torso: r.torso, outfit: r.outfit, crest: 'Z', mood: 'determined', eyes: ['#38bdf8', '#38bdf8'] }); f.visible = false; f.rotation.y = Math.PI; scene.add(f); return f; });
  const netFox = NET_COLS.map(([, c]) => { const f = kit.makeFox({ key: 'net', torso: c, outfit: 'tee', mood: 'happy' }); f.visible = false; f.rotation.y = Math.PI; scene.add(f); return f; });
  const watchers = [{ key: 'ida', torso: '#f472b6', outfit: 'dress', x: 5.9, z: 1.6 }, { key: 'pross', torso: '#6b7d93', outfit: 'coat', x: 6.6, z: 2.6 }].map(w => { const f = kit.makeFox({ key: w.key, torso: w.torso, outfit: w.outfit, mood: 'happy' }); f.position.set(w.x, 0, w.z); f.rotation.y = Math.atan2(-w.x, -2 - w.z); f.lookAtV = V(0, 1.6, -2); scene.add(f); f.userData.lookAt = V(0, 1.8, -2); return f; });
  const allFox = [P, odessa, ...regFox, ...netFox, ...watchers];
  const hopAll = () => { [odessa, ...watchers].forEach(f => { f.userData.hop = 1; }); };

  // ---------- state ----------
  const S = { phase: 'menu', mode: null, t: -3, lastT: -3, me: 2, lanes: [], flash: null, say: { who: 'ODESSA · BARKEEP', text: LINES.hello[0] }, done: null, pass: null, turnCard: null, count: null, aim: null, meter: null, beaconT: 0, spoke: {}, camShot: 'menu', round: HOOPS.round, quit: false };
  const freshLane = (i, owner) => ({ i, owner, rack: RACK_N, score: 0, made: 0, shots: 0, streak: 0, bestStreak: 0, swish: 0, fire: false, cpuT: rr(0.6, 1.2), left: false, fin: false, threes: 0 });
  const lane = i => S.lanes[i];
  const free = () => S.mode === 'practice' || S.mode === 'demo';
  const rimOff = t => { if (free()) return S.practiceMove ? 0.26 * Math.sin(t * 1.6) : 0; const ms = S.round - HOOPS.moveAt; if (t < ms) return 0; const k = smooth(0, 2, t - ms); return 0.26 * k * Math.sin((t - ms) * 1.65); };
  const rimPos = (i, t) => V(laneX(i) + rimOff(t), RIM_Y, RIM_Z);
  const timeLeft = () => Math.max(0, S.round - S.t);
  const isThree = () => !free() && S.t >= S.round - HOOPS.threeAt;

  // ---------- shots ----------
  const launchPos = i => V(laneX(i) + LAUNCH.x, LAUNCH.y, LAUNCH.z);
  function idealSpeed(i, yaw, t) { const p0 = launchPos(i), r = rimPos(i, t), D = Math.hypot(r.x - p0.x, r.z - p0.z), h = r.y - p0.y; return 1.008 * Math.sqrt(G * D * D / (2 * Math.cos(ANG) ** 2 * (D * Math.tan(ANG) - h))); }
  function flightT(i, t) { const p0 = launchPos(i), r = rimPos(i, t), D = Math.hypot(r.x - p0.x, r.z - p0.z); return D / (idealSpeed(i, 0, t) * Math.cos(ANG)); }
  function leadYaw(i, t) { const T = flightT(i, t), r = rimPos(i, t + T), p0 = launchPos(i); return Math.atan2(r.x - p0.x, -(r.z - p0.z)); }
  // f = power factor (1.0 = perfect depth), yaw = sideways angle (0 = straight down the lane)
  function shoot(i, f, yaw, net = false) {
    const L = lane(i); if (!L || L.rack <= 0 || S.phase !== 'run' || (!free() && S.t >= S.round)) return false;
    const b = balls.find(q => !q.on); if (!b) return false;
    L.rack--; L.shots++;
    const v = idealSpeed(i, yaw, S.t) * f, p0 = launchPos(i);
    b.on = true; b.owner = i; b.scored = b.rimHit = b.boardHit = false; b.age = 0; b.fire = L.fire; b.lt = S.t; b.p.copy(p0);
    b.v.set(Math.sin(yaw) * v * Math.cos(ANG), v * Math.sin(ANG), -Math.cos(yaw) * v * Math.cos(ANG)); b.spin.set(rr(-8, -5), 0, 0);
    b.m.material = L.fire ? fireM : ballM; b.m.visible = b.sh.visible = true; b.m.position.copy(b.p);
    const pan = panOf(i); SND.shot(pan);
    const fx = i === S.me ? P : laneFox(i); if (fx && fx.visible) fx.userData.shootT = 0.45;
    if (i === S.me && S.mode === 'online' && !net && S.net) S.net.send('sh', { f: +f.toFixed(4), y: +yaw.toFixed(4), t: +S.t.toFixed(3) });
    push(); return true;
  }
  const panOf = i => clamp((laneX(i) - laneX(S.me)) / 2.6, -1, 1);
  function scoreBall(b) {
    const i = b.owner, L = lane(i); b.scored = true; const me = i === S.me;
    if (S.mode === 'online' && !me) { kickNet(i); spark(rimPos(i, S.t), '#ffd23a', 4); laneFlash(i, '#ffffff'); SND.netRattle(panOf(i)); return; } // remote scores come from their owner
    L.made++; L.streak++; L.bestStreak = Math.max(L.bestStreak, L.streak); const three = b.lt >= S.round - HOOPS.threeAt && !free();
    const th3 = three || !!L.demoThree; L.demoThree = false; let pts = th3 ? 3 : 2; if (three) L.threes++; if (L.fire) pts += 1; if (!b.rimHit && !b.boardHit) L.swish++;
    L.score += pts; const wasFire = L.fire; if (L.streak >= 3) L.fire = true;
    kickNet(i); spark(rimPos(i, S.t), L.fire ? '#ff6a1a' : '#ffd23a', me ? 10 : 4);
    const pan = panOf(i), sw = !b.rimHit && !b.boardHit; if (sw) SND.swish(pan); else SND.netRattle(pan); if (me) SND.make(pan, L.fire, three);
    laneFlash(i, L.fire ? '#ff6a1a' : '#ffffff'); popup(rimPos(i, S.t).add(V(0, 0.35, 0.1)), sw && me ? 'SWISH +' + pts : '+' + pts, L.fire ? '#ff7a2a' : three ? '#ff3b2a' : '#ffd23a', me);
    if (me) { fovKick = sw ? 2.6 : 1.6; if (L.streak > 0 && L.streak % 5 === 0) { hopAll(); SND.cheer(0.6); } }
    if (me) { if (L.fire && !wasFire) { flash('ON FIRE · +1 A BASKET', '#ff6a1a', 1.4); speak('On fire'); SND.fire(); SND.cheer(0.8); hopAll(); } }
    if (S.mode === 'online' && me) sendScore();
    if (S.mode === 'race' || (S.mode === 'online' && S.netMode === 'race')) { if (L.score >= HOOPS.raceTo && !S.raceWin) { S.raceWin = i; if (S.mode === 'online' && S.net) S.net.send('ev', { k: 'win' }); endRound(); } }
    push();
  }
  function ballHome(b) { const i = b.owner, L = lane(i); b.on = false; if (i === S.me) SND.rollback(0); b.m.visible = b.sh.visible = false; if (!L) return; L.rack = Math.min(RACK_N, L.rack + 1);
    if (!b.scored && !(S.mode === 'online' && i !== S.me)) { L.streak = 0; if (L.fire && i === S.me) flash('FIRE IS OUT', '#8a847e', 0.9); L.fire = false; if (i === S.me) { SND.miss(0); if (S.mode === 'online') sendScore(); } } push(); }
  const kickNet = i => { R.lanes[i].netKick = 1; };
  const laneFlash = (i, col) => { const Ln = R.lanes[i]; Ln.neonK = 1; Ln.flashCol = new THREE.Color(col); Ln.rimMat.emissiveIntensity = 1.2; };
  function stepBall(b, dt) {
    const i = b.owner, x0 = laneX(i), r = rimPos(i, S.t), pan = panOf(i), prevY = b.p.y;
    b.v.y -= G * dt; b.p.addScaledVector(b.v, dt); b.age += dt;
    // rim (torus centre circle)
    const hx = b.p.x - r.x, hz = b.p.z - r.z, hd = Math.hypot(hx, hz) || 1e-4, qx = r.x + hx / hd * RIM_R, qz = r.z + hz / hd * RIM_R;
    const dx = b.p.x - qx, dy = b.p.y - r.y, dz = b.p.z - qz, dd = Math.hypot(dx, dy, dz), md = BALL_R + RIM_T;
    if (dd < md) { const nx = dx / dd, ny = dy / dd, nz = dz / dd, vn = b.v.x * nx + b.v.y * ny + b.v.z * nz; b.p.x += nx * (md - dd); b.p.y += ny * (md - dd); b.p.z += nz * (md - dd);
      if (vn < 0) { b.v.x -= 1.55 * vn * nx; b.v.y -= 1.55 * vn * ny; b.v.z -= 1.55 * vn * nz; b.v.multiplyScalar(0.86); if (!b.rimHit || Math.abs(vn) > 0.6) { SND.rim(pan, clamp(Math.abs(vn) / 3, 0.35, 1)); if (i === S.me) shake = Math.max(shake, clamp(Math.abs(vn) / 3, 0.2, 1) * 0.6); R.lanes[i].rimMat.emissiveIntensity = Math.max(R.lanes[i].rimMat.emissiveIntensity, 0.4); R.lanes[i].wob = Math.max(R.lanes[i].wob || 0, clamp(Math.abs(vn) / 3, 0.3, 1)); } b.rimHit = true; } }
    // backboard / back net
    if (b.p.z - BALL_R < BOARD_Z && b.v.z < 0) { b.p.z = BOARD_Z + BALL_R; b.v.z = -b.v.z * 0.55; b.v.x *= 0.9; const onBoard = Math.abs(b.p.x - (x0 + rimOff(S.t))) < 0.46 && b.p.y > RIM_Y - 0.02 && b.p.y < RIM_Y + 0.62; if (onBoard) { b.boardHit = true; SND.board(pan); } }
    // side nets + ceiling net
    if (b.p.x - BALL_R < x0 - HALF && b.v.x < 0) { b.p.x = x0 - HALF + BALL_R; b.v.x = -b.v.x * 0.4; }
    if (b.p.x + BALL_R > x0 + HALF && b.v.x > 0) { b.p.x = x0 + HALF - BALL_R; b.v.x = -b.v.x * 0.4; }
    if (b.p.z < -1.2 && b.p.y + BALL_R > CEIL_Y && b.v.y > 0) { b.p.y = CEIL_Y - BALL_R; b.v.y = -b.v.y * 0.3; }
    if (b.p.z > LIP_Z + 0.2 && b.v.z > 0 && b.p.y < 1.2) { b.p.z = LIP_Z + 0.2; b.v.z = -b.v.z * 0.3; }
    // through the hoop (downwards, inside the ring)
    if (!b.scored && b.v.y < 0 && prevY >= r.y && b.p.y < r.y && Math.hypot(b.p.x - r.x, b.p.z - r.z) < RIM_R - 0.035) scoreBall(b);
    // ramp: roll back to the player
    const fy = rampY(b.p.z); if (b.p.y - BALL_R < fy && b.p.z < LIP_Z + 0.2) { b.p.y = fy + BALL_R; if (b.v.y < -0.8) SND.bounce(pan, -b.v.y); if (b.v.y < 0) b.v.y = -b.v.y * 0.35; b.v.x *= 0.985; b.v.z += 2.6 * dt; b.v.z = Math.min(b.v.z, 3.2); }
    if (b.p.z > LIP_Z - 0.05 && b.p.y < 1.1 || b.age > 7) ballHome(b);
  }

  // ---------- CPU regulars ----------
  function cpuStep(i, dt) { const L = lane(i), R0 = L.owner.reg; if (!R0 || S.t >= S.round) return; L.cpuT -= dt; if (L.cpuT > 0 || L.rack <= 0) return;
    L.cpuT = rr(1.4, 2.2) / R0.rate; // tuned: Zoran ≈ 55–65 a round, Hoyt ≈ 30–40 (tavern record 60)
    const hit = Math.random() < 0.15 + R0.skill * 0.57, f = hit ? 1.015 + rr(-0.008, 0.008) : 1.015 + (Math.random() < 0.5 ? -1 : 1) * rr(0.07, 0.12), yaw = leadYaw(i, S.t) + (hit ? 0 : rr(-0.04, 0.04)); shoot(i, f, yaw); }

  // ---------- input: swipe up (drag meter), TAP MODE, keyboard ----------
  const el = renderer.domElement; let drag = null;
  // power 0..1.15 → speed factor; a smooth 'magnet' near the sweet spot (stronger with AIM GUIDE / TAP MODE)
  const powerToF = p => { const d = 0.8 + 0.4 * p - 1.015, mag = opts.guide || opts.tap ? 0.45 : 0.62; return 1.015 + d * (mag + (1 - mag) * smooth(0.05, 0.16, Math.abs(d))); };
  const MAKE = [0.985, 1.045]; // measured make window of the speed factor (rim + board bounces included)
  const greenZone = () => { let z0 = null, z1 = 0; for (let p = 0; p <= 1.15; p += 0.0025) { const f = powerToF(p); if (f >= MAKE[0] && f <= MAKE[1]) { if (z0 == null) z0 = p; z1 = p; } } return [z0 ?? 0.5, z1]; };
  const myYaw = raw => { const lead = opts.tap ? leadYaw(S.me, S.t) : 0; let y = clamp(raw + lead, -0.3, 0.3); if (opts.guide && !opts.tap) { const ly = leadYaw(S.me, S.t); if (Math.abs(y - ly) < 0.06) y = ly + (y - ly) * 0.5; } return y; };
  const canShoot = () => S.phase === 'run' && lane(S.me) && lane(S.me).rack > 0 && S.t >= 0 && !S.demo && (free() || S.t < S.round);
  function onDown(e) { SND.ok(); if (!canShoot()) return; if (opts.tap) { const p = S.meter ? S.meter.p : 0.5; shoot(S.me, powerToF(p), myYaw(0)); return; } drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY }; try { el.setPointerCapture(e.pointerId); } catch (er) {} aimUpd(); }
  function onMove(e) { if (!drag || e.pointerId !== drag.id) return; drag.x = e.clientX; drag.y = e.clientY; aimUpd(); }
  function onUp(e) { if (!drag || e.pointerId !== drag.id) return; const a = aimOf(); drag = null; S.aim = null; if (a && a.p > 0.08) shoot(S.me, powerToF(a.p), myYaw(a.yaw)); push(); }
  function aimOf() { if (!drag) return null; const H = ST.CH(), dy = drag.y0 - drag.y, dx = drag.x - drag.x0; const p = clamp(dy / (0.3 * H), 0, 1.15), yaw = dy > 8 ? clamp(Math.atan2(dx, dy) * 0.38, -0.3, 0.3) : 0; return { p, yaw }; }
  function aimUpd() { const a = aimOf(); S.aim = a; push(); }
  el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);
  const keys = { held: false, p: 0, dir: 1, yaw: 0 };
  function onKey(e) { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (S.phase !== 'run') return;
    if (e.code === 'Space') { e.preventDefault(); SND.ok(); if (e.type === 'keydown' && !e.repeat) { if (opts.tap) { if (canShoot()) shoot(S.me, powerToF(S.meter ? S.meter.p : 0.5), myYaw(0)); } else if (canShoot()) { keys.held = true; keys.p = 0; keys.dir = 1; } } else if (e.type === 'keyup' && keys.held) { keys.held = false; S.aim = null; shoot(S.me, powerToF(keys.p), myYaw(keys.yaw)); } }
    if (e.type === 'keydown' && (e.code === 'ArrowLeft' || e.code === 'KeyA')) { keys.yaw = clamp(keys.yaw - 0.04, -0.3, 0.3); push(); }
    if (e.type === 'keydown' && (e.code === 'ArrowRight' || e.code === 'KeyD')) { keys.yaw = clamp(keys.yaw + 0.04, -0.3, 0.3); push(); } }
  addEventListener('keydown', onKey); addEventListener('keyup', onKey);

  // ---------- flashes, speech, LED ----------
  function flash(txt, col = '#ffd23a', dur = 0.9) { S.flash = { txt, col, t: dur }; push(); }
  function speak(t) { if (!opts.audio) return; SND.duck(1.4); try { const u = new SpeechSynthesisUtterance(t); u.rate = 1.1; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} }
  function drawLed(i) { const Ln = R.lanes[i], L = lane(i), on = !!(L && L.owner); const tl = free() ? '--' : Math.ceil(timeLeft()); const key = on ? L.owner.name + '|' + L.score + '|' + tl + '|' + L.fire + '|' + L.left : 'off'; if (key === Ln.ledKey) return; Ln.ledKey = key;
    const c = Ln.ledCv.getContext('2d'); c.fillStyle = '#05040a'; c.fillRect(0, 0, 256, 96); if (!on) { c.fillStyle = '#3a3836'; c.font = '900 30px "Archivo", Arial'; c.fillText('FOX HOOPS', 40, 60); Ln.ledTex.needsUpdate = true; return; }
    c.fillStyle = L.owner.col; c.fillRect(0, 0, 10, 96); c.font = '800 22px "Archivo", Arial'; c.fillStyle = '#ffffff'; c.fillText(L.left ? L.owner.name + ' · LEFT' : L.owner.name, 20, 28);
    c.font = '900 56px "Archivo", Arial'; c.fillStyle = L.fire ? '#ff6a1a' : '#ff3b2a'; c.fillText(String(L.score).padStart(2, '0'), 20, 86); c.fillStyle = '#ffd23a'; c.font = '900 40px "Archivo", Arial'; c.textAlign = 'right'; c.fillText(String(tl), 244, 86); c.textAlign = 'left'; Ln.ledTex.needsUpdate = true; }

  // ---------- rounds ----------
  function setupLanes(owners) { S.lanes = Array.from({ length: NL }, (_, i) => owners[i] ? freshLane(i, owners[i]) : null);
    [...regFox, ...netFox].forEach(f => { f.visible = false; f.userData.laneI = null; });
    S.lanes.forEach((L, i) => { if (!L || i === S.me) return; const f = L.owner.reg ? regFox[REGULARS.indexOf(L.owner.reg)] : netFox[L.owner.slot || 0]; if (f) { f.visible = true; f.position.set(laneX(i) + Math.sign(i - S.me) * 0.2, 0, -0.12); f.userData.laneI = i; } });
    balls.forEach(b => { b.on = false; b.m.visible = b.sh.visible = false; }); R.lanes.forEach(l => l.ledKey = ''); }
  const laneFox = i => [...regFox, ...netFox].find(f => f.visible && f.userData.laneI === i);
  function begin(mode, o = {}) {
    S.mode = mode; S.done = null; S.flash = null; S.spoke = {}; S.raceWin = null; S.quit = false; S.round = mode === 'practice' || mode === 'demo' ? 1e9 : mode === 'race' ? 90 : HOOPS.round; S.practiceMove = false; keys.yaw = 0;
    if (mode === 'house') { S.me = 2; const regs = o.regs || [REGULARS[0], REGULARS[1]]; setupLanes({ 2: { kind: 'me', name: 'YOU', col: '#ffd23a' }, 1: { kind: 'cpu', name: regs[0].name, col: '#38bdf8', reg: regs[0] }, 3: { kind: 'cpu', name: regs[1].name, col: '#22c55e', reg: regs[1] } }); }
    else if (mode === 'practice') { S.me = 2; setupLanes({ 2: { kind: 'me', name: 'YOU', col: '#ffd23a' } }); }
    else if (mode === 'demo') { S.me = 2; setupLanes({ 2: { kind: 'me', name: 'YOU', col: '#ffd23a' }, 1: { kind: 'cpu', name: REGULARS[0].name, col: '#38bdf8', reg: REGULARS[0] }, 3: { kind: 'cpu', name: REGULARS[1].name, col: '#22c55e', reg: REGULARS[1] } }); }
    else if (mode === 'pass') { S.me = 2; const pl = S.pass.players[S.pass.cur]; setupLanes({ 2: { kind: 'me', name: pl.name, col: pl.col } }); }
    S.phase = 'count'; S.t = -3; S.lastT = -3; S.say = null; S.camShot = 'play'; SND.ok(); SND.music('game', true); SND.setIntensity(0); SND.ambience(0.15); push(true);
  }
  function endRound() { if (S.phase !== 'run') return; S.phase = 'buzz'; S.buzzT = 0; SND.buzzer(); push(true); }
  function finish() {
    const me = lane(S.me); S.phase = 'done'; S.camShot = 'done'; drag = null; S.aim = null;
    const acc = me && me.shots ? Math.round(me.made / me.shots * 100) : 0, rows = me ? [['BASKETS', me.made + ' / ' + me.shots], ['ACCURACY', acc + '%'], ['BEST STREAK', String(me.bestStreak)], ['SWISHES', String(me.swish)], ['3-POINTERS', String(me.threes)]] : [];
    const board = S.lanes.filter(Boolean).map(L => ({ name: L.owner.name, col: L.owner.col, score: L.score, me: L.i === S.me, left: L.left })).sort((a, b) => b.score - a.score);
    const myS = me ? me.score : 0, place = 1 + board.filter(x => !x.me && x.score > myS).length, tied = board.some(x => !x.me && x.score === myS), won = place === 1 && board.length > 1 && !tied;
    let gold = 0, newBest = false, trophy = false, title = '', kicker = '', sub = '';
    save.setFlag(SAVE_KEYS.played); save.setStat(SAVE_KEYS.games, save.stat(SAVE_KEYS.games) + 1); save.best(SAVE_KEYS.streak, me ? me.bestStreak : 0);
    if (S.mode === 'house') { newBest = save.best(SAVE_KEYS.best, me.score); gold = Math.floor(me.score / 6) + (won ? 10 : 0); if (won) save.setStat(SAVE_KEYS.wins, save.stat(SAVE_KEYS.wins) + 1);
      if (me.score >= HOOPS.record && !save.flag(SAVE_KEYS.record)) { save.setFlag(SAVE_KEYS.record); if (!save.count(SAVE_KEYS.trophy)) { save.give(SAVE_KEYS.trophy, 1); trophy = true; } }
      kicker = 'VS THE REGULARS'; title = won ? 'YOU BEAT THE REGULARS' : place === 1 ? 'A TIE AT THE TOP' : 'PLACE ' + place + ' OF ' + board.length; sub = (newBest ? 'NEW BEST' : 'BEST ' + save.stat(SAVE_KEYS.best)) + (gold ? ' · +' + gold + ' GOLD' : ''); }
    else if (S.mode === 'online') { gold = Math.floor(me.score / 10) + (won ? 8 : 0); if (won) save.setStat(SAVE_KEYS.onlineWins, save.stat(SAVE_KEYS.onlineWins) + 1); kicker = 'ONLINE · ' + (S.netMode === 'race' ? 'RACE TO ' + HOOPS.raceTo : 'SHOOTOUT'); title = won ? 'YOU WIN' : place === 1 ? 'TIED FOR FIRST' : 'PLACE ' + place + ' OF ' + board.length; sub = gold ? '+' + gold + ' GOLD' : ''; }
    else if (S.mode === 'pass') { const pl = S.pass.players[S.pass.cur]; pl.score = me.score; pl.made = me.made; pl.shots = me.shots; S.pass.cur++;
      if (S.pass.cur < S.pass.players.length) { S.phase = 'turn'; S.turnCard = { last: pl, next: S.pass.players[S.pass.cur] }; S.camShot = 'menu'; push(true); return; }
      const st = S.pass.players.slice().sort((a, b) => b.score - a.score); kicker = 'PASS & PLAY'; title = st[0].score > (st[1] ? st[1].score : -1) ? st[0].name + ' WINS' : 'A TIE AT THE TOP'; sub = S.pass.players.length + ' PLAYERS';
      board.length = 0; st.forEach(p => board.push({ name: p.name, col: p.col, score: p.score, me: false })); }
    if (gold) save.addGold(gold); if (me && S.mode !== 'pass' && S.mode !== 'practice') save.addXp(Math.round(me.score / 4));
    const line = won ? pick(LINES.win) : pick(LINES.lose); S.say = S.mode === 'pass' || S.mode === 'practice' ? null : { who: 'ODESSA · BARKEEP', text: line }; SND.music('menu', true); SND.setIntensity(0); SND.ambience(0.35); SND.jingle(won || S.mode === 'pass' || S.mode === 'practice'); if (gold) setTimeout(() => SND.coin(), 700); if (won || trophy) { SND.cheer(1); hopAll(); confetti(laneX(S.me)); }
    S.done = { mode: S.mode, kicker, title, sub, rows, board, total: me ? me.score : 0, won, gold, trophy, grade: S.mode === 'pass' ? '' : place ? String(place) + (['ST', 'ND', 'RD'][place - 1] || 'TH') : '' };
    speak((S.mode === 'pass' ? title : 'Final score ' + (me ? me.score : 0) + '. ' + title).toLowerCase());
    if (S.mode === 'online' && S.net) { sendScore(true); S.net.send('ev', { k: 'playing', on: false }); }
    push(true);
  }

  // ---------- pass & play ----------
  function passStart(n) { n = clamp(n | 0, 2, MAX_PLAYERS); S.pass = { players: Array.from({ length: n }, (_, k) => ({ name: 'PLAYER ' + (k + 1), col: NET_COLS[k][1], cname: NET_COLS[k][0], score: null })), cur: 0 }; S.phase = 'turn'; S.turnCard = { last: null, next: S.pass.players[0] }; S.camShot = 'menu'; push(true); }
  function passGo() { if (S.phase !== 'turn' || !S.pass) return; S.turnCard = null; begin('pass'); }

  // ---------- online (engine/duel-net.js; falls back to a same-browser test channel) ----------
  const NETS = { st: null };
  let lastSeen = {}, netTok = 0, nTimer = 0, matchIds = null;
  async function connect(code, handlers) {
    try { const mod = await import(new URL('engine/duel-net.js', document.baseURI).href); return await mod.connectDuel({ game: HOOPS.key, code, ...handlers }); }
    catch (e) { // TEST fallback: BroadcastChannel between tabs of this browser (so the lobby + match can be tried without the repo's duel-net.js)
      const id = Math.random().toString(36).slice(2, 10), bc = new BroadcastChannel('8g-' + HOOPS.key + '-' + code); setTimeout(() => handlers.onStatus && handlers.onStatus('local'), 0);
      bc.onmessage = ev => { const m = ev.data; if (!m || m.from === id || (m.to && m.to !== id)) return; handlers.onMsg && handlers.onMsg(m.t, m.d, m.from); };
      return { id, local: true, send: (t, d, to) => bc.postMessage({ t, d, to, from: id }), leave: () => bc.close() }; }
  }
  const netState = () => NETS.st;
  function netSet(p) { if (NETS.st) Object.assign(NETS.st, p); push(true); }
  function members() { const n = NETS.st; if (!n || !S.net) return []; const all = [{ id: S.net.id, j: n.j, ready: n.ready, playing: n.st === 'play', me: true }, ...Object.entries(n.peers).map(([id, p]) => ({ id, ...p, me: false }))]; all.sort((a, b) => a.j - b.j || (a.id < b.id ? -1 : 1)); return all.slice(0, MAX_PLAYERS); }
  const inRoom = () => members().some(m => m.me);
  function hostId(match = true) { let m = members(); if (match && matchIds) m = m.filter(x => matchIds.includes(x.id)); return m.length ? m.reduce((a, b) => a.id < b.id ? a : b).id : (S.net ? S.net.id : null); }
  function playerList(ids) { const s = ids.slice().sort(), me = S.net && S.net.id; return s.map((id, slot) => ({ id, slot, col: NET_COLS[slot][1], name: id === me ? 'YOU' : s.length > 2 ? NET_COLS[slot][0] : 'RIVAL', cname: NET_COLS[slot][0] })); }
  function netOpen() { NETS.st = { st: 'menu', code: '', codeIn: '', mode: 'shootout', modeSet: false, peers: {}, ready: false, j: 0, status: '', msg: '', ping: null }; S.phase = 'menu'; push(true); }
  function netClose() { netLeave(); NETS.st = null; push(true); }
  async function netJoin(code) { code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); if (code.length < 4) { netSet({ msg: 'Type the 4-letter room code from your friend.' }); return; }
    netLeave(); if (!NETS.st) netOpen(); lastSeen = {}; netSet({ st: 'room', code, status: 'connecting', peers: {}, ready: false, j: Date.now(), msg: '' });
    const tok = netTok = netTok + 1;
    const N = await connect(code, { onJoin: id => nHello(id), onLeave: id => nGone(id), onMsg: (t, d, id) => nMsg(t, d, id), onStatus: s => netSet({ status: s }) });
    if (tok !== netTok) { N.leave(); return; } S.net = N; if (N.local) netSet({ status: 'local' }); nHello(); push(true);
    clearInterval(nTimer); nTimer = setInterval(nTick, 1000); }
  function netCreate() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ'; let k = ''; for (let i = 0; i < 4; i++) k += A[Math.floor(Math.random() * A.length)]; return netJoin(k); }
  function netLeave() { netTok++; clearInterval(nTimer); if (S.net) { S.net.send('ev', { k: 'bye' }); S.net.leave(); } S.net = null; matchIds = null; lastSeen = {}; if (S.mode === 'online' && (S.phase === 'run' || S.phase === 'count')) { S.phase = 'menu'; S.camShot = 'menu'; S.mode = null; } }
  function nHello(to) { const n = NETS.st; if (!S.net || !n) return; S.net.send('hi', { v: 1, j: n.j, ready: n.ready, mode: n.mode, playing: n.st === 'play' }, to); }
  function nMsg(t, d, id) { const n = NETS.st; if (!n || !S.net || !d) return; const now = performance.now(), known = !!lastSeen[id];
    if (t === 'hi') { lastSeen[id] = now; n.peers[id] = { ...(n.peers[id] || {}), j: +d.j || Date.now(), ready: !!d.ready, playing: !!d.playing }; if (!n.modeSet && d.mode && +d.j < n.j) n.mode = d.mode === 'race' ? 'race' : 'shootout'; if (!known) setTimeout(() => nHello(id), 0); setTimeout(nMaybeStart, 0); push(true); return; }
    if (!known) return; lastSeen[id] = now; const inMatch = !!(matchIds && matchIds.includes(id)), li = inMatch ? laneOfId(id) : -1;
    if (t === 'pg') { if (d.t != null) S.net.send('pg', { e: d.t }, id); else if (d.e != null) netSet({ ping: Math.max(1, Math.round(now - d.e)) }); return; }
    if (t === 'sh') { if (li >= 0 && S.mode === 'online' && S.phase === 'run') { const L = lane(li); if (L.rack <= 0) L.rack = 1; shoot(li, +d.f || 1, +d.y || 0, true); } return; }
    if (t === 'sc') { if (li >= 0 && lane(li)) { const L = lane(li); Object.assign(L, { score: +d.s || 0, made: +d.m || 0, shots: +d.n || 0, fire: !!d.fi, streak: +d.st || 0 }); if (d.fin) L.fin = true; push(); } return; }
    if (t !== 'ev') return;
    if (d.k === 'ready') { if (n.peers[id]) n.peers[id].ready = !!d.on; setTimeout(nMaybeStart, 0); push(true); }
    else if (d.k === 'mode') { n.mode = d.m === 'race' ? 'race' : 'shootout'; n.modeSet = true; n.ready = false; Object.values(n.peers).forEach(p => p.ready = false); push(true); }
    else if (d.k === 'start') nStart(d);
    else if (d.k === 'playing') { if (n.peers[id]) n.peers[id].playing = !!d.on; push(true); }
    else if (d.k === 'win') { if (S.mode === 'online' && S.phase === 'run') { S.raceWin = li; endRound(); } }
    else if (d.k === 'bye') nGone(id); }
  function nGone(id) { if (!lastSeen[id]) return; delete lastSeen[id]; const n = NETS.st; if (n) delete n.peers[id]; const li = matchIds && matchIds.includes(id) ? laneOfId(id) : -1; if (li >= 0 && lane(li)) { lane(li).left = true; lane(li).fin = true; } push(true); }
  function nTick() { if (!S.net) return; S.net.send('pg', { t: performance.now() }); const now = performance.now(); for (const id of Object.keys(lastSeen)) if (now - lastSeen[id] > 25000) nGone(id); }
  function nMaybeStart() { const n = NETS.st; if (!n || !S.net || n.st !== 'room' || !inRoom() || hostId(false) !== S.net.id) return; const m = members(); if (m.length < 2 || !m.every(x => x.ready && !x.playing)) return;
    const d = { k: 'start', t0: Date.now() + 3500, mode: n.mode, ids: m.map(x => x.id) }; S.net.send('ev', d); nStart(d); }
  // lanes for an online match: centre the players (2 → lanes 1,3 · 3 → 1,2,3 · 4 → 0,1,3,4 · 5 → all)
  const LANE_SETS = { 1: [2], 2: [1, 3], 3: [1, 2, 3], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4] };
  let netLanes = {};
  const laneOfId = id => netLanes[id] ?? -1;
  function nStart(d) { const n = NETS.st; if (!n || !S.net || !Array.isArray(d.ids)) return; if (!d.ids.includes(S.net.id)) { netSet({ msg: 'A game started without you. You join the next one.' }); return; }
    matchIds = d.ids.slice(0, MAX_PLAYERS); const pl = playerList(matchIds), set = LANE_SETS[pl.length]; netLanes = {}; const owners = {};
    pl.forEach((p, k) => { const li = set[k]; netLanes[p.id] = li; owners[li] = { kind: p.id === S.net.id ? 'me' : 'net', id: p.id, name: p.name, col: p.col, slot: p.slot, cname: p.cname }; if (p.id === S.net.id) S.me = li; });
    let t0 = +d.t0; const w = t0 - Date.now(); if (!(w >= 0 && w <= 5000)) t0 = Date.now() + 3000; S.t0 = t0;
    n.st = 'play'; n.mode = d.mode === 'race' ? 'race' : 'shootout'; n.ready = false; Object.keys(n.peers).forEach(k => { n.peers[k].ready = false; n.peers[k].playing = matchIds.includes(k); });
    S.mode = 'online'; S.netMode = n.mode; S.done = null; S.flash = null; S.spoke = {}; S.raceWin = null; S.round = n.mode === 'race' ? 90 : HOOPS.round; keys.yaw = 0;
    setupLanes(owners); S.phase = 'count'; S.t = (Date.now() - t0) / 1000; S.lastT = S.t; S.say = null; S.camShot = 'play'; SND.music('game', true); SND.setIntensity(0); SND.ambience(0.15); push(true); }
  function sendScore(fin) { const L = lane(S.me); if (!S.net || !L) return; S.net.send('sc', { s: L.score, m: L.made, n: L.shots, fi: L.fire, st: L.streak, fin: !!fin }); }
  function netReady() { const n = NETS.st; if (!n || !S.net) return; n.ready = !n.ready; S.net.send('ev', { k: 'ready', on: n.ready }); setTimeout(nMaybeStart, 0); push(true); }
  function netMode(m) { const n = NETS.st; if (!n || n.mode === m) return; n.mode = m; n.modeSet = true; n.ready = false; Object.values(n.peers).forEach(p => p.ready = false); if (S.net) S.net.send('ev', { k: 'mode', m }); push(true); }
  function netToLobby() { const n = NETS.st; if (!n) return; n.st = 'room'; S.phase = 'menu'; S.done = null; S.camShot = 'menu'; S.lanes = []; [...regFox, ...netFox].forEach(f => { f.visible = false; f.userData.laneI = null; }); if (S.net) S.net.send('ev', { k: 'playing', on: false }); push(true); }

  // ---------- camera ----------
  const camPos = V(0, 3, 9), camLook = V(0, 2, -2);
  function camTarget(dt, now) {
    const portrait = ST.CH() > ST.CW(); camera.fov = damp(camera.fov, portrait ? 64 : 48, 6, dt);
    if (S.camShot === 'play') { const x = laneX(S.me); return { p: V(x, portrait ? 1.78 : 1.6, portrait ? 1.55 : 1.0), l: V(x, portrait ? 1.72 : 1.85, -3.0) }; }
    if (S.camShot === 'done') { const a = now * 0.08; return { p: V(Math.sin(a) * 1.0 + (portrait ? 0 : 0.6), 2.9, portrait ? 6.4 : 5.6), l: V(portrait ? 0 : 0.7, 1.6, -0.8) }; }
    const a = Math.sin(now * 0.07) * 0.5; return portrait ? { p: V(2.2 + a, 2.5, 6.2), l: V(-0.4, 1.7, -1.4) } : { p: V(3.2 + a, 2.6, 6.2), l: V(-0.6, 1.6, -0.8) };
  }
  // ---------- hud state for the page ----------
  let pushT = 0, dirty = true; function push(now) { dirty = true; if (now) emit(); }
  function emit() { dirty = false; pushT = 0; try { onState(hud()); } catch (e) {} }
  function hud() {
    const me = lane(S.me), tl = timeLeft(), n = NETS.st, m = n ? members() : [];
    const rows = S.lanes.filter(Boolean).map(L => ({ name: L.owner.name, col: L.owner.col, score: L.score, me: L.i === S.me, fire: L.fire, left: L.left, rack: L.rack })).sort((a, b) => b.score - a.score);
    const [z0, z1] = greenZone(), a = S.aim || (keys.held ? { p: keys.p, yaw: keys.yaw } : null);
    return { phase: S.phase, mode: S.mode, netMode: S.netMode, theme: TH.name, opts: { ...opts }, embed,
      time: S.mode === 'demo' ? 'DEMO' : S.mode === 'practice' ? 'FREE' : S.phase === 'count' ? Math.floor(S.round / 60) + ':' + String(Math.floor(S.round % 60)).padStart(2, '0') : Math.floor(Math.ceil(tl) / 60) + ':' + String(Math.ceil(tl) % 60).padStart(2, '0'), low: S.mode !== 'practice' && tl <= 10 && S.phase === 'run',
      count: S.phase === 'count' ? Math.max(1, Math.ceil(-S.t)) : null, three: isThree() && S.phase === 'run', moving: Math.abs(rimOff(S.t)) > 0.01 && S.phase === 'run',
      me: me ? { score: me.score, made: me.made, shots: me.shots, streak: me.streak, fire: me.fire, rack: me.rack } : null, rows,
      meter: S.phase === 'run' ? { on: !!a || tapOn(), p: tapOn() && !a ? (S.meter ? S.meter.p : 0) : a ? a.p : 0, z0, z1, yaw: a ? a.yaw : 0, tap: tapOn() } : null,
      demo: S.demo && DEMO[S.demo.i] ? { cap: DEMO[S.demo.i].cap, key: DEMO[S.demo.i].key, n: S.demo.i + 1, of: DEMO.length, w: Math.round((S.demo.i + Math.min(1, S.demo.t / DEMO[S.demo.i].d)) / DEMO.length * 100), finger: S.demo.finger } : null,
      flash: S.flash ? { txt: S.flash.txt, col: S.flash.col } : null, say: S.say, done: S.done, turn: S.turnCard, pass: S.pass ? { n: S.pass.players.length, cur: S.pass.cur, players: S.pass.players.map(p => ({ ...p })) } : null,
      hint: S.phase === 'run' && !S.demo && me && me.shots < 2 ? (opts.tap ? 'TAP ANYWHERE WHEN THE METER IS IN THE GREEN' : 'SWIPE UP · RELEASE IN THE GREEN') : '',
      best: save.stat(SAVE_KEYS.best), wins: save.stat(SAVE_KEYS.wins), gold: save.data.gold, record: HOOPS.record, raceTo: HOOPS.raceTo,
      net: n ? { ...n, peers: { ...n.peers }, members: m, list: playerList(m.map(x => x.id)), host: hostId(false), myId: S.net ? S.net.id : null, full: n.st !== 'menu' && !!S.net && m.length >= MAX_PLAYERS && !m.some(x => x.me), local: !!(S.net && S.net.local) } : null };
  }


  // ---------- DEMO: how to play, played by itself (captions + a ghost finger; nothing is saved) ----------
  const tapOn = () => opts.tap || !!(S.demo && DEMO[S.demo.i] && DEMO[S.demo.i].tap);
  const DEMO = [
    { d: 3.4, key: 'BALLS', cap: 'This is your machine. You get 4 balls. They roll back down after every shot.' },
    { d: 3.6, key: 'SWIPE', cap: 'Swipe up from anywhere on the screen. The power meter fills as you drag.', drag: { to: 0.55, at: 0.5, len: 1.8, hold: true } },
    { d: 3.2, key: 'GREEN', cap: 'Let go while the meter is in the green band. Swish!', drag: { to: 0.55, at: 0.2, len: 0.9, release: true } },
    { d: 3.2, key: 'SHORT', cap: 'Let go too early and the ball falls short of the rim.', drag: { to: 0.27, at: 0.2, len: 0.7, release: true } },
    { d: 3.4, key: 'AIM', cap: 'Swipe at an angle to aim left or right.', drag: { to: 0.55, at: 0.2, len: 0.9, dx: 0.2, yaw: 0.2, release: true } },
    { d: 4.4, key: 'FIRE', cap: 'Sink 3 in a row and you are ON FIRE: +1 on every basket until you miss.', burst: 3 },
    { d: 4.4, key: 'MOVE', cap: 'In the last 30 seconds the hoop moves. Aim where it will be.', move: true, burst: 2, lead: true },
    { d: 3.6, key: '3 PTS', cap: 'In the last 15 seconds every basket is worth 3 points.', flash: ['3-POINT TIME', '#ec3013'], burst: 1, three: true },
    { d: 4.6, key: 'TAP', cap: 'Hard to swipe? Turn on TAP MODE: the meter swings by itself, tap once in the green.', tap: true },
    { d: 3.2, key: 'GO', cap: 'That is it. Your turn: beat Zoran and Hoyt!' },
  ];
  function demoStart() { if (S.mode === 'online') return; S.pass = null; S.turnCard = null; begin('demo'); S.phase = 'run'; S.t = 0; S.meter = { p: 0, dir: 1 }; S.demo = { i: 0, t: 0, fired: {}, finger: null }; S.say = null; push(true); }
  function demoStop() { S.demo = null; S.aim = null; api.quit(); }
  function demoTick(dt) {
    const D = S.demo; D.t += dt; let st = DEMO[D.i];
    if (D.t >= st.d) { D.i++; D.t = 0; D.fired = {}; S.aim = null; D.finger = null; if (D.i >= DEMO.length) { demoStop(); return; } st = DEMO[D.i]; S.practiceMove = !!st.move; if (st.flash) flash(st.flash[0], st.flash[1], 1.3); if (st.tap) S.meter = { p: 0, dir: 1 }; push(true); }
    const t = D.t, L = lane(S.me); D.finger = null; if (!L) return;
    if (st.drag) { const g = st.drag; if (t >= g.at && !D.fired.rel) { const e = smooth(0, 1, (t - g.at) / g.len); S.aim = { p: g.to * e, yaw: (g.yaw || 0) * e }; D.finger = { x: 0.5 + (g.dx || 0) * e, y: 0.8 - 0.3 * g.to * e, down: true };
        if (g.release && e >= 1) { D.fired.rel = 1; const a = S.aim; S.aim = null; L.rack = Math.max(L.rack, 1); shoot(S.me, powerToF(a.p), a.yaw); } }
      if (D.fired.rel && t < g.at + g.len + 0.35) D.finger = { x: 0.5 + (g.dx || 0), y: 0.8 - 0.3 * g.to, down: false }; }
    if (st.burst) { for (let k = 0; k < st.burst; k++) { const at = 0.5 + k * 0.75; if (t >= at && !D.fired['b' + k]) { D.fired['b' + k] = 1; L.rack = Math.max(L.rack, 1); const y = st.lead ? leadYaw(S.me, S.t) : 0; shoot(S.me, 1.015, y); if (st.three) { /* show the 3-point value for the demo basket */ L.demoThree = true; } } if (t >= at - 0.25 && t < at + 0.15) D.finger = { x: 0.5, y: 0.66, down: true, flick: true }; } }
    if (st.tap && S.meter) { const [z0, z1] = greenZone(), p = S.meter.p; if (t > 1.3 && !D.fired.tap && p > z0 + 0.03 && p < z1 - 0.03) { D.fired.tap = 1; D.tapT = t; L.rack = Math.max(L.rack, 1); shoot(S.me, powerToF(p), 0); } if (D.fired.tap && t - D.tapT < 0.35) D.finger = { x: 0.5, y: 0.55, down: true, tap: true }; }
  }

  // ---------- main loop ----------
  const clock = new THREE.Clock(); let raf = 0, now = 0;
  function frame() {
    raf = requestAnimationFrame(frame); const dt = Math.min(clock.getDelta(), 0.05); now += dt;
    // time
    if (S.phase === 'count' || S.phase === 'run') { if (S.mode === 'online' && S.t0) S.t = (Date.now() - S.t0) / 1000; else S.t += dt;
      if (S.phase === 'count') { const c = Math.ceil(-S.t); if (c !== S.lastCount && c > 0) { S.lastCount = c; SND.beep(false); if (c === 3) speak('three'); } if (S.t >= 0) { S.phase = 'run'; S.lastCount = null; SND.beep(true); flash('GO', '#22c55e', 0.6); speak('go'); S.meter = { p: 0, dir: 1 }; } }
      if (S.phase === 'run' && !free()) { const tl = timeLeft();
        if (tl <= HOOPS.moveAt && !S.spoke.move && S.mode !== 'race') { S.spoke.move = 1; flash('HOOP ON THE MOVE', '#38bdf8', 1.3); speak('hoop on the move'); }
        if (tl <= HOOPS.threeAt && !S.spoke.three) { S.spoke.three = 1; flash('3-POINT TIME', '#ec3013', 1.3); speak('three point time'); }
        if (tl <= 10 && !S.spoke.ten) { S.spoke.ten = 1; speak('ten seconds'); }
        if (tl <= 5 && Math.ceil(tl) !== S.lastTick) { S.lastTick = Math.ceil(tl); SND.tick(); }
        if (tl <= 0) endRound(); } }
    if (S.phase === 'buzz') { S.buzzT += dt; if (S.buzzT > 2.6 || (S.buzzT > 0.6 && !balls.some(b => b.on && (b.owner === S.me || S.mode !== 'online')))) { finish(); } }
    // meter (tap mode / keyboard hold)
    if (S.phase === 'run' && S.meter && tapOn()) { const m = S.meter; m.p += m.dir * dt * 1.05; if (m.p > 1.1) { m.p = 1.1; m.dir = -1; } if (m.p < 0) { m.p = 0; m.dir = 1; } dirty = true; }
    if (keys.held) { keys.p += keys.dir * dt * 0.9; if (keys.p > 1.1) { keys.p = 1.1; keys.dir = -1; } if (keys.p < 0) { keys.p = 0; keys.dir = 1; } dirty = true; }
    // CPU + balls
    if (S.phase === 'run') S.lanes.forEach((L, i) => { if (L && L.owner.kind === 'cpu') cpuStep(i, dt); });
    if (S.demo && S.phase === 'run') demoTick(dt);
    const sub = 4, h = dt / sub; for (const b of balls) if (b.on) { for (let k = 0; k < sub && b.on; k++) stepBall(b, h); if (b.on) { b.m.position.copy(b.p); b.m.rotation.x += b.spin.x * dt; b.sh.position.set(b.p.x, rampY(b.p.z) + 0.006, b.p.z); const hgt = b.p.y - rampY(b.p.z); b.sh.material.opacity = 0.32; b.sh.scale.setScalar(clamp(1 - hgt * 0.25, 0.4, 1)); if (b.fire && Math.random() < 0.6) spark(b.p, '#ff6a1a', 1, 0.3, 0.16); else if (b.owner === S.me && !b.scored && b.age < 1.1 && Math.random() < 0.5) spark(b.p, '#fff1c4', 1, 0.05, 0.07); } }
    // hoops move, nets swish, LEDs
    R.lanes.forEach((Ln, i) => { Ln.hoop.position.x = (S.phase === 'run' || S.phase === 'buzz') && lane(i) ? rimOff(S.t) : damp(Ln.hoop.position.x, 0, 4, dt); Ln.netKick = Math.max(0, Ln.netKick - dt * 3); Ln.wob = Math.max(0, (Ln.wob || 0) - dt * 2.2); Ln.hoop.rotation.z = Math.sin(now * 46) * (Ln.wob || 0) * 0.018; Ln.hoop.position.y = Math.sin(now * 52) * (Ln.wob || 0) * 0.01; Ln.net.scale.set(1 - Ln.netKick * 0.15, 1 + Ln.netKick * 0.35, 1 - Ln.netKick * 0.15); Ln.net.position.y = RIM_Y - 0.17 - Ln.netKick * 0.06; drawLed(i); });
    // rack + hand balls
    S.lanes.forEach((L, i) => rackMeshes[i].forEach((m, k) => { m.visible = !!L && k < L.rack - (i === S.me && S.phase === 'run' ? 1 : 0); }));
    rackMeshes.forEach((ms, i) => { if (!lane(i)) ms.forEach((m, k) => m.visible = k < 2); });
    const meL = lane(S.me); hand.visible = S.phase === 'run' && !!meL && meL.rack > 0 && S.camShot === 'play';
    if (hand.visible) { const a = S.aim, p = a ? a.p : 0; hand.position.set(laneX(S.me) + (a ? a.yaw * 0.25 : keys.yaw * 0.25), LAUNCH.y - 0.08 - p * 0.12 + Math.sin(now * 3) * 0.008, LAUNCH.z + 0.08 + p * 0.06); hand.material = meL.fire ? fireM : ballM; }
    // aim guide (FREE SHOOT always, else when AIM GUIDE is on)
    const ga = S.aim || (keys.held ? { p: keys.p, yaw: keys.yaw } : null) || (tapOn() && S.meter ? { p: S.meter.p, yaw: 0 } : null), gOn = hand.visible && (opts.guide || free()) && ga && ga.p > 0.05;
    if (gOn) { const v = idealSpeed(S.me, 0, S.t) * powerToF(ga.p), yw = myYaw(ga.yaw), p0 = launchPos(S.me), vv = V(Math.sin(yw) * v * Math.cos(ANG), v * Math.sin(ANG), -Math.cos(yw) * v * Math.cos(ANG)); guide.forEach((s, k) => { const t = (k + 1) * 0.045; s.position.set(p0.x + vv.x * t, p0.y + vv.y * t - 0.5 * G * t * t, p0.z + vv.z * t); s.visible = s.position.z > RIM_Z - 0.1; }); } else guide.forEach(s => s.visible = false);
    // sparks
    for (const q of sparks) if (q.life > 0) { q.life -= dt * 1.6; q.v.y -= 3 * dt; q.s.position.addScaledVector(q.v, dt); q.s.material.opacity = Math.max(0, q.life); }
    // foxes
    P.visible = S.camShot !== 'play'; P.position.x = laneX(S.me); const near = S.camShot === 'play'; [...regFox, ...netFox].forEach(f => { if (f.userData.laneI != null && lane(f.userData.laneI)) f.visible = !near; });
    for (const f of allFox) { if (!f.visible) continue; const u = f.userData; kit.animFox(f, dt, 0); if (u.shootT > 0) { u.shootT -= dt; const k = Math.sin(clamp(u.shootT / 0.45, 0, 1) * Math.PI); u.P.arms[0].rotation.x = -2.6 * k; u.P.arms[1].rotation.x = -2.6 * k; u.P.body.position.y += k * 0.05; } else if (f !== odessa && !watchers.includes(f)) { u.P.arms[0].rotation.x = -0.9; u.P.arms[1].rotation.x = -0.9; } }
    // audio beacon (AUDIO CUES): a soft tick panned to where the hoop is
    if (opts.audio && S.phase === 'run') { S.beaconT -= dt; if (S.beaconT <= 0) { S.beaconT = 0.7; SND.beacon(clamp(rimOff(S.t) / 0.26, -1, 1), Math.abs(rimOff(S.t)) > 0.01); } }
    // POLISH: music intensity, ambience, bulbs, neon, rims, pop-ups, confetti, dust
    if (S.phase === 'run' && !free()) SND.setIntensity(timeLeft() <= HOOPS.threeAt ? 2 : timeLeft() <= HOOPS.moveAt ? 1 : 0);
    SND.update(dt);
    { const on = Math.floor(now * (S.phase === 'run' && isThree() ? 8 : 4)) % 2; R.bulbs.forEach((m, k) => m.material = (k % 2) === on ? R.bulbA : R.bulbB); }
    R.lanes.forEach((Ln, i) => { const L = lane(i), base = L ? new THREE.Color(L.owner.col) : Ln.neonBase.clone().multiplyScalar(0.35); Ln.neonK = Math.max(0, Ln.neonK - dt * 2.2);
      if (L && L.fire) base.set('#ff6a1a').multiplyScalar(0.75 + 0.25 * Math.sin(now * 23 + i) * Math.sin(now * 7.3)); Ln.neonMat.color.copy(base).lerp(Ln.flashCol || base, Ln.neonK);
      Ln.rimMat.emissiveIntensity = Math.max(0, Ln.rimMat.emissiveIntensity - dt * 2.5); });
    for (const q of pops) if (q.t > 0) { q.t -= dt * 0.9; q.s.position.y += dt * 0.55; q.s.material.opacity = clamp(q.t * 1.6, 0, 1); const sc = q.big * (0.75 + 0.35 * smooth(1, 0.85, q.t)); q.s.scale.set(sc * 2.67, sc, 1); if (q.t <= 0) q.s.visible = false; }
    if (confT > 0) { confT -= dt; confD.forEach((d, k) => { d.v.y -= 2.2 * dt; d.v.multiplyScalar(1 - 1.4 * dt); d.v.x += Math.sin(now * 3 + k) * dt * 0.8; d.p.addScaledVector(d.v, dt); d.r.addScaledVector(d.w, dt); _q.setFromEuler(_e.set(d.r.x, d.r.y, d.r.z)); _m4.compose(d.p, _q, _one); conf.setMatrixAt(k, _m4); }); conf.instanceMatrix.needsUpdate = true; if (confT <= 0) conf.count = 0; }
    { const dp = R.dustP; for (let k = 0; k < dp.length; k += 3) { dp[k] += Math.sin(now * 0.3 + k) * dt * 0.05; dp[k + 1] += dt * 0.03; if (dp[k + 1] > 4.7) dp[k + 1] = Math.abs(dp[k]) < 3.4 && dp[k + 2] < 1.4 ? 3.2 : 0.4; } R.dust.geometry.attributes.position.needsUpdate = true; }
    if (S.flash) { S.flash.t -= dt; if (S.flash.t <= 0) { S.flash = null; dirty = true; } }
    // camera
    const T = camTarget(dt, now), k = S.camShot === 'play' ? 7 : S.camShot === 'done' ? 3.6 : 2.2; camPos.lerp(T.p, 1 - Math.exp(-k * dt)); camLook.lerp(T.l, 1 - Math.exp(-k * dt)); shake = Math.max(0, shake - dt * 3); fovKick = Math.max(0, fovKick - dt * 9); camera.position.copy(camPos); if (shake > 0) camera.position.add(V(rr(-1, 1), rr(-1, 1), 0).multiplyScalar(shake * 0.012)); camera.lookAt(camLook); camera.fov -= fovKick * 0.4; camera.aspect = ST.CW() / ST.CH(); camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    pushT += dt; if (dirty && pushT > 0.08) emit();
  }
  const ro = new ResizeObserver(() => { renderer.setSize(ST.CW(), ST.CH()); push(true); }); ro.observe(container);
  // audio unlocks on the first touch / key (browser rule); music starts then
  const unlock = () => { if (!SND.ok()) return; SND.setMusic(opts.music); SND.startMusic(); removeEventListener('pointerdown', unlock, true); removeEventListener('keydown', unlock, true); };
  addEventListener('pointerdown', unlock, true); addEventListener('keydown', unlock, true);
  frame(); push(true);
  if (/[?&]demo=1/.test(location.search)) setTimeout(demoStart, 600);
  // first wide shot snaps into place
  { const T = camTarget(0, 0); camPos.copy(T.p); camLook.copy(T.l); }

  const api = {
    HOOPS, hud, opts: () => ({ ...opts }),
    setOpt(k, v) { opts[k] = v == null ? !opts[k] : !!v; saveOpts(); if (k === 'music') { SND.ok(); SND.setMusic(opts.music); } if (k === 'audio' && opts.audio) { SND.ok(); speak('audio cues on'); } push(true); },
    playHouse: () => begin('house'), demoStart, demoStop, playPractice: () => { begin('practice'); S.say = null; }, togglePracticeMove: () => { S.practiceMove = !S.practiceMove; push(true); },
    passStart, passGo, passPlayers: () => S.pass,
    quit() { S.demo = null; S.aim = null; SND.music('menu', true); SND.setIntensity(0); SND.ambience(0.35); if (S.mode === 'online') { netLeave(); netToLobby(); NETS.st && (NETS.st.st = 'menu'); } S.phase = 'menu'; S.mode = null; S.camShot = 'menu'; S.done = null; S.turnCard = null; S.pass = null; S.lanes = []; balls.forEach(b => { b.on = false; b.m.visible = b.sh.visible = false; }); drag = null; S.aim = null; [...regFox, ...netFox].forEach(f => { f.visible = false; f.userData.laneI = null; }); S.say = { who: 'ODESSA · BARKEEP', text: pick(LINES.hello) }; push(true); },
    again() { const m = S.done && S.done.mode; if (m === 'pass') passStart(S.pass ? S.pass.players.length : 2); else if (m === 'practice') begin('practice'); else if (m === 'online') netToLobby(); else begin('house', {}); },
    finishPractice() { if (S.mode === 'practice' && S.phase === 'run') { const me = lane(S.me); save.best(SAVE_KEYS.practice, me ? me.made : 0); S.phase = 'buzz'; S.buzzT = 2; } },
    netOpen, netClose, netJoin, netCreate, netReady, netMode, netToLobby, netLeave: () => { netLeave(); if (NETS.st) Object.assign(NETS.st, { st: 'menu', code: '', peers: {}, msg: '', ready: false }); push(true); },
    netCodeIn(v) { if (NETS.st) { NETS.st.codeIn = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); NETS.st.msg = ''; push(true); } },
    // test hooks (console / automated checks)
    _shoot: (f, yaw) => shoot(S.me, f, yaw ?? 0), _state: () => S, _ideal: () => idealSpeed(S.me, 0, S.t),
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); netLeave(); SND.close(); removeEventListener('pointerdown', unlock, true); removeEventListener('keydown', unlock, true); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); renderer.dispose(); renderer.domElement.remove(); },
  };
  return api;
}
