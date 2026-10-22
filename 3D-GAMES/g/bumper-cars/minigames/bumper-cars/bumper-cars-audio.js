/* BUMPER CARS - WebAudio synth sound effects + a small fairground loop. No audio files. */

export function createAudio({ sound = true, music = true } = {}) {
  let ctx = null, master = null, sfx = null, mus = null, noiseBuf = null;
  let soundOn = sound, musicOn = music, closed = false;
  let engOsc = null, engGain = null, engFilt = null;
  let musTimer = 0, nextNote = 0, step = 0;

  function init() {
    if (ctx || closed) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = soundOn ? 1 : 0; sfx.connect(master);
    mus = ctx.createGain(); mus.gain.value = musicOn ? 0.32 : 0; mus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    engOsc = ctx.createOscillator(); engOsc.type = 'sawtooth'; engOsc.frequency.value = 55;
    engFilt = ctx.createBiquadFilter(); engFilt.type = 'lowpass'; engFilt.frequency.value = 300;
    engGain = ctx.createGain(); engGain.gain.value = 0;
    engOsc.connect(engFilt); engFilt.connect(engGain); engGain.connect(sfx); engOsc.start();
    nextNote = ctx.currentTime + 0.1;
    musTimer = setInterval(schedule, 60);
    return ctx;
  }
  function resume() { if (!ctx) init(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); }
  const now = () => ctx.currentTime;

  function tone(freq, dur, { type = 'square', vol = 0.2, to = null, at = 0, dest = null } = {}) {
    if (!ctx) return;
    const t = now() + at;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, { vol = 0.3, freq = 1200, q = 0.8, type = 'bandpass', at = 0 } = {}) {
    if (!ctx) return;
    const t = now() + at;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfx); s.start(t); s.stop(t + dur + 0.05);
  }

  /* ---- music: a bouncy fairground oom-pah in C, 132 bpm ---- */
  const BASS = [48, 55, 48, 55, 53, 60, 53, 60, 55, 62, 55, 62, 48, 55, 48, 43];
  const MEL = [72, 76, 79, 76, 77, 81, 84, 81, 79, 83, 86, 83, 84, 79, 76, 72,
               72, 74, 76, 77, 79, 77, 76, 74, 74, 79, 77, 74, 72, 0, 72, 0];
  const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
  function schedule() {
    if (!ctx || closed) return;
    const spb = 60 / 132 / 2;
    while (nextNote < ctx.currentTime + 0.25) {
      if (musicOn && ctx.state === 'running') {
        const at = nextNote - ctx.currentTime;
        if (step % 2 === 0) tone(mtof(BASS[(step / 2) % 16]), 0.22, { type: 'triangle', vol: 0.35, at: Math.max(0, at), dest: mus });
        else tone(mtof(BASS[((step - 1) / 2) % 16] + 16), 0.08, { type: 'square', vol: 0.06, at: Math.max(0, at), dest: mus });
        const n = MEL[step % 32];
        if (n) tone(mtof(n), 0.16, { type: 'square', vol: 0.07, at: Math.max(0, at), dest: mus });
      }
      nextNote += spb; step++;
    }
  }

  return {
    resume,
    get ready() { return !!ctx && ctx.state === 'running'; },
    setSound(on) { soundOn = on; if (sfx) sfx.gain.setTargetAtTime(on ? 1 : 0, now(), 0.05); },
    setMusic(on) { musicOn = on; if (mus) mus.gain.setTargetAtTime(on ? 0.32 : 0, now(), 0.1); },
    engine(speed01, on) {
      if (!ctx) return;
      const v = on ? 0.025 + speed01 * 0.05 : 0;
      engGain.gain.setTargetAtTime(v, now(), 0.08);
      engOsc.frequency.setTargetAtTime(48 + speed01 * 70, now(), 0.1);
      engFilt.frequency.setTargetAtTime(220 + speed01 * 700, now(), 0.1);
    },
    bump(power) {
      const p = Math.min(1, power);
      tone(110 + p * 40, 0.18, { type: 'sine', vol: 0.5 * (0.4 + p), to: 45 });
      noise(0.12 + p * 0.1, { vol: 0.35 * (0.4 + p), freq: 500, type: 'lowpass' });
      tone(520, 0.08, { type: 'square', vol: 0.05 + p * 0.06, to: 260 });
    },
    wall(power) { noise(0.1, { vol: 0.12 + power * 0.2, freq: 300, type: 'lowpass' }); },
    spark() { noise(0.07, { vol: 0.12, freq: 4200, q: 2 }); noise(0.05, { vol: 0.08, freq: 6500, q: 3, at: 0.05 }); },
    score(pts) { for (let i = 0; i < Math.min(pts, 4); i++) tone(660 * Math.pow(1.26, i), 0.09, { type: 'square', vol: 0.09, at: i * 0.06 }); },
    horn(pitch = 1) {
      tone(392 * pitch, 0.32, { type: 'square', vol: 0.12 }); tone(494 * pitch, 0.32, { type: 'square', vol: 0.1 });
    },
    boost() { noise(0.45, { vol: 0.25, freq: 900, type: 'bandpass', q: 0.6 }); tone(180, 0.4, { type: 'sawtooth', vol: 0.1, to: 420 }); },
    brake() { noise(0.25, { vol: 0.15, freq: 2600, q: 4 }); },
    star() { [0, 4, 7, 12].forEach((s, i) => tone(mtof(76 + s), 0.12, { type: 'triangle', vol: 0.22, at: i * 0.06 })); },
    beep(hi) { tone(hi ? 880 : 440, hi ? 0.4 : 0.14, { type: 'square', vol: 0.14 }); },
    win() { [0, 4, 7, 12, 7, 12].forEach((s, i) => tone(mtof(72 + s), 0.18, { type: 'square', vol: 0.12, at: i * 0.11 })); },
    lose() { [7, 4, 0].forEach((s, i) => tone(mtof(64 + s), 0.25, { type: 'triangle', vol: 0.18, at: i * 0.18 })); },
    click() { tone(1200, 0.04, { type: 'square', vol: 0.05 }); },
    close() {
      closed = true; clearInterval(musTimer);
      if (ctx) { try { ctx.close(); } catch (e) { /* already closed */ } }
      ctx = null;
    }
  };
}
