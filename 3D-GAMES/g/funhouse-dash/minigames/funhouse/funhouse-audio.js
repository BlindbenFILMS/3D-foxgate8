/* FUNHOUSE DASH: WebAudio synth sound effects + a calliope waltz. No audio files. */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

/* An original 8-bar waltz in C (3/4). [midi, beats] per note. */
const MELODY = [
  [76, 1], [79, .5], [76, .5], [72, 1],
  [74, 1], [77, .5], [74, .5], [71, 1],
  [72, .5], [74, .5], [76, .5], [77, .5], [79, 1],
  [81, 1], [79, 2],
  [76, 1], [79, .5], [76, .5], [84, 1],
  [83, 1], [81, .5], [79, .5], [77, 1],
  [76, .5], [77, .5], [79, .5], [76, .5], [74, 1],
  [72, 3],
];
const CHORDS = [[48, [60, 64, 67]], [43, [59, 62, 67]], [48, [60, 64, 67]], [41, [60, 65, 69]],
  [48, [60, 64, 67]], [43, [59, 62, 65]], [43, [59, 62, 67]], [48, [60, 64, 67]]];
const MEL_EVENTS = (() => {
  const out = []; let b = 0;
  for (const [m, d] of MELODY) { out.push({ b, m, d }); b += d; }
  return out;
})();

export function createAudio(opts = {}) {
  let ctx = null, master = null, sfx = null, mus = null, noiseBuf = null;
  let soundOn = opts.sound !== false, musicOn = !!opts.music;
  let musTimer = 0, nextT = 0, beat = 0;
  let rumbleSrc = null, rumbleGain = null;
  const BEAT = 60 / 168;

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = soundOn ? 0.85 : 0; sfx.connect(master);
    mus = ctx.createGain(); mus.gain.value = musicOn ? 0.2 : 0; mus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function unlock() {
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (musicOn && !musTimer) startMusic();
  }

  function out(pan, dest) {
    if (dest) return dest;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      p.connect(sfx);
      return p;
    }
    return sfx;
  }

  function tone(f, dur, o = {}) {
    if (!ctx || (!soundOn && !o.dest)) return;
    const t = ctx.currentTime + (o.at || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const v = o.vol == null ? 0.25 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + (o.attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(out(o.pan, o.dest));
    osc.start(t); osc.stop(t + dur + 0.03);
  }

  function noise(dur, o = {}) {
    if (!ctx || !soundOn) return;
    const t = ctx.currentTime + (o.at || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1200, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain(); const v = o.vol == null ? 0.25 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + (o.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out(o.pan));
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  const S = {
    step(v = 1) { tone(150, 0.05, { type: 'triangle', vol: 0.07 * v }); noise(0.03, { type: 'highpass', f: 2500, vol: 0.03 * v }); },
    ding() { tone(1318, 0.12, { type: 'square', vol: 0.06 }); tone(1760, 0.3, { type: 'square', vol: 0.06, at: 0.07 }); },
    bonk(pan = 0) {
      tone(320, 0.5, { vol: 0.35, to: 80, pan });
      tone(640, 0.35, { type: 'triangle', vol: 0.1, to: 180, pan });
      noise(0.14, { type: 'lowpass', f: 380, vol: 0.4, pan });
      for (let i = 0; i < 4; i++) tone(260 - i * 30, 0.09, { type: 'sine', vol: 0.1, at: 0.5 + i * 0.09, pan });
    },
    whoosh(pan = 0, v = 1) { noise(0.38, { f: 380, to: 1900, q: 1.4, vol: 0.28 * v, pan, attack: 0.12 }); },
    hiss(pan = 0, v = 1) { noise(0.5, { type: 'highpass', f: 2800, vol: 0.14 * v, pan, attack: 0.4 }); },
    puff(pan = 0, v = 1) { noise(0.32, { type: 'lowpass', f: 1100, to: 200, vol: 0.4 * v, pan }); tone(95, 0.22, { vol: 0.2 * v, to: 50, pan }); },
    creak(v = 1) { tone(190, 0.4, { type: 'sawtooth', vol: 0.035 * v, to: 120, attack: 0.1 }); },
    slip() { tone(620, 0.55, { type: 'triangle', vol: 0.16, to: 160 }); noise(0.4, { f: 900, to: 300, vol: 0.12 }); },
    chime(pan = 0) {
      tone(1568, 1.1, { vol: 0.2, pan }); tone(2352, 0.7, { vol: 0.07, pan }); tone(3136, 0.45, { vol: 0.04, pan });
    },
    glass(pan = 0) { noise(0.45, { type: 'highpass', f: 4200, vol: 0.32, pan }); tone(2600, 0.25, { type: 'square', vol: 0.05, to: 1500, pan }); },
    doorOpen() { tone(523, 0.16, { type: 'triangle', vol: 0.15 }); tone(784, 0.3, { type: 'triangle', vol: 0.15, at: 0.1 }); },
    whee() { tone(400, 0.7, { type: 'triangle', vol: 0.12, to: 1200 }); },
    count() { tone(660, 0.16, { type: 'square', vol: 0.08 }); },
    go() { tone(990, 0.4, { type: 'square', vol: 0.1 }); tone(1320, 0.4, { type: 'square', vol: 0.05, at: 0.04 }); },
    fanfare() { [72, 76, 79, 84].forEach((m, i) => tone(mtof(m), i === 3 ? 0.6 : 0.18, { type: 'square', vol: 0.08, at: i * 0.12 })); },
    lose() { [67, 64, 60].forEach((m, i) => tone(mtof(m), 0.3, { type: 'triangle', vol: 0.12, at: i * 0.2 })); },
    click() { tone(1100, 0.04, { type: 'square', vol: 0.04 }); },
  };

  function rumble(level) {
    if (!ctx || !soundOn) { if (rumbleGain) rumbleGain.gain.value = 0; return; }
    if (!rumbleSrc) {
      rumbleSrc = ctx.createBufferSource(); rumbleSrc.buffer = noiseBuf; rumbleSrc.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 170;
      rumbleGain = ctx.createGain(); rumbleGain.gain.value = 0;
      rumbleSrc.connect(f); f.connect(rumbleGain); rumbleGain.connect(sfx);
      rumbleSrc.start();
    }
    rumbleGain.gain.setTargetAtTime(clamp(level, 0, 1) * 0.35, ctx.currentTime, 0.1);
  }

  function schedule() {
    if (!ctx) return;
    while (nextT < ctx.currentTime + 0.25) {
      const bar = Math.floor(beat / 3) % 8, inBar = beat % 3;
      const [root, ch] = CHORDS[bar];
      if (inBar === 0) tone(mtof(root), BEAT * 0.9, { type: 'triangle', vol: 0.3, dest: mus, at: nextT - ctx.currentTime });
      else ch.forEach((m) => tone(mtof(m), BEAT * 0.45, { type: 'square', vol: 0.035, dest: mus, at: nextT - ctx.currentTime }));
      const b0 = beat % 24;
      for (const e of MEL_EVENTS) {
        if (e.b >= b0 && e.b < b0 + 1) {
          const at = nextT + (e.b - b0) * BEAT - ctx.currentTime;
          tone(mtof(e.m), e.d * BEAT * 0.9, { type: 'square', vol: 0.07, dest: mus, at });
          tone(mtof(e.m + 12), e.d * BEAT * 0.7, { type: 'sine', vol: 0.05, dest: mus, at });
        }
      }
      nextT += BEAT; beat++;
    }
  }
  function startMusic() {
    if (!ctx || musTimer) return;
    nextT = ctx.currentTime + 0.1;
    musTimer = setInterval(schedule, 60);
  }
  function stopMusic() { if (musTimer) clearInterval(musTimer); musTimer = 0; }

  return {
    S, unlock, rumble,
    get sound() { return soundOn; },
    get music() { return musicOn; },
    setSound(b) { soundOn = !!b; if (sfx) sfx.gain.value = soundOn ? 0.85 : 0; if (!soundOn && rumbleGain) rumbleGain.gain.value = 0; },
    setMusic(b) {
      musicOn = !!b;
      if (mus) mus.gain.value = musicOn ? 0.2 : 0;
      if (musicOn) startMusic(); else stopMusic();
    },
    close() {
      stopMusic();
      try { if (rumbleSrc) rumbleSrc.stop(); } catch (e) { /* already stopped */ }
      if (ctx) ctx.close();
      ctx = null;
    },
  };
}
