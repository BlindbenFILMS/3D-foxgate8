/* 8 GATES 3D - CROQUET - WebAudio synth sound effects and a small garden music loop. No audio files. */

export function createAudio({ music = true, sound = true } = {}) {
  let ctx = null, master = null, sfxBus = null, musicBus = null;
  let musicOn = music, soundOn = sound, musicTimer = 0, nextBeat = 0, beat = 0, closed = false, unlocked = false;

  function ensure() {
    if (closed) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = soundOn ? 1 : 0; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.22 : 0; musicBus.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function noiseBuf(len) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function tone(freq, dur, { type = 'sine', vol = 0.3, at = 0, slide = 0, bus = null, attack = 0.004 } = {}) {
    if (!ensure()) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function knock(freq, vol, len = 0.06, q = 6) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = noiseBuf(len);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    n.connect(f); f.connect(g); g.connect(sfxBus);
    n.start(t);
  }

  const sfx = {
    /* mallet on ball: woody clack */
    mallet(p = 0.6) { knock(900 + p * 500, 0.5 + p * 0.4, 0.08, 4); tone(220 + p * 120, 0.09, { type: 'triangle', vol: 0.25 }); },
    /* ball on ball */
    click(v = 1) { const k = Math.min(1, v / 6); knock(2400, 0.25 + k * 0.5, 0.05, 9); tone(1500, 0.05, { type: 'square', vol: 0.05 + k * 0.08 }); },
    leg() { tone(1900, 0.25, { type: 'sine', vol: 0.12 }); tone(2870, 0.18, { type: 'sine', vol: 0.06 }); },
    pegtap() { knock(600, 0.4, 0.07, 3); },
    hoop() { [784, 988, 1175].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.18, at: i * 0.07 })); },
    roquet() { knock(2000, 0.6, 0.06, 8); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: 'square', vol: 0.06, at: 0.05 + i * 0.05 })); },
    out() { tone(220, 0.35, { type: 'sawtooth', vol: 0.1, slide: 0.6 }); },
    peg() { knock(500, 0.6, 0.1, 2); [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.4, { type: 'triangle', vol: 0.16, at: 0.08 + i * 0.09 })); },
    turn() { tone(660, 0.08, { type: 'sine', vol: 0.12 }); tone(880, 0.1, { type: 'sine', vol: 0.1, at: 0.07 }); },
    ui() { tone(1200, 0.04, { type: 'square', vol: 0.05 }); },
    tick() { tone(1800, 0.03, { type: 'sine', vol: 0.05 }); },
    win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.16, at: i * 0.11 })); },
    lose() { [392, 349, 311, 262].forEach((f, i) => tone(f, 0.34, { type: 'triangle', vol: 0.13, at: i * 0.16 })); },
    cane() { knock(3200, 0.18, 0.03, 12); },
  };

  /* garden music: plucked pentatonic arpeggio over a soft bass, scheduled ahead */
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
  const CHORDS = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]];
  function pluck(freq, t, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.value = 2200;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(f); f.connect(g); g.connect(musicBus);
    o.start(t); o.stop(t + 0.5);
  }
  function schedule() {
    if (!ctx || !musicOn || closed) return;
    const spb = 0.2;
    if (nextBeat < ctx.currentTime) nextBeat = ctx.currentTime + 0.05;
    while (nextBeat < ctx.currentTime + 0.5) {
      const bar = Math.floor(beat / 16) % CHORDS.length;
      const ch = CHORDS[bar];
      const base = 392;
      const i = beat % 16;
      if (i % 2 === 0) {
        const n = (i / 2) % 4 === 3 ? SCALE[(beat * 7) % SCALE.length] : ch[(i / 2) % 3] + 12;
        pluck(base * Math.pow(2, n / 12), nextBeat, 0.25);
      }
      if (i % 8 === 0) pluck(base / 2 * Math.pow(2, ch[0] / 12), nextBeat, 0.35);
      nextBeat += spb; beat++;
    }
  }

  function startMusicLoop() {
    clearInterval(musicTimer); musicTimer = 0;
    if (!musicOn || closed) return;
    musicTimer = setInterval(schedule, 120);
  }

  return {
    unlock() { unlocked = true; if (ensure() && !musicTimer) startMusicLoop(); },
    play(name, ...a) { if (!soundOn || !unlocked) return; try { if (ensure()) sfx[name] && sfx[name](...a); } catch (e) { /* ignore */ } },
    setSound(v) { soundOn = !!v; if (sfxBus) sfxBus.gain.value = soundOn ? 1 : 0; },
    setMusic(v) {
      musicOn = !!v;
      if (musicBus) musicBus.gain.value = musicOn ? 0.22 : 0;
      if (musicOn && ctx) startMusicLoop(); else clearInterval(musicTimer);
    },
    get sound() { return soundOn; },
    get music() { return musicOn; },
    close() { closed = true; clearInterval(musicTimer); if (ctx) ctx.close().catch(() => {}); ctx = null; },
  };
}
