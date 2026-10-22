/* CAR WASH: WebAudio synth sound effects + a small music loop. No audio files. */

export function createAudio({ music = true, sound = true } = {}) {
  let ctx = null, master, sfx, mus, noiseBuf, sprayGain, sprayFilter, sprayLfo;
  let soundOn = sound, musicOn = music, musTimer = null, step = 0, nextT = 0;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = soundOn ? 1 : 0; sfx.connect(master);
    mus = ctx.createGain(); mus.gain.value = musicOn ? 0.18 : 0; mus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    sprayFilter = ctx.createBiquadFilter(); sprayFilter.type = 'bandpass'; sprayFilter.frequency.value = 1200; sprayFilter.Q.value = 1;
    sprayGain = ctx.createGain(); sprayGain.gain.value = 0;
    src.connect(sprayFilter); sprayFilter.connect(sprayGain); sprayGain.connect(sfx); src.start();
    sprayLfo = ctx.createOscillator(); sprayLfo.frequency.value = 7;
    const lg = ctx.createGain(); lg.gain.value = 260; sprayLfo.connect(lg); lg.connect(sprayFilter.frequency); sprayLfo.start();
    if (musicOn) startMusic();
    return true;
  }

  function tone(f, dur, type = 'square', vol = 0.15, when = 0, slide = 0, out) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out || sfx); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, freq, vol = 0.2, when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfx); s.start(t); s.stop(t + dur + 0.02);
  }

  /* music: 16 steps of 8ths, bouncy C major loop */
  const BASS = [48, 0, 48, 0, 43, 0, 45, 0, 41, 0, 41, 0, 43, 0, 43, 47];
  const ARP = [72, 76, 79, 76, 71, 74, 79, 74, 69, 72, 77, 72, 71, 74, 79, 83];
  const mf = n => 440 * Math.pow(2, (n - 69) / 12);
  function startMusic() {
    if (!ctx || musTimer) return;
    nextT = ctx.currentTime + 0.05;
    musTimer = setInterval(() => {
      const e = 60 / 116 / 2;
      while (nextT < ctx.currentTime + 0.25) {
        const w = nextT - ctx.currentTime, b = BASS[step % 16], a = ARP[step % 16];
        if (b) tone(mf(b - 12), e * 1.6, 'triangle', 0.5, w, 0, mus);
        if (step % 2 === 0 || step % 16 > 11) tone(mf(a), e * 0.7, 'square', 0.09, w, 0, mus);
        if (step % 4 === 2) noiseHat(w);
        nextT += e; step++;
      }
    }, 60);
  }
  function noiseHat(w) {
    const t = ctx.currentTime + w;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(mus); s.start(t); s.stop(t + 0.07);
  }
  function stopMusic() { if (musTimer) clearInterval(musTimer); musTimer = null; }

  const TOOL_F = [900, 2600, 5200], TOOL_Q = [2.2, 0.9, 0.5];
  return {
    resume: ensure,
    spray(on, tool = 0) {
      if (!ctx) return;
      const t = ctx.currentTime;
      sprayGain.gain.setTargetAtTime(on ? (tool === 2 ? 0.14 : 0.2) : 0, t, 0.04);
      sprayFilter.frequency.setTargetAtTime(TOOL_F[tool] || 1200, t, 0.05);
      sprayFilter.Q.value = TOOL_Q[tool] || 1;
      sprayLfo.frequency.value = tool === 0 ? 11 : tool === 1 ? 5 : 2;
    },
    pop(i = 0, tool = 0) {
      ensure();
      const base = [520, 640, 780][tool] || 520;
      tone(base + i * 35, 0.09, 'sine', 0.28, 0, 300);
      if (tool === 0) tone(base * 1.5 + i * 30, 0.06, 'sine', 0.12, 0.04, 200);
    },
    stage(n) { tone(660, 0.1, 'square', 0.14); tone(n >= 2 ? 1046 : 880, 0.18, 'square', 0.14, 0.1); },
    carDone(cpu) {
      if (cpu) { tone(392, 0.12, 'triangle', 0.12); return; }
      tone(988, 0.08, 'square', 0.16); tone(1318, 0.3, 'square', 0.16, 0.08); noise(0.25, 6000, 0.12, 0.05);
    },
    tick() { tone(1200, 0.05, 'square', 0.1); },
    go() { tone(523, 0.12, 'square', 0.14); tone(784, 0.2, 'square', 0.14, 0.12); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'square', 0.15, i * 0.12)); },
    lose() { [523, 440, 349].forEach((f, i) => tone(f, 0.25, 'triangle', 0.18, i * 0.15)); },
    tap() { ensure(); tone(700, 0.04, 'square', 0.08); },
    setSound(on) { soundOn = !!on; if (sfx) sfx.gain.value = soundOn ? 1 : 0; },
    setMusic(on) {
      musicOn = !!on;
      if (mus) mus.gain.value = musicOn ? 0.18 : 0;
      if (musicOn) startMusic(); else stopMusic();
    },
    get sound() { return soundOn; },
    get music() { return musicOn; },
    close() { stopMusic(); if (ctx) { ctx.close().catch(() => {}); ctx = null; } }
  };
}
