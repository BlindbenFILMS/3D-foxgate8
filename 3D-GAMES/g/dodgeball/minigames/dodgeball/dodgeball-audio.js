/* DODGEBALL sound: WebAudio synth only, no files. */

export function createAudio({ music = true } = {}) {
  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let sfxOn = true, musicOn = music, musicTimer = 0, step = 0, nextT = 0;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.22 : 0; musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
    return ctx;
  }

  function out(pan) {
    if (pan === undefined || !ctx.createStereoPanner) return sfxBus;
    const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(sfxBus);
    return p;
  }
  function tone(type, f0, f1, dur, vol, pan, t0 = 0) {
    if (!ctx || !sfxOn) return;
    const t = ctx.currentTime + t0;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out(pan)); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, type, f0, f1, pan, q = 1, t0 = 0) {
    if (!ctx || !sfxOn) return;
    const t = ctx.currentTime + t0;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out(pan)); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  const sfx = {
    throw(power, pan) { noise(0.22, 0.35 + power * 0.3, 'bandpass', 600, 2600 + power * 2000, pan, 2); tone('sine', 220, 520, 0.12, 0.08, pan); },
    perfect(pan) { tone('square', 880, 1760, 0.14, 0.06, pan); tone('sine', 1320, 1320, 0.2, 0.08, pan, 0.06); },
    hit(pan) { tone('sine', 160, 50, 0.25, 0.7, pan); noise(0.12, 0.6, 'lowpass', 2400, 300, pan); },
    catch(pan) { tone('sine', 300, 120, 0.1, 0.5, pan); tone('triangle', 784, 784, 0.12, 0.18, pan, 0.05); tone('triangle', 1175, 1175, 0.18, 0.18, pan, 0.11); },
    block(pan) { tone('square', 200, 90, 0.12, 0.2, pan); noise(0.08, 0.4, 'highpass', 1500, 0, pan); },
    bounce(v, pan) { const k = Math.min(1, v / 14); if (k < 0.08) return; tone('sine', 140 + k * 60, 70, 0.1, 0.35 * k, pan); },
    pick(pan) { tone('triangle', 440, 660, 0.07, 0.15, pan); },
    dash(pan) { noise(0.16, 0.25, 'bandpass', 1800, 600, pan, 1.5); },
    out() { tone('sawtooth', 220, 110, 0.35, 0.12); tone('square', 165, 82, 0.35, 0.08); },
    back() { [523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.12, 0.15, undefined, i * 0.07)); },
    beep(hi) { tone('square', hi ? 1046 : 523, hi ? 1046 : 523, hi ? 0.35 : 0.12, 0.1); },
    whistle() { if (!ctx || !sfxOn) return; const t = ctx.currentTime; const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = 2700; lfo.frequency.value = 38; lg.gain.value = 120; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.02); g.gain.setValueAtTime(0.06, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g); g.connect(sfxBus); o.start(t); lfo.start(t); o.stop(t + 0.55); lfo.stop(t + 0.55); },
    cheer() { noise(1.4, 0.18, 'bandpass', 900, 1400, undefined, 0.7); noise(1.1, 0.1, 'bandpass', 2200, 1800, undefined, 1, 0.1); },
    win() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.18, 0.16, undefined, i * 0.11)); },
    lose() { [392, 349, 311, 262].forEach((f, i) => tone('triangle', f, f * 0.98, 0.25, 0.14, undefined, i * 0.16)); },
    /* incoming-ball cue for the player's fox: a tick that rises as the ball gets near */
    warn(k, pan) { tone('sine', 600 + 900 * k, 600 + 900 * k, 0.05, 0.07 + 0.08 * k, pan); },
    now(pan) { tone('square', 1568, 1568, 0.06, 0.07, pan); },
    tap() { tone('sine', 660, 660, 0.04, 0.05); },
  };

  /* tiny loop: bass + hats + a 4-note hook, scheduled ahead */
  const BASS = [55, 0, 55, 65.4, 73.4, 0, 65.4, 49];
  const HOOK = [440, 0, 0, 523, 0, 587, 0, 0, 659, 0, 587, 0, 523, 0, 0, 0];
  function startMusic() {
    if (musicTimer || !ctx) return;
    nextT = ctx.currentTime + 0.1;
    musicTimer = setInterval(() => {
      if (!ctx) return;
      const spb = 60 / 118 / 2;
      while (nextT < ctx.currentTime + 0.25) {
        const t = nextT, s = step % 16;
        if (musicOn) {
          const b = BASS[(step >> 1) % 8];
          if (s % 2 === 0 && b) mtone('triangle', b, 0.22, 0.4, t);
          if (s % 2 === 1) mnoise(0.04, 0.08, t);
          if (s % 4 === 0) mtone('sine', 120, 0.1, 0.35, t, 45);
          const h = HOOK[s];
          if (h && (step >> 4) % 2 === 1) mtone('square', h, 0.12, 0.05, t);
        }
        nextT += spb; step++;
      }
    }, 60);
  }
  function mtone(type, f, dur, vol, t, f1) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.02);
  }
  function mnoise(dur, vol, t) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(musicBus); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }

  return {
    unlock: ensure,
    sfx: new Proxy(sfx, { get: (o, k) => (...a) => { if (ctx && sfxOn) { try { o[k](...a); } catch (e) { /* audio is best effort */ } } } }),
    setSound(on) { sfxOn = !!on; },
    setMusic(on) { musicOn = !!on; if (musicBus) musicBus.gain.setTargetAtTime(musicOn ? 0.22 : 0, ctx.currentTime, 0.1); },
    get sound() { return sfxOn; },
    get music() { return musicOn; },
    close() { clearInterval(musicTimer); musicTimer = 0; if (ctx) { try { ctx.close(); } catch (e) { /* ignore */ } } ctx = null; },
  };
}
