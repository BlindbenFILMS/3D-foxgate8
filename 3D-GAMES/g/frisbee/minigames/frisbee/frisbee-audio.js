/* FRISBEE - WebAudio synth sound effects and a small music loop. No audio files. */

export function createAudio({ sound = true, music = true } = {}) {
  let ctx = null, master = null, sfxBus = null, musBus = null, noiseBuf = null;
  let soundOn = sound, musicOn = music, musicTimer = null, step = 0, nextT = 0, closed = false;

  function ensure() {
    if (closed) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = soundOn ? 0.9 : 0; sfxBus.connect(master);
      musBus = ctx.createGain(); musBus.gain.value = musicOn ? 0.22 : 0; musBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (musicOn && !musicTimer) startMusic();
    return ctx;
  }

  function tone(freq, t0, dur, { type = 'square', vol = 0.2, to = null, bus = sfxBus, attack = 0.005 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(t0, dur, { f0 = 800, f1 = 2400, q = 2, vol = 0.3, bus = sfxBus } = {}) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t0); s.stop(t0 + dur + 0.02);
  }

  const SFX = {
    throw(t, v = {}) {
      const lob = v.type === 'lob';
      noise(t, lob ? 0.55 : 0.32, { f0: 500, f1: lob ? 1400 : 2600, q: 3, vol: 0.32 });
      tone(lob ? 300 : 420, t, 0.12, { type: 'triangle', vol: 0.08, to: lob ? 520 : 900 });
    },
    catch(t) { tone(660, t, 0.07, { vol: 0.16 }); tone(990, t + 0.06, 0.1, { vol: 0.14 }); },
    block(t) { tone(160, t, 0.22, { type: 'sine', vol: 0.5, to: 60 }); noise(t, 0.12, { f0: 300, f1: 900, q: 1, vol: 0.4 }); tone(240, t + 0.09, 0.18, { type: 'sawtooth', vol: 0.08, to: 120 }); },
    land(t) { noise(t, 0.1, { f0: 400, f1: 200, q: 1, vol: 0.22 }); },
    turn(t) { tone(320, t, 0.18, { type: 'sawtooth', vol: 0.09, to: 160 }); tone(240, t + 0.16, 0.22, { type: 'sawtooth', vol: 0.08, to: 110 }); },
    tick(t, v = {}) { tone(v.hot ? 1500 : 1100, t, 0.04, { type: 'square', vol: v.hot ? 0.09 : 0.05 }); },
    whistle(t) { tone(2300, t, 0.32, { type: 'sine', vol: 0.12, to: 2100 }); tone(2350, t + 0.05, 0.24, { type: 'sine', vol: 0.06, to: 2200 }); },
    score(t) { [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.08, 0.2, { vol: 0.15 })); tone(1047, t + 0.34, 0.4, { type: 'triangle', vol: 0.15 }); },
    against(t) { [392, 330, 262].forEach((f, i) => tone(f, t + i * 0.1, 0.18, { type: 'triangle', vol: 0.15 })); },
    select(t) { tone(880, t, 0.05, { vol: 0.08 }); },
    win(t) { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.1, 0.22, { vol: 0.14 })); },
    lose(t) { [392, 370, 349, 262].forEach((f, i) => tone(f, t + i * 0.16, 0.3, { type: 'triangle', vol: 0.15 })); },
    dive(t) { noise(t, 0.2, { f0: 1800, f1: 500, q: 1.5, vol: 0.18 }); },
  };

  function play(name, v) {
    if (!soundOn || closed || !ctx) return; /* the context is only made by unlock() on a user gesture */
    if (!ensure() || !SFX[name]) return;
    try { SFX[name](ctx.currentTime + 0.005, v); } catch (e) { /* ignore */ }
  }

  /* --- music: 4-bar loop, plucky and light --- */
  const BPM = 112, S16 = 60 / BPM / 4;
  const prog = [[196, 247, 294], [165, 196, 247], [131, 165, 196], [147, 185, 220]];
  const lead = [0, 2, 4, 2, 1, 2, 4, 5];
  function startMusic() {
    if (!ctx || musicTimer) return;
    nextT = ctx.currentTime + 0.1; step = 0;
    musicTimer = setInterval(schedule, 60);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
  function schedule() {
    if (!ctx || !musicOn) return;
    while (nextT < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 16) % 4, s = step % 16, ch = prog[bar];
      if (s % 4 === 0) tone(ch[0] / 2, nextT, S16 * 3, { type: 'triangle', vol: 0.5, bus: musBus });
      if (s % 4 === 2) tone(ch[(s / 2) % 3 | 0] * 2, nextT, S16 * 1.5, { type: 'square', vol: 0.12, bus: musBus });
      if (s % 2 === 1 && (step * 7) % 5 < 2) {
        const n = lead[(step >> 1) % 8], sc = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3];
        tone(ch[0] * 2 * sc[n], nextT, S16 * 1.2, { type: 'triangle', vol: 0.18, bus: musBus });
      }
      nextT += S16; step++;
    }
  }

  return {
    unlock: ensure,
    play,
    setSound(b) { soundOn = !!b; if (sfxBus) sfxBus.gain.value = soundOn ? 0.9 : 0; },
    setMusic(b) {
      musicOn = !!b;
      if (musBus) musBus.gain.value = musicOn ? 0.22 : 0;
      if (musicOn && ctx) startMusic(); else stopMusic();
    },
    get sound() { return soundOn; },
    get music() { return musicOn; },
    close() { closed = true; stopMusic(); if (ctx) { try { ctx.close(); } catch (e) { /* ignore */ } ctx = null; } },
  };
}
