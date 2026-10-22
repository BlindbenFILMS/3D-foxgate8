/* WOODSHOP sound: WebAudio synth only, no files. */

export function createAudio({ music = true, sound = true } = {}) {
  let ctx = null, master = null, sfx = null, mus = null, noiseBuf = null;
  let musicOn = music, soundOn = sound;
  let loop = null, holdNode = null, nextBeat = 0, step = 0;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = soundOn ? 1 : 0; sfx.connect(master);
    mus = ctx.createGain(); mus.gain.value = musicOn ? 0.5 : 0; mus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
    return true;
  }

  function tone(freq, dur, { type = 'sine', vol = 0.2, at = 0, slide = 0, out = sfx } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, { freq = 1500, q = 1, vol = 0.3, at = 0, type = 'bandpass' } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfx);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  /* Continuous sound while a hold stage runs: filtered noise + a rising guide tone. */
  function holdStart(kind) {
    if (!ctx) return;
    holdStop();
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.value = kind === 'sand' ? 2600 : 900; f.Q.value = kind === 'sand' ? 0.8 : 0.6;
    const g = ctx.createGain(); g.gain.value = 0;
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = kind === 'sand' ? 7 : 2.5; lg.gain.value = kind === 'sand' ? 0.09 : 0.05;
    lfo.connect(lg); lg.connect(g.gain);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 220; og.gain.value = 0.05;
    s.connect(f); f.connect(g); g.connect(sfx); o.connect(og); og.connect(sfx);
    g.gain.setValueAtTime(kind === 'sand' ? 0.12 : 0.07, ctx.currentTime);
    s.start(); lfo.start(); o.start();
    holdNode = { s, lfo, o, og, g };
  }
  function holdLevel(v) { /* 0..1 guide pitch */
    if (!holdNode || !ctx) return;
    holdNode.o.frequency.setTargetAtTime(220 + v * 660, ctx.currentTime, 0.03);
  }
  function holdStop() {
    if (!holdNode || !ctx) return;
    const n = holdNode; holdNode = null;
    const t = ctx.currentTime;
    n.g.gain.cancelScheduledValues(t); n.g.gain.setTargetAtTime(0, t, 0.03);
    n.og.gain.setTargetAtTime(0, t, 0.03);
    [n.s, n.lfo, n.o].forEach(x => { try { x.stop(t + 0.15); } catch (e) { /* already stopped */ } });
  }

  const SFX = {
    beep(close) { tone(500 + close * 900, 0.045, { type: 'square', vol: 0.05 }); },
    saw() { for (let i = 0; i < 3; i++) noise(0.09, { freq: 1700 + i * 300, q: 2, vol: 0.35, at: i * 0.08 }); },
    knock(good) {
      tone(140, 0.18, { vol: 0.5, slide: 0.5 });
      noise(0.04, { freq: 3000, q: 0.7, vol: 0.25 });
      if (good) tone(1320, 0.25, { type: 'triangle', vol: 0.08, at: 0.05 });
    },
    ring(r) { tone(300 + (1 - r) * 700, 0.05, { type: 'sine', vol: 0.06 }); },
    zone() { tone(1046, 0.12, { type: 'triangle', vol: 0.12 }); },
    puff() { noise(0.35, { freq: 600, q: 0.5, vol: 0.2, type: 'lowpass' }); },
    swoosh() { noise(0.3, { freq: 900, q: 0.6, vol: 0.12 }); },
    grade(g) {
      const seq = { PERFECT: [784, 988, 1175, 1568], GREAT: [784, 1046], GOOD: [659], ROUGH: [330], MISS: [180] }[g] || [600];
      seq.forEach((f, i) => tone(f, 0.16, { type: g === 'MISS' ? 'sawtooth' : 'triangle', vol: g === 'MISS' ? 0.08 : 0.14, at: i * 0.07 }));
    },
    turn() { tone(523, 0.1, { type: 'triangle', vol: 0.12 }); tone(784, 0.14, { type: 'triangle', vol: 0.12, at: 0.09 }); },
    piece() { [523, 659, 784].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.12, at: i * 0.1 })); },
    win() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.24, { type: 'triangle', vol: 0.15, at: i * 0.12 })); },
    lose() { [440, 392, 330].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.12, at: i * 0.16 })); },
    click() { tone(900, 0.04, { type: 'square', vol: 0.04 }); },
  };

  /* Music: gentle workshop loop, pentatonic plucks over a walking bass. */
  const BASS = [110, 0, 165, 0, 147, 0, 131, 0, 110, 0, 165, 0, 196, 0, 165, 0];
  const MEL = [440, 0, 523, 587, 0, 659, 0, 587, 523, 0, 440, 0, 392, 0, 440, 0,
               659, 0, 587, 523, 0, 440, 0, 523, 587, 0, 659, 784, 0, 659, 0, 0];
  function startMusic() {
    if (loop || !ctx) return;
    nextBeat = ctx.currentTime + 0.1;
    loop = setInterval(() => {
      if (!ctx || !musicOn) return;
      const spb = 60 / 96 / 2;
      while (nextBeat < ctx.currentTime + 0.25) {
        const at = nextBeat - ctx.currentTime;
        const b = BASS[step % BASS.length], m = MEL[step % MEL.length];
        if (b) tone(b, spb * 1.8, { type: 'triangle', vol: 0.16, at: Math.max(0, at), out: mus });
        if (m) tone(m, spb * 1.4, { type: 'sine', vol: 0.07, at: Math.max(0, at), out: mus });
        if (step % 4 === 2) noise(0.03, { freq: 6000, q: 1, vol: 0.03, at: Math.max(0, at) });
        nextBeat += spb; step++;
      }
    }, 90);
  }

  return {
    unlock: ensure,
    sfx: new Proxy(SFX, { get: (o, k) => (...a) => { if (ctx && soundOn && o[k]) o[k](...a); } }),
    holdStart: (k) => { if (soundOn) holdStart(k); },
    holdLevel, holdStop,
    setSound(b) { soundOn = !!b; if (sfx) sfx.gain.value = soundOn ? 1 : 0; if (!soundOn) holdStop(); },
    setMusic(b) { musicOn = !!b; if (mus) mus.gain.setTargetAtTime(musicOn ? 0.5 : 0, ctx.currentTime, 0.1); },
    get sound() { return soundOn; },
    get music() { return musicOn; },
    close() {
      holdStop();
      if (loop) clearInterval(loop); loop = null;
      if (ctx) { try { ctx.close(); } catch (e) { /* ignore */ } }
      ctx = null;
    },
  };
}
