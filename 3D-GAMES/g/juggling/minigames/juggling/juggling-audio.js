/* 8 GATES 3D: JUGGLING, WebAudio synth sound + music. No audio files. */

export function createAudio({ music = true } = {}) {
  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  const st = { sound: true, music, cues: true, muted: false };
  let musicTimer = 0, nextNote = 0, step = 0, tempo = 0.45;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.22; musicBus.connect(master);
    const len = ctx.sampleRate * 1;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function resume() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
    if (c && st.music && !musicTimer) startMusic();
  }

  function out(pan) {
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(sfxBus); return p;
    }
    return sfxBus;
  }

  function tone({ f = 440, f2 = null, type = 'sine', t = 0, dur = 0.12, vol = 0.3, pan = 0, attack = 0.004, bus = null }) {
    if (!ctx) return;
    const now = ctx.currentTime + t;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, now);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(bus || out(pan));
    o.start(now); o.stop(now + dur + 0.02);
  }

  function noise({ t = 0, dur = 0.1, vol = 0.2, freq = 2000, q = 1, type = 'bandpass', pan = 0, bus = null }) {
    if (!ctx) return;
    const now = ctx.currentTime + t;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    s.connect(f); f.connect(g); g.connect(bus || out(pan));
    s.start(now, Math.random() * 0.5); s.stop(now + dur + 0.02);
  }

  const SFX = {
    perfect(p) { tone({ f: 880, f2: 1320, type: 'triangle', dur: 0.12, vol: 0.3, pan: p }); tone({ f: 1760, type: 'sine', t: 0.05, dur: 0.18, vol: 0.12, pan: p }); },
    good(p) { tone({ f: 660, f2: 820, type: 'triangle', dur: 0.1, vol: 0.28, pan: p }); },
    ok(p) { tone({ f: 440, f2: 470, type: 'triangle', dur: 0.09, vol: 0.24, pan: p }); },
    throw(p) { noise({ dur: 0.09, vol: 0.05, freq: 1800, q: 0.7, pan: p }); },
    drop(p) { tone({ f: 160, f2: 48, type: 'sine', dur: 0.32, vol: 0.5, pan: p }); noise({ dur: 0.08, vol: 0.12, freq: 400, q: 0.6, pan: p }); tone({ f: 330, f2: 220, type: 'square', t: 0.08, dur: 0.25, vol: 0.06, pan: p }); },
    bounce(p) { tone({ f: 120, f2: 70, type: 'sine', dur: 0.12, vol: 0.18, pan: p }); },
    early(p) { tone({ f: 220, f2: 180, type: 'square', dur: 0.08, vol: 0.08, pan: p }); },
    whiff(p) { noise({ dur: 0.05, vol: 0.05, freq: 3000, q: 2, pan: p }); },
    pop() { tone({ f: 300, f2: 900, type: 'sine', dur: 0.12, vol: 0.25 }); },
    count() { tone({ f: 523, type: 'square', dur: 0.1, vol: 0.12 }); },
    go() { tone({ f: 1046, type: 'square', dur: 0.22, vol: 0.14 }); },
    level() { [660, 880, 1100].forEach((f, i) => tone({ f, type: 'triangle', t: i * 0.06, dur: 0.12, vol: 0.18 })); },
    end() { tone({ f: 784, type: 'triangle', dur: 0.4, vol: 0.2 }); tone({ f: 523, type: 'triangle', t: 0.15, dur: 0.5, vol: 0.2 }); },
    cheer() { for (let i = 0; i < 6; i++) noise({ t: i * 0.07, dur: 0.35, vol: 0.06, freq: 900 + Math.random() * 1400, q: 0.8 }); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone({ f, type: 'triangle', t: i * 0.1, dur: 0.25, vol: 0.2 })); },
    lose() { [523, 466, 392].forEach((f, i) => tone({ f, type: 'triangle', t: i * 0.14, dur: 0.3, vol: 0.18 })); },
    tap() { tone({ f: 900, type: 'sine', dur: 0.04, vol: 0.08 }); }
  };

  function sfx(name, pan = 0) {
    if (!st.sound || st.muted || !ctx) return;
    const fn = SFX[name]; if (fn) fn(pan);
  }

  /* rhythm cue for a hand: a soft pre-tick and an accent on the beat.
     left = low, right = high, panned hard so it works on mono too. */
  function cue(hand, delay, accent) {
    if (!st.sound || !st.cues || st.muted || !ctx) return;
    const pan = hand === 0 ? -0.85 : 0.85;
    const f = hand === 0 ? 392 : 659;
    if (accent) tone({ f, type: 'sine', t: Math.max(0, delay), dur: 0.07, vol: 0.2, pan });
    else tone({ f: f * 0.5, type: 'sine', t: Math.max(0, delay), dur: 0.05, vol: 0.08, pan });
  }

  /* --- music: small oom-pah street-band loop, tempo follows the juggling beat --- */
  const BASS = [0, 7, 0, 7, 5, 12, 5, 12, 7, 14, 7, 14, 0, 7, 0, 7];
  const MEL = [12, null, 16, null, 19, 16, null, 12, 14, null, 17, null, 19, null, 16, null,
    12, null, 16, null, 19, 21, 19, 16, 14, null, 11, null, 12, null, null, null];
  function startMusic() {
    if (!ctx || musicTimer) return;
    nextNote = ctx.currentTime + 0.05; step = 0;
    musicTimer = setInterval(schedule, 40);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = 0; } }
  function schedule() {
    if (!ctx || !st.music || st.muted) return;
    const half = tempo / 2;
    while (nextNote < ctx.currentTime + 0.15) {
      const t = nextNote - ctx.currentTime;
      const root = 130.81; /* C3 */
      if (step % 2 === 0) {
        const b = BASS[(step / 2) % 16];
        tone({ f: root * Math.pow(2, b / 12) / 2, type: 'triangle', t, dur: half * 0.9, vol: 0.5, bus: musicBus });
      } else {
        noise({ t, dur: 0.04, vol: 0.12, freq: 7000, q: 1, type: 'highpass', bus: musicBus });
        tone({ f: root * 2 * Math.pow(2, 4 / 12), type: 'square', t, dur: 0.06, vol: 0.06, bus: musicBus });
      }
      const m = MEL[step % 32];
      if (m !== null && m !== undefined) tone({ f: root * 2 * Math.pow(2, m / 12), type: 'square', t, dur: half * 0.8, vol: 0.09, bus: musicBus });
      nextNote += half; step++;
    }
  }

  return {
    resume,
    sfx,
    cue,
    get ctx() { return ctx; },
    setTempo(b) { tempo = Math.max(0.3, Math.min(0.7, b)); },
    set(opts) {
      Object.assign(st, opts);
      if (!st.music) stopMusic(); else if (ctx) startMusic();
    },
    mute(m) { st.muted = !!m; },
    get state() { return { ...st }; },
    close() { stopMusic(); if (ctx) { try { ctx.close(); } catch (e) { /* ignore */ } ctx = null; } }
  };
}
