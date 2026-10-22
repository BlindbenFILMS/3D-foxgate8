/* 8 GATES 3D - VOLLEYBALL: WebAudio synth sound effects, a beach music loop,
   and an optional "ball sound" (a soft tone that follows the ball, for playing by ear).
   No audio files. */

export function createAudio(o = {}) {
  let ctx = null, master = null, sfx = null, mus = null, noiseBuf = null;
  const st = { sound: o.sound !== false, music: !!o.music, ball: false };
  let musTimer = 0, nextT = 0, step = 0;
  let ballOsc = null, ballGain = null, ballPan = null;

  function ac() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
    mus = ctx.createGain(); mus.gain.value = 0.22; mus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function unlock() {
    const c = ac();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    if (st.music && !musTimer) startMusic();
    if (st.ball && !ballOsc) makeBall();
  }

  function dest(pan, bus) {
    const b = bus || sfx;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      p.connect(b);
      return p;
    }
    return b;
  }

  function tone(f, d, { type = 'sine', v = 0.3, to = 0, at = 0, pan = 0, a = 0.004, bus = null, when = 0 } = {}) {
    if (!ctx || (!bus && !st.sound)) return;
    const t = (when || ctx.currentTime) + at;
    const os = ctx.createOscillator(), g = ctx.createGain();
    os.type = type;
    os.frequency.setValueAtTime(f, t);
    if (to) os.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    os.connect(g); g.connect(dest(pan, bus));
    os.start(t); os.stop(t + d + 0.05);
  }

  function noise(d, { v = 0.3, f = 1200, q = 1, type = 'bandpass', at = 0, pan = 0, to = 0, a = 0.004, bus = null, when = 0 } = {}) {
    if (!ctx || (!bus && !st.sound)) return;
    const t = (when || ctx.currentTime) + at;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (to) fl.frequency.exponentialRampToValueAtTime(to, t + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(fl); fl.connect(g); g.connect(dest(pan, bus));
    src.start(t, Math.random() * 0.5); src.stop(t + d + 0.05);
  }

  const S = {
    bump(pan) { tone(170, 0.14, { type: 'triangle', v: 0.55, to: 80, pan }); noise(0.08, { v: 0.35, f: 700, pan }); },
    set(pan) { tone(560, 0.08, { type: 'triangle', v: 0.32, to: 320, pan }); noise(0.05, { v: 0.2, f: 2400, pan }); },
    spike(pan) { noise(0.18, { v: 0.8, f: 2200, q: 0.7, to: 380, pan }); tone(150, 0.16, { type: 'square', v: 0.22, to: 55, pan }); },
    tip(pan) { tone(700, 0.06, { type: 'triangle', v: 0.25, to: 500, pan }); },
    serve(pan) { noise(0.12, { v: 0.6, f: 1500, q: 0.8, to: 500, pan }); tone(200, 0.12, { type: 'triangle', v: 0.35, to: 90, pan }); },
    toss() { tone(380, 0.12, { type: 'sine', v: 0.12, to: 620 }); },
    sand(pan, v = 0.5) { noise(0.26, { v, f: 420, q: 0.5, type: 'lowpass', to: 120, pan }); tone(90, 0.12, { type: 'sine', v: v * 0.5, to: 50, pan }); },
    net() { noise(0.4, { v: 0.32, f: 900, q: 4, to: 500 }); tone(110, 0.3, { type: 'sawtooth', v: 0.06, to: 70 }); },
    block() { noise(0.12, { v: 0.6, f: 1000, q: 1 }); tone(240, 0.14, { type: 'square', v: 0.2, to: 120 }); },
    jump() { tone(260, 0.12, { type: 'sine', v: 0.08, to: 420 }); },
    whistle() {
      if (!ctx || !st.sound) return;
      const t = ctx.currentTime;
      const os = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
      os.type = 'triangle'; os.frequency.value = 2500;
      lfo.frequency.value = 38; lg.gain.value = 140;
      lfo.connect(lg); lg.connect(os.frequency);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      g.gain.setValueAtTime(0.16, t + 0.32);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      os.connect(g); g.connect(sfx);
      os.start(t); lfo.start(t); os.stop(t + 0.5); lfo.stop(t + 0.5);
    },
    point(good) {
      const n = good ? [523, 659, 784, 1046] : [392, 330, 262];
      n.forEach((f, i) => tone(f, 0.16, { type: 'square', v: 0.1, at: i * 0.07 }));
    },
    cheer() { noise(1.3, { v: 0.22, f: 1600, q: 0.4, a: 0.25 }); noise(1.0, { v: 0.12, f: 3200, q: 0.6, a: 0.2, at: 0.1 }); },
    aww() { noise(0.9, { v: 0.12, f: 700, q: 0.8, to: 380, a: 0.15 }); },
    tick() { tone(880, 0.05, { type: 'square', v: 0.09 }); },
    cue() { tone(1320, 0.09, { type: 'square', v: 0.15 }); },
    perfect() { tone(1046, 0.08, { type: 'square', v: 0.1 }); tone(1568, 0.14, { type: 'square', v: 0.1, at: 0.06 }); },
    good() { tone(880, 0.1, { type: 'square', v: 0.08 }); },
    miss() { tone(220, 0.2, { type: 'sawtooth', v: 0.12, to: 110 }); },
    ui() { tone(660, 0.04, { type: 'square', v: 0.08 }); },
    win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.3, { type: 'square', v: 0.1, at: i * 0.11 })); },
    lose() { [392, 349, 311, 262].forEach((f, i) => tone(f, 0.32, { type: 'triangle', v: 0.16, at: i * 0.16 })); }
  };

  /* ---- music: I V vi IV beach groove, 100 bpm, 16th note steps ---- */
  const CH = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const MEL = [0, -1, 2, -1, 1, -1, 2, 0, -1, 1, -1, 2, 0, -1, 1, -1];
  function startMusic() {
    if (!ctx || musTimer) return;
    nextT = ctx.currentTime + 0.1; step = 0;
    musTimer = setInterval(sched, 25);
  }
  function stopMusic() { if (musTimer) clearInterval(musTimer); musTimer = 0; }
  function sched() {
    if (!ctx) return;
    const dt = 60 / 100 / 4;
    while (nextT < ctx.currentTime + 0.12) {
      const bar = Math.floor(step / 16) % 4, s = step % 16, ch = CH[bar];
      if (s === 0 || s === 10) tone(mtof(ch[0] - 24), 0.32, { type: 'triangle', v: 0.5, bus: mus, when: nextT });
      if (s === 6 || s === 14) tone(mtof(ch[2] - 24), 0.2, { type: 'triangle', v: 0.35, bus: mus, when: nextT });
      const mi = MEL[s];
      if (mi >= 0) {
        const f = mtof(ch[mi] + 12);
        tone(f, 0.22, { type: 'sine', v: 0.32, bus: mus, when: nextT });
        tone(f * 4, 0.06, { type: 'sine', v: 0.06, bus: mus, when: nextT });
      }
      if (s % 2 === 1) noise(0.04, { v: 0.12, f: 7000, q: 0.7, type: 'highpass', bus: mus, when: nextT });
      if (s === 4 || s === 12) noise(0.08, { v: 0.2, f: 2000, q: 0.6, bus: mus, when: nextT });
      nextT += dt; step++;
    }
  }

  /* ---- ball sound (accessibility) ---- */
  function makeBall() {
    if (!ctx || ballOsc) return;
    ballOsc = ctx.createOscillator(); ballOsc.type = 'sine'; ballOsc.frequency.value = 300;
    ballGain = ctx.createGain(); ballGain.gain.value = 0;
    let node = ballGain;
    if (ctx.createStereoPanner) { ballPan = ctx.createStereoPanner(); ballGain.connect(ballPan); node = ballPan; }
    node.connect(sfx);
    ballOsc.connect(ballGain); ballOsc.start();
  }
  function setBall(on, freq = 300, pan = 0, vol = 0.05) {
    if (!ctx) return;
    if (st.ball && !ballOsc) makeBall();
    if (!ballOsc) return;
    const t = ctx.currentTime;
    ballGain.gain.setTargetAtTime(on && st.ball && st.sound ? vol : 0, t, 0.05);
    ballOsc.frequency.setTargetAtTime(freq, t, 0.04);
    if (ballPan) ballPan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, 0.05);
  }

  return {
    ...S,
    unlock,
    setSound(on) { st.sound = !!on; if (!on) setBall(false); },
    setMusic(on) { st.music = !!on; if (on) { unlock(); startMusic(); } else stopMusic(); },
    setBallSound(on) { st.ball = !!on; if (on) unlock(); else setBall(false); },
    setBall,
    close() { stopMusic(); if (ctx) { try { ctx.close(); } catch (e) {} } ctx = null; ballOsc = null; }
  };
}
