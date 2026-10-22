/* WASHING UP: WebAudio synth sound effects + a little kitchen tune. No audio files. */

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

export function createAudio(opts = {}) {
  let ctx = null, out = null, sfx = null, mus = null, nbuf = null;
  let sound = opts.sound !== false, music = !!opts.music;
  let rubSrc = null, rubF = null, rubG = null;
  let musTimer = 0, step = 0, nextT = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; return null; }
    out = ctx.createGain(); out.gain.value = 0.75; out.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = sound ? 1 : 0; sfx.connect(out);
    mus = ctx.createGain(); mus.gain.value = music ? 0.15 : 0; mus.connect(out);
    const len = ctx.sampleRate;
    nbuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = nbuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (music) startMusic();
    return ctx;
  }

  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone(f, dur, o = {}) {
    if (!ctx) return;
    const bus = o.bus || sfx;
    if (bus === sfx && !sound) return;
    const t = (o.at || ctx.currentTime) + (o.delay || 0);
    const os = ctx.createOscillator();
    os.type = o.type || 'sine';
    os.frequency.setValueAtTime(f, t);
    if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const g = ctx.createGain();
    env(g, t, o.a || 0.005, o.vol || 0.22, dur);
    os.connect(g); g.connect(bus);
    os.start(t); os.stop(t + dur + 0.05);
  }

  function noise(dur, o = {}) {
    if (!ctx) return;
    const bus = o.bus || sfx;
    if (bus === sfx && !sound) return;
    const t = (o.at || ctx.currentTime) + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = nbuf;
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1200, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    env(g, t, o.a || 0.004, o.vol || 0.25, dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  /* continuous sponge squeak: gritty and low over dirt, bright swish over clean china */
  function setRub(level, gritty) {
    if (!ctx) return;
    if (!rubSrc) {
      rubSrc = ctx.createBufferSource(); rubSrc.buffer = nbuf; rubSrc.loop = true;
      rubF = ctx.createBiquadFilter(); rubF.type = 'bandpass'; rubF.Q.value = 4;
      rubG = ctx.createGain(); rubG.gain.value = 0;
      rubSrc.connect(rubF); rubF.connect(rubG); rubG.connect(sfx);
      rubSrc.start();
    }
    const t = ctx.currentTime;
    const lv = Math.max(0, Math.min(1, level));
    rubG.gain.setTargetAtTime(sound ? lv * 0.32 : 0, t, 0.03);
    rubF.frequency.setTargetAtTime(gritty ? 700 + lv * 600 : 2800 + lv * 1200, t, 0.04);
    rubF.Q.setTargetAtTime(gritty ? 2.2 : 8, t, 0.05);
  }

  const S = {
    unlock: init,
    setRub,
    spotGone(n = 0) { tone(mtof(79 + (n % 5) * 2), 0.12, { type: 'triangle', vol: 0.16 }); },
    clink() { tone(2400, 0.25, { vol: 0.12 }); tone(3150, 0.3, { vol: 0.08, delay: 0.01 }); tone(1800, 0.2, { vol: 0.06, delay: 0.02 }); },
    sparkle() { [84, 88, 91, 96].forEach((m, i) => tone(mtof(m), 0.14, { type: 'triangle', vol: 0.12, delay: i * 0.055 })); },
    splash() { noise(0.35, { type: 'lowpass', f: 2600, to: 300, vol: 0.32 }); tone(380, 0.12, { to: 160, vol: 0.08 }); },
    soap() { noise(0.28, { f: 900, to: 3600, q: 3, vol: 0.28 }); tone(260, 0.2, { to: 520, type: 'sine', vol: 0.08, delay: 0.05 }); },
    warn() { tone(1250, 0.07, { type: 'square', vol: 0.06 }); },
    crack() { noise(0.09, { type: 'highpass', f: 3000, vol: 0.35 }); tone(900, 0.05, { type: 'square', vol: 0.05 }); },
    shatter() { for (let i = 0; i < 6; i++) { noise(0.12, { type: 'highpass', f: 2500 + i * 900, vol: 0.22, delay: i * 0.035 }); tone(3000 + i * 400, 0.08, { vol: 0.05, delay: i * 0.03 }); } },
    beep(hi) { tone(hi ? 1320 : 660, hi ? 0.35 : 0.14, { type: 'square', vol: 0.07 }); },
    whistle() { tone(1900, 0.5, { type: 'sine', vol: 0.12 }); tone(2010, 0.5, { type: 'sine', vol: 0.06 }); },
    win() { [72, 76, 79, 84, 79, 84].forEach((m, i) => tone(mtof(m), 0.2, { type: 'triangle', vol: 0.16, delay: i * 0.11 })); },
    lose() { [67, 64, 60].forEach((m, i) => tone(mtof(m), 0.28, { type: 'triangle', vol: 0.14, delay: i * 0.18 })); },
    tap() { tone(900, 0.05, { type: 'triangle', vol: 0.08 }); },
    setSound(on) { sound = !!on; if (sfx && ctx) sfx.gain.setTargetAtTime(sound ? 1 : 0, ctx.currentTime, 0.02); if (!sound && rubG && ctx) rubG.gain.setTargetAtTime(0, ctx.currentTime, 0.02); },
    setMusic(on) {
      music = !!on;
      if (!ctx) return;
      mus.gain.setTargetAtTime(music ? 0.15 : 0, ctx.currentTime, 0.1);
      if (music) startMusic(); else stopMusic();
    },
    close() {
      stopMusic();
      try { if (rubSrc) rubSrc.stop(); } catch (e) { /* already stopped */ }
      try { if (ctx) ctx.close(); } catch (e) { /* closed */ }
      ctx = null; rubSrc = null;
    }
  };

  /* 4 bars of eighths: C - Am - F - G, bouncy pentatonic plucks */
  const ROOTS = [48, 45, 41, 43];
  const MEL = [72, 0, 76, 79, 0, 76, 72, 0, 69, 0, 72, 76, 0, 72, 69, 0, 65, 0, 69, 72, 0, 69, 77, 0, 67, 71, 74, 0, 79, 0, 77, 74];
  const BASS = [1, 0, 0, 1, 1, 0, 1, 0];

  function playStep(s, t) {
    const root = ROOTS[Math.floor(s / 8) % 4];
    const b = s % 8;
    if (BASS[b]) tone(mtof(root + (b === 4 ? 12 : 0)), 0.22, { type: 'triangle', vol: 0.5, bus: mus, at: t });
    const m = MEL[s % 32];
    if (m && (Math.floor(s / 32) % 2 === 0 || s % 3 !== 0)) tone(mtof(m), 0.18, { type: 'square', vol: 0.12, bus: mus, at: t, a: 0.003 });
    if (b % 2 === 1) noise(0.04, { type: 'highpass', f: 7000, vol: 0.12, bus: mus, at: t });
  }

  function startMusic() {
    if (!ctx || musTimer) return;
    nextT = ctx.currentTime + 0.1;
    musTimer = setInterval(() => {
      if (!ctx) return;
      while (nextT < ctx.currentTime + 0.2) {
        playStep(step, nextT);
        nextT += 60 / 116 / 2;
        step = (step + 1) % 64;
      }
    }, 60);
  }
  function stopMusic() { if (musTimer) { clearInterval(musTimer); musTimer = 0; } }

  return S;
}
