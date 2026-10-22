/* ORCHARD — WebAudio synth sound effects + a small looping tune. No audio files. */

const PENTA = [0, 2, 4, 7, 9];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function createAudio({ sound = true, music = true } = {}) {
  let ctx = null, master = null, sfx = null, mus = null, noiseBuf = null;
  let soundOn = sound, musicOn = music, musTimer = null, nextNote = 0, beat = 0;
  let lastRipe = 0, unlocked = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      sfx = ctx.createGain(); sfx.gain.value = soundOn ? 1 : 0; sfx.connect(master);
      mus = ctx.createGain(); mus.gain.value = musicOn ? 0.32 : 0; mus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (musicOn && !musTimer && unlocked) startMusic();
    return ctx;
  }

  function out(pan, bus) {
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan || 0));
      p.connect(bus || sfx);
      return p;
    }
    return bus || sfx;
  }

  function tone(freq, dur, { type = 'sine', vol = 0.25, pan = 0, slide = 0, when = 0, attack = 0.005, bus } = {}) {
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(out(pan, bus));
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(dur, { vol = 0.2, pan = 0, freq = 1200, q = 0.8, type = 'bandpass', when = 0 } = {}) {
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(out(pan));
    s.start(t0); s.stop(t0 + dur + 0.05);
  }

  const fx = {
    pick(streak = 1, pan = 0) {
      const n = 72 + PENTA[(streak - 1) % 5] + 12 * Math.floor(Math.min(streak - 1, 9) / 5);
      tone(mtof(n), 0.16, { type: 'triangle', vol: 0.3, pan });
      tone(mtof(n + 7), 0.14, { type: 'sine', vol: 0.14, pan, when: 0.05 });
      noise(0.05, { vol: 0.12, pan, freq: 3000 });
    },
    gold(pan = 0) { [0, 4, 7, 12, 16].forEach((s, i) => tone(mtof(84 + s), 0.22, { type: 'triangle', vol: 0.22, pan, when: i * 0.05 })); },
    unripe(pan = 0) { tone(180, 0.14, { type: 'square', vol: 0.12, pan, slide: 0.6 }); noise(0.06, { vol: 0.1, pan, freq: 600 }); },
    over(pan = 0) { tone(240, 0.18, { type: 'sawtooth', vol: 0.08, pan, slide: 0.5 }); noise(0.1, { vol: 0.14, pan, freq: 400, type: 'lowpass' }); },
    ground(pan = 0) { noise(0.12, { vol: 0.16, pan, freq: 500, type: 'lowpass' }); tone(150, 0.1, { vol: 0.14, pan, slide: 0.7 }); },
    catch(pan = 0) { tone(mtof(79), 0.1, { type: 'triangle', vol: 0.3, pan }); tone(mtof(86), 0.16, { type: 'triangle', vol: 0.24, pan, when: 0.06 }); },
    shake(pan = 0) { for (let i = 0; i < 5; i++) noise(0.14, { vol: 0.22, pan, freq: 1800 + i * 300, q: 0.5, when: i * 0.08 }); tone(90, 0.4, { vol: 0.18, pan, slide: 0.7 }); },
    shakeFail(pan = 0) { noise(0.1, { vol: 0.12, pan, freq: 1400 }); tone(140, 0.12, { type: 'square', vol: 0.06, pan }); },
    land(pan = 0) { noise(0.09, { vol: 0.14, pan, freq: 300, type: 'lowpass' }); tone(110, 0.09, { vol: 0.16, pan, slide: 0.6 }); },
    ripe(pan = 0) {
      if (!ctx || ctx.currentTime - lastRipe < 0.22) return;
      lastRipe = ctx.currentTime;
      tone(mtof(91 + PENTA[Math.floor(Math.random() * 5)]), 0.25, { type: 'sine', vol: 0.05, pan });
    },
    tick() { tone(mtof(81), 0.08, { type: 'square', vol: 0.08 }); },
    go() { tone(mtof(84), 0.3, { type: 'square', vol: 0.12 }); tone(mtof(91), 0.3, { type: 'triangle', vol: 0.12, when: 0.02 }); },
    tap() { tone(mtof(76), 0.05, { type: 'triangle', vol: 0.08 }); },
    win() { [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) => tone(mtof(72 + s), 0.22, { type: 'triangle', vol: 0.22, when: i * 0.1 })); },
    lose() { [7, 4, 0, -5].forEach((s, i) => tone(mtof(67 + s), 0.32, { type: 'triangle', vol: 0.18, when: i * 0.16 })); },
    end() { tone(mtof(72), 0.5, { type: 'square', vol: 0.12 }); tone(mtof(79), 0.5, { type: 'square', vol: 0.08, when: 0.01 }); },
  };

  /* music: bouncy pentatonic loop, 104 bpm, scheduled ahead */
  const MEL = [0, 2, 4, 7, 4, 2, 9, 7, 0, 4, 7, 9, 12, 9, 7, 4];
  const BASS = [0, 0, 7, 7, 5, 5, 7, 7];
  function startMusic() {
    if (!ctx || musTimer) return;
    nextNote = ctx.currentTime + 0.1;
    musTimer = setInterval(() => {
      if (!ctx) return;
      const spb = 60 / 104 / 2;
      while (nextNote < ctx.currentTime + 0.25) {
        const when = nextNote - ctx.currentTime;
        if (beat % 2 === 0) tone(mtof(43 + BASS[(beat / 2) % 8]), spb * 1.6, { type: 'triangle', vol: 0.35, when, bus: mus });
        if (beat % 4 !== 3) tone(mtof(67 + MEL[beat % 16]), spb * 0.9, { type: 'square', vol: 0.07, when, bus: mus });
        if (beat % 4 === 2) noiseHat(when);
        nextNote += spb; beat++;
      }
    }, 90);
  }
  function noiseHat(when) {
    const t0 = ctx.currentTime + when;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.06, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    s.connect(f); f.connect(g); g.connect(mus); s.start(t0); s.stop(t0 + 0.08);
  }
  function stopMusic() { if (musTimer) { clearInterval(musTimer); musTimer = null; } }

  return {
    unlock() { unlocked = true; return ensure(); },
    play(name, ...args) { if (!soundOn || !unlocked) return; if (!ensure()) return; const f = fx[name]; if (f) f(...args); },
    setSound(b) { soundOn = !!b; if (sfx) sfx.gain.value = soundOn ? 1 : 0; },
    setMusic(b) {
      musicOn = !!b;
      if (mus) mus.gain.value = musicOn ? 0.32 : 0;
      if (musicOn && ctx && unlocked) startMusic(); else stopMusic();
    },
    get sound() { return soundOn; },
    get music() { return musicOn; },
    close() { stopMusic(); if (ctx) { ctx.close().catch(() => {}); ctx = null; } },
  };
}
