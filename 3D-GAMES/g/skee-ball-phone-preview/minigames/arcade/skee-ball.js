// 8 GATES — ARCADE · SKEE-BALL [arcadeSkee] (master list #35). A drop-in arcade interior: five lanes, neon, carpet, a prize counter.
// Fits any building on any world (the room is self-contained and lit on its own).
// PLAY: swipe up from the ball to roll it (speed of the swipe = power, angle = aim, a curved swipe = spin). Drag sideways first to move the ball.
//       EASY ROLL (and Space / Enter on desktop): tap to lock the aim, tap to lock the power.
// MODES: SOLO (9 balls, Hope plays the next lane) · PASS & PLAY (2–5 on one phone, take turns ball by ball) · ONLINE (2–5, everyone rolls on their own lane at once).
// SOUND GUIDE: aim = left/right pan, power = pitch, every score is spoken (for players who can't see the board). Phones that can, buzz on each score.
// Holes: 10 · 20 · 30 · 40 · 50 rings, two 100 pockets in the top corners. Balls that stop short roll back for 0.
// MERGE: createSkeeBall({ container, onState }) stands alone. buildArcade() makes the room into its own scene; a world can open the DC page in a panel (?embed=1).
// Online uses engine/duel-net.js (connectDuel, same as the Skate Park). If that file is missing, it falls back to a same-device test (two tabs).
import * as THREE from '../../vendor/three/three.module.js';
import { foxKit, PLAYER_MALE, HOPE_LOOK, PLAYER_FEMALE } from '../../fox-kit.js';
import { castKit } from '../../engine/cast.js';
import { save } from '../../engine/save.js';

export const KEY = 'arcadeSkee';
export const BALLS = 9;
export const COLS = [['RED', '#ec3013'], ['BLUE', '#38bdf8'], ['GOLD', '#ffd23a'], ['GREEN', '#22c55e'], ['PINK', '#f472b6']];
export const MAX_PLAYERS = 5;
// rewards (DRAFT for Ben): tickets = score / 10, gold = score / 50, XP = score / 30
export const REWARD = { ticketPer: 10, goldPer: 50, xpPer: 30, clubScore: 450 };
const HOPE_LINES = { // DRAFT lines for Ben
  hello: 'Listen to the roll. A deep thunk is the fifty.',
  hundred: 'A hundred! I heard it drop in the corner.',
  short: 'Too soft. Give it a little more push.',
  hard: 'Too hard. It hit the back wall.',
  fifty: 'Fifty! Right down the middle.',
  end: 'Good game. Tickets are at the prize counter.',
};

// ---------- small helpers (copied, not imported, so this game needs no shared-file change) ----------
const rr = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), pick = a => a[Math.floor(Math.random() * a.length)];
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newCode = () => Array.from({ length: 4 }, () => CODE_CH[Math.floor(Math.random() * CODE_CH.length)]).join('');

// ---------- the machine (metres; a fox is ~2 tall) ----------
const LANES = 5, GAP = 1.22, LW = 0.86, LL = 2.6, Y0 = 0.78, SLOPE = 0.05, R = 0.055;
const TH = 38 * Math.PI / 180, ST = Math.sin(TH), CT = Math.cos(TH), BW = 0.86, BH = 1.0, BZ0 = -LL - 0.16, BY0 = Y0 + LL * SLOPE + 0.05;
const RC = 0.46, RINGS = [0.065, 0.14, 0.22, 0.31, 0.40], BAND_PTS = [50, 40, 30, 20, 10], POCKETS = [[-0.27, 0.9], [0.27, 0.9]], PR = 0.058;
const FR = 1.0, G = 1.7, HOP = 0.62, DT = 1 / 120;
const laneX = i => (i - 2) * GAP;
const band = r => { for (let k = 0; k < RINGS.length; k++) if (r < RINGS[k]) return k; return RINGS.length; };
const holeW = k => k === 0 ? RC : RC - (RINGS[k - 1] + RINGS[k]) / 2;

// ---------- the roll: one deterministic simulation used for your ball, a friend's ball and Hope's ball ----------
// p = { x0, v0, vx, ax, seed }  →  phases lane → air → board → drop (or back = too soft)
export function newRoll(p) { return { p, rng: mulberry32((p.seed >>> 0) || 1), ph: 'lane', x: p.x0, s: 0, v: p.v0, vx: p.vx, ax: p.ax || 0, t: 0, spin: 0, bx: 0, bw: 0, vbx: 0, vbw: 0, still: 0, pts: null, why: '', land: null, ev: [], dropT: 0, air: null }; }
function launch(b) {
  const ve = b.v, rng = b.rng; let wl = 0.05 + ve * 0.26 + (rng() - 0.5) * 0.035, xl = b.x + b.vx * 0.35 + (rng() - 0.5) * 0.03, vbw = ve * 0.22, vbx = b.vx * 0.5, hard = false;
  if (wl > 0.98) { hard = true; wl = 0.98 - Math.min(0.3, (wl - 0.98) * 0.5); vbw = -0.3 - rng() * 0.3; }
  xl = clamp(xl, -BW / 2 + R, BW / 2 - R);
  b.ph = 'air'; b.air = { t: 0, T: 0.28 + ve * 0.045, x0: b.x, xl, wl, h: 0.16 + ve * 0.04 }; b.land = { w: wl, hard }; b.vbx = vbx; b.vbw = vbw; b.ev.push(['launch', ve]);
}
function drop(b, pts, why, hx, hw) { b.ph = 'drop'; b.pts = pts; b.why = why; b.dropT = 0; b.hole = { x: hx, w: hw, x0: b.bx, w0: b.bw }; b.ev.push(['drop', pts]); }
export function stepRoll(b, dt) {
  b.t += dt;
  if (b.ph === 'lane') {
    b.v -= FR * dt; b.vx += b.ax * dt; b.x += b.vx * dt; b.s += b.v * dt; b.spin += b.v * dt / R;
    const lim = LW / 2 - R - 0.01; if (Math.abs(b.x) > lim) { b.x = Math.sign(b.x) * lim; b.vx = -b.vx * 0.55; b.ax *= 0.4; b.v *= 0.96; b.ev.push(['wall', Math.abs(b.vx)]); }
    if (b.v <= 0 && b.s < LL) { b.ph = 'back'; b.v = 0; b.ev.push(['short']); } else if (b.s >= LL) launch(b);
  } else if (b.ph === 'back') {
    b.v -= FR * 1.2 * dt; b.s += b.v * dt; b.spin += b.v * dt / R; b.vx *= 0.98; b.x += b.vx * dt * 0.3;
    if (b.s <= 0) { b.s = 0; b.ph = 'done'; b.pts = 0; b.why = 'short'; b.ev.push(['drop', 0]); }
  } else if (b.ph === 'air') {
    const a = b.air; a.t += dt; if (a.t >= a.T) { b.ph = 'board'; b.bx = a.xl; b.bw = a.wl; b.ev.push(['land', b.land.hard]); }
  } else if (b.ph === 'board') {
    b.vbw -= G * dt; const dm = Math.exp(-1.6 * dt); b.vbx *= dm; b.vbw *= dm;
    let nx = b.bx + b.vbx * dt, nw = b.bw + b.vbw * dt; const xl = BW / 2 - R;
    if (Math.abs(nx) > xl) { nx = Math.sign(nx) * xl; b.vbx = -b.vbx * 0.5; b.ev.push(['clack', 0.4]); }
    if (nw > BH - R) { nw = BH - R; b.vbw = -Math.abs(b.vbw) * 0.4; }
    const sp = Math.hypot(b.vbx, b.vbw);
    for (const [px, pw] of POCKETS) { const d = Math.hypot(nx - px, nw - pw); if (d < PR * 0.95) { if (sp < 0.9) { b.bx = nx; b.bw = nw; drop(b, 100, 'pocket', px, pw); return; } const ux = (nx - px) / d, uw = (nw - pw) / d, vr = b.vbx * ux + b.vbw * uw; if (vr < 0) { b.vbx -= 1.5 * vr * ux; b.vbw -= 1.5 * vr * uw; } nx = b.bx; nw = b.bw; b.ev.push(['clack', 0.6]); break; } }
    const r0 = Math.hypot(b.bx, b.bw - RC), r1 = Math.hypot(nx, nw - RC), k0 = band(r0), k1 = band(r1);
    if (k0 !== k1 && r1 > 1e-4) {
      const ux = nx / r1, uw = (nw - RC) / r1, vr = b.vbx * ux + b.vbw * uw, funnel = k0 === RINGS.length && k1 === RINGS.length - 1 && b.bw > RC - 0.1;
      if (Math.abs(vr) < HOP && !funnel) { b.vbx -= 1.35 * vr * ux; b.vbw -= 1.35 * vr * uw; nx = b.bx; nw = b.bw; if (Math.abs(vr) > 0.08) b.ev.push(['clack', Math.abs(vr)]); }
      else { b.vbx *= 0.72; b.vbw *= 0.72; b.ev.push(['hop', Math.abs(vr)]); }
    }
    b.bx = nx; b.bw = nw;
    const r = Math.hypot(b.bx, b.bw - RC), k = band(r);
    if (k === 0 && sp < 1.3) { drop(b, 50, 'ring', 0, RC); return; }
    if (b.bw < R) { b.bw = R; if (k === RINGS.length) { drop(b, 0, 'gutter', b.bx, -0.05); return; } b.vbw = Math.abs(b.vbw) * 0.3; }
    if (sp < 0.08) b.still += dt; else b.still = 0;
    if (b.still > 0.14 || b.t > 7) { if (k === RINGS.length) drop(b, b.bw > RC ? 10 : 0, b.bw > RC ? 'ring' : 'gutter', b.bw > RC ? 0 : b.bx, b.bw > RC ? holeW(4) : -0.05); else drop(b, BAND_PTS[k], 'ring', 0, holeW(k)); }
  } else if (b.ph === 'drop') { b.dropT += dt; if (b.dropT > 0.42) b.ph = 'done'; }
}
// run a roll to the end with no graphics (used by tests and to check a friend's score)
export function simulate(p) { const b = newRoll(p); let n = 0; while (b.ph !== 'done' && n++ < 120 * 20) stepRoll(b, DT); return b; }

// ---------- textures ----------
function canvasTex(w, h, draw, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); } t.userData = { c, g }; return t; }
function makeGradient() { const d = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; }
function crestTex(letter, col = '#38bdf8', bg = '#0b1430', fg = '#ffffff') { return canvasTex(128, 128, (g) => { g.fillStyle = col; g.fillRect(0, 0, 128, 128); g.fillStyle = bg; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.fill(); g.fillStyle = fg; g.font = '900 64px Archivo, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letter, 64, 68); }); }
const BOARD_PAL = ['#ec3013', '#f59e0b', '#22c55e', '#38bdf8', '#7c3aed'];   // 50 · 40 · 30 · 20 · 10
function boardTex() {
  return canvasTex(512, 600, (g, W, H) => {
    const X = x => (x / BW + 0.5) * W, Y = w => H - w / BH * H, S = W / BW;
    g.fillStyle = '#14112a'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 2; for (let i = -H; i < W; i += 28) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H, H); g.stroke(); }
    for (let k = RINGS.length - 1; k >= 0; k--) { g.fillStyle = BOARD_PAL[k]; g.beginPath(); g.arc(X(0), Y(RC), RINGS[k] * S, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.arc(X(0), Y(RC), RINGS[k] * S - 6, 0, 7); g.fill(); g.fillStyle = BOARD_PAL[k]; g.beginPath(); g.arc(X(0), Y(RC), RINGS[k] * S - 12, 0, 7); g.fill(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 0; k < RINGS.length; k++) { const hw = holeW(k), hx = X(0), hy = Y(hw); g.fillStyle = '#05040a'; g.beginPath(); g.ellipse(hx, hy, R * S * 1.25, R * S * (k ? 0.9 : 1.25), 0, 0, 7); g.fill(); if (k) { g.fillStyle = '#ffffff'; g.font = '900 30px Archivo, Arial, sans-serif'; g.fillText(String(BAND_PTS[k]), hx, Y(hw + (RINGS[k] - RINGS[k - 1]) * 0.5 + 0.03) + 2); } }
    g.fillStyle = '#ffffff'; g.font = '900 22px Archivo, Arial, sans-serif'; g.fillText('50', X(0), Y(RC + 0.1));
    for (const [px, pw] of POCKETS) { g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(X(px), Y(pw), PR * S + 9, 0, 7); g.fill(); g.fillStyle = '#05040a'; g.beginPath(); g.arc(X(px), Y(pw), PR * S, 0, 7); g.fill(); g.fillStyle = '#ffd23a'; g.font = '900 26px Archivo, Arial, sans-serif'; g.fillText('100', X(px), Y(pw - 0.13)); }
    g.fillStyle = '#05040a'; g.fillRect(0, H - 10, W, 10);
  });
}
function laneTex() { return canvasTex(128, 512, (g, W, H) => { g.fillStyle = '#c98a4b'; g.fillRect(0, 0, W, H); for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#b97a3e' : '#d39657'; g.fillRect(i * W / 9, 0, W / 9 - 1, H); } g.fillStyle = 'rgba(80,40,10,0.18)'; for (let i = 0; i < 70; i++) g.fillRect(Math.random() * W, Math.random() * H, 1, rr(10, 60)); g.fillStyle = '#ffd23a'; for (let i = 0; i < 3; i++) { const y = H * (0.25 + i * 0.12); g.beginPath(); g.moveTo(W / 2, y - 18); g.lineTo(W / 2 + 12, y + 6); g.lineTo(W / 2 - 12, y + 6); g.closePath(); g.fill(); } }); }
function carpetTex() { return canvasTex(256, 256, (g, W, H) => { g.fillStyle = '#120c2a'; g.fillRect(0, 0, W, H); const cols = ['#ec3013', '#38bdf8', '#ffd23a', '#22c55e', '#f472b6']; for (let i = 0; i < 26; i++) { g.strokeStyle = pick(cols); g.lineWidth = 4; const x = Math.random() * W, y = Math.random() * H; if (i % 3 === 0) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 16, y + 26); g.lineTo(x - 14, y + 24); g.closePath(); g.stroke(); } else if (i % 3 === 1) { g.beginPath(); g.moveTo(x, y); for (let k = 1; k < 5; k++) g.lineTo(x + k * 9, y + (k % 2 ? 10 : 0)); g.stroke(); } else { g.beginPath(); g.arc(x, y, 7, 0, 7); g.stroke(); } } }, 7); }
function signTex(t1, t2, col = '#ffd23a') { return canvasTex(512, 128, (g, W, H) => { g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H); g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(6, 6, W - 12, H - 12); g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = col; g.shadowBlur = 18; g.fillStyle = col; g.font = '900 58px Archivo, Arial, sans-serif'; g.fillText(t1, W / 2, t2 ? 52 : 66); if (t2) { g.shadowBlur = 6; g.fillStyle = '#ffffff'; g.font = '800 24px Archivo, Arial, sans-serif'; g.fillText(t2, W / 2, 100); } }); }

// ---------- sound (synth only, so no media needed) ----------
class Sfx {
  ensure() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.out = this.ctx.createGain(); this.out.gain.value = 0.55; this.out.connect(this.ctx.destination); } catch (e) { return; } } if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); }
  tone(f, d = 0.12, v = 0.18, type = 'triangle', pan = 0, at = 0) { const c = this.ctx; if (!c || this.muted) return; const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); let n = g; if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); n = p; } o.connect(g); n.connect(this.out); o.start(t); o.stop(t + d + 0.05); }
  noiseBuf() { if (this.nb) return this.nb; const c = this.ctx, b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return this.nb = b; }
  rumble(level, pitch = 300, pan = 0) { const c = this.ctx; if (!c) return; if (!this.rm) { const s = c.createBufferSource(); s.buffer = this.noiseBuf(); s.loop = true; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; const g = c.createGain(); g.gain.value = 0; let n = g; if (c.createStereoPanner) { this.rp = c.createStereoPanner(); g.connect(this.rp); n = this.rp; } s.connect(f); f.connect(g); n.connect(this.out); s.start(); this.rm = { s, f, g }; } const t = c.currentTime; this.rm.g.gain.setTargetAtTime(this.muted ? 0 : level, t, 0.05); this.rm.f.frequency.setTargetAtTime(pitch, t, 0.05); if (this.rp) this.rp.pan.setTargetAtTime(clamp(pan, -1, 1), t, 0.05); }
  thunk(v = 0.3, f = 90) { this.tone(f, 0.18, v, 'sine'); this.tone(f * 2.1, 0.06, v * 0.4, 'square'); }
  score(pts, pan = 0) { if (pts >= 100) [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, 0.2, 'square', pan, i * 0.08)); else if (pts > 0) { const n = pts / 10; for (let i = 0; i < n; i++) this.tone(440 + i * 110, 0.1, 0.16, 'triangle', pan, i * 0.06); } else { this.tone(110, 0.35, 0.2, 'sawtooth', pan); } }
}

// ---------- the game ----------
export async function createSkeeBall({ container, onState = () => {}, opts = {} }) {
  const touch = matchMedia('(pointer: coarse)').matches, CW = () => container.clientWidth || 1, CH = () => container.clientHeight || 1;
  const renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.6 : 2)); renderer.setSize(CW(), CH()); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none'; container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#0b0820'); scene.fog = new THREE.Fog('#0b0820', 9, 16);
  const camera = new THREE.PerspectiveCamera(50, CW() / CH(), 0.05, 40);
  const grad = makeGradient(), cache = new Map(), V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const toon = (c, extra) => { const k = c + (extra ? JSON.stringify(extra, (kk, v) => v && v.isTexture ? v.uuid : v) : ''); if (!cache.has(k)) cache.set(k, new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...extra })); return cache.get(k); };
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1a1626, side: THREE.BackSide });
  function addOutline(mesh, t = 0.02, radius) { const g = mesh.geometry; g.computeBoundingBox(); const s = V3(); g.boundingBox.getSize(s); const o = new THREE.Mesh(g, outlineMat); if (radius) o.scale.setScalar(1 + t / radius); else o.scale.set(1 + 2 * t / Math.max(s.x, 0.01), 1 + 2 * t / Math.max(s.y, 0.01), 1 + 2 * t / Math.max(s.z, 0.01)); mesh.add(o); return mesh; }
  function M(geo, mat, x = 0, y = 0, z = 0, parent, outline = 0.02, radius) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (outline) addOutline(m, outline, radius); (parent || scene).add(m); return m; }
  const kit = foxKit({ THREE, scene, toon, M, grad, outlineMat, crestTex, rr, pick, clamp, smooth, damp });
  const cast = castKit({ THREE, M, toon, makeFox: kit.makeFox });
  scene.add(new THREE.HemisphereLight(0xd9d4ff, 0x3a2a50, 1.25)); const key = new THREE.DirectionalLight(0xfff0e0, 1.35); key.position.set(2, 6, 4); scene.add(key);
  const sfx = new Sfx();

  // ----- the room -----
  const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d), glow = c => new THREE.MeshBasicMaterial({ color: c });
  { const fl = new THREE.Mesh(new THREE.PlaneGeometry(9, 9.4), new THREE.MeshToonMaterial({ map: carpetTex(), gradientMap: grad })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -0.1); scene.add(fl);
    const wallM = toon('#231a46'); M(BOX(9, 3.8, 0.1), wallM, 0, 1.9, -4.75, null, 0); M(BOX(0.1, 3.8, 9.4), wallM, -4.5, 1.9, -0.1, null, 0); M(BOX(0.1, 3.8, 9.4), wallM, 4.5, 1.9, -0.1, null, 0);
    M(BOX(9, 0.1, 9.4), toon('#120c2a'), 0, 3.8, -0.1, null, 0);
    [['#ec3013', 3.2], ['#38bdf8', 3.0], ['#ffd23a', 0.35]].forEach(([c, y]) => M(BOX(8.9, 0.05, 0.05), glow(c), 0, y, -4.68, null, 0));
    [-4.43, 4.43].forEach(x => { M(BOX(0.05, 0.05, 9.2), glow('#f472b6'), x, 3.1, -0.1, null, 0); M(BOX(0.05, 0.05, 9.2), glow('#38bdf8'), x, 0.3, -0.1, null, 0); });
    for (let i = 0; i < 3; i++) M(BOX(1.6, 0.04, 0.6), glow('#e9e4ff'), (i - 1) * 2.6, 3.76, 0.6, null, 0);
    const big = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshBasicMaterial({ map: signTex('SKEE·BALL', '8 GATES ARCADE', '#ffd23a') })); big.position.set(0, 3.25, -4.68); scene.add(big);
    // prize counter (right) + two cabinets (left): decoration, cut first if a phone struggles
    const pc = new THREE.Group(); pc.position.set(3.75, 0, 1.2); pc.rotation.y = -Math.PI / 2; scene.add(pc);
    M(BOX(2.2, 1.0, 0.6), toon('#ec3013'), 0, 0.5, 0, pc); M(BOX(2.3, 0.06, 0.7), toon('#f3f2f2'), 0, 1.03, 0, pc);
    M(BOX(2.2, 1.3, 0.3), toon('#2a2150'), 0, 1.8, -0.45, pc, 0);
    for (let i = 0; i < 12; i++) M(new THREE.SphereGeometry(0.1, 10, 8), toon(pick(['#ffd23a', '#38bdf8', '#f472b6', '#22c55e', '#f2741f'])), -0.9 + (i % 6) * 0.36, 1.35 + Math.floor(i / 6) * 0.45, -0.38, pc, 0.012, 0.1);
    const ps = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: signTex('PRIZES', 'TICKETS HERE', '#f472b6') })); ps.position.set(0, 2.7, -0.3); pc.add(ps);
    [-0.6, 0.6].forEach((z, i) => { const c = new THREE.Group(); c.position.set(-3.9, 0, 0.8 + z * 2); c.rotation.y = Math.PI / 2; scene.add(c); M(BOX(0.8, 1.9, 0.7), toon(i ? '#38bdf8' : '#22c55e'), 0, 0.95, 0, c); M(BOX(0.62, 0.48, 0.02), glow(i ? '#7c3aed' : '#ec3013'), 0, 1.45, 0.36, c, 0); M(BOX(0.7, 0.08, 0.3), toon('#201e1d'), 0, 1.05, 0.45, c, 0.01); });
  }

  // ----- five lanes -----
  const bTex = boardTex(), lTex = laneTex(), marq = signTex('SKEE·BALL', null, '#ec3013');
  const ballGeo = new THREE.SphereGeometry(R, 16, 12), ballMats = COLS.map(([, c]) => toon(c)), woodBall = toon('#c47a3a');
  const lipGeos = RINGS.map(r => new THREE.TorusGeometry(r, 0.011, 6, 40)), pocketGeo = new THREE.TorusGeometry(PR, 0.012, 6, 24);
  const boardPt = (x, w, lift = R) => V3(x, BY0 + w * ST + lift * CT, BZ0 - w * CT + lift * ST);
  const lanePt = (x, s) => { const hump = smooth(LL - 0.25, LL, s) * 0.05; return V3(x, Y0 + s * SLOPE + R + hump, -s); };
  const lanes = [];
  for (let i = 0; i < LANES; i++) {
    const g = new THREE.Group(); g.position.x = laneX(i); scene.add(g);
    const bed = M(BOX(LW, 0.04, LL + 0.2), new THREE.MeshToonMaterial({ map: lTex, gradientMap: grad }), 0, Y0 + LL * SLOPE / 2 - 0.02, -LL / 2 + 0.1, g, 0); bed.rotation.x = Math.atan(SLOPE);
    M(BOX(LW + 0.16, Y0 - 0.06, LL + 0.2), toon('#2a2150'), 0, (Y0 - 0.06) / 2, -LL / 2 + 0.1, g, 0.02);
    [-1, 1].forEach(sd => { const r = M(BOX(0.06, 0.12, LL + 0.2), toon('#ec3013'), sd * (LW / 2 + 0.03), Y0 + LL * SLOPE / 2 + 0.04, -LL / 2 + 0.1, g, 0.012); r.rotation.x = Math.atan(SLOPE);
      const gl = new THREE.Mesh(BOX(0.012, 0.42, LL - 0.5), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.12, depthWrite: false })); gl.position.set(sd * (LW / 2 + 0.03), Y0 + 0.36 + LL * SLOPE / 2, -LL / 2 - 0.1); g.add(gl); });
    const hump = M(new THREE.CylinderGeometry(0.06, 0.06, LW, 12, 1, false, 0, Math.PI), toon('#f3f2f2'), 0, Y0 + LL * SLOPE - 0.02, -LL + 0.04, g, 0.01); hump.rotation.set(0, 0, Math.PI / 2); hump.rotation.x = -Math.PI / 2;
    // target board, lips, pockets, cabinet
    const brd = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshToonMaterial({ map: bTex, gradientMap: grad })); brd.position.copy(boardPt(0, BH / 2, 0)); brd.rotation.x = -(Math.PI / 2 - TH); g.add(brd);
    lipGeos.forEach((lg, k) => { const m = new THREE.Mesh(lg, toon(k ? '#f3f2f2' : '#ffd23a')); m.position.copy(boardPt(0, RC, 0.012)); m.rotation.x = -(Math.PI / 2 - TH); g.add(m); });
    POCKETS.forEach(([px, pw]) => { const m = new THREE.Mesh(pocketGeo, toon('#ffd23a')); m.position.copy(boardPt(px, pw, 0.012)); m.rotation.x = -(Math.PI / 2 - TH); g.add(m); });
    const top = boardPt(0, BH, 0), cabC = toon('#7c3aed');
    [-1, 1].forEach(sd => { const p = M(BOX(0.08, 1.75, 1.25), cabC, sd * (BW / 2 + 0.04), BY0 + 0.55, BZ0 - 0.45, g, 0.015); p.position.y = 0.9; });
    M(BOX(BW + 0.16, 1.9, 0.08), cabC, 0, 0.95, BZ0 - CT - 0.12, g, 0.015);
    M(BOX(BW + 0.16, 0.14, 0.3), toon('#201e1d'), 0, BY0 - 0.04, BZ0 + 0.05, g, 0.01);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(BW, 0.5), new THREE.MeshBasicMaterial({ color: 0x9ad8ff, transparent: true, opacity: 0.1, depthWrite: false })); net.position.set(0, top.y + 0.25, top.z + 0.02); g.add(net);
    const mq = new THREE.Mesh(new THREE.PlaneGeometry(BW + 0.16, 0.24), new THREE.MeshBasicMaterial({ map: marq })); mq.position.set(0, top.y + 0.62, top.z + 0.06); g.add(mq);
    const sc = canvasTex(256, 112, () => {}), scr = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.27), new THREE.MeshBasicMaterial({ map: sc })); scr.position.set(0, top.y + 0.33, top.z + 0.06); g.add(scr);
    // front: ball return trough with the balls you have left
    M(BOX(LW + 0.16, 0.1, 0.3), toon('#201e1d'), 0, Y0 - 0.08, 0.22, g, 0.012);
    const tray = new THREE.InstancedMesh(ballGeo, woodBall, BALLS); tray.count = 0; g.add(tray);
    const ball = M(ballGeo, woodBall, 0, 0, 0, g, 0.008, R); ball.visible = false;
    const aim = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 1.4).translate(0, 0.7 + R, 0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.6, depthWrite: false })); aim.visible = false; aim.renderOrder = 2; g.add(aim);
    const L = { i, g, sc, ball, tray, aim, roll: null, queue: [], owner: null, name: '', col: '#ffd23a', score: 0, balls: 0, lastPts: null, scrKey: '', fox: null, x0: 0, cool: 0 };
    lanes.push(L);
  }
  const tm = new THREE.Matrix4();
  function setTray(L, n) { n = clamp(n, 0, BALLS); L.tray.count = n; for (let k = 0; k < n; k++) { tm.makeTranslation(-LW / 2 + 0.08 + k * 0.088, Y0 - 0.02 + R * 0.4, 0.22); L.tray.setMatrixAt(k, tm); } L.tray.instanceMatrix.needsUpdate = true; }
  function drawScreen(L) { const k = L.name + '|' + L.score + '|' + L.balls + '|' + L.col + '|' + L.lastPts; if (k === L.scrKey) return; L.scrKey = k; const { g } = L.sc.userData;
    g.fillStyle = '#05040a'; g.fillRect(0, 0, 256, 112); g.strokeStyle = L.col; g.lineWidth = 4; g.strokeRect(2, 2, 252, 108); g.textBaseline = 'middle';
    g.fillStyle = L.col; g.font = '900 20px Archivo, Arial, sans-serif'; g.textAlign = 'left'; g.fillText(L.name || 'INSERT TOKEN', 12, 22); g.textAlign = 'right'; g.fillStyle = '#ffffff'; g.fillText(L.owner ? 'BALL ' + Math.min(BALLS, L.balls + (L.roll ? 0 : 1)) + '/' + BALLS : '', 244, 22);
    g.textAlign = 'center'; g.fillStyle = L.owner ? '#ffd23a' : '#3a3836'; g.font = '900 60px Archivo, Arial, sans-serif'; g.fillText(String(L.score).padStart(3, '0'), 128, 74); L.sc.needsUpdate = true; }

  // ----- the cast -----
  const me = cast.make('player', { mood: 'happy' }); me.rotation.y = Math.PI; me.visible = true;
  const hope = cast.make('hope', { mood: 'happy' }); hope.rotation.y = Math.PI; hope.visible = false;
  const rivals = COLS.map(([, c], k) => { const f = kit.makeFox({ key: 'rival' + k, torso: c, crest: '8', look: k % 2 ? PLAYER_FEMALE : PLAYER_MALE, eyes: ['#38bdf8', '#38bdf8'], outfit: 'armor', mood: 'happy' }); f.rotation.y = Math.PI; f.visible = false; return f; });
  const foxes = [me, hope, ...rivals];
  const FOX_S = 0.64; foxes.forEach(f => f.scale.multiplyScalar(FOX_S));   // the fox kit's foxes are ~2.8 tall; arcade height here
  const standAt = (f, laneI, side) => { if (side == null) side = laneI < S.myLane ? -0.56 : 0.56; f.position.set(laneX(laneI) + side, 0, 0.5); };

  // ----- state -----
  const S = { phase: 'intro', mode: 'solo', myLane: 2, players: [], cur: 0, flash: null, flashT: 0, hint: true, guide: false, easy: false, easySt: 'aim', easyAim: 0, easyPow: 0, easyT: 0, radio: '', radioT: 0, result: null, turnBanner: '', turnT: 0, safeTop: 70, safeBottom: 0, hopeT: 4, hopeN: 0, coach: '' };
  const N = { st: null, code: '', codeIn: '', status: '', peers: {}, ready: false, j: 0, msg: '', copied: false, ping: null, net: null, tok: 0, seen: {}, match: null, mid: 0 };
  let dirty = true, emitT = 0;
  const touchDirty = () => { dirty = true; };
  function flash(t, col = '#ffd23a', sub = '') { S.flash = { t, col, sub }; S.flashT = 1.6; dirty = true; }
  function say(text) { if (!S.guide || !('speechSynthesis' in window)) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 1.1; speechSynthesis.speak(u); } catch (e) {} }
  function radio(text) { S.radio = text; S.radioT = 5; dirty = true; }
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

  // ----- camera -----
  const fitCam = new THREE.PerspectiveCamera(50, 1, 0.05, 40), _p = V3();
  function fitShot(pts, el, margin = 0.04) { const W = CW(), H = CH(); fitCam.aspect = W / H; fitCam.fov = camera.fov; fitCam.updateProjectionMatrix();
    const yT = 1 - 2 * S.safeTop / H - margin, yB = -1 + 2 * S.safeBottom / H + margin, xR = 1 - margin, xL = -1 + margin, sy = (yT + yB) / 2;
    const dir = V3(0, Math.sin(el), Math.cos(el)), tgt = V3(); pts.forEach(p => tgt.add(p)); tgt.multiplyScalar(1 / pts.length);
    const bounds = d => { fitCam.position.copy(tgt).addScaledVector(dir, d); fitCam.lookAt(tgt); fitCam.updateMatrixWorld(); let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for (const p of pts) { _p.copy(p).project(fitCam); if (_p.z > 1) return null; x0 = Math.min(x0, _p.x); x1 = Math.max(x1, _p.x); y0 = Math.min(y0, _p.y); y1 = Math.max(y1, _p.y); } return { x0, x1, y0, y1 }; };
    const fits = d => { const b = bounds(d); return b && b.x0 >= xL && b.x1 <= xR && b.y0 >= yB && b.y1 <= yT; };
    let d = 3; for (let it = 0; it < 3; it++) { let lo = 0.3, hi = 30; for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; } d = hi; const b = bounds(d); if (!b) break; const cy = (b.y0 + b.y1) / 2, th = Math.tan(fitCam.fov * Math.PI / 360) * d, up = V3().setFromMatrixColumn(fitCam.matrixWorld, 1); tgt.addScaledVector(up, (cy - sy) * th); }
    return { pos: tgt.clone().addScaledVector(dir, d), look: tgt }; }
  const shotCache = new Map();
  function shot() { const W = CW(), H = CH(), portrait = H > W, li = S.myLane, x = laneX(li), k = S.phase + '|' + li + '|' + W + 'x' + H + '|' + S.safeTop + '|' + S.safeBottom;
    if (shotCache.has(k)) return shotCache.get(k); let s;
    if (S.phase === 'play') s = fitShot([V3(x - LW / 2, Y0, 0.3), V3(x + LW / 2, Y0, 0.3), boardPt(0, BH, 0).add(V3(x - BW / 2, 0.08, 0)), boardPt(0, BH, 0).add(V3(x + BW / 2, 0.08, 0))], portrait ? 0.46 : (opts.landEl ?? 0.3), 0.03);
    else { const a = portrait ? 0.7 : 2.3; s = fitShot([V3(x - a, 0, 1.0), V3(x + a, 0, 1.0), V3(x - a, 2.2, BZ0 - 0.5), V3(x + a, 2.2, BZ0 - 0.5), V3(x + 0.56, 1.85, 0.5)], 0.32, 0.05); }
    if (shotCache.size > 40) shotCache.clear(); shotCache.set(k, s); return s; }
  const camLook = V3(0, 1, -2); camera.position.set(0, 2.6, 5);

  // ----- lanes in use -----
  function resetLanes() { for (const L of lanes) { L.owner = null; L.name = ''; L.score = 0; L.balls = 0; L.roll = null; L.queue = []; L.ball.visible = false; L.lastPts = null; L.col = '#ffd23a'; setTray(L, 0); L.scrKey = ''; drawScreen(L); } foxes.forEach(f => f.visible = false); }
  resetLanes(); standAt(me, 2, 0.56); me.visible = true;
  function claim(L, owner, name, col) { L.owner = owner; L.name = name; L.col = col; L.score = 0; L.balls = 0; L.roll = null; L.queue = []; L.lastPts = null; setTray(L, BALLS); L.scrKey = ''; drawScreen(L); }

  // ----- starting a game -----
  function start(mode = 'solo', n = 1) {
    sfx.ensure(); resetLanes(); S.mode = mode; S.result = null; S.radio = ''; S.radioT = 0; S.flash = null; S.turnBanner = ''; S.cur = 0; S.hint = true; S.coach = ''; S.easySt = 'aim';
    if (mode === 'pass') { n = clamp(n | 0, 2, MAX_PLAYERS); S.players = COLS.slice(0, n).map(([nm, c], k) => ({ id: 'p' + k, name: nm, col: c, score: 0, balls: 0, me: true, last: [] })); S.myLane = 2; claim(lanes[2], 'me', S.players[0].name, S.players[0].col); }
    else { S.players = [{ id: 'me', name: 'YOU', col: COLS[0][1], score: 0, balls: 0, me: true, last: [] }]; S.myLane = 2; claim(lanes[2], 'me', 'YOU', '#ffd23a');
      hope.visible = true; standAt(hope, 1); claim(lanes[1], 'hope', 'HOPE', '#f472b6'); S.hopeT = 3.5; S.hopeN = 0; setTimeout(() => { if (S.mode === 'solo' && S.phase === 'play') { radio(HOPE_LINES.hello); } }, 1200); }
    me.visible = false; standAt(me, S.myLane, 0.56); S.phase = 'play'; shotCache.clear();
    if (mode === 'pass') turnCard(); dirty = true; save.setStat(KEY + '.games', save.stat(KEY + '.games') + 1);
  }
  function turnCard() { const p = S.players[S.cur]; if (!p) return; lanes[S.myLane].name = p.name; lanes[S.myLane].col = p.col; lanes[S.myLane].score = p.score; lanes[S.myLane].balls = p.balls; setTray(lanes[S.myLane], BALLS - p.balls); S.turnBanner = p.name + ' · BALL ' + (p.balls + 1) + ' OF ' + BALLS; S.turnT = 1.6; say(p.name + ', ball ' + (p.balls + 1)); dirty = true; }
  const curPlayer = () => S.mode === 'pass' ? S.players[S.cur] : S.players[0];
  function canRoll() { const L = lanes[S.myLane]; if (S.phase !== 'play' || L.roll || L.queue.length || L.cool > 0) return false; const p = curPlayer(); return !!p && p.balls < BALLS && !p.done; }

  // ----- rolling -----
  function roll(p, fromNet) { const L = lanes[S.myLane]; if (!canRoll()) return false; sfx.ensure();
    p = { x0: clamp(+p.x0 || 0, -LW / 2 + R + 0.01, LW / 2 - R - 0.01), v0: clamp(+p.v0 || 0, 0.5, 6.5), vx: clamp(+p.vx || 0, -0.9, 0.9), ax: clamp(+p.ax || 0, -0.5, 0.5), seed: p.seed || (Math.random() * 2 ** 31) | 0 };
    const pl = curPlayer(); pl.balls++; L.balls = pl.balls; setTray(L, BALLS - pl.balls); startRoll(L, p); S.hint = false; dirty = true;
    if (S.mode === 'online' && N.net && N.match) N.net.send('ev', { k: 'roll', mid: N.match.mid, b: pl.balls, p });
    return true; }
  function startRoll(L, p) { L.roll = newRoll(p); L.roll.acc = 0; L.ball.visible = true; L.ball.material = woodBall; L.ball.children[0] && (L.ball.children[0].visible = true); const f = L.owner === 'hope' ? hope : L.fox; if (f) f.userData.throwT = 0.5; drawScreen(L); }
  function rollDone(L, b) { const pts = b.pts || 0; L.ball.visible = false; L.cool = 0.35;
    if (L.owner === 'me') {
      const pl = curPlayer(); pl.score += pts; pl.last.push(pts); L.score = pl.score; L.lastPts = pts;
      let bonus = 0; pl.streak = pts >= 40 ? (pl.streak || 0) + 1 : 0; if (pl.streak >= 3) { pl.streak = 0; bonus = 50; pl.score += 50; L.score = pl.score; }
      const why = b.why === 'short' ? 'TOO SOFT' : b.why === 'gutter' ? 'GUTTER' : '', hard = b.land && b.land.hard;
      const coach = pts >= 50 ? '' : why === 'TOO SOFT' ? 'A LITTLE HARDER' : hard ? 'A LITTLE SOFTER' : b.land && b.land.w < RC - 0.06 ? 'A LITTLE HARDER FOR THE 50' : b.land && b.land.w > RC + 0.06 ? 'A LITTLE SOFTER FOR THE 50' : '';
      S.coach = coach; flash(pts >= 100 ? '100!' : pts ? String(pts) : (why || '0'), pts >= 100 ? '#ffd23a' : pts >= 50 ? '#ec3013' : pts ? '#38bdf8' : '#8a847e', bonus ? 'HOT STREAK +50' : coach);
      sfx.score(pts); buzz(pts >= 50 ? [40, 40, 80] : pts ? 30 : 120);
      say((pts ? pts + (bonus ? ', hot streak, plus fifty' : '') : why === 'TOO SOFT' ? 'too soft, zero' : 'gutter, zero') + '. Total ' + pl.score + '. ' + (BALLS - pl.balls ? (BALLS - pl.balls) + ' balls left' : 'Last ball') + (coach ? '. ' + coach.toLowerCase() : ''));
      if (S.mode === 'solo') { if (pts >= 100) radio(HOPE_LINES.hundred); else if (pts === 50) radio(HOPE_LINES.fifty); else if (b.why === 'short' && pl.balls <= 3) radio(HOPE_LINES.short); else if (hard && pl.balls <= 3) radio(HOPE_LINES.hard); }
      if (S.mode === 'online' && N.net && N.match) { N.net.send('ev', { k: 'pts', mid: N.match.mid, b: pl.balls, pts, total: pl.score }); const mp = N.match.players.find(x => x.id === N.net.id); if (mp) { mp.score = pl.score; mp.balls = pl.balls; } }
      if (S.mode === 'pass') { const allDone = S.players.every(x => x.balls >= BALLS); if (allDone) setTimeout(finish, 1200); else { S.cur = (S.cur + 1) % S.players.length; let g = 0; while (S.players[S.cur].balls >= BALLS && g++ < 6) S.cur = (S.cur + 1) % S.players.length; setTimeout(turnCard, 1500); } }
      else if (pl.balls >= BALLS) { if (S.mode === 'online') { pl.done = true; if (N.net && N.match) N.net.send('ev', { k: 'done', mid: N.match.mid, total: pl.score }); const mp = N.match && N.match.players.find(x => x.id === N.net.id); if (mp) mp.done = true; setTimeout(checkMatchEnd, 300); } else setTimeout(finish, 1200); }
    } else if (L.owner === 'hope') { L.score += pts; L.lastPts = pts; if (L.balls >= BALLS) setTimeout(() => { if (L.owner === 'hope') { L.score = 0; L.balls = 0; setTray(L, BALLS); L.scrKey = ''; drawScreen(L); } }, 4000); sfx.score(pts, -0.6); }
    else if (L.owner) { // a friend online: their own 'pts' message is the score that counts
      L.lastPts = pts; sfx.tone(300 + pts * 4, 0.08, 0.06, 'triangle', clamp((L.i - S.myLane) * 0.5, -1, 1)); }
    drawScreen(L); dirty = true; }
  function finish() { if (S.phase === 'over') return; const p0 = S.players[0], score = p0.score;
    const tickets = Math.floor(score / REWARD.ticketPer), gold = Math.floor(score / REWARD.goldPer), xp = Math.floor(score / REWARD.xpPer), newBest = save.best(KEY + '.best', score);
    save.setStat(KEY + '.tickets', save.stat(KEY + '.tickets') + tickets); if (gold) save.addGold(gold); if (xp) save.addXp(xp); if (score >= REWARD.clubScore) save.setFlag(KEY + '.club450');
    let rows = S.players.map(p => ({ name: p.name, col: p.col, score: p.score, me: p.me })); if (S.mode === 'online' && N.match) rows = N.match.players.map(p => ({ name: p.name, col: p.col, score: p.score, me: p.id === (N.net && N.net.id), gone: p.gone }));
    if (S.mode === 'solo' && lanes[1].owner === 'hope') rows.push({ name: 'HOPE', col: '#f472b6', score: lanes[1].score, me: false });
    rows.sort((a, b) => b.score - a.score); const win = S.mode !== 'solo' && rows[0] && rows[0].me && rows.length > 1;
    if (win && S.mode === 'online') save.setStat(KEY + '.onlineWins', save.stat(KEY + '.onlineWins') + 1);
    S.result = { rows, score, tickets, gold, xp, newBest, best: save.stat(KEY + '.best'), win, winner: rows[0] ? rows[0].name : '' };
    S.phase = 'over'; shotCache.clear(); me.visible = true; me.userData.mood = 'excited'; me.userData.hop = 1; sfx.score(100);
    say((S.mode === 'pass' || S.mode === 'online' ? rows[0].name + ' wins with ' + rows[0].score + '. ' : '') + 'Final score ' + score + '. ' + tickets + ' tickets.' + (newBest ? ' New best!' : ''));
    if (S.mode === 'solo') radio(HOPE_LINES.end);
    if (S.mode === 'online' && N.st === 'play') { N.st = 'room'; N.ready = false; if (N.net) N.net.send('ev', { k: 'playing', on: false }); }
    dirty = true; }
  function toMenu() { S.phase = 'intro'; S.result = null; S.radio = ''; S.radioT = 0; S.flash = null; S.turnBanner = ''; resetLanes(); S.myLane = 2; me.visible = true; standAt(me, 2, 0.56); me.userData.mood = 'happy'; shotCache.clear(); if (N.st === 'play') { if (N.net && N.match) { N.net.send('ev', { k: 'done', mid: N.match.mid, total: S.players[0] ? S.players[0].score : 0 }); N.net.send('ev', { k: 'playing', on: false }); } N.st = 'room'; } N.match = null; dirty = true; }

  // Hope's lane in solo: a steady player with the odd hot ball
  function hopeTick(dt) { const L = lanes[1]; if (L.owner !== 'hope' || L.roll || S.phase !== 'play') return; S.hopeT -= dt; if (S.hopeT > 0 || L.balls >= BALLS) return; S.hopeT = rr(4.5, 7.5);
    const go100 = Math.random() < 0.15, side = Math.random() < 0.5 ? -1 : 1; const p = go100 ? { x0: 0, v0: rr(3.9, 4.15), vx: side * rr(0.2, 0.29), ax: 0 } : { x0: rr(-0.05, 0.05), v0: 2.77 + (Math.random() + Math.random() - 1) * 0.35, vx: rr(-0.06, 0.06), ax: 0 };
    p.seed = (Math.random() * 2 ** 31) | 0; L.balls++; setTray(L, BALLS - L.balls); startRoll(L, p); }

  // ----- input: swipe up to roll -----
  let drag = null; const el = renderer.domElement;
  function lanePxPerM() { const L = lanes[S.myLane], a = lanePt(laneX(L.i) - LW / 2, 0.1).project(camera), b = lanePt(laneX(L.i) + LW / 2, 0.1).project(camera); return Math.max(40, Math.abs(b.x - a.x) * CW() / 2 / LW); }
  el.addEventListener('pointerdown', e => { sfx.ensure(); if (S.easy || !canRoll()) return; drag = { id: e.pointerId, pts: [{ x: e.clientX, y: e.clientY, t: e.timeStamp || performance.now() }], x0: lanes[S.myLane].x0, flick: false, fx: 0, ppm: lanePxPerM(), upFrom: e.clientY }; try { el.setPointerCapture(e.pointerId); } catch (er) {} });
  el.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; const p = { x: e.clientX, y: e.clientY, t: e.timeStamp || performance.now() }; drag.pts.push(p); if (drag.pts.length > 60) drag.pts.shift(); const p0 = drag.pts[0];
    if (!drag.flick) { const up = drag.upFrom != null ? drag.upFrom - p.y : 0; if (drag.upFrom == null || p.y > drag.upFrom) { drag.upFrom = p.y; drag.lastX = p.x; } if (up > 26) { drag.flick = true; drag.fs = drag.pts.length - 1; } else { const L = lanes[S.myLane]; L.x0 = clamp(drag.x0 + (p.x - p0.x) / drag.ppm, -LW / 2 + R + 0.01, LW / 2 - R - 0.01); } }
    if (S.guide) { const L = lanes[S.myLane]; sfx.tone(300 + clamp((p0.y - p.y) / CH(), 0, 1) * 500, 0.05, 0.05, 'sine', L.x0 / (LW / 2)); } });
  const endDrag = e => { if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null; if (!d.flick) return; d.pts.push({ x: e.clientX, y: e.clientY, t: e.timeStamp || performance.now() }); let fl0 = d.pts.slice(d.fs); const lastP = fl0[fl0.length - 1]; let ei = fl0.length - 1; while (ei > 0 && Math.hypot(fl0[ei - 1].x - lastP.x, fl0[ei - 1].y - lastP.y) < 4) ei--; if (lastP.t - fl0[ei].t > 260) return; fl0 = fl0.slice(0, ei + 1); const now = fl0[fl0.length - 1].t; let pts = fl0.filter(p => now - p.t < 130); if (pts.length < 2) pts = fl0.slice(-2); if (pts.length < 2) pts = d.pts.slice(-2); if (pts.length < 2) return;
    const a = pts[0], b = pts[pts.length - 1], dtt = Math.max(0.016, (b.t - a.t) / 1000), H = CH(), vy = (a.y - b.y) / dtt / H, vxp = (b.x - a.x) / dtt; if (vy < 0.45) return;
    const fl = d.pts.slice(d.fs), m = Math.floor(fl.length / 2), ang = (p, q) => Math.atan2(q.x - p.x, p.y - q.y), a1 = fl.length > 4 ? ang(fl[0], fl[m]) : 0, a2 = fl.length > 4 ? ang(fl[m], fl[fl.length - 1]) : 0;
    const v0 = clamp(1.6 + vy * 0.85, 1.8, 6.2), slope = clamp(vxp / (vy * H), -1.2, 1.2), vx = clamp(slope * v0 * 0.42, -0.8, 0.8), ax = clamp((a2 - a1) * 0.55, -0.4, 0.4);
    roll({ x0: lanes[S.myLane].x0, v0, vx, ax }); };
  el.addEventListener('pointerup', endDrag); el.addEventListener('pointercancel', e => { if (drag && e.pointerId === drag.id) drag = null; });
  // EASY ROLL: tap 1 = aim, tap 2 = power
  function easyTap() { sfx.ensure(); if (!canRoll()) return; if (S.easySt === 'aim') { S.easySt = 'power'; S.easyT = 0; sfx.tone(660, 0.08, 0.12); say('Aim set. Now power.'); } else { const aim = S.easyAim, pw = S.easyPow; S.easySt = 'aim'; S.easyT = 0; roll({ x0: 0, v0: 2.2 + pw * 2.2, vx: aim * 0.42, ax: 0 }); } dirty = true; }
  function onKey(e) { const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return; if (S.phase !== 'play') return;
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!S.easy) { S.easy = true; S.easySt = 'aim'; } easyTap(); }
    else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { const L = lanes[S.myLane]; L.x0 = clamp(L.x0 + (e.code === 'ArrowLeft' ? -0.04 : 0.04), -LW / 2 + R + 0.01, LW / 2 - R - 0.01); } }
  if (!opts.noKeys) addEventListener('keydown', onKey);

  // ----- online (2–5): engine/duel-net.js, or a same-device test channel -----
  function localDuel({ game, code, onJoin, onLeave, onMsg, onStatus }) { const id = Math.random().toString(36).slice(2, 10); let ch; try { ch = new BroadcastChannel('8g-' + game + '-' + code); } catch (e) { onStatus('offline'); return { id, send() {}, leave() {} }; }
    ch.onmessage = e => { const m = e.data || {}; if (m.from === id || (m.to && m.to !== id)) return; if (m.t === '__join') { onJoin(m.from); return; } if (m.t === '__bye') { onLeave && onLeave(m.from); return; } onMsg(m.t, m.d, m.from); };
    setTimeout(() => { onStatus('local'); ch.postMessage({ from: id, t: '__join' }); }, 60);
    return { id, send(t, d, to) { try { ch.postMessage({ from: id, to, t, d }); } catch (e) {} }, leave() { try { ch.postMessage({ from: id, t: '__bye' }); ch.close(); } catch (e) {} } }; }
  const nSet = p => { Object.assign(N, p); dirty = true; };
  function members() { if (!N.net) return []; const all = [{ id: N.net.id, j: N.j, ready: N.ready, playing: N.st === 'play', me: true }, ...Object.entries(N.peers).map(([id, p]) => ({ id, ...p, me: false }))]; all.sort((a, b) => a.j - b.j || (a.id < b.id ? -1 : 1)); return all.slice(0, MAX_PLAYERS); }
  const hostId = () => { const m = members(); return m.length ? m.reduce((a, b) => a.id < b.id ? a : b).id : null; };
  function netOpen() { nSet({ st: 'menu', code: '', codeIn: '', msg: '', peers: {}, ready: false }); }
  function netCreate() { netJoin(newCode()); }
  async function netJoin(code) { code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); if (code.length < 4) { nSet({ msg: 'Type the 4-letter room code from your friend.' }); return; }
    netLeave(); N.seen = {}; nSet({ st: 'room', code, status: 'connecting', peers: {}, ready: false, j: Date.now(), msg: '', copied: false, ping: null });
    const tok = ++N.tok, h = { game: 'skee', code, onJoin: id => hello(id), onLeave: id => gone(id), onMsg: (t, d, id) => recv(t, d, id), onStatus: s => nSet({ status: s }) };
    let net = null; if (!opts.localNet) { try { const mod = await import(new URL('engine/duel-net.js', document.baseURI).href); net = await mod.connectDuel(h); } catch (e) { net = null; } }
    if (!net) net = localDuel(h);
    if (tok !== N.tok) { net.leave(); return; } N.net = net; hello(); dirty = true;
    try { const u = new URL(location.href); u.searchParams.set('room', code); history.replaceState(null, '', u.href); } catch (e) {}
    clearInterval(N.timer); N.timer = setInterval(netTick, 1000); }
  function netLeave() { N.tok++; clearInterval(N.timer); if (N.net) { N.net.send('ev', { k: 'bye' }); N.net.leave(); } N.net = null; N.seen = {}; if (N.match && S.mode === 'online' && S.phase === 'play') toMenu(); N.match = null; try { const u = new URL(location.href); if (u.searchParams.has('room')) { u.searchParams.delete('room'); history.replaceState(null, '', u.href); } } catch (e) {} }
  function netClose() { netLeave(); nSet({ st: null }); }
  function hello(to) { if (!N.net) return; N.net.send('hi', { v: 1, j: N.j, ready: N.ready, playing: N.st === 'play' }, to); }
  function recv(t, d, id) { if (!N.net || !d) return; const now = performance.now(), known = !!N.seen[id];
    if (t === 'hi') { N.seen[id] = now; N.peers[id] = { ...(N.peers[id] || {}), j: +d.j || Date.now(), ready: !!d.ready, playing: !!d.playing }; if (!known) setTimeout(() => hello(id), 0); setTimeout(maybeStart, 0); dirty = true; return; }
    if (!known) return; N.seen[id] = now;
    if (t === 'pg') { if (d.t != null) N.net.send('pg', { e: d.t }, id); else if (d.e != null) nSet({ ping: Math.max(1, Math.round(now - d.e)) }); return; }
    if (t !== 'ev') return;
    if (d.k === 'ready') { N.peers[id] = { ...(N.peers[id] || {}), ready: !!d.on }; setTimeout(maybeStart, 0); }
    else if (d.k === 'start') beginMatch(d);
    else if (d.k === 'playing') N.peers[id] = { ...(N.peers[id] || {}), playing: !!d.on };
    else if (d.k === 'bye') gone(id);
    else if (N.match && d.mid === N.match.mid) { const mp = N.match.players.find(p => p.id === id); if (!mp) return; const L = lanes[mp.lane];
      if (d.k === 'roll' && d.p) { mp.balls = Math.max(mp.balls, +d.b || 0); L.balls = mp.balls; setTray(L, BALLS - mp.balls); if (L.roll) L.queue.push(d.p); else startRoll(L, d.p); }
      else if (d.k === 'pts') { mp.score = +d.total || 0; L.score = mp.score; L.lastPts = +d.pts || 0; drawScreen(L); }
      else if (d.k === 'done') { mp.done = true; mp.score = +d.total || mp.score; L.score = mp.score; drawScreen(L); setTimeout(checkMatchEnd, 300); } }
    dirty = true; }
  function gone(id) { if (!N.seen[id]) return; delete N.seen[id]; delete N.peers[id]; if (N.match) { const mp = N.match.players.find(p => p.id === id); if (mp) { mp.gone = true; mp.done = true; const L = lanes[mp.lane]; L.name = mp.name + ' · LEFT'; L.scrKey = ''; drawScreen(L); if (L.fox) L.fox.visible = false; setTimeout(checkMatchEnd, 300); } } dirty = true; }
  function netTick() { if (!N.net) return; N.net.send('pg', { t: performance.now() }); hello(); const now = performance.now(); for (const id of Object.keys(N.seen)) if (now - N.seen[id] > 25000) gone(id); }
  function maybeStart() { if (!N.net || N.st !== 'room' || hostId() !== N.net.id) return; const m = members(); if (m.length < 2 || !m.some(x => x.me) || !m.every(x => x.ready && !x.playing)) return;
    const d = { k: 'start', t0: Date.now() + 3000, ids: m.map(x => x.id), mid: (Date.now() % 1e9) | 0 }; N.net.send('ev', d); beginMatch(d); }
  function netReady() { if (!N.net) return; N.ready = !N.ready; N.net.send('ev', { k: 'ready', on: N.ready }); setTimeout(maybeStart, 0); dirty = true; }
  function beginMatch(d) { if (!N.net || !Array.isArray(d.ids)) return; if (!d.ids.includes(N.net.id)) { nSet({ msg: 'A game started without you. You join the next one.' }); return; }
    const n = d.ids.length, off = Math.floor((LANES - n) / 2); resetLanes(); sfx.ensure();
    N.match = { mid: d.mid, players: d.ids.map((id, k) => ({ id, name: id === N.net.id ? 'YOU' : COLS[k][0], col: COLS[k][1], score: 0, balls: 0, done: false, gone: false, lane: off + k })) };
    S.myLane = N.match.players.find(p => p.id === N.net.id).lane; N.match.players.forEach((p, k) => { const L = lanes[p.lane]; const mine = p.id === N.net.id; claim(L, mine ? 'me' : p.id, mine ? 'YOU' : p.name, p.col); if (mine) S.myLane = p.lane; else { const f = rivals[k]; f.visible = true; standAt(f, p.lane); L.fox = f; } });
    S.mode = 'online'; S.radio = ''; S.radioT = 0; S.players = [{ id: 'me', name: 'YOU', col: N.match.players.find(p => p.id === N.net.id).col, score: 0, balls: 0, me: true, last: [] }]; S.cur = 0; S.result = null; S.hint = true; S.coach = '';
    N.st = 'play'; N.ready = false; Object.values(N.peers).forEach(p => p.ready = false); N.net.send('ev', { k: 'playing', on: true }); S.phase = 'play'; me.visible = false; shotCache.clear();
    lanes[S.myLane].cool = clamp((+d.t0 - Date.now()) / 1000, 0, 4); S.turnBanner = n + ' PLAYERS · ROLL WHEN YOU LIKE'; S.turnT = clamp((+d.t0 - Date.now()) / 1000, 0, 4) + 2; say(n + ' players. Roll when you like.'); dirty = true; }
  function checkMatchEnd() { if (!N.match || S.phase !== 'play') return; if (N.match.players.every(p => p.done || p.gone)) finish(); }
  async function netShare() { if (!N.code) return; let u; try { u = new URL(location.href); u.searchParams.set('room', N.code); u.searchParams.delete('embed'); } catch (e) { return; } try { if (navigator.share && touch) await navigator.share({ title: '8 GATES · Skee-Ball', text: 'Play Skee-Ball with me in 8 GATES. Room ' + N.code, url: u.href }); else { await navigator.clipboard.writeText(u.href); nSet({ copied: true }); setTimeout(() => nSet({ copied: false }), 2000); } } catch (e) {} }

  // ----- the frame loop -----
  const clock = new THREE.Clock(); let raf = 0, alive = true;
  function ballPos(L, b) { const x = laneX(L.i); if (b.ph === 'lane' || b.ph === 'back' || b.ph === 'done') return lanePt(x + b.x, b.s);
    if (b.ph === 'air') { const a = b.air, k = clamp(a.t / a.T, 0, 1), p0 = lanePt(x + a.x0, LL), p1 = boardPt(x + a.xl, a.wl); return p0.lerp(p1, k).add(V3(0, Math.sin(k * Math.PI) * a.h, 0)); }
    if (b.ph === 'board') return boardPt(x + b.bx, b.bw);
    const h = b.hole, k = smooth(0, 0.25, b.dropT), sink = smooth(0.22, 0.42, b.dropT); return boardPt(x + h.x0 + (h.x - h.x0) * k, h.w0 + (h.w - h.w0) * k, R * (1 - sink * 2.2)); }
  function frame() { if (!alive) return; raf = requestAnimationFrame(frame); const dt = Math.min(0.1, clock.getDelta()), t = clock.elapsedTime;
    // rolls
    let loud = 0, loudPan = 0, loudPitch = 200;
    for (const L of lanes) { if (L.cool > 0) { const c0 = Math.ceil(L.cool); L.cool = Math.max(0, L.cool - dt); if (L === lanes[S.myLane] && Math.ceil(L.cool) !== c0) { dirty = true; if (S.mode === 'online' && L.cool > 0.4) sfx.tone(520, 0.1, 0.12); else if (S.mode === 'online' && L.cool === 0) { sfx.tone(880, 0.2, 0.15); flash('ROLL!', '#22c55e'); } } } const b = L.roll; if (!b) { if (L.queue.length && !L.cool) startRoll(L, L.queue.shift()); continue; }
      b.acc += dt; while (b.acc >= DT && b.ph !== 'done') { stepRoll(b, DT); b.acc -= DT; }
      for (const [k, v] of b.ev) { const pan = clamp((L.i - S.myLane) * 0.5 + (b.ph === 'board' ? b.bx : b.x) * 1.5, -1, 1), mine = L.owner === 'me', vol = mine ? 1 : 0.35;
        if (k === 'wall') sfx.tone(520, 0.04, 0.08 * vol, 'square', pan); else if (k === 'launch') { sfx.thunk(0.22 * vol, 140); } else if (k === 'land') sfx.thunk(0.28 * vol, v ? 70 : 110); else if (k === 'clack' || k === 'hop') sfx.tone(k === 'hop' ? 900 : 700, 0.03, Math.min(0.12, 0.05 + v * 0.1) * vol, 'square', pan); else if (k === 'drop' && mine) sfx.thunk(0.35, 60); }
      b.ev.length = 0;
      if (b.ph === 'lane' || b.ph === 'back') { const lv = Math.min(1, Math.abs(b.v) / 4) * (L.owner === 'me' ? 0.35 : 0.08); if (lv > loud) { loud = lv; loudPan = clamp((L.i - S.myLane) * 0.5 + b.x * 1.5, -1, 1); loudPitch = 160 + Math.abs(b.v) * 120; } }
      L.ball.position.copy(ballPos(L, b)); L.ball.rotation.x -= (b.ph === 'lane' || b.ph === 'back' ? (b.v * dt / R) : b.ph === 'board' ? b.vbw * dt / R : 0);
      if (b.ph === 'done') { L.roll = null; rollDone(L, b); }
    }
    if (sfx.ctx) sfx.rumble(loud, loudPitch, loudPan);
    // the waiting ball on your lane + aim line (easy roll)
    { const L = lanes[S.myLane], ready = canRoll(); if (ready && !L.roll) { const p = lanePt(laneX(L.i) + L.x0, 0.12); L.ball.visible = true; L.ball.position.copy(p); }
      if (S.easy && ready) { S.easyT += dt; if (S.easySt === 'aim') S.easyAim = Math.sin(S.easyT * 2.4); else S.easyPow = 0.5 - 0.5 * Math.cos(S.easyT * 2.6);
        L.aim.visible = true; L.aim.position.set(L.x0, Y0 + 0.12 * SLOPE + 0.012, -0.12); L.aim.rotation.y = -S.easyAim * 0.3; L.aim.material.color.set(S.easySt === 'aim' ? 0xffd23a : 0xec3013); L.aim.scale.z = S.easySt === 'power' ? 0.15 + S.easyPow * 1.2 : 1;
        if (S.guide && ((t * 6) | 0) !== S.gTick) { S.gTick = (t * 6) | 0; sfx.tone(S.easySt === 'aim' ? 440 : 260 + S.easyPow * 600, 0.07, 0.06, 'sine', S.easyAim); }
        if (((t * 12) | 0) !== S.eTick) { S.eTick = (t * 12) | 0; dirty = true; } }
      else L.aim.visible = false; }
    hopeTick(dt);
    // foxes
    for (const f of foxes) { if (!f.visible) continue; const u = f.userData; kit.animFox(f, dt, 0); if (u.throwT > 0) { u.throwT = Math.max(0, u.throwT - dt); const k = Math.sin((1 - u.throwT / 0.5) * Math.PI); u.P.arms[1].rotation.x = 0.6 - k * 1.6; u.P.body.rotation.x = 0.25 * k; } }
    // timers
    if (S.flashT > 0) { S.flashT -= dt; if (S.flashT <= 0) { S.flash = null; dirty = true; } }
    if (S.turnT > 0) { S.turnT -= dt; if (S.turnT <= 0) { S.turnBanner = ''; dirty = true; } }
    if (S.radioT > 0) { S.radioT -= dt; if (S.radioT <= 0) { S.radio = ''; dirty = true; } }
    // camera
    const sh = shot(), k = 1 - Math.exp(-3.2 * dt); camera.position.lerp(sh.pos, k); camLook.lerp(sh.look, k); camera.lookAt(camLook);
    for (const L of lanes) drawScreen(L);
    renderer.render(scene, camera);
    emitT -= dt; if (dirty && emitT <= 0) { dirty = false; emitT = 0.08; onState(hud()); } }
  function resize() { renderer.setSize(CW(), CH()); camera.aspect = CW() / CH(); camera.updateProjectionMatrix(); shotCache.clear(); }
  const ro = new ResizeObserver(resize); ro.observe(container);

  // ----- what the page draws -----
  function hud() { const pl = curPlayer(), m = N.net ? members() : [], full = !!N.net && N.st === 'room' && m.length === MAX_PLAYERS && !m.some(x => x.me);
    let board = []; if (S.mode === 'pass') board = S.players.map((p, k) => ({ name: p.name, col: p.col, score: p.score, balls: p.balls, cur: k === S.cur && S.phase === 'play', me: true }));
    else if (S.mode === 'online' && N.match) board = N.match.players.map(p => ({ name: p.name, col: p.col, score: p.id === N.net?.id ? S.players[0].score : p.score, balls: p.id === N.net?.id ? S.players[0].balls : p.balls, cur: p.id === N.net?.id, me: p.id === N.net?.id, done: p.done, gone: p.gone }));
    else if (S.mode === 'solo' && lanes[1].owner === 'hope') board = [{ name: 'YOU', col: '#ffd23a', score: S.players[0]?.score || 0, balls: S.players[0]?.balls || 0, cur: true, me: true }, { name: 'HOPE', col: '#f472b6', score: lanes[1].score, balls: lanes[1].balls, cur: false, me: false }];
    return { phase: S.phase, mode: S.mode, score: pl ? pl.score : 0, ball: pl ? Math.min(BALLS, pl.balls + (canRoll() ? 1 : 0)) : 0, balls: pl ? pl.balls : 0, BALLS, name: pl ? pl.name : '', col: pl ? pl.col : '#ffd23a',
      best: save.stat(KEY + '.best'), tickets: save.stat(KEY + '.tickets'), gold: save.data.gold, board, flash: S.flash, hint: S.hint && S.phase === 'play' && !S.easy, canRoll: canRoll(), easy: S.easy, easySt: S.easySt, easyAim: S.easyAim, easyPow: S.easyPow, guide: S.guide,
      turn: lanes[S.myLane].cool > 0.4 && S.mode === 'online' && S.phase === 'play' ? 'GET READY · ' + Math.ceil(lanes[S.myLane].cool) : S.turnBanner, radio: S.radio, result: S.result, coach: S.coach,
      net: N.st ? { st: N.st, code: N.code, status: N.status, ping: N.ping, msg: N.msg, ready: N.ready, copied: N.copied, host: N.net && hostId() === N.net.id, full, members: m.map((x, k) => ({ name: x.me ? 'YOU' : COLS[k] ? COLS[k][0] : 'FRIEND', col: COLS[k] ? COLS[k][1] : '#fff', ready: x.ready, playing: x.playing, me: x.me })) } : null }; }

  frame();
  const api = {
    start, toMenu, roll, easyTap, hud, netOpen, netCreate, netJoin, netLeave, netClose, netReady, netShare, simulate,
    setEasy(on) { S.easy = !!on; S.easySt = 'aim'; S.easyT = 0; dirty = true; },
    setGuide(on) { S.guide = !!on; sfx.ensure(); if (on) say('Sound guide on. Swipe up to roll, or turn on easy roll and tap twice.'); else try { speechSynthesis.cancel(); } catch (e) {} dirty = true; },
    setSafe(top, bottom) { top = Math.round(top); bottom = Math.round(bottom); if (Math.abs(top - S.safeTop) > 3 || Math.abs(bottom - S.safeBottom) > 3) { S.safeTop = top; S.safeBottom = bottom; shotCache.clear(); } },
    setMuted(m) { sfx.muted = !!m; },
    destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); removeEventListener('keydown', onKey); netLeave(); try { sfx.ctx && sfx.ctx.close(); } catch (e) {} renderer.dispose(); renderer.domElement.remove(); },
    _debug: { S, N, lanes, camera },
  };
  onState(hud());
  return api;
}
