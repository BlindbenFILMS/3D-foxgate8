/* AIRPORT TSA . WebAudio synth sound effects and a soft lounge loop (no audio files) */
export function createAudio(o = {}) {
  let ctx = null, master = null, sfxG = null, musG = null, noiseBuf = null, timer = 0, nextT = 0, step = 0, closed = false;
  let muted = !!o.muted, musicOn = !!o.music, gestured = false;
  const MUS = 0.5;

  function init() {
    if (closed) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
      sfxG = ctx.createGain(); sfxG.gain.value = 0.6; sfxG.connect(master);
      musG = ctx.createGain(); musG.gain.value = musicOn ? MUS : 0; musG.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      timer = setInterval(sched, 120);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function tone(f, d, { type = 'sine', v = 0.25, at = 0, to = 0, a = 0.006, dest } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + Math.max(0, at), os = ctx.createOscillator(), g = ctx.createGain();
    os.type = type; os.frequency.setValueAtTime(f, t); if (to) os.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    os.connect(g); g.connect(dest || sfxG); os.start(t); os.stop(t + d + 0.05);
  }
  function noise(d, { v = 0.2, at = 0, f = 1200, q = 1, type = 'bandpass', dest } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + Math.max(0, at), src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(fl); fl.connect(g); g.connect(dest || sfxG); src.start(t, Math.random() * 0.5); src.stop(t + d + 0.05);
  }
  const SFX = {
    tap: () => tone(880, 0.06, { type: 'square', v: 0.07 }),
    tag: () => { tone(1320, 0.07, { type: 'square', v: 0.09 }); tone(1760, 0.06, { type: 'square', v: 0.07, at: 0.05 }); },
    untag: () => tone(620, 0.08, { type: 'square', v: 0.07 }),
    good: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { type: 'triangle', v: 0.18, at: i * 0.07 })),
    bad: () => { tone(220, 0.3, { type: 'sawtooth', v: 0.12, to: 140 }); tone(233, 0.3, { type: 'square', v: 0.05, to: 150 }); },
    beep: () => tone(1500, 0.1, { type: 'square', v: 0.07 }),
    alarm: () => { for (let i = 0; i < 3; i++) tone(950, 0.12, { type: 'square', v: 0.09, at: i * 0.18 }); },
    chime: () => { tone(659, 0.9, { v: 0.16 }); tone(523, 0.9, { v: 0.16, at: 0.35 }); tone(784, 1.2, { v: 0.14, at: 0.7 }); },
    scan: () => noise(0.9, { v: 0.05, f: 320, type: 'lowpass' }),
    radio: () => { noise(0.22, { v: 0.1, f: 2400, q: 4 }); tone(1200, 0.08, { type: 'square', v: 0.05, at: 0.24 }); },
    pop: () => tone(520, 0.1, { type: 'triangle', v: 0.13, to: 880 }),
    whoosh: () => noise(0.4, { v: 0.08, f: 900, q: 0.7 }),
    cash: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.14, { type: 'square', v: 0.06, at: i * 0.06 })),
    start: () => [392, 523, 659, 784].forEach((f, i) => tone(f, 0.2, { type: 'triangle', v: 0.15, at: i * 0.09 })),
    end: () => [784, 659, 523, 392].forEach((f, i) => tone(f, 0.24, { type: 'triangle', v: 0.15, at: i * 0.12 })),
    toss: () => noise(0.18, { v: 0.08, f: 1600, q: 2 }),
    door: () => { noise(0.3, { v: 0.1, f: 300, type: 'lowpass' }); tone(140, 0.15, { type: 'square', v: 0.06, at: 0.2 }); },
  };
  const CH = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function sched() {
    if (!ctx || !musicOn || muted || ctx.state !== 'running') return;
    const spb = 60 / 90 / 2;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.4) {
      const bar = Math.floor(step / 8) % 4, s = step % 8, ch = CH[bar], at = nextT - ctx.currentTime;
      if (s === 0) ch.forEach(m => tone(mtof(m), spb * 7.5, { type: 'triangle', v: 0.03, at, a: 0.09, dest: musG }));
      if (s === 0 || s === 3 || s === 4 || s === 6) tone(mtof(ch[0] - 12 + (s === 6 ? 7 : 0)), spb * 1.4, { v: 0.11, at, dest: musG });
      if (s % 2 === 1) noise(0.04, { v: 0.025, f: 8000, type: 'highpass', at, dest: musG });
      if ((s === 2 || s === 5) && step % 3 === 0) tone(mtof(ch[(step + s) % 4] + 12), spb * 0.9, { v: 0.035, at, dest: musG });
      nextT += spb; step++;
    }
  }
  return {
    unlock() { gestured = true; init(); },
    sfx(n) { if (muted || closed || (!ctx && !gestured)) return; if (!init()) return; if (SFX[n]) SFX[n](); },
    setMuted(b) { muted = !!b; if (master) master.gain.value = muted ? 0 : 0.9; },
    setMusic(b) { musicOn = !!b; if (musG) musG.gain.value = musicOn ? MUS : 0; },
    get started() { return !!ctx; },
    close() { closed = true; clearInterval(timer); if (ctx) { try { ctx.close(); } catch (e) { /* closed */ } } ctx = null; },
  };
}
