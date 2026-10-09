// 8 GATES — GO CLUB [goClub] · sound. Everything is synthesised with Web Audio (no media files to ship or load).
// Copied from the Backgammon Club's audio and re-voiced for go:
//   SFX   — the sharp "pachi" of a stone on a kaya board, fingers in the stone bowl, captured stones dropping into the lid,
//           a soft wood block for a pass, a small bell for atari, a low tok for ko, a temple bell for the count,
//           button + clock ticks, crowd cheers for online reactions, win / lose stings.
//   MUSIC — "garden": a generative koto (pentatonic in-sen scale) with a breathy shakuhachi and the odd wind chime, slow and sparse.
//           Soft under the menu, a little fuller in play, darker when a group is in atari, fades at the end, ducks while moves are spoken.
// createGoAudio() → { unlock, sfx(name, opt), setSound(on), setMusic(on), mood('menu'|'play'|'tense'|'over'), duck(on), suspend(on) }

const rr = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

export function createGoAudio({ sound = true, music = true } = {}) {
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
    noise(t + 0.004, 0.012, { type: 'highpass', f: 6000, q: 0.5, gain: 0.05 * loud, wet: 0, pan });
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
    stone: o => { const t = T(), l = ((o && o.loud) || 1) * 1.8, pan = (o && o.pan) || 0;   // "pachi": slate on kaya
      noise(t, 0.008, { type: 'highpass', f: 5200, q: 0.7, gain: 0.5 * l, wet: 0.1, pan }); noise(t, 0.03, { f: 3400, q: 8, gain: 0.42 * l, wet: 0.18, pan });
      noise(t, 0.07, { f: 1150, q: 6, gain: 0.2 * l, wet: 0.25, pan }); osc(t, 210, 0.09, { gain: 0.14 * l, f2: 150, wet: 0.1, pan }); osc(t + 0.002, 1720, 0.05, { gain: 0.03 * l, f2: 1650, wet: 0.2, pan }); },
    bowl: o => { const t = T(); for (let i = 0; i < 5; i++) noise(t + i * 0.03 + rr(0, 0.02), 0.014, { f: rr(2600, 4200), q: 5, gain: rr(0.35, 0.55), wet: 0.1, pan: 0.4 }); },
    capture: o => { const t = T(), n = Math.min(8, (o && o.n) || 1); for (let i = 0; i < n; i++) { const tt = t + i * 0.055 + rr(0, 0.02); noise(tt, 0.018, { f: rr(3000, 4500), q: 5, gain: 0.75, wet: 0.15, pan: 0.5 }); osc(tt, rr(380, 460), 0.06, { gain: 0.16, f2: 300, wet: 0.1, pan: 0.5 }); } },
    pass: o => { const t = T(); osc(t, 620, 0.09, { type: 'triangle', gain: 0.12, f2: 600, wet: 0.3 }); osc(t + 0.14, 470, 0.12, { type: 'triangle', gain: 0.1, f2: 455, wet: 0.3 }); noise(t, 0.02, { f: 900, q: 4, gain: 0.08, wet: 0.2 }); },
    atari: o => { const t = T(); bell(t, mtof(86), 0.7, 0.1, 2.76, 1.2); bell(t + 0.16, mtof(86), 0.5, 0.065, 2.76, 1.2); },
    ko: o => { const t = T(); osc(t, 240, 0.16, { type: 'triangle', gain: 0.18, f2: 200, wet: 0.3 }); osc(t + 0.12, 180, 0.2, { type: 'triangle', gain: 0.13, f2: 160, wet: 0.3 }); },
    score: o => { const t = T(); bell(t, mtof(45), 4.5, 0.13, 1.41, 3.2); bell(t, mtof(57), 3.5, 0.05, 2.76, 1.5); },
    mark: o => { const t = T(); noise(t, 0.014, { f: 2400, q: 3, gain: 0.7, wet: 0.05 }); osc(t, 700, 0.05, { gain: 0.1, wet: 0 }); },
    pick: o => { const t = T(); noise(t, 0.016, { f: 3600, q: 3, gain: 0.45, wet: 0.05 }); noise(t, 0.03, { type: 'lowpass', f: 1200, q: 0.7, gain: 0.12, wet: 0 }); osc(t, 1250, 0.035, { gain: 0.05, wet: 0 }); },
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
  // ---------- garden: koto (bright FM pluck), shakuhachi (breathy sine with vibrato), wind chimes; in-sen scale on D ----------
  function koto(t, f, dur, gain, pan = 0) {
    const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); c.type = 'triangle'; c.frequency.setValueAtTime(f * 1.006, t); c.frequency.exponentialRampToValueAtTime(f, t + 0.06); m.frequency.value = f * 3.01;
    mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.4); m.connect(mg); mg.connect(c.frequency);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(1200, t + dur); c.connect(lp); lp.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.003); g.gain.exponentialRampToValueAtTime(gain * 0.3, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out(g, musBus, 0.4, pan); c.start(t); m.start(t); c.stop(t + dur + 0.05); m.stop(t + dur + 0.05); }
  function flute(t, f, dur, gain) {
    const o = ctx.createOscillator(), vib = ctx.createOscillator(), vg = ctx.createGain(), g = ctx.createGain(); o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.25); vib.frequency.value = 5; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.012, t + dur * 0.6); vib.connect(vg); vg.connect(o.frequency); o.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.35); g.gain.setValueAtTime(gain, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur); out(g, musBus, 0.5, -0.25); o.start(t); vib.start(t); o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
    noise(t, dur, { type: 'bandpass', f: f * 2, q: 2.5, gain: gain * 0.35, a: 0.3, bus: musBus, wet: 0.5, pan: -0.25 }); }
  const chime = t => { for (let i = 0; i < 4; i++) bellM(t + i * rr(0.08, 0.2), mtof(pick([86, 88, 91, 93, 98])), 2.2, 0.012); };
  function bellM(t, f, dur, gain) { bell(t, f, dur, gain, 2.76, 0.6, musBus, 0.6); }
  const INSEN = [0, 1, 5, 7, 10, 12, 13, 17, 19, 22, 24];   // D Eb G A C D …
  const PHRASES = [[2, 3, 4, 3, 2], [4, 5, 4, 2, 1, 2], [5, 6, 5, 4], [2, 1, 0], [3, 4, 6, 5, 4, 3], [7, 6, 5, 4, 2]];
  const seq = { running: false, timer: 0, next: 0, step: 0, bar: 0, song: 0, bpm: 66, phrase: null, pi: 0, root: 50 };
  function schedule() {
    if (!ctx) return; const spb = 60 / seq.bpm, eighth = spb / 2, now = T();
    if (seq.next < now - 0.2) seq.next = now + 0.05;
    while (seq.next < now + 0.25) {
      const t = seq.next, st = seq.step, bar = seq.bar, full = moodNow === 'play' || moodNow === 'tense', soft = moodNow === 'menu', root = seq.root + (moodNow === 'tense' ? -2 : 0);
      if (st === 0 && bar % 2 === 0) { koto(t, mtof(root - 12), spb * 6, soft ? 0.04 : 0.05, -0.3); koto(t + 0.02, mtof(root - 5), spb * 5, soft ? 0.025 : 0.035, -0.2); }
      if (st === 0 && Math.random() < (soft ? 0.45 : 0.7)) { seq.phrase = pick(PHRASES); seq.pi = 0; }
      if (seq.phrase && seq.pi < seq.phrase.length && (st % 2 === 0 || Math.random() < 0.25)) { const deg = seq.phrase[seq.pi++], m = root + 12 + INSEN[Math.min(INSEN.length - 1, deg)];
        koto(t, mtof(m), eighth * (seq.pi === seq.phrase.length ? 5 : 2.5), soft ? 0.045 : 0.06, 0.2); if (Math.random() < 0.15) koto(t + eighth * 0.4, mtof(m), eighth * 1.5, 0.025, 0.25); }
      if (full && st === 4 && bar % 4 === 1 && Math.random() < 0.6) flute(t, mtof(root + 12 + pick([0, 5, 7, 12])), spb * rr(3, 5), 0.035);
      if (st === 6 && Math.random() < 0.08) chime(t);
      seq.next += eighth; seq.step++;
      if (seq.step >= 8) { seq.step = 0; seq.bar++; }
    }
  }
  function startMusic() { if (!ctx || seq.running) return; seq.running = true; seq.next = T() + 0.1; seq.timer = setInterval(schedule, 60); schedule(); fadeMusic(); }
  function stopMusic() { seq.running = false; clearInterval(seq.timer); if (ctx) { musBus.gain.cancelScheduledValues(T()); musBus.gain.setTargetAtTime(0, T(), 0.3); } }
  function fadeMusic() { if (!ctx) return; const lvl = !on.music ? 0 : (moodNow === 'over' ? 0.35 : moodNow === 'menu' ? 0.8 : 1.0) * (duckOn ? 0.35 : 1); musBus.gain.cancelScheduledValues(T()); musBus.gain.setTargetAtTime(lvl, T(), 0.6); musFilter.frequency.setTargetAtTime(moodNow === 'tense' ? 2600 : moodNow === 'over' ? 1800 : 5200, T(), 0.8); }

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
