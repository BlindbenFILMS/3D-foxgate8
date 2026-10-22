/* PLAYGROUND: WebAudio synth sound effects + a small looping tune. No audio files. */
export function createAudio({ music = true } = {}) {
  let ctx = null, master = null, sfxBus = null, musBus = null, timer = 0, step = 0, nextT = 0;
  let soundOn = true, musicOn = music, closed = false;

  function unlock() {
    if (closed) return;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = soundOn ? 0.8 : 0; sfxBus.connect(master);
      musBus = ctx.createGain(); musBus.gain.value = musicOn ? 0.22 : 0; musBus.connect(master);
      timer = setInterval(schedule, 90);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function tone(f, dur, { type = 'sine', vol = 0.25, to = 0, delay = 0, bus = sfxBus, attack = 0.005 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  let noiseBuf = null;
  function noise(dur, { vol = 0.25, f = 1200, q = 0.8, to = 0, delay = 0, type = 'bandpass' } = {}) {
    if (!ctx) return;
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = ctx.currentTime + delay, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + dur + 0.05);
  }

  const SFX = {
    tick:   () => tone(1320, 0.07, { type: 'square', vol: 0.12 }),
    good:   (q = 1) => { tone(660, 0.1, { type: 'triangle', vol: 0.3 }); tone(q > 0.75 ? 1046 : 880, 0.16, { type: 'triangle', vol: 0.3, delay: 0.06 }); },
    bad:    () => tone(180, 0.22, { type: 'sawtooth', vol: 0.16, to: 110 }),
    ai:     () => tone(520, 0.06, { type: 'triangle', vol: 0.07 }),
    whoosh: () => noise(0.45, { vol: 0.3, f: 500, to: 2400, q: 1.2 }),
    out:    () => { noise(0.5, { vol: 0.3, f: 800, to: 3000 }); tone(700, 0.5, { type: 'triangle', vol: 0.18, to: 180, delay: 0.05 }); },
    thud:   () => { tone(120, 0.18, { type: 'sine', vol: 0.4, to: 60 }); noise(0.12, { vol: 0.15, f: 300, type: 'lowpass' }); },
    pack:   () => { noise(0.14, { vol: 0.35, f: 600, type: 'lowpass' }); tone(240, 0.1, { vol: 0.2, to: 140 }); },
    crumble:() => { noise(0.9, { vol: 0.35, f: 900, to: 200, type: 'lowpass' }); tone(300, 0.6, { type: 'sawtooth', vol: 0.08, to: 90 }); },
    grab:   () => tone(980, 0.06, { type: 'square', vol: 0.1 }),
    count:  () => tone(660, 0.14, { type: 'square', vol: 0.16 }),
    go:     () => { tone(990, 0.35, { type: 'square', vol: 0.18 }); tone(1320, 0.35, { type: 'triangle', vol: 0.12 }); },
    finish: () => [784, 988, 1175].forEach((f, k) => tone(f, 0.18, { type: 'triangle', vol: 0.22, delay: k * 0.08 })),
    win:    () => [523, 659, 784, 1046, 784, 1046].forEach((f, k) => tone(f, 0.22, { type: 'triangle', vol: 0.25, delay: k * 0.11 })),
    lose:   () => [523, 466, 392].forEach((f, k) => tone(f, 0.28, { type: 'triangle', vol: 0.2, delay: k * 0.16 })),
    click:  () => tone(880, 0.05, { type: 'square', vol: 0.08 }),
  };
  function play(name, arg) { if (!ctx || !soundOn || closed) return; const f = SFX[name]; if (f) f(arg); }

  /* bouncy pentatonic loop, 8th notes at 120 bpm */
  const MEL = [72, 0, 76, 79, 0, 76, 74, 72, 69, 0, 72, 74, 76, 0, 74, 0, 72, 0, 76, 79, 81, 79, 76, 74, 72, 74, 76, 0, 72, 0, 0, 0];
  const BASS = [48, 55, 52, 55, 45, 52, 48, 52];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function schedule() {
    if (!ctx || !musicOn || closed) return;
    const spb = 0.25;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.3) {
      const d = nextT - ctx.currentTime, n = MEL[step % MEL.length];
      if (n) tone(mtof(n), 0.18, { type: 'triangle', vol: 0.3, delay: d, bus: musBus });
      if (step % 2 === 0) tone(mtof(BASS[(step >> 2) % BASS.length]), 0.22, { type: 'sine', vol: 0.45, delay: d, bus: musBus });
      if (step % 4 === 2) tone(2400, 0.03, { type: 'square', vol: 0.05, delay: d, bus: musBus });
      step++; nextT += spb;
    }
  }

  return {
    unlock, play,
    get sound() { return soundOn; }, get music() { return musicOn; },
    setSound(b) { soundOn = !!b; if (sfxBus) sfxBus.gain.value = soundOn ? 0.8 : 0; },
    setMusic(b) { musicOn = !!b; if (musBus) musBus.gain.value = musicOn ? 0.22 : 0; },
    close() { closed = true; clearInterval(timer); if (ctx) { try { ctx.close(); } catch (e) { /* ignore */ } } ctx = null; },
  };
}
