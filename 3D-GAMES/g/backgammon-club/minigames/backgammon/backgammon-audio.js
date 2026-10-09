// 8 GATES — BACKGAMMON CLUB [backgammonClub] · sound. Everything is synthesised with Web Audio (no media files to ship or load).
// Copied from the Checkers Club's audio and re-voiced for backgammon:
//   SFX   — dice rattling in the cup and tumbling onto the board, checkers clicking down on the wood, a hit (knock + whoosh to
//           the bar), entering from the bar, bearing off into the tray, a doubles chime, a "no move" shrug, button + clock ticks,
//           crowd cheers for online reactions, win / gammon / lose stings.
//   MUSIC — "café": a generative oud-and-frame-drum groove (maqsum rhythm, Hijaz scale over a drone, ~92 bpm). Soft under the menu,
//           full in play, darker when a checker is on the bar, fades at game end, ducks while moves are spoken.
// createBackgammonAudio() → { unlock, sfx(name, opt), setSound(on), setMusic(on), mood('menu'|'play'|'tense'|'over'), duck(on), suspend(on) }

const rr = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

export function createBackgammonAudio({ sound = true, music = true } = {}) {
  let ctx = null, master, sfxBus, musBus, musFilter, verb, verbIn, noiseBuf, on = { sound, music }, moodNow = 'menu', duckOn = false, susp = false;
  function build() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
    sfxBus = ctx.createGain(); sfxBus.gain.value = on.sound ? 1 : 0; sfxBus.connect(master);
    musFilter = ctx.createBiquadFilter(); musFilter.type = 'lowpass'; musFilter.frequency.value = 5200; musFilter.Q.value = 0.4; musFilter.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = 0; musBus.connect(musFilter);
    // a small wood-panelled room: generated stereo impulse
    verb = ctx.createConvolver(); const len = Math.floor(ctx.sampleRate * 1.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) { const t = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (i < 220 ? i / 220 : 1); } }
    verb.buffer = ir; verbIn = ctx.createGain(); verbIn.gain.value = 0.22; verbIn.connect(verb); const vOut = ctx.createGain(); vOut.gain.value = 0.55; verb.connect(vOut); vOut.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return true;
  }
  function unlock() { if (!ctx && !build()) return; if (ctx.state === 'suspended' && !susp) ctx.resume(); if (on.music && !seq.running) startMusic(); }
  const T = () => ctx.currentTime;

  // ---------- building blocks ----------
  function env(g, t, a, peak, d, end = 0.0001) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end, t + a + d); }
  function out(node, bus, wet = 0, pan = 0) { let n = node; if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; n.connect(p); n = p; } n.connect(bus); if (wet) { const w = ctx.createGain(); w.gain.value = wet; n.connect(w); w.connect(verbIn); } }
  function noise(t, dur, { type = 'bandpass', f = 2000, q = 1, gain = 0.3, a = 0.001, bus = sfxBus, wet = 0.15, pan = 0, f2 } = {}) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = rr(0.9, 1.1); const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q; const g = ctx.createGain();
    s.connect(fl); fl.connect(g); env(g, t, a, gain, dur); out(g, bus, wet, pan); s.start(t, rr(0, 0.5)); s.stop(t + a + dur + 0.05);
  }
  function osc(t, f, dur, { type = 'sine', gain = 0.2, a = 0.002, f2, bus = sfxBus, wet = 0.2, pan = 0 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); o.connect(g); env(g, t, a, gain, dur); out(g, bus, wet, pan); o.start(t); o.stop(t + a + dur + 0.05);
  }
  function bell(t, f, dur = 1.4, gain = 0.12, ratio = 3.5, index = 2.2, bus = sfxBus, wet = 0.45) {   // FM bell
    const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain(); c.frequency.value = f; m.frequency.value = f * ratio;
    mg.gain.setValueAtTime(f * index, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dur); m.connect(mg); mg.connect(c.frequency); c.connect(g); env(g, t, 0.003, gain, dur); out(g, bus, wet); c.start(t); m.start(t); c.stop(t + dur + 0.1); m.stop(t + dur + 0.1);
  }
  // a wooden piece set down on a wooden board. weight 0 (pawn) … 1 (king)
  function clack(t, weight = 0.5, loud = 1, pan = 0) {
    const f = 2600 - weight * 900 + rr(-120, 120);
    noise(t, 0.035, { f, q: 6, gain: 0.5 * loud, wet: 0.12, pan });
    noise(t, 0.018, { f: f * 1.9, q: 9, gain: 0.22 * loud, wet: 0.05, pan });
    noise(t, 0.06, { type: 'lowpass', f: 900, q: 0.7, gain: 0.25 * loud, wet: 0.08, pan });
    osc(t, 230 - weight * 70, 0.07, { gain: 0.32 * loud, f2: 120, wet: 0.05, pan });   // the board's body
    noise(t + 0.004, 0.012, { type: 'highpass', f: 6000, q: 0.5, gain: 0.05 * loud, wet: 0, pan });   // felt brush
  }
  // a wooden disc slid a little then set down: a soft felt slide, then a flat click with a hollow body
  function disc(t, pitch = 1, loud = 1, pan = 0, slide = true) {
    if (slide) noise(t, 0.07, { type: 'bandpass', f: 1400, f2: 900, q: 0.8, gain: 0.05 * loud, a: 0.03, wet: 0.05, pan });
    const t1 = t + (slide ? 0.05 : 0);
    noise(t1, 0.025, { f: 2100 * pitch, q: 5, gain: 0.48 * loud, wet: 0.12, pan });
    noise(t1, 0.045, { type: 'lowpass', f: 700, q: 0.8, gain: 0.22 * loud, wet: 0.06, pan });
    osc(t1, 260 * pitch, 0.06, { gain: 0.26 * loud, f2: 150 * pitch, wet: 0.05, pan });
  }

  // ---------- SFX ----------
  const SFX = {
    rattle: o => { const t = T(); for (let i = 0; i < 9; i++) { const tt = t + i * 0.045 + rr(0, 0.02); noise(tt, 0.02, { f: rr(2400, 4000), q: 4, gain: rr(0.3, 0.5), wet: 0.08, pan: rr(-0.3, 0.3) }); } noise(t, 0.4, { type: 'bandpass', f: 900, q: 0.8, gain: 0.04, a: 0.1, wet: 0.1 }); },
    dice: o => { const t = T(); [0, 0.11, 0.19, 0.25].forEach((d, i) => { const l = 1 - i * 0.24; noise(t + d, 0.024, { f: 2800 - i * 200, q: 5, gain: 0.6 * l, wet: 0.14, pan: o && o.pan }); osc(t + d, 520 - i * 30, 0.035, { gain: 0.13 * l, f2: 300, wet: 0.05, pan: o && o.pan }); }); },
    doubles: o => { const t = T(); bell(t, mtof(81), 0.9, 0.05, 2.01, 1.1); bell(t + 0.09, mtof(88), 0.9, 0.04, 2.01, 1.1); },
    hit: o => { const t = T(); disc(t, 1.15, 1.2, o && o.pan, false); clack(t + 0.02, 0.6, 0.7, o && o.pan); noise(t + 0.05, 0.35, { type: 'bandpass', f: 1800, f2: 500, q: 1.4, gain: 0.08, a: 0.04, wet: 0.3 }); },
    enter: o => { const t = T(); noise(t, 0.12, { type: 'bandpass', f: 600, f2: 1600, q: 1.2, gain: 0.05, a: 0.04, wet: 0.2 }); disc(t + 0.08, 1.05, 0.9, o && o.pan, false); },
    off: o => { const t = T(); disc(t, 1.3, 1.1, 0.5, false); disc(t + 0.06, 1.4, 0.45, 0.5, false); bell(t + 0.05, mtof(91), 0.5, 0.02, 2.01, 0.8); },
    nomove: o => { const t = T(); osc(t, 330, 0.18, { type: 'triangle', gain: 0.07, f2: 247, wet: 0.2 }); osc(t + 0.2, 247, 0.25, { type: 'triangle', gain: 0.06, f2: 196, wet: 0.2 }); },
    gammon: o => { const t = T(); [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => bell(t + i * 0.09, mtof(m + 12), 1.8, 0.08, 2.0, 1.6)); noise(t + 0.4, 0.8, { type: 'highpass', f: 6000, q: 0.5, gain: 0.05, a: 0.1, wet: 0.5 }); },
    pick: o => { const t = T(); noise(t, 0.016, { f: 3600, q: 3, gain: 0.45, wet: 0.05 }); noise(t, 0.03, { type: 'lowpass', f: 1200, q: 0.7, gain: 0.12, wet: 0 }); osc(t, 1250, 0.035, { gain: 0.05, wet: 0 }); },
    move: o => disc(T(), rr(0.95, 1.05), 1, o && o.pan),
    hop: o => { const n = (o && o.n) || 0, t = T(); disc(t, 1 + n * 0.12, 1.1, o && o.pan, false); clack(t + 0.03, 0.3, 0.5, o && o.pan); noise(t, 0.1, { type: 'lowpass', f: 450, q: 1, gain: 0.18, wet: 0.2 }); },
    tray: o => { const t = T(); disc(t, 1.25, 0.4, 0, false); disc(t + 0.07, 1.3, 0.18, 0, false); },
    crown: o => { const t = T(); disc(t, 1.15, 0.9, 0, false); [0, 4, 7, 12].forEach((s, i) => bell(t + 0.08 + i * 0.07, mtof(79 + s), 1.0, 0.05, 2.01, 1.2)); noise(t + 0.05, 0.5, { type: 'highpass', f: 7000, q: 0.5, gain: 0.05, a: 0.05, wet: 0.5 }); },
    must: o => { const t = T(); bell(t, 987.8, 0.5, 0.05, 1.5, 0.8); bell(t + 0.12, 987.8, 0.5, 0.04, 1.5, 0.8); },
    bad: o => { const t = T(); osc(t, 150, 0.09, { type: 'triangle', gain: 0.16, f2: 110, wet: 0.05 }); osc(t + 0.1, 120, 0.12, { type: 'triangle', gain: 0.12, f2: 90, wet: 0.05 }); },
    ui: o => { const t = T(); noise(t, 0.014, { f: 2800, q: 2, gain: 0.32, wet: 0 }); osc(t, 900, 0.025, { gain: 0.03, wet: 0 }); },
    tick: o => { const t = T(), hi = o && o.hi; noise(t, 0.02, { f: hi ? 4200 : 3000, q: 3, gain: hi ? 0.6 : 0.42, wet: 0.05 }); osc(t, hi ? 1760 : 1320, 0.05, { gain: hi ? 0.06 : 0.035, wet: 0 }); },
    start: o => { const t = T(); noise(t, 0.5, { type: 'bandpass', f: 600, f2: 2400, q: 1.2, gain: 0.07, a: 0.2, wet: 0.4 }); bell(t + 0.35, mtof(72), 1.4, 0.06, 2, 1.3); bell(t + 0.35, mtof(79), 1.4, 0.04, 2, 1.3); },
    win: o => { const t = T(); [60, 64, 67, 72, 76].forEach((m, i) => { bell(t + i * 0.11, mtof(m + 12), 1.6, 0.08, 2.0, 1.6); }); [48, 55, 64, 67].forEach(m => ep(t + 0.55, mtof(m), 2.5, 0.06, sfxBus)); },
    lose: o => { const t = T(); [67, 63, 60, 55].forEach((m, i) => bell(t + i * 0.2, mtof(m), 1.6, 0.06, 1.0, 0.8)); },
    draw: o => { const t = T(); bell(t, mtof(67), 1.5, 0.06, 2, 1); bell(t + 0.25, mtof(67), 1.5, 0.05, 2, 1); },
    clap: o => { const t = T(), n = 14 + Math.floor(rr(0, 10)); for (let i = 0; i < n; i++) { const tt = t + rr(0, 0.9); noise(tt, 0.025, { f: rr(900, 2200), q: 1.2, gain: rr(0.16, 0.34), wet: 0.35, pan: rr(-0.7, 0.7) }); } },
    ooh: o => { const t = T(); for (const [f, p] of [[220, -0.4], [277, 0.1], [330, 0.5]]) vowel(t, f, f * 1.25, 0.7, 0.16, p, [700, 1100]); },
    oof: o => { const t = T(); for (const [f, p] of [[196, -0.3], [233, 0.3]]) vowel(t, f, f * 0.7, 0.5, 0.18, p, [500, 800]); },
  };
  function vowel(t, f1, f2, dur, gain, pan, form) {   // a crowd voice: a saw through two formants
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f1, t); o.frequency.linearRampToValueAtTime(f2, t + dur);
    const sum = ctx.createGain(); for (const ff of form) { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = ff; b.Q.value = 6; o.connect(b); b.connect(sum); }
    sum.connect(g); env(g, t, 0.08, gain, dur); out(g, sfxBus, 0.4, pan); o.start(t); o.stop(t + dur + 0.2);
  }

  // ---------- MUSIC: club lounge trio ----------
  // electric piano voice (FM: ratio 1 body + a bright tine that dies fast)
  function ep(t, f, dur, gain, bus = musBus, pan = 0) {
    const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), tine = ctx.createOscillator(), tg = ctx.createGain(), g = ctx.createGain();
    c.frequency.value = f; m.frequency.value = f; mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.15, t + 0.6); m.connect(mg); mg.connect(c.frequency);
    tine.frequency.value = f * 14.1; tg.gain.setValueAtTime(0.0001, t); tg.gain.exponentialRampToValueAtTime(gain * 0.12, t + 0.002); tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); tine.connect(tg);
    c.connect(g); tg.connect(g); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(gain * 0.4, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out(g, bus, 0.28, pan); for (const n of [c, m, tine]) { n.start(t); n.stop(t + dur + 0.05); }
  }
  function bassNote(t, f, dur, gain) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(280, t + 0.25); o.connect(lp); o2.connect(lp); lp.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(gain * 0.5, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out(g, musBus, 0.08); o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function ride(t, gain, pan = 0.35) {   // metallic: inharmonic squares through a highpass
    const g = ctx.createGain(), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500; hp.connect(g);
    for (const r of [1, 1.342, 1.807, 2.413, 3.031]) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 310 * r; o.connect(hp); o.start(t); o.stop(t + 0.5); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); out(g, musBus, 0.25, pan);
  }
  const brush = (t, d, gain) => noise(t, d, { type: 'bandpass', f: 4500, f2: 3000, q: 0.8, gain, a: d * 0.6, bus: musBus, wet: 0.1, pan: -0.3 });
  const kick = (t, gain) => osc(t, 95, 0.18, { gain, f2: 45, bus: musBus, wet: 0 });
  // ---------- café groove: oud (FM pluck) in Hijaz over a drone, frame drum in maqsum (doum tek - tek doum - tek -) ----------
  function oud(t, f, dur, gain, pan = 0.15) {
    const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); c.type = 'triangle'; c.frequency.value = f; m.frequency.value = f * 2.003;
    mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.25); m.connect(mg); mg.connect(c.frequency);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(3800, t); lp.frequency.exponentialRampToValueAtTime(900, t + dur); c.connect(lp); lp.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(gain * 0.35, t + 0.18); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out(g, musBus, 0.3, pan); c.start(t); m.start(t); c.stop(t + dur + 0.05); m.stop(t + dur + 0.05);
  }
  function drone(t, f, dur, gain) { const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 1.5; lp.type = 'lowpass'; lp.frequency.value = 520; o.connect(lp); o2.connect(lp); lp.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur); out(g, musBus, 0.25, -0.2); o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); }
  const doum = (t, gain) => { osc(t, 92, 0.32, { gain, f2: 58, bus: musBus, wet: 0.1, pan: -0.1 }); noise(t, 0.05, { type: 'lowpass', f: 300, q: 0.8, gain: gain * 0.6, bus: musBus, wet: 0.1 }); };
  const tek = (t, gain, pan = 0.2) => { noise(t, 0.035, { f: 2600, q: 2.5, gain, bus: musBus, wet: 0.15, pan }); osc(t, 520, 0.03, { gain: gain * 0.3, f2: 380, bus: musBus, wet: 0, pan }); };
  const riq = (t, gain) => noise(t, 0.07, { type: 'highpass', f: 7000, q: 0.6, gain, bus: musBus, wet: 0.2, pan: 0.4 });
  // D Hijaz: D Eb F# G A Bb C D (MIDI from D3 = 50)
  const HIJAZ = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16, 17, 19];
  const MOTIFS = [[0, 1, 2, 1, 0], [4, 3, 2, 1, 2], [4, 5, 4, 3, 2, 1], [7, 6, 5, 4], [2, 3, 4, 2, 1, 0], [4, 4, 5, 4, 2]];
  const seq = { running: false, timer: 0, next: 0, step: 0, bar: 0, song: 0, bpm: 92, motif: null, mi: 0, root: 50 };
  // maqsum in 8 eighths: doum on 1 and 4½(=step 3), tek on 2(step 2), 3½? use the common pattern D T - T D - T -
  const MAQSUM = ['D', 'T', '-', 'T', 'D', '-', 'T', '-'];
  function schedule() {
    if (!ctx) return; const spb = 60 / seq.bpm, eighth = spb / 2, now = T();
    if (seq.next < now - 0.2) seq.next = now + 0.05;
    while (seq.next < now + 0.25) {
      const t = seq.next, st = seq.step, bar = seq.bar, full = moodNow === 'play' || moodNow === 'tense', soft = moodNow === 'menu', root = seq.root + (bar % 8 >= 6 ? 5 : 0);
      const hit = MAQSUM[st];
      if (hit === 'D') doum(t, soft ? 0.1 : 0.14); else if (hit === 'T') tek(t, soft ? 0.045 : 0.075);
      if (full && hit === '-' && Math.random() < 0.5) tek(t, 0.03, -0.3);
      if (full && st % 2 === 1 && Math.random() < 0.25) riq(t, 0.02);
      if (st === 0 && bar % 2 === 0) drone(t, mtof(root - 12), spb * 8.2, soft ? 0.035 : 0.05);
      // oud: a motif every bar or two, from the Hijaz scale, with little ornaments
      if (st === 0 && (bar % 2 === 0 || full) && Math.random() < (soft ? 0.5 : 0.8)) { seq.motif = pick(MOTIFS); seq.mi = 0; }
      if (seq.motif && seq.mi < seq.motif.length && (st % 2 === 0 || Math.random() < 0.35)) { const deg = seq.motif[seq.mi++], m = root + 12 + HIJAZ[Math.min(HIJAZ.length - 1, deg)];
        oud(t, mtof(m), eighth * (seq.mi === seq.motif.length ? 3.5 : 1.6), soft ? 0.05 : 0.07); if (Math.random() < 0.18) oud(t + eighth * 0.5, mtof(m + 1), eighth * 0.5, 0.03); }
      if (st === 4 && Math.random() < 0.4) oud(t, mtof(root), eighth * 1.2, soft ? 0.04 : 0.055, -0.2);   // a low answer
      seq.next += eighth; seq.step++;
      if (seq.step >= 8) { seq.step = 0; seq.bar++; }
    }
  }
  function startMusic() { if (!ctx || seq.running) return; seq.running = true; seq.next = T() + 0.1; seq.timer = setInterval(schedule, 60); schedule(); fadeMusic(); }
  function stopMusic() { seq.running = false; clearInterval(seq.timer); if (ctx) { musBus.gain.cancelScheduledValues(T()); musBus.gain.setTargetAtTime(0, T(), 0.3); } }
  function fadeMusic() { if (!ctx) return; const lvl = !on.music ? 0 : (moodNow === 'over' ? 0.14 : moodNow === 'menu' ? 0.32 : 0.4) * (duckOn ? 0.35 : 1); musBus.gain.cancelScheduledValues(T()); musBus.gain.setTargetAtTime(lvl, T(), 0.6); musFilter.frequency.setTargetAtTime(moodNow === 'tense' ? 2600 : moodNow === 'over' ? 1800 : 5200, T(), 0.8); }

  return {
    unlock,
    sfx(name, o) { if (!on.sound || !ctx || ctx.state !== 'running') return; const f = SFX[name]; if (f) try { f(o); } catch (e) {} },
    setSound(v) { on.sound = !!v; if (ctx) sfxBus.gain.setTargetAtTime(v ? 1 : 0, T(), 0.05); },
    setMusic(v) { on.music = !!v; if (!ctx) return; if (v) { if (!seq.running) startMusic(); else fadeMusic(); } else stopMusic(); },
    mood(m) { if (m === moodNow) return; moodNow = m; fadeMusic(); },
    duck(v) { if (duckOn === !!v) return; duckOn = !!v; fadeMusic(); },
    suspend(v) { susp = !!v; if (!ctx) return; if (v) ctx.suspend(); else ctx.resume(); },
    get ready() { return !!ctx && ctx.state === 'running'; },
  };
}
