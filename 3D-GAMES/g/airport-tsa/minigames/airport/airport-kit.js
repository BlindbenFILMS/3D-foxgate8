/* AIRPORT TSA . toon kit: materials, mesh merging, sign atlas */
import * as THREE from '../../vendor/three/three.module.js';

export const INK = 0x1a1626;
let GRAD = null;
export function gradMap() {
  if (GRAD) return GRAD;
  const d = new Uint8Array([118, 118, 118, 255, 196, 196, 196, 255, 255, 255, 255, 255]);
  GRAD = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter;
  GRAD.generateMipmaps = false;
  GRAD.needsUpdate = true;
  return GRAD;
}

const MATS = new Map();
export function toonMat(color = 0xffffff, o = {}) {
  if (o.map) return new THREE.MeshToonMaterial({ color, gradientMap: gradMap(), map: o.map });
  const key = 't|' + color + '|' + (o.vc ? 1 : 0);
  if (!MATS.has(key)) MATS.set(key, new THREE.MeshToonMaterial({ color, gradientMap: gradMap(), vertexColors: !!o.vc }));
  return MATS.get(key);
}
export function inkMat() {
  if (!MATS.has('ink')) MATS.set('ink', new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));
  return MATS.get('ink');
}
export function basicVC() {
  if (!MATS.has('bvc')) MATS.set('bvc', new THREE.MeshBasicMaterial({ vertexColors: true }));
  return MATS.get('bvc');
}
export function clearMats() { MATS.forEach(m => m.dispose()); MATS.clear(); if (GRAD) { GRAD.dispose(); GRAD = null; } }

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
const _n3 = new THREE.Matrix3(), _c = new THREE.Color(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _ctr = new THREE.Vector3(), _sz = new THREE.Vector3();

/* Collects many toon parts into one vertex-coloured mesh plus one ink shell mesh */
export class Builder {
  constructor() { this.P = []; this.N = []; this.C = []; this.I = []; }
  get empty() { return this.P.length === 0; }
  add(geo, color, o = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0, o.order || 'XYZ'); _q.setFromEuler(_e);
    _p.set(o.x || 0, o.y || 0, o.z || 0); _m.compose(_p, _q, _s); _n3.getNormalMatrix(_m);
    const pos = g.attributes.position, nor = g.attributes.normal;
    _c.set(color);
    for (let i = 0; i < pos.count; i++) {
      _a.fromBufferAttribute(pos, i).applyMatrix4(_m); this.P.push(_a.x, _a.y, _a.z);
      _b.fromBufferAttribute(nor, i).applyMatrix3(_n3).normalize(); this.N.push(_b.x, _b.y, _b.z);
      this.C.push(_c.r, _c.g, _c.b);
    }
    if (o.ink !== false) {
      const t = o.t ?? 0.045;
      g.computeBoundingBox(); g.boundingBox.getCenter(_ctr); g.boundingBox.getSize(_sz);
      const kx = _sz.x > 1e-3 ? (_sz.x + 2 * t) / _sz.x : 1, ky = _sz.y > 1e-3 ? (_sz.y + 2 * t) / _sz.y : 1, kz = _sz.z > 1e-3 ? (_sz.z + 2 * t) / _sz.z : 1;
      for (let i = 0; i < pos.count; i++) {
        _a.fromBufferAttribute(pos, i).sub(_ctr); _a.x *= kx; _a.y *= ky; _a.z *= kz;
        _a.add(_ctr).applyMatrix4(_m); this.I.push(_a.x, _a.y, _a.z);
      }
    }
    if (g !== geo) g.dispose();
    geo.dispose();
    return this;
  }
  box(x, y0, z, w, h, d, color, o = {}) { return this.add(new THREE.BoxGeometry(w, h, d), color, { ...o, x, y: y0 + h / 2, z }); }
  cyl(x, y0, z, rt, rb, h, color, o = {}) { return this.add(new THREE.CylinderGeometry(rt, rb, h, o.seg || 14), color, { ...o, x, y: y0 + h / 2, z }); }
  sph(x, y, z, r, color, o = {}) { return this.add(new THREE.SphereGeometry(r, o.seg || 12, o.seg2 || 8), color, { ...o, x, y, z }); }
  cap(x, y, z, r, len, color, o = {}) { return this.add(new THREE.CapsuleGeometry(r, len, 4, o.seg || 10), color, { ...o, x, y, z }); }
  plane(x, y, z, w, h, color, o = {}) { return this.add(new THREE.PlaneGeometry(w, h), color, { ink: false, ...o, x, y, z }); }
  build(o = {}) {
    const grp = new THREE.Group();
    if (this.P.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, o.mat || toonMat(0xffffff, { vc: true }));
      grp.add(mesh); grp.userData.mesh = mesh;
    }
    if (this.I.length && o.ink !== false) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.I, 3));
      g.computeBoundingSphere();
      const ink = new THREE.Mesh(g, inkMat());
      grp.add(ink); grp.userData.ink = ink;
    }
    this.P = this.N = this.C = this.I = null;
    return grp;
  }
}

/* Signs: every label drawn into one canvas, merged into one or two meshes */
export class SignAtlas {
  constructor(size = 2048, ppu = 40) {
    this.size = size; this.ppu = ppu;
    this.cv = document.createElement('canvas'); this.cv.width = this.cv.height = size;
    this.ctx = this.cv.getContext('2d');
    this.cx = 0; this.cy = 0; this.rh = 0; this.L = {};
  }
  alloc(w, h) {
    if (this.cx + w > this.size) { this.cx = 0; this.cy += this.rh + 4; this.rh = 0; }
    if (this.cy + h > this.size) { this.cy = 0; this.cx = 0; } /* overflow: reuse (never expected) */
    const r = { x: this.cx, y: this.cy, w, h };
    this.cx += w + 4; this.rh = Math.max(this.rh, h);
    return r;
  }
  draw(text, w, h, o = {}) {
    const k = o.ppu || this.ppu, pw = Math.max(8, Math.round(w * k)), ph = Math.max(8, Math.round(h * k));
    const r = this.alloc(pw, ph), c = this.ctx;
    c.save(); c.beginPath(); c.rect(r.x, r.y, pw, ph); c.clip();
    c.fillStyle = o.bg || '#111111'; c.fillRect(r.x, r.y, pw, ph);
    if (o.rule) { const t = Math.max(3, ph * 0.08); c.fillStyle = o.rule; c.fillRect(r.x, r.y + ph - t, pw, t); }
    const lines = String(text).split('\n');
    const pad = ph * (o.pad ?? 0.14);
    const iconW = o.icon ? ph * 0.86 : 0;
    const lh = (ph - pad * 2) / lines.length;
    let fs = lh * (o.fs || 0.8);
    const font = s => `${o.weight || 900} ${s}px Archivo, "Arial Black", Arial, sans-serif`;
    c.font = font(fs);
    const mw = Math.max(...lines.map(l => c.measureText(l).width));
    const avail = pw - pad * 2 - iconW;
    if (mw > avail) { fs *= avail / mw; c.font = font(fs); }
    c.fillStyle = o.fg || '#ffffff'; c.textBaseline = 'middle';
    const align = o.align || 'center';
    c.textAlign = align;
    lines.forEach((l, i) => {
      const y = r.y + pad + lh * (i + 0.5) + fs * 0.04;
      const x = align === 'left' ? r.x + pad + iconW : align === 'right' ? r.x + pw - pad : r.x + iconW / 2 + pw / 2;
      c.fillText(l, x, y);
    });
    if (o.icon) drawIcon(c, o.icon, r.x + pad + iconW * 0.45, r.y + ph / 2, ph * 0.32, o.fg || '#fff');
    c.restore();
    return r;
  }
  quad(r, w, h, o = {}) { const n = o.list || 'main'; (this.L[n] = this.L[n] || []).push({ r, w, h, o }); }
  add(text, w, h, style, place) {
    const r = this.draw(text, w, h, style);
    this.quad(r, w, h, place);
    if (place.both) this.quad(r, w, h, { ...place, ry: (place.ry || 0) + Math.PI });
    return r;
  }
  build() {
    const tex = new THREE.CanvasTexture(this.cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const out = { tex, mat };
    const S = this.size;
    for (const [name, list] of Object.entries(this.L)) {
      const P = [], U = [];
      for (const q of list) {
        const g = new THREE.PlaneGeometry(q.w, q.h).toNonIndexed();
        _e.set(q.o.rx || 0, q.o.ry || 0, 0, 'YXZ'); _q.setFromEuler(_e); _p.set(q.o.x || 0, q.o.y || 0, q.o.z || 0); _m.compose(_p, _q, _s);
        const pos = g.attributes.position, uv = g.attributes.uv;
        const u0 = q.r.x / S, u1 = (q.r.x + q.r.w) / S, v0 = 1 - (q.r.y + q.r.h) / S, v1 = 1 - q.r.y / S;
        for (let i = 0; i < pos.count; i++) {
          _a.fromBufferAttribute(pos, i).applyMatrix4(_m); P.push(_a.x, _a.y, _a.z);
          U.push(u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
        }
        g.dispose();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
      g.computeBoundingSphere();
      out[name] = new THREE.Mesh(g, mat);
    }
    return out;
  }
}

export function drawIcon(c, kind, x, y, s, col) {
  c.save(); c.translate(x, y); c.fillStyle = col; c.strokeStyle = col; c.lineWidth = s * 0.22; c.lineCap = 'square';
  c.beginPath();
  if (kind === 'plane') {
    c.moveTo(-s, s * 0.15); c.lineTo(-s * 0.2, s * 0.1); c.lineTo(-s * 0.55, s * 0.9); c.lineTo(-s * 0.25, s * 0.9); c.lineTo(s * 0.35, s * 0.1);
    c.lineTo(s * 0.9, s * 0.1); c.lineTo(s, 0); c.lineTo(s * 0.9, -s * 0.1); c.lineTo(s * 0.35, -s * 0.1); c.lineTo(-s * 0.25, -s * 0.9);
    c.lineTo(-s * 0.55, -s * 0.9); c.lineTo(-s * 0.2, -s * 0.1); c.lineTo(-s, -s * 0.15); c.closePath(); c.fill();
  } else if (kind === 'cup') {
    c.rect(-s * 0.7, -s * 0.5, s * 1.1, s * 1.2); c.fill(); c.beginPath(); c.arc(s * 0.5, s * 0.05, s * 0.35, -1.2, 1.2); c.stroke();
  } else if (kind === 'bag') {
    c.rect(-s * 0.85, -s * 0.45, s * 1.7, s * 1.25); c.fill(); c.beginPath(); c.rect(-s * 0.35, -s * 0.85, s * 0.7, s * 0.4); c.stroke();
  } else if (kind === 'info') {
    c.arc(0, -s * 0.62, s * 0.2, 0, 7); c.fill(); c.beginPath(); c.rect(-s * 0.18, -s * 0.25, s * 0.36, s * 1.05); c.fill();
  } else if (kind === 'arrow') {
    c.moveTo(-s, -s * 0.2); c.lineTo(s * 0.2, -s * 0.2); c.lineTo(s * 0.2, -s * 0.7); c.lineTo(s, 0); c.lineTo(s * 0.2, s * 0.7); c.lineTo(s * 0.2, s * 0.2); c.lineTo(-s, s * 0.2); c.closePath(); c.fill();
  } else if (kind === 'shield') {
    c.moveTo(0, -s); c.lineTo(s * 0.85, -s * 0.6); c.lineTo(s * 0.7, s * 0.4); c.lineTo(0, s); c.lineTo(-s * 0.7, s * 0.4); c.lineTo(-s * 0.85, -s * 0.6); c.closePath(); c.fill();
  }
  c.restore();
}

export function disposeObj(o) {
  o.traverse(n => { if (n.geometry) n.geometry.dispose(); });
}
