/* FOX FARM: WebAudio synth sound effects + a small banjo-ish loop. No audio files. */

export function createAudio({ music = true } = {}) {
  let ctx = null, master = null, sfxGain = null, musGain = null;
  let sfxOn = true, musicOn = music, musicTimer = null, step = 0;

  function ensure() {
    if (ctx) return ctx;
    const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.gain.value = sfxOn ? 0.9 : 0; sfxGain.connect(master);
      musGain = ctx.createGain(); musGain.gain.value = musicOn ? 0.22 : 0; musGain.connect(master);
    } catch (e) { ctx = null; }
    return ctx;
  }
  function unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume().catch(() => {}); if (musicOn) startMusic(); }

  function tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, at = 0, attack = 0.005, out = sfxGain } = {}) {
    const c = ensure(); if (!c || !out) return;
    const t0 = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, { vol = 0.25, freq = 1200, q = 1, type = 'bandpass', at = 0, slide = 0 } = {}) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + at;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t0);
  }

  const PITCH = { lettuce: 880, carrot: 660, corn: 440 };
  const fx = {
    tap() { tone(1200, 0.05, { type: 'triangle', vol: 0.12 }); },
    queue() { tone(990, 0.07, { type: 'triangle', vol: 0.14 }); },
    unqueue() { tone(520, 0.08, { type: 'triangle', vol: 0.12, slide: 0.7 }); },
    seed(k) { tone(PITCH[k] || 600, 0.09, { type: 'square', vol: 0.07 }); tone((PITCH[k] || 600) * 1.5, 0.09, { type: 'square', vol: 0.05, at: 0.06 }); },
    plant() { noise(0.12, { vol: 0.3, freq: 300, q: 0.8, type: 'lowpass' }); tone(180, 0.12, { type: 'sine', vol: 0.25, slide: 0.6 }); },
    water() { for (let i = 0; i < 5; i++) tone(700 + Math.random() * 700, 0.07, { type: 'sine', vol: 0.12, slide: 1.6, at: i * 0.05 }); noise(0.3, { vol: 0.12, freq: 3000, q: 0.6 }); },
    pick(k, golden) {
      const f = PITCH[k] || 600;
      noise(0.08, { vol: 0.25, freq: k === 'corn' ? 900 : 2200, q: 2 });
      tone(f, 0.12, { type: 'triangle', vol: 0.28, slide: 1.5 });
      tone(f * 1.5, 0.16, { type: 'triangle', vol: 0.2, at: 0.07 });
      if (golden) [1, 1.26, 1.5, 2].forEach((m, i) => tone(f * m * 2, 0.18, { type: 'sine', vol: 0.12, at: 0.12 + i * 0.06 }));
    },
    ripe(k) { const f = PITCH[k] || 600; tone(f * 2, 0.25, { type: 'sine', vol: 0.09 }); tone(f * 3, 0.25, { type: 'sine', vol: 0.05, at: 0.05 }); },
    thirsty() { tone(1500, 0.06, { type: 'sine', vol: 0.06, slide: 0.6 }); },
    wilt() { tone(400, 0.5, { type: 'sawtooth', vol: 0.06, slide: 0.4 }); },
    clear() { noise(0.15, { vol: 0.2, freq: 600, q: 0.7, slide: 0.5 }); },
    crow() { tone(700, 0.18, { type: 'sawtooth', vol: 0.12, slide: 0.6 }); tone(650, 0.2, { type: 'sawtooth', vol: 0.12, slide: 0.55, at: 0.24 }); },
    shoo() { noise(0.3, { vol: 0.3, freq: 800, q: 0.7, slide: 4 }); tone(900, 0.14, { type: 'sawtooth', vol: 0.08, slide: 1.6, at: 0.05 }); },
    eaten() { tone(300, 0.3, { type: 'square', vol: 0.08, slide: 0.5 }); },
    salad() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { type: 'triangle', vol: 0.18, at: i * 0.08 })); },
    tick() { tone(1400, 0.05, { type: 'square', vol: 0.06 }); },
    cane() { tone(2400, 0.03, { type: 'triangle', vol: 0.05 }); },
    win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.2, at: i * 0.12 })); },
    lose() { [440, 392, 330, 262].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.16, at: i * 0.18 })); },
    turn() { tone(660, 0.12, { type: 'triangle', vol: 0.16 }); tone(990, 0.16, { type: 'triangle', vol: 0.16, at: 0.1 }); },
  };

  /* little country loop: bass + plucked arpeggio */
  const CH = [[196, 247, 294], [262, 330, 392], [196, 247, 294], [294, 370, 440]];
  function musicStep() {
    const c = ctx; if (!c || !musicOn) return;
    const ch = CH[Math.floor(step / 8) % CH.length], i = step % 8;
    if (i % 4 === 0) tone(ch[0] / 2, 0.3, { type: 'triangle', vol: 0.5, out: musGain });
    const n = [0, 1, 2, 1, 2, 1, 0, 2][i];
    tone(ch[n] * 2, 0.18, { type: 'square', vol: 0.12, out: musGain, attack: 0.002 });
    step++;
  }
  function startMusic() { if (musicTimer || !musicOn || !ensure()) return; musicTimer = setInterval(musicStep, 190); }
  function stopMusic() { if (musicTimer) clearInterval(musicTimer); musicTimer = null; }

  return {
    fx, unlock,
    play(name, ...a) { if (!sfxOn) return; try { ensure(); fx[name] && fx[name](...a); } catch (e) { /* ignore */ } },
    setSound(on) { sfxOn = !!on; if (sfxGain) sfxGain.gain.value = sfxOn ? 0.9 : 0; },
    setMusic(on) { musicOn = !!on; if (musGain) musGain.gain.value = musicOn ? 0.22 : 0; if (musicOn) startMusic(); else stopMusic(); },
    get sound() { return sfxOn; }, get music() { return musicOn; },
    close() { stopMusic(); if (ctx) { try { ctx.close(); } catch (e) { /* ignore */ } } ctx = null; },
  };
}
