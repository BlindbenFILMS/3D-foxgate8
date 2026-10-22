/* ELECTRICIAN JOB: WebAudio synth sound + music. No audio files. */

export function makeAudio({ music = true, sfx = true } = {}) {
  let ctx = null, master = null, musicGain = null, sfxGain = null;
  let musicOn = music, sfxOn = sfx, musicTimer = 0, step = 0, nextT = 0, closed = false, unlocked = false;

  function ensure() {
    if (closed || !unlocked) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.gain.value = sfxOn ? 1 : 0; sfxGain.connect(master);
      musicGain = ctx.createGain(); musicGain.gain.value = musicOn ? 0.22 : 0; musicGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, { type = 'square', vol = 0.18, slide = 0, delay = 0, bus = null, attack = 0.004 } = {}) {
    const c = ensure(); if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, { vol = 0.2, hp = 2000, delay = 0 } = {}) {
    const c = ensure(); if (!c) return;
    const t = c.currentTime + delay;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(sfxGain);
    s.start(t);
  }

  const api = {
    resume() { unlocked = true; ensure(); if (musicOn) startMusic(); },
    click() { tone(520, 0.05, { type: 'square', vol: 0.09 }); tone(260, 0.04, { type: 'triangle', vol: 0.08, delay: 0.02 }); },
    turnBack() { tone(300, 0.05, { type: 'square', vol: 0.07 }); },
    lock() { tone(880, 0.06, { type: 'triangle', vol: 0.12 }); tone(1320, 0.08, { type: 'triangle', vol: 0.1, delay: 0.05 }); },
    unlock() { tone(660, 0.06, { type: 'triangle', vol: 0.1 }); tone(440, 0.08, { type: 'triangle', vol: 0.08, delay: 0.05 }); },
    zap() { noise(0.12, { vol: 0.12, hp: 3000 }); tone(1200, 0.1, { type: 'sawtooth', vol: 0.05, slide: -800 }); },
    light(k = 0) { const f = 660 * Math.pow(2, (k % 6) / 12 * 2); tone(f, 0.16, { type: 'triangle', vol: 0.14 }); tone(f * 1.5, 0.2, { type: 'sine', vol: 0.08, delay: 0.05 }); },
    dark() { tone(400, 0.12, { type: 'triangle', vol: 0.08, slide: -180 }); },
    spark() { noise(0.18, { vol: 0.16, hp: 1800 }); },
    tick() { tone(1000, 0.03, { type: 'square', vol: 0.05 }); },
    go() { tone(523, 0.1, { vol: 0.12 }); tone(784, 0.18, { vol: 0.12, delay: 0.1 }); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, { type: 'square', vol: 0.11, delay: i * 0.11 })); tone(1046, 0.5, { type: 'triangle', vol: 0.12, delay: 0.46 }); },
    lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.26, { type: 'triangle', vol: 0.12, delay: i * 0.16 })); },
    cpuDone() { tone(330, 0.12, { type: 'sawtooth', vol: 0.07 }); tone(247, 0.2, { type: 'sawtooth', vol: 0.07, delay: 0.1 }); },
    setSfx(on) { sfxOn = on; if (sfxGain) sfxGain.gain.value = on ? 1 : 0; },
    setMusic(on) { musicOn = on; if (musicGain) musicGain.gain.value = on ? 0.22 : 0; if (on) startMusic(); },
    get sfx() { return sfxOn; },
    get music() { return musicOn; },
    close() { closed = true; clearInterval(musicTimer); musicTimer = 0; if (ctx) { try { ctx.close(); } catch (e) { /* ignore */ } } ctx = null; }
  };

  /* little funk loop: bass + offbeat chord stabs, scheduled ahead */
  const BASS = [41, 0, 41, 44, 0, 46, 0, 44, 39, 0, 39, 41, 0, 44, 0, 46];
  const CHORD = [[65, 68, 72], [63, 67, 70]];
  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function startMusic() {
    if (!ctx || musicTimer || !musicOn) return;
    nextT = ctx.currentTime + 0.1;
    musicTimer = setInterval(() => {
      if (!ctx || !musicOn) return;
      const spb = 60 / 112 / 4;
      while (nextT < ctx.currentTime + 0.3) {
        const s = step % 16, bar = Math.floor(step / 16) % 2;
        const b = BASS[s];
        const dly = Math.max(0, nextT - ctx.currentTime);
        if (b) tone(midi(b), spb * 1.6, { type: 'triangle', vol: 0.5, bus: musicGain, delay: dly });
        if (s % 4 === 2) CHORD[bar].forEach(m => tone(midi(m), spb * 0.9, { type: 'square', vol: 0.06, bus: musicGain, delay: dly }));
        if (s % 2 === 0) tone(8000, 0.02, { type: 'square', vol: 0.03, bus: musicGain, delay: dly });
        nextT += spb; step++;
      }
    }, 80);
  }

  return api;
}
