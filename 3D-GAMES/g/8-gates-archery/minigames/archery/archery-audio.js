/* 8 GATES 3D · ARCHERY · WebAudio synth sound + music (no audio files) */

export function createAudio({ music = false } = {}) {
  let ctx = null, out = null, sfx = null, mus = null, noiseBuf = null;
  let soundOn = true, musicOn = music;
  let musTimer = 0, musNext = 0, musStep = 0, mNote = 4;
  let tone = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      out = ctx.createGain(); out.gain.value = 0.9; out.connect(ctx.destination);
      sfx = ctx.createGain(); sfx.gain.value = soundOn ? 0.75 : 0; sfx.connect(out);
      mus = ctx.createGain(); mus.gain.value = musicOn ? 0.16 : 0; mus.connect(out);
      const len = ctx.sampleRate;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      musTimer = setInterval(schedule, 120);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function osc(type, f, t0, dur, vol, f2, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || sfx);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(t0, dur, vol, type, f, f2, q, dest) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const fl = ctx.createBiquadFilter(); fl.type = type || 'bandpass';
    fl.frequency.setValueAtTime(f || 1000, t0);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    fl.Q.value = q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || sfx);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.05);
  }

  const SFX = {
    creak(t) { noise(t, 0.75, 0.10, 'bandpass', 260, 820, 7); osc('sawtooth', 62, t, 0.65, 0.025, 104); },
    full(t) { osc('square', 880, t, 0.05, 0.04); osc('square', 1320, t + 0.06, 0.05, 0.03); },
    twang(t, p = 1) {
      osc('triangle', 170 + p * 90, t, 0.38, 0.32, 85);
      osc('sawtooth', 340 + p * 160, t, 0.14, 0.07, 110);
      noise(t, 0.08, 0.18, 'highpass', 2200);
    },
    whoosh(t) { noise(t, 0.55, 0.16, 'bandpass', 2600, 520, 2.2); },
    thud(t) { osc('sine', 150, t, 0.22, 0.55, 48); noise(t, 0.1, 0.22, 'lowpass', 900); },
    bell(t) { osc('sine', 1318, t, 0.9, 0.16); osc('sine', 1976, t + 0.05, 0.8, 0.09); osc('sine', 2637, t + 0.1, 0.6, 0.05); },
    ground(t) { osc('sine', 92, t, 0.2, 0.32, 40); noise(t, 0.16, 0.18, 'lowpass', 480); },
    cheer(t) { noise(t, 1.5, 0.10, 'bandpass', 1100, 1500, 0.7); noise(t + 0.12, 1.3, 0.07, 'bandpass', 2500, 2100, 1.1); },
    chime(t) { osc('triangle', 660, t, 0.18, 0.13); osc('triangle', 990, t + 0.09, 0.25, 0.11); },
    fanfare(t) {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => osc('square', f, t + i * 0.12, 0.28, 0.06));
      osc('triangle', 1046.5, t + 0.5, 0.7, 0.12);
    },
    sad(t) { [392, 349.2, 311.1].forEach((f, i) => osc('triangle', f, t + i * 0.22, 0.38, 0.11)); },
    click(t) { osc('square', 1200, t, 0.03, 0.035); },
    tick(t, c = 0) { osc('sine', 900 + c * 900, t, 0.05, 0.05); },
    shake(t) { noise(t, 0.12, 0.05, 'bandpass', 400, 300, 4); },
  };

  function play(name, arg) {
    if (!soundOn || !ctx || !ensure()) return;
    const f = SFX[name];
    if (f) f(ctx.currentTime + 0.005, arg);
  }

  /* gentle range music: D major pentatonic plucks over a soft bass */
  const SCALE = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0];
  const BASS = [73.42, 73.42, 98.0, 110.0];
  function schedule() {
    if (!ctx || !musicOn) return;
    const spb = 60 / 96 / 2;
    if (musNext < ctx.currentTime) musNext = ctx.currentTime + 0.05;
    while (musNext < ctx.currentTime + 0.4) {
      const s = musStep % 16, bar = Math.floor(musStep / 16) % 4;
      if (s === 0 || s === 8) osc('triangle', BASS[bar], musNext, 0.55, 0.3, null, mus);
      if (s % 4 === 2) noise(musNext, 0.05, 0.05, 'highpass', 6000, null, 1, mus);
      if ([0, 3, 6, 8, 11, 14].includes(s) && Math.random() < 0.85) {
        mNote = Math.max(0, Math.min(8, mNote + Math.floor(Math.random() * 5) - 2));
        osc('triangle', SCALE[mNote] * 2, musNext, 0.3, 0.12, null, mus);
      }
      musNext += spb; musStep++;
    }
  }

  /* audio sight: a soft tone whose pitch rises as the shot lines up (c = 0..1) */
  function setTone(on, c = 0) {
    if (on && soundOn && ctx && ensure()) {
      if (!tone) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; g.gain.value = 0; o.connect(g); g.connect(sfx); o.start();
        tone = { o, g };
      }
      const t = ctx.currentTime;
      tone.o.frequency.setTargetAtTime(220 + c * 660, t, 0.04);
      tone.g.gain.setTargetAtTime(0.035 + c * 0.03, t, 0.05);
    } else if (tone) {
      const tt = tone; tone = null;
      try { tt.g.gain.setTargetAtTime(0, ctx.currentTime, 0.04); } catch (e) { /* closed */ }
      setTimeout(() => { try { tt.o.stop(); } catch (e) { /* stopped */ } }, 300);
    }
  }

  return {
    unlock: ensure,
    play,
    setTone,
    setSound(b) { soundOn = !!b; if (sfx) sfx.gain.value = soundOn ? 0.75 : 0; if (!soundOn) setTone(false); },
    setMusic(b) { musicOn = !!b; if (mus) mus.gain.value = musicOn ? 0.16 : 0; },
    get soundOn() { return soundOn; },
    get musicOn() { return musicOn; },
    close() {
      clearInterval(musTimer); setTone(false);
      if (ctx) ctx.close().catch(() => {});
      ctx = null;
    },
  };
}
