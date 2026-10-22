/* 8 GATES 3D : TRACK & FIELD : WebAudio synth sound + music (no audio files) */

export function createAudio({ music = true, sfx = true } = {}) {
  let ctx = null, master = null, sfxBus = null, musBus = null, noiseBuf = null;
  let sfxOn = sfx, musOn = music, closed = false, unlocked = false;
  let musTimer = 0, nextNote = 0, step = 0;

  function ensure() {
    if (closed) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      musBus = ctx.createGain(); musBus.gain.value = 0.22; musBus.connect(master);
      const len = ctx.sampleRate * 2;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (musOn) startMusic();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(type, f0, f1, dur, vol, at = 0, bus = sfxBus) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, ftype, f0, f1, q = 1, at = 0, attack = 0.005) {
    const t = ctx.currentTime + at;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter(); f.type = ftype; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  function crowd(dur, vol) {
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.35);
    g.gain.setValueAtTime(vol, t + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 7; lg.gain.value = vol * 0.35;
    lfo.connect(lg); lg.connect(g.gain);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t); s.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur + 0.05);
  }

  const SFX = {
    tap()     { tone('sine', 880, 880, 0.05, 0.12); },
    step()    { noise(0.05, 0.12, 'bandpass', 1900, 1300, 2); },
    beep()    { tone('sine', 660, 660, 0.14, 0.28); },
    gun()     { noise(0.35, 0.9, 'lowpass', 5000, 250, 0.7, 0, 0.002); tone('square', 140, 40, 0.14, 0.35); },
    jump()    { tone('triangle', 280, 760, 0.22, 0.3); },
    land()    { noise(0.38, 0.55, 'lowpass', 700, 140, 1); },
    throw()   { noise(0.4, 0.45, 'bandpass', 500, 2600, 3); tone('triangle', 400, 900, 0.18, 0.12); },
    stick()   { tone('square', 190, 60, 0.09, 0.28); noise(0.12, 0.3, 'lowpass', 1000, 200, 1); },
    hit()     { tone('square', 540, 200, 0.1, 0.25); tone('square', 320, 110, 0.14, 0.2, 0.04); },
    foul()    { tone('sawtooth', 220, 220, 0.18, 0.22); tone('sawtooth', 165, 165, 0.32, 0.22, 0.2); },
    whistle() { tone('sine', 2500, 2700, 0.32, 0.18); },
    cheer()   { crowd(1.8, 0.35); },
    win()     { [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.22, 0.14, i * 0.11)); tone('triangle', 1047, 1047, 0.6, 0.18, 0.44); },
    lose()    { [392, 330, 262].forEach((f, i) => tone('triangle', f, f, 0.28, 0.2, i * 0.18)); },
  };

  /* ---------- music: a light 132 bpm loop ---------- */
  const BASS = [45, 0, 45, 52, 0, 45, 50, 52, 41, 0, 41, 48, 0, 41, 43, 45];
  const LEAD = [69, 0, 72, 0, 76, 0, 72, 74, 0, 72, 69, 0, 65, 0, 67, 69];
  const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);
  function schedule() {
    if (!ctx || !musOn) return;
    const spb = 60 / 132 / 2;
    while (nextNote < ctx.currentTime + 0.25) {
      const at = nextNote - ctx.currentTime;
      const i = step % 16, bar = Math.floor(step / 16) % 4;
      const b = BASS[i];
      if (b) tone('triangle', mtof(b), mtof(b), spb * 0.9, 0.5, Math.max(0, at), musBus);
      if (bar % 2 === 1 && LEAD[i]) tone('square', mtof(LEAD[i]), mtof(LEAD[i]), spb * 0.7, 0.12, Math.max(0, at), musBus);
      if (i % 2 === 0) {
        const t = ctx.currentTime + Math.max(0, at);
        const s = ctx.createBufferSource(); s.buffer = noiseBuf;
        const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
        const g = ctx.createGain(); g.gain.setValueAtTime(i % 4 === 0 ? 0.2 : 0.09, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        s.connect(f); f.connect(g); g.connect(musBus); s.start(t); s.stop(t + 0.06);
      }
      nextNote += spb; step++;
    }
  }
  function startMusic() {
    if (!ctx || musTimer) return;
    nextNote = ctx.currentTime + 0.1;
    musTimer = setInterval(schedule, 90);
  }
  function stopMusic() { if (musTimer) clearInterval(musTimer); musTimer = 0; }

  return {
    unlock() { unlocked = true; ensure(); },
    play(name) {
      if (!sfxOn || closed || !unlocked) return;
      if (!ensure()) return;
      const f = SFX[name]; if (f) { try { f(); } catch (e) { /* ignore */ } }
    },
    setSfx(on) { sfxOn = !!on; },
    setMusic(on) {
      musOn = !!on;
      if (!ctx) return;
      if (musOn) startMusic(); else stopMusic();
    },
    get sfx() { return sfxOn; },
    get music() { return musOn; },
    close() {
      closed = true; stopMusic();
      if (ctx) { try { ctx.close(); } catch (e) { /* ignore */ } }
      ctx = null;
    },
  };
}
