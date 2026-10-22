/* AIRPORT TSA . X-ray screen and departure board drawing (2D canvas) */
import { ITEMS } from './airport-rules.js';

export const XW = 640, XH = 400;
export const BAG_RECT = { x: 70, y: 82, w: 500, h: 270 };
const COL = { org: '#ff9b3d', orgD: '#c9641c', mix: '#58d47f', mixD: '#2c9550', met: '#3d7bff', metD: '#1a3fc4', dense: '#0b1a8a' };
const FONT = s => `900 ${s}px Archivo, "Arial Black", Arial, sans-serif`;

function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}
function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2); c.fill(); }

function drawItem(c, k, w, h) {
  const F = col => { c.fillStyle = col; };
  const S = (col, lw) => { c.strokeStyle = col; c.lineWidth = lw; };
  switch (k) {
    case 'laptop':
      F(COL.mix); rr(c, -w / 2, -h / 2, w, h, 6); c.fill(); F(COL.mixD);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) c.fillRect(-w / 2 + 10 + i * (w - 20) / 6, -h / 2 + 10 + j * h * 0.15, (w - 20) / 6 - 4, h * 0.15 - 4);
      F(COL.metD); c.fillRect(-w / 2 + 8, h * 0.18, w - 16, h * 0.18); break;
    case 'shoes':
      F(COL.org); ell(c, -w * 0.24, 0, w * 0.21, h * 0.48); ell(c, w * 0.24, 0, w * 0.21, h * 0.48);
      F(COL.met); for (let i = 0; i < 3; i++) { ell(c, -w * 0.24, -h * 0.25 + i * h * 0.16, 3, 3); ell(c, w * 0.24, -h * 0.25 + i * h * 0.16, 3, 3); } break;
    case 'book':
      F(COL.org); c.fillRect(-w / 2, -h / 2, w, h); F(COL.orgD); for (let i = 1; i < 6; i++) c.fillRect(-w / 2 + 4, -h / 2 + i * h / 6, w - 8, 2); break;
    case 'phone':
      F(COL.met); rr(c, -w / 2, -h / 2, w, h, 6); c.fill(); F(COL.metD); c.fillRect(-w * 0.32, -h * 0.28, w * 0.64, h * 0.56); break;
    case 'charger':
      F(COL.met); c.fillRect(-w / 2, -h / 2, w * 0.42, h * 0.6); S(COL.met, 3); c.beginPath(); c.moveTo(-w * 0.08, -h * 0.2);
      c.bezierCurveTo(w * 0.5, -h * 0.7, w * 0.05, h * 0.75, w * 0.5, h * 0.4); c.stroke(); break;
    case 'sweater':
      F(COL.org); ell(c, 0, 0, w * 0.48, h * 0.46); F(COL.orgD); ell(c, -w * 0.15, -h * 0.05, w * 0.12, h * 0.08); ell(c, w * 0.18, h * 0.12, w * 0.1, h * 0.07); break;
    case 'umbrella':
      F(COL.met); c.fillRect(-w / 2, -h * 0.18, w * 0.92, h * 0.36); F(COL.metD); for (let i = 0; i < 5; i++) c.fillRect(-w / 2 + 6 + i * w * 0.18, -h / 2, 3, h);
      S(COL.met, 4); c.beginPath(); c.arc(w * 0.42, h * 0.1, h * 0.45, -Math.PI / 2, Math.PI / 2); c.stroke(); break;
    case 'camera':
      F(COL.metD); rr(c, -w / 2, -h / 2, w, h, 5); c.fill(); F(COL.met); ell(c, 0, 0, Math.min(w, h) * 0.34, Math.min(w, h) * 0.34); F(COL.dense); ell(c, 0, 0, Math.min(w, h) * 0.16, Math.min(w, h) * 0.16); break;
    case 'headphones':
      S(COL.met, 5); c.beginPath(); c.arc(0, h * 0.1, w * 0.4, Math.PI, 0); c.stroke(); F(COL.metD); ell(c, -w * 0.4, h * 0.22, w * 0.12, h * 0.26); ell(c, w * 0.4, h * 0.22, w * 0.12, h * 0.26); break;
    case 'liquids':
      S(COL.mix, 2); c.strokeRect(-w / 2, -h / 2, w, h); F(COL.mix);
      for (let i = 0; i < 3; i++) { rr(c, -w / 2 + 6 + i * w * 0.3, -h * 0.25, w * 0.22, h * 0.65, 4); c.fill(); }
      F(COL.met); for (let i = 0; i < 3; i++) c.fillRect(-w / 2 + 9 + i * w * 0.3, -h * 0.38, w * 0.12, h * 0.12); break;
    case 'keys':
      S(COL.metD, 4); c.beginPath(); c.arc(-w * 0.15, -h * 0.15, w * 0.22, 0, Math.PI * 2); c.stroke(); F(COL.metD);
      c.fillRect(0, -h * 0.05, w * 0.48, h * 0.14); c.fillRect(-w * 0.05, h * 0.05, w * 0.12, h * 0.42); break;
    case 'snacks':
      F(COL.org); c.beginPath(); c.moveTo(-w / 2, -h / 2); for (let i = 0; i <= 6; i++) c.lineTo(-w / 2 + i * w / 6, -h / 2 + (i % 2) * 5);
      c.lineTo(w / 2, h / 2); for (let i = 6; i >= 0; i--) c.lineTo(-w / 2 + i * w / 6, h / 2 - (i % 2) * 5); c.closePath(); c.fill(); break;
    case 'toy':
      F(COL.org); ell(c, 0, h * 0.18, w * 0.38, h * 0.32); ell(c, 0, -h * 0.25, w * 0.28, h * 0.22); ell(c, -w * 0.25, -h * 0.42, w * 0.1, h * 0.08); ell(c, w * 0.25, -h * 0.42, w * 0.1, h * 0.08); break;
    case 'hairdryer':
      F(COL.mix); ell(c, -w * 0.15, -h * 0.1, w * 0.3, h * 0.32); c.fillRect(0, -h * 0.25, w * 0.5, h * 0.3); c.fillRect(-w * 0.28, 0, w * 0.18, h * 0.5);
      F(COL.metD); for (let i = 0; i < 4; i++) c.fillRect(-w * 0.32 + i * 6, -h * 0.25, 3, h * 0.3); break;
    case 'knife':
      F(COL.org); rr(c, -w / 2, -h / 2, w * 0.38, h, 4); c.fill();
      F(COL.dense); c.beginPath(); c.moveTo(-w * 0.12, -h * 0.5); c.lineTo(w * 0.5, -h * 0.05); c.lineTo(w * 0.42, h * 0.5); c.lineTo(-w * 0.12, h * 0.5); c.closePath(); c.fill();
      c.fillRect(-w * 0.15, -h * 0.7, 6, h * 1.4); break;
    case 'scissors':
      F(COL.dense); c.save(); c.rotate(0.12); c.beginPath(); c.moveTo(-w * 0.05, -4); c.lineTo(w * 0.5, 0); c.lineTo(-w * 0.05, 5); c.fill(); c.restore();
      c.save(); c.rotate(-0.12); c.beginPath(); c.moveTo(-w * 0.05, -4); c.lineTo(w * 0.5, 0); c.lineTo(-w * 0.05, 5); c.fill(); c.restore();
      S(COL.dense, 5); c.beginPath(); c.arc(-w * 0.3, -h * 0.25, h * 0.32, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(-w * 0.3, h * 0.25, h * 0.32, 0, Math.PI * 2); c.stroke(); break;
    case 'bottle':
      F(COL.mix); rr(c, -w / 2, -h * 0.25, w, h * 0.75, 8); c.fill(); c.fillRect(-w * 0.2, -h * 0.42, w * 0.4, h * 0.2);
      F(COL.mixD); rr(c, -w / 2 + 3, -h * 0.02, w - 6, h * 0.5, 6); c.fill(); F(COL.met); c.fillRect(-w * 0.24, -h / 2, w * 0.48, h * 0.09); break;
    case 'hammer':
      F(COL.org); rr(c, -w / 2, -h * 0.18, w * 0.8, h * 0.36, 4); c.fill(); F(COL.dense); c.fillRect(w * 0.22, -h / 2, w * 0.18, h); c.fillRect(w * 0.36, -h * 0.5, w * 0.14, h * 0.36); break;
    case 'spray':
      F(COL.metD); rr(c, -w / 2, -h * 0.32, w, h * 0.82, 6); c.fill(); F(COL.dense); c.fillRect(-w * 0.3, -h * 0.46, w * 0.6, h * 0.16); c.fillRect(-w * 0.1, -h / 2, w * 0.5, h * 0.06); break;
    case 'fireworks':
      for (let i = 0; i < 4; i++) { F(COL.org); c.fillRect(-w / 2 + i * w * 0.25, -h * 0.25, w * 0.2, h * 0.75); F(COL.dense); c.fillRect(-w / 2 + i * w * 0.25, -h * 0.35, w * 0.2, h * 0.12); }
      S(COL.metD, 2); c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(-w / 2 + i * w * 0.25 + w * 0.1, -h * 0.35); c.lineTo(-w / 2 + i * w * 0.25 + w * 0.16, -h * 0.5); } c.stroke(); break;
  }
}

function itemBox(it) { const d = ITEMS[it.kind], R = BAG_RECT; return { cx: R.x + it.x * R.w, cy: R.y + it.y * R.h, w: d.w * R.w, h: d.h * R.w }; }

/* o: { lane, label, scan 0..1, reveal, idle } */
export function drawXray(c, bag, o = {}) {
  c.save();
  c.fillStyle = '#05081c'; c.fillRect(0, 0, XW, XH);
  c.fillStyle = 'rgba(70,110,255,0.08)'; for (let y = 50; y < XH; y += 4) c.fillRect(0, y, XW, 1);
  c.fillStyle = '#000000'; c.fillRect(0, 0, XW, 48); c.fillStyle = '#ec3013'; c.fillRect(0, 46, XW, 3);
  c.font = FONT(22); c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = '#ffd23a'; c.fillText('LANE ' + (o.lane || 1) + '   X-RAY', 18, 24);
  c.textAlign = 'right'; c.fillStyle = '#ffffff'; c.fillText(o.label || '', XW - 18, 24);
  c.fillStyle = '#000000'; c.fillRect(0, XH - 34, XW, 34);
  c.font = FONT(14); c.textAlign = 'left';
  [['ORGANIC', COL.org], ['MIXED', COL.mix], ['METAL', COL.met], ['DENSE', COL.dense]].forEach(([t, col], i) => { c.fillStyle = col; c.fillRect(18 + i * 118, XH - 23, 14, 14); c.fillStyle = '#c9d1ff'; c.fillText(t, 38 + i * 118, XH - 15); });
  if (!bag) {
    c.textAlign = 'left'; c.fillStyle = '#6f7cff'; c.font = FONT(28); c.fillText(o.idle || 'WAITING FOR BAG', 70, XH / 2);
    c.restore(); return;
  }
  const R = BAG_RECT, scan = o.scan ?? 1;
  c.save(); c.beginPath(); c.rect(0, 50, R.x - 30 + (R.w + 60) * scan, XH - 86); c.clip();
  c.fillStyle = 'rgba(70,110,230,0.18)'; rr(c, R.x - 18, R.y - 14, R.w + 36, R.h + 28, 26); c.fill();
  c.lineWidth = 9; c.strokeStyle = '#3156d6'; c.stroke();
  c.lineWidth = 7; c.beginPath(); c.moveTo(XW / 2 - 60, R.y - 14); c.lineTo(XW / 2 - 60, R.y - 30); c.lineTo(XW / 2 + 60, R.y - 30); c.lineTo(XW / 2 + 60, R.y - 14); c.stroke();
  c.setLineDash([5, 5]); c.strokeStyle = '#5b85ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(R.x - 8, R.y + 2); c.lineTo(R.x + R.w + 8, R.y + 2); c.stroke(); c.setLineDash([]);
  c.globalAlpha = 0.93;
  for (const it of bag.items) { const b = itemBox(it); c.save(); c.translate(b.cx, b.cy); c.rotate(it.rot); drawItem(c, it.kind, b.w, b.h); c.restore(); }
  c.globalAlpha = 1;
  c.restore();
  if (scan < 1) { const x = R.x - 30 + (R.w + 60) * scan; c.fillStyle = 'rgba(140,210,255,0.9)'; c.fillRect(x - 2, 54, 4, XH - 92); }
  let n = 0;
  for (const it of bag.items) {
    const b = itemBox(it), s = Math.max(b.w, b.h) * 0.62 + 16;
    if (it.tag) {
      n++;
      c.strokeStyle = '#ffd23a'; c.lineWidth = 4; c.strokeRect(b.cx - s, b.cy - s, s * 2, s * 2);
      c.fillStyle = '#ffd23a'; c.fillRect(b.cx - s, b.cy - s - 22, 30, 22); c.fillStyle = '#000000'; c.font = FONT(16); c.textAlign = 'left'; c.fillText(String(n), b.cx - s + 9, b.cy - s - 10);
    }
    if (o.reveal && it.bad) {
      c.strokeStyle = '#ec3013'; c.lineWidth = 4; c.strokeRect(b.cx - s - 5, b.cy - s - 5, s * 2 + 10, s * 2 + 10);
      const t = ITEMS[it.kind].label; c.font = FONT(15); const tw = c.measureText(t).width + 14;
      c.fillStyle = '#ec3013'; c.fillRect(b.cx - s - 5, b.cy + s + 5, tw, 22); c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.fillText(t, b.cx - s + 2, b.cy + s + 17);
    }
  }
  c.restore();
}

/* returns the item under a point given in canvas pixels */
export function hitXray(bag, px, py) {
  if (!bag) return null;
  let best = null, bd = 1e9;
  for (const it of bag.items) {
    const b = itemBox(it), rad = Math.max(b.w, b.h) * 0.55 + 18, d = Math.hypot(px - b.cx, py - b.cy);
    if (d < rad && d < bd) { bd = d; best = it; }
  }
  return best;
}

export function drawBoard(c, W, H, flights, clock) {
  c.save();
  c.fillStyle = '#0a0a0a'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#000000'; c.fillRect(0, 0, W, 54); c.fillStyle = '#ec3013'; c.fillRect(0, 52, W, 3);
  c.font = FONT(30); c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = '#ffd23a'; c.fillText('DEPARTURES', 22, 28);
  c.textAlign = 'right'; c.fillStyle = '#ffffff'; c.fillText(clock, W - 22, 28);
  const cols = [22, 140, 300, 690, 800];
  c.font = FONT(15); c.fillStyle = '#8d8a85'; c.textAlign = 'left';
  ['TIME', 'FLIGHT', 'DESTINATION', 'GATE', 'STATUS'].forEach((t, i) => c.fillText(t, cols[i], 72));
  const rh = (H - 86) / 5;
  flights.slice(0, 5).forEach((f, i) => {
    const y = 86 + i * rh;
    c.fillStyle = i % 2 ? '#111111' : '#181818'; c.fillRect(0, y, W, rh - 2);
    c.font = FONT(24); c.fillStyle = '#ffffff';
    c.fillText(f.time, cols[0], y + rh / 2); c.fillText(f.code, cols[1], y + rh / 2); c.fillText(f.dest, cols[2], y + rh / 2); c.fillText(f.gate, cols[3], y + rh / 2);
    c.fillStyle = f.status === 'BOARDING' ? '#ffd23a' : f.status === 'DELAYED' ? '#ff5a3c' : f.status === 'FINAL CALL' ? '#ff5a3c' : '#7fe39a';
    c.fillText(f.status, cols[4], y + rh / 2);
  });
  c.restore();
}
