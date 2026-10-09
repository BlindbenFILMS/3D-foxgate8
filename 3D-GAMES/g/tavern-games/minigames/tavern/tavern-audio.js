// 8 GATES — TAVERN AUDIO. Synthesised sound for any tavern game: no audio files, nothing to download, phone friendly.
//   const T = tavernAudio(audio, { world })   // audio = the shared Ambience from village-game.js (createStage gives you one)
//   T.ensure()            call after a tap (audio.init()) — builds the buses, the room tone and the music
//   T.click(v)  T.cushion(v)  T.pot(kind)  T.rattle()  T.strike(p)  T.chalk()  T.roll(totalSpeed)    pool
//   T.rod(power)  T.bead()                                                                            foosball
//   T.tok('table'|'paddle'|'net'|'floor', v)                                                         ping-pong
//   T.clack(v)  T.bang(v)  T.goal(mine)  T.air(on)  T.beep(hi)  T.serve()  T.glide(sp)  T.post()  T.ooh()                             air hockey
//   T.coins(n)  T.cheer(k)  T.groan()  T.step()  T.tap()  T.clink()  T.door()                          room + UI
//   T.setMusic(on) · T.musicOn · T.duck(0..1) · T.update(dt) · T.suspend() · T.resume() · T.dispose()
// Music: a small jazz trio (walking bass, soft electric piano, brushes, a vibraphone line now and then), a different
// tune and tempo per world. It ducks while a frame is on and under dialogue. Music on/off is remembered ('8gates.tavern.music').
const MKEY = '8gates.tavern.music';
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
// [root midi, chord intervals] per bar
const TUNES = {
  luxor: { bpm: 86, bars: [[57, [0, 3, 7, 10, 14]], [62, [0, 4, 10, 14, 21]], [55, [0, 4, 7, 11, 14]], [60, [0, 4, 7, 11, 14]], [54, [0, 3, 6, 10]], [59, [0, 4, 10, 13]], [52, [0, 3, 7, 10, 14]], [52, [0, 4, 10, 15]]], mel: [0, 2, 3, 5, 7, 8, 10] },
  meru: { bpm: 96, bars: [[60, [0, 4, 7, 11, 14]], [57, [0, 3, 7, 10]], [62, [0, 3, 7, 10, 14]], [55, [0, 4, 10, 14]], [64, [0, 3, 7, 10]], [57, [0, 4, 10, 13]], [62, [0, 3, 7, 10]], [55, [0, 4, 10, 14]]], mel: [0, 2, 4, 5, 7, 9, 11] },
  gaya: { bpm: 80, bars: [[53, [0, 4, 7, 11, 14]], [58, [0, 4, 7, 11]], [50, [0, 3, 7, 10, 14]], [55, [0, 4, 10, 14]], [53, [0, 4, 7, 11]], [58, [0, 4, 7, 11, 14]], [57, [0, 3, 7, 10]], [52, [0, 4, 10, 13]]], mel: [0, 2, 4, 5, 7, 9, 11] },
  kufa: { bpm: 90, bars: [[57, [0, 3, 7, 10]], [58, [0, 4, 7, 11]], [57, [0, 3, 7, 10]], [52, [0, 4, 7, 10, 13]], [55, [0, 4, 7, 10]], [53, [0, 4, 7, 11]], [58, [0, 4, 7, 11]], [52, [0, 4, 7, 10, 13]]], mel: [0, 1, 4, 5, 7, 8, 10] },
  nebo: { bpm: 78, bars: [[55, [0, 4, 7, 14]], [60, [0, 4, 7, 11]], [52, [0, 3, 7, 10]], [57, [0, 3, 7, 10, 14]], [55, [0, 4, 7, 14]], [60, [0, 4, 7, 11]], [62, [0, 4, 7, 10]], [62, [0, 4, 7, 10, 14]]], mel: [0, 2, 4, 7, 9] },
  zion: { bpm: 100, bars: [[58, [0, 4, 7, 11, 14]], [55, [0, 3, 7, 10]], [60, [0, 3, 7, 10, 14]], [53, [0, 4, 10, 14]], [58, [0, 4, 7, 11]], [55, [0, 4, 10, 13]], [60, [0, 3, 7, 10]], [53, [0, 4, 10, 14]]], mel: [0, 2, 4, 5, 7, 9, 11] },
};

export function tavernAudio(audio, { world = 'luxor', bpmMul = 1 } = {}) {   // bpmMul > 1 = a livelier take on the same tune (air hockey uses 1.14)
  const tune0 = TUNES[world] || TUNES.luxor, tune = { ...tune0, bpm: tune0.bpm * bpmMul };
  let bus = null, musBus = null, roomBus = null, rollG = null, rollF = null, airG = null, airOn = false, glideG = null, glideF = null, built = false, ctx = null, noise = null;
  let musicOn = true; try { musicOn = localStorage.getItem(MKEY) !== 'off'; } catch (e) {}
  let duckK = 0, musLevel = 1.5, clinkT = 4, nextT = 0, step8 = 0, iv = 0, seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const live = () => built && ctx && ctx.state !== 'closed' && !audio.muted;
  function ensure() {
    try { audio.init && audio.init(); } catch (e) {}
    ctx = audio.ctx; if (!ctx || built) return; built = true; noise = audio.noise;
    try { if (audio.wind) audio.wind.gain.setTargetAtTime(0.0, ctx.currentTime, 0.3); } catch (e) {}
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2; comp.connect(audio.master);
    bus = ctx.createGain(); bus.gain.value = 2.6; bus.connect(comp);
    // a touch of room: short feedback delay so clicks sound like a wooden hall, not a void
    const dl = ctx.createDelay(0.2), fb = ctx.createGain(), wet = ctx.createGain(), lp = ctx.createBiquadFilter(); dl.delayTime.value = 0.045; fb.gain.value = 0.28; wet.gain.value = 0.22; lp.type = 'lowpass'; lp.frequency.value = 2600;
    bus.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(comp);
    musBus = ctx.createGain(); musBus.gain.value = musicOn ? musLevel : 0; musBus.connect(comp);
    roomBus = ctx.createGain(); roomBus.gain.value = 1.6; roomBus.connect(comp);
    // rolling felt rumble: one looped noise, gain follows how fast the balls are going
    { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; rollF = ctx.createBiquadFilter(); rollF.type = 'lowpass'; rollF.frequency.value = 260; rollG = ctx.createGain(); rollG.gain.value = 0; s.connect(rollF); rollF.connect(rollG); rollG.connect(bus); s.start(); }
    // the air-hockey table's fan: a bright hiss through the holes + a low motor hum, faded in by T.air(true)
    { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.playbackRate.value = 1.3; const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 5200; hp.Q.value = 0.5; airG = ctx.createGain(); airG.gain.value = 0; s.connect(hp); hp.connect(airG); airG.connect(bus); s.start();
      const hum = ctx.createOscillator(), hg = ctx.createGain(); hum.type = 'sawtooth'; hum.frequency.value = 98; const hl = ctx.createBiquadFilter(); hl.type = 'lowpass'; hl.frequency.value = 240; hg.gain.value = 0.06; hum.connect(hl); hl.connect(hg); hg.connect(airG); hum.start(); }
    // the puck gliding on the air cushion: a thin hiss that rises with its speed
    { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; glideF = ctx.createBiquadFilter(); glideF.type = 'bandpass'; glideF.frequency.value = 2400; glideF.Q.value = 0.9; glideG = ctx.createGain(); glideG.gain.value = 0; s.connect(glideF); glideF.connect(glideG); glideG.connect(bus); s.start(); }
    // the tavern: two murmur bands that swell and fall like a room full of foxes talking
    for (const [f, q, g0, rate] of [[420, 0.9, 0.035, 0.13], [880, 1.2, 0.022, 0.21], [1500, 1.6, 0.010, 0.31]]) { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.playbackRate.value = 0.7 + rnd() * 0.3; const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const g = ctx.createGain(); g.gain.value = g0; const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = rate; lg.gain.value = g0 * 0.7; lfo.connect(lg); lg.connect(g.gain); lfo.start(); s.connect(b); b.connect(g); g.connect(roomBus); s.start(0, rnd()); }
    nextT = ctx.currentTime + 0.2; iv = setInterval(schedule, 25);
    document.addEventListener('visibilitychange', onVis);
  }
  const onVis = () => { if (!ctx) return; if (document.hidden) ctx.suspend && ctx.suspend(); else ctx.resume && ctx.resume(); };
  // ---------- building blocks ----------
  function nz(t, dur, f, q, vol, type = 'bandpass', dest = bus, att = 0.002) { const s = ctx.createBufferSource(); s.buffer = noise; const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(b); b.connect(g); g.connect(dest); s.start(t, rnd() * 1.6); s.stop(t + dur + 0.05); }
  function osc(t, f, dur, vol, type = 'sine', f2 = 0, dest = bus, att = 0.002) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05); }
  const now = () => ctx.currentTime;
  // ---------- pool ----------
  let lastClick = 0;
  function click(v) { if (!live()) return; const t = now(); if (t - lastClick < 0.012) return; lastClick = t; const k = Math.min(1, v); // phenolic balls: a bright tick with a short ring
    osc(t, 2900 + rnd() * 700, 0.045, 0.05 + k * 0.32, 'sine'); osc(t, 5200 + rnd() * 600, 0.02, 0.02 + k * 0.1, 'sine'); nz(t, 0.025, 4200, 1.4, 0.03 + k * 0.22, 'bandpass'); }
  function cushion(v) { if (!live()) return; const t = now(), k = Math.min(1, v); nz(t, 0.11, 520, 0.8, 0.04 + k * 0.3, 'lowpass'); osc(t, 150, 0.09, 0.03 + k * 0.18, 'sine', 70); }
  function pot(kind) { if (!live()) return; const t = now(); // into the jaw, down through the pocket, a knock in the return
    nz(t, 0.06, 900, 0.9, 0.25, 'bandpass'); osc(t, 110, 0.18, 0.28, 'sine', 55);
    [0.09, 0.17, 0.23].forEach((d, i) => { osc(t + d, 620 - i * 120, 0.05, 0.12 - i * 0.03, 'triangle'); nz(t + d, 0.03, 1800, 2, 0.07 - i * 0.015); });
    osc(t + 0.32, 85, 0.22, 0.18, 'sine', 60); if (kind === 'black') osc(t + 0.05, 220, 0.5, 0.05, 'triangle'); }
  function rattle() { if (!live()) return; const t = now(); for (let i = 0; i < 3; i++) { nz(t + i * 0.035, 0.03, 1600 + i * 300, 3, 0.18 - i * 0.04); osc(t + i * 0.035, 700 - i * 90, 0.04, 0.08, 'square'); } }
  function strike(p) { if (!live()) return; const t = now(), k = Math.min(1, p); // leather tip on phenolic + the ash cue
    nz(t, 0.02, 3800, 1.2, 0.1 + k * 0.35, 'highpass'); osc(t, 1650, 0.03, 0.05 + k * 0.2, 'sine'); osc(t, 320, 0.06, 0.04 + k * 0.12, 'triangle', 240); }
  function chalk() { if (!live()) return; const t = now(); for (let i = 0; i < 3; i++) nz(t + i * 0.09, 0.07, 5200 + rnd() * 1500, 6, 0.05, 'bandpass', bus, 0.02); }
  function roll(sp) { if (!rollG) return; const t = now(), g = live() ? Math.min(0.16, sp * 0.045) : 0; rollG.gain.setTargetAtTime(g, t, 0.05); rollF.frequency.setTargetAtTime(180 + Math.min(500, sp * 110), t, 0.08); }
  // ---------- air hockey ----------
  let lastClack = 0;
  function clack(v) { if (!live()) return; const t = now(); if (t - lastClack < 0.03) return; lastClack = t; const k = Math.min(1, v); // hard plastic mallet on a light puck: a hollow knock + a crack on the big ones
    osc(t, 980 + rnd() * 160, 0.06, 0.08 + k * 0.32, 'triangle', 620); osc(t, 2300 + rnd() * 300, 0.03, 0.03 + k * 0.14, 'sine'); nz(t, 0.035, 3000, 1.1, 0.05 + k * 0.3, 'bandpass'); if (k > 0.65) nz(t, 0.05, 6500, 0.7, 0.2 * k, 'highpass'); }
  let lastBang = 0;
  function bang(v) { if (!live()) return; const t = now(); if (t - lastBang < 0.025) return; lastBang = t; const k = Math.min(1, v); // the rail: a plastic slap with a woody body under it
    nz(t, 0.06, 1500, 1.4, 0.05 + k * 0.28, 'bandpass'); osc(t, 260 + rnd() * 40, 0.08, 0.04 + k * 0.2, 'sine', 140); osc(t, 1700, 0.02, 0.02 + k * 0.08, 'square'); }
  function goal(mine) { if (!live()) return; const t = now(); // into the slot, down the chute, then the buzzer
    nz(t, 0.05, 1100, 1, 0.3, 'bandpass'); osc(t, 180, 0.12, 0.25, 'sine', 90); [0.08, 0.15, 0.21, 0.26].forEach((d, i) => { osc(t + d, 900 - i * 140, 0.04, 0.12 - i * 0.02, 'triangle'); nz(t + d, 0.025, 2400, 2, 0.06); }); osc(t + 0.34, 70, 0.25, 0.22, 'sine', 50);
    const b = ctx.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = mine ? 2200 : 1400; b.connect(bus); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + 0.3); g.gain.linearRampToValueAtTime(mine ? 0.13 : 0.09, t + 0.34); g.gain.setValueAtTime(mine ? 0.13 : 0.09, t + 0.95); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1); g.connect(b);
    for (const f of mine ? [233, 294, 349] : [196, 208]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(g); o.start(t + 0.3); o.stop(t + 1.15); } }
  function glide(sp) { if (!glideG) return; const t = now(), g = live() ? Math.min(0.07, sp * 0.012) : 0; glideG.gain.setTargetAtTime(g, t, 0.04); glideF.frequency.setTargetAtTime(1800 + Math.min(2600, sp * 420), t, 0.06); }
  function post() { if (!live()) return; const t = now(); osc(t, 1480, 0.5, 0.09, 'sine'); osc(t, 2210, 0.35, 0.05, 'sine'); osc(t, 3970, 0.18, 0.03, 'sine'); nz(t, 0.03, 4000, 1.5, 0.12); }
  function ooh() { if (!live()) return; const t = now(); for (const f of [420, 640]) { const s = ctx.createBufferSource(); s.buffer = noise; const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.Q.value = 4; b.frequency.setValueAtTime(f * 0.8, t); b.frequency.linearRampToValueAtTime(f * 1.25, t + 0.5); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.11, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9); s.connect(b); b.connect(g); g.connect(roomBus); s.start(t, rnd()); s.stop(t + 1); } }
  // ---------- ping-pong ----------
  let lastTok = 0;
  function tok(kind, v = 0.5) { if (!live()) return; const t = now(); if (t - lastTok < 0.02) return; lastTok = t; const k = Math.min(1, v);
    if (kind === 'table') { osc(t, 1650 + rnd() * 120, 0.07, 0.1 + k * 0.22, 'sine', 1200); nz(t, 0.02, 3800, 1.6, 0.05 + k * 0.12); osc(t, 420, 0.05, 0.05, 'triangle'); }   // hollow celluloid on board
    else if (kind === 'paddle') { osc(t, 980 + rnd() * 80, 0.05, 0.12 + k * 0.25, 'triangle', 700); nz(t, 0.03, 2200, 1.0, 0.06 + k * 0.3); if (k > 0.7) nz(t, 0.04, 6000, 0.8, 0.18 * k, 'highpass'); }   // rubber + wood
    else if (kind === 'net') { nz(t, 0.08, 700, 0.8, 0.12, 'lowpass'); osc(t, 260, 0.08, 0.06, 'sine', 180); }
    else { osc(t, 900 + rnd() * 100, 0.06, 0.08 * (0.4 + k), 'sine', 600); nz(t, 0.02, 2600, 1.4, 0.04); } }   // floor
  // ---------- foosball ----------
  function rod(p = 0.6) { if (!live()) return; const t = now(), k = Math.min(1, p); // the rod spinning in its bearings + a clunk at the end of the swing
    const s = ctx.createBufferSource(); s.buffer = noise; const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.Q.value = 3; b.frequency.setValueAtTime(900, t); b.frequency.exponentialRampToValueAtTime(2600 + k * 1600, t + 0.12); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05 + k * 0.08, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); s.connect(b); b.connect(g); g.connect(bus); s.start(t, rnd()); s.stop(t + 0.2);
    osc(t + 0.14, 160, 0.06, 0.05 + k * 0.05, 'sine', 90); }
  function bead() { if (!live()) return; const t = now(); for (let i = 0; i < 2; i++) { osc(t + i * 0.05, 2100 - i * 300, 0.06, 0.06, 'triangle'); nz(t + i * 0.05, 0.02, 3000, 2, 0.05); } }
  function air(on) { airOn = !!on; if (!airG || !ctx) return; airG.gain.setTargetAtTime(live() && airOn ? 0.075 : 0, now(), on ? 0.25 : 0.6); }
  function beep(hi) { if (!live()) return; const t = now(); osc(t, hi ? 1760 : 1320, hi ? 0.22 : 0.1, 0.06, 'square'); }
  function serve() { if (!live()) return; const t = now(); osc(t, 520, 0.06, 0.06, 'triangle', 880); nz(t, 0.04, 2600, 1.5, 0.06); }
  // ---------- room + UI ----------
  function coins(n = 5) { if (!live()) return; const t = now(); for (let i = 0; i < Math.min(12, n); i++) { const d = i * 0.06 + rnd() * 0.03; osc(t + d, 2400 + rnd() * 900, 0.18, 0.06, 'sine'); osc(t + d, 3600 + rnd() * 900, 0.1, 0.03, 'sine'); } }
  function cheer(k = 1) { if (!live()) return; const t = now(); for (const [f, d] of [[700, 0], [1150, 0.05], [1800, 0.1], [2600, 0.16]]) { const s = ctx.createBufferSource(); s.buffer = noise; const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 2.2; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + d); g.gain.linearRampToValueAtTime(0.09 * k, t + d + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.4); const tr = ctx.createOscillator(), tg = ctx.createGain(); tr.frequency.value = 7 + rnd() * 5; tg.gain.value = 0.04 * k; tr.connect(tg); tg.connect(g.gain); tr.start(t); tr.stop(t + 1.6); s.connect(b); b.connect(g); g.connect(roomBus); s.start(t + d, rnd()); s.stop(t + d + 1.5); }
    for (let i = 0; i < 6; i++) nz(t + 0.1 + rnd() * 0.8, 0.03, 2000 + rnd() * 1500, 2, 0.06, 'bandpass', roomBus); }   // claps
  function groan() { if (!live()) return; const t = now(); for (const f of [300, 520]) { const s = ctx.createBufferSource(); s.buffer = noise; const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.Q.value = 3; b.frequency.setValueAtTime(f * 1.4, t); b.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.9); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.1, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0); s.connect(b); b.connect(g); g.connect(roomBus); s.start(t, rnd()); s.stop(t + 1.1); } }
  let stepAlt = 0; function step() { if (!live()) return; const t = now(); stepAlt ^= 1; nz(t, 0.07, 700 + stepAlt * 120, 0.7, 0.09, 'lowpass'); osc(t, 120 + stepAlt * 15, 0.05, 0.05, 'sine'); }
  function tap() { if (!live()) return; const t = now(); osc(t, 1200, 0.03, 0.05, 'triangle'); }
  function clink() { if (!live()) return; const t = now(), f = 2200 + rnd() * 1400; osc(t, f, 0.35, 0.025, 'sine', 0, roomBus); osc(t, f * 2.71, 0.2, 0.012, 'sine', 0, roomBus); if (rnd() < 0.5) { osc(t + 0.08, f * 1.13, 0.3, 0.02, 'sine', 0, roomBus); } }
  function door() { if (!live()) return; const t = now(); osc(t, 1318, 0.6, 0.05, 'sine'); osc(t + 0.12, 1046, 0.7, 0.05, 'sine'); }
  // ---------- music ----------
  const BAR = () => 60 / tune.bpm * 4;
  function playStep(s, t) { const beat = 60 / tune.bpm, bar = Math.floor(s / 8) % tune.bars.length, e = s % 8, [root, iv8] = tune.bars[bar], nextRoot = tune.bars[(bar + 1) % tune.bars.length][0], M = musBus;
    // brushes: a swish on every beat, a slap on 2 and 4; ride on the swing
    if (e % 2 === 0) nz(t, beat * 0.9, 2600, 0.5, 0.025, 'bandpass', M, beat * 0.35);
    if (e === 2 || e === 6) nz(t, 0.09, 1800, 0.8, 0.05, 'bandpass', M);
    if (e === 0 || e === 3 || e === 4 || e === 7) nz(t, 0.22, 7500, 0.7, e === 0 || e === 4 ? 0.022 : 0.014, 'highpass', M);
    if ((e === 0 && rnd() < 0.8) || (e === 5 && rnd() < 0.25)) osc(t, 95, 0.22, 0.07, 'sine', 48, M);
    // walking bass on the beat: root, chord tone, chord tone, chromatic approach into the next bar
    if (e % 2 === 0) { const b = e / 2, n = b === 0 ? root - 12 : b === 3 ? nextRoot - 12 + (rnd() < 0.5 ? 1 : -1) : root - 12 + iv8[Math.min(iv8.length - 1, b === 1 ? 2 : 1)] + (b === 2 && rnd() < 0.3 ? 12 : 0);
      const f = midi(n - 12 + 12); osc(t, f, beat * 0.9, 0.16, 'triangle', 0, M, 0.006); osc(t, f * 2, beat * 0.4, 0.03, 'sine', 0, M, 0.004); }
    // piano comps: the Charleston (1 and the and-of-2), sometimes anticipated
    if (e === 0 || e === 3 || (e === 7 && rnd() < 0.3)) { const vol = e === 0 ? 0.03 : 0.024; iv8.slice(1).forEach((iv, i) => { const f = midi(root + iv + (i > 2 ? -12 : 0)); osc(t + i * 0.008, f, beat * 1.6, vol, 'sine', 0, M, 0.01); osc(t + i * 0.008, f * 2, beat * 0.5, vol * 0.25, 'sine', 0, M, 0.004); }); }
    // a vibraphone line every other bar
    if (bar % 2 === 1 && (e === 1 || e === 3 || e === 4 || e === 6) && rnd() < 0.55) { const deg = tune.mel[Math.floor(rnd() * tune.mel.length)], f = midi(root % 12 + 72 + deg); osc(t, f, beat * 2.2, 0.035, 'sine', 0, M, 0.004); osc(t, f * 4, beat * 0.6, 0.006, 'sine', 0, M, 0.003); } }
  function schedule() { if (!ctx || ctx.state !== 'running') return; const beat = 60 / tune.bpm;
    while (nextT < ctx.currentTime + 0.18) { const e = step8 % 8, swing = e % 2 === 1 ? beat * (2 / 3) - beat / 2 : 0; if (musicOn && !audio.muted) playStep(step8, nextT + swing); step8++; nextT += beat / 2; }
    // music sits under the game: ducked while a frame is on or someone is talking
    if (musBus) musBus.gain.setTargetAtTime(musicOn ? musLevel * (1 - duckK * 0.45) : 0, ctx.currentTime, 0.4); }
  function update(dt) { if (!live()) return; clinkT -= dt; if (clinkT < 0) { clinkT = 3 + rnd() * 7; clink(); } }
  return { ensure, click, cushion, pot, rattle, strike, chalk, roll, clack, bang, goal, air, beep, serve, glide, post, ooh, tok, rod, bead, coins, cheer, groan, step, tap, clink, door, update,
    get musicOn() { return musicOn; }, setMusic(on) { musicOn = !!on; try { localStorage.setItem(MKEY, musicOn ? 'on' : 'off'); } catch (e) {} if (musBus && ctx) musBus.gain.setTargetAtTime(musicOn ? musLevel : 0, ctx.currentTime, 0.2); },
    duck(k) { duckK = Math.max(0, Math.min(1, k)); }, suspend() { ctx && ctx.suspend && ctx.suspend(); }, resume() { ctx && ctx.resume && ctx.resume(); },
    dispose() { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); } };
}
