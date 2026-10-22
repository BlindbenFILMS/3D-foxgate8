/* TOY WORKSHOP: WebAudio synth sound + music. No audio files. */

export function createAudio({ music = true, sound = true } = {}) {
  let ctx = null, master = null, sfxBus = null, musBus = null;
  let unlocked = false, soundOn = sound, musicOn = music, musTimer = 0, musStep = 0, nextT = 0, closed = false;
  let chargeOsc = null, chargeGain = null;

  function ensure() {
    if (closed || !unlocked) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = soundOn ? 0.9 : 0; sfxBus.connect(master);
      musBus = ctx.createGain(); musBus.gain.value = musicOn ? 0.22 : 0; musBus.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, { type = 'sine', vol = 0.3, at = 0, slide = 0, bus = null, attack = 0.005 } = {}) {
    const c = ensure(); if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  let noiseBuf = null;
  function noise(dur, { vol = 0.3, at = 0, freq = 1200, q = 1, type = 'bandpass' } = {}) {
    const c = ensure(); if (!c) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t); s.stop(t + dur + 0.02);
  }

  const sfx = {
    tap() { tone(900, 0.05, { type: 'triangle', vol: 0.15 }); },
    place(i = 0) { tone(520 + i * 70, 0.09, { type: 'triangle', vol: 0.3 }); noise(0.05, { vol: 0.25, freq: 2400, q: 3 }); },
    wrong() { tone(180, 0.22, { type: 'square', vol: 0.12, slide: -60 }); },
    paint() { noise(0.35, { vol: 0.35, freq: 700, q: 0.7, type: 'lowpass' }); tone(330, 0.25, { vol: 0.12, slide: 220 }); },
    hammer(grade) {
      noise(0.08, { vol: 0.6, freq: 3200, q: 2 });
      tone(grade === 'MISS' ? 140 : 220, 0.18, { type: 'square', vol: 0.15, slide: -80 });
      if (grade === 'PERFECT') { tone(1046, 0.25, { vol: 0.2, at: 0.05 }); tone(1568, 0.3, { vol: 0.16, at: 0.12 }); }
      if (grade === 'GOOD') tone(784, 0.2, { vol: 0.16, at: 0.05 });
    },
    ship() { [659, 784, 1046].forEach((f, i) => tone(f, 0.16, { type: 'triangle', vol: 0.22, at: i * 0.07 })); },
    tick() { tone(1400, 0.03, { type: 'square', vol: 0.06 }); },
    bell() { [880, 1320].forEach((f, i) => tone(f, 0.9, { vol: 0.2, at: i * 0.02 })); },
    win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.22, at: i * 0.1 })); },
    lose() { [440, 392, 330].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.2, at: i * 0.15 })); },
    go() { tone(660, 0.12, { type: 'square', vol: 0.1 }); tone(990, 0.2, { type: 'square', vol: 0.1, at: 0.12 }); },
    chime() { tone(1760, 0.12, { vol: 0.12 }); },
  };

  /* hammer charge tone: pitch follows power so players can play by ear */
  function charge(on, power = 0) {
    const c = ensure(); if (!c) return;
    if (on && !chargeOsc) {
      chargeOsc = c.createOscillator(); chargeGain = c.createGain();
      chargeOsc.type = 'triangle'; chargeGain.gain.value = 0.0001;
      chargeOsc.connect(chargeGain); chargeGain.connect(sfxBus); chargeOsc.start();
      chargeGain.gain.setTargetAtTime(0.07, c.currentTime, 0.02);
    }
    if (chargeOsc) {
      if (on) chargeOsc.frequency.setTargetAtTime(220 + power * 660, c.currentTime, 0.015);
      else {
        const o = chargeOsc, g = chargeGain; chargeOsc = null; chargeGain = null;
        g.gain.setTargetAtTime(0.0001, c.currentTime, 0.02); o.stop(c.currentTime + 0.15);
      }
    }
  }

  /* music: a small marimba loop, scheduled ahead */
  const SCALE = [262, 294, 330, 392, 440, 523, 587, 659];
  const PAT = [0, 2, 4, 2, 5, 4, 2, 4, 1, 3, 5, 3, 6, 5, 3, 5];
  const BASS = [131, 131, 110, 98];
  function musicTick() {
    if (!ctx || !musicOn || closed) return;
    const spb = 60 / 112 / 2;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.3) {
      const at = nextT - ctx.currentTime;
      const n = PAT[musStep % 16];
      tone(SCALE[n], 0.22, { type: 'sine', vol: 0.25, at, bus: musBus });
      tone(SCALE[n] * 2, 0.08, { type: 'triangle', vol: 0.05, at, bus: musBus });
      if (musStep % 4 === 0) tone(BASS[(musStep / 16 | 0) % 4], 0.4, { type: 'triangle', vol: 0.3, at, bus: musBus });
      musStep++; nextT += spb;
    }
  }
  musTimer = setInterval(musicTick, 100);

  return {
    sfx, charge,
    unlock() { unlocked = true; ensure(); },
    get sound() { return soundOn; },
    get music() { return musicOn; },
    setSound(v) { soundOn = !!v; if (sfxBus) sfxBus.gain.value = soundOn ? 0.9 : 0; },
    setMusic(v) { musicOn = !!v; if (musBus) musBus.gain.value = musicOn ? 0.22 : 0; },
    close() {
      closed = true; clearInterval(musTimer);
      if (ctx) { try { ctx.close(); } catch (e) { /* already closed */ } }
      ctx = null;
    },
  };
}
