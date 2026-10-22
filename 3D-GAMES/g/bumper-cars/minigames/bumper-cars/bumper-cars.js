/* BUMPER CARS for 8 GATES 3D
   Standalone: createBumperCars({ container, onState })
   World mode: createBumperCars({ container, onState, opts: { world: { renderer, camera, parent } } })
   See README.md for the full API. */
import * as THREE from '../../vendor/three/three.module.js';
import {
  ARENA, CAR, ROUND, COUNT, STAR_EVERY, STAR_TIME, LEVELS, CAST, lineup,
  hitPoints, rank, rewards, aiControl, CAPTIONS
} from './bumper-cars-rules.js';
import { createAudio } from './bumper-cars-audio.js';

export const GAME = { key: 'bumperCars', name: 'BUMPER CARS', maxPlayers: 4 };

const INK = 0x1a1626;
const PI = Math.PI;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = a => { while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; return a; };

export async function createBumperCars({ container, onState = () => {}, opts = {} }) {
  const W = opts.world || null;
  const touch = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
  const owned = [];
  const own = o => { owned.push(o); return o; };

  /* ---------------- save / settings ---------------- */
  const store = {
    get(k, d) {
      if (opts.save && opts.save.stat) { try { const v = opts.save.stat(GAME.key + '.' + k, d); return v == null ? d : v; } catch (e) { return d; } }
      try { const v = localStorage.getItem(GAME.key + '.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      if (opts.save && opts.save.setStat) { try { opts.save.setStat(GAME.key + '.' + k, v); } catch (e) { /* ignore */ } return; }
      try { localStorage.setItem(GAME.key + '.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ }
    },
    gold(n) {
      if (!n) return;
      if (opts.save && opts.save.addGold) { try { opts.save.addGold(n); } catch (e) { /* ignore */ } return; }
      this.set('gold', (this.get('gold', 0) | 0) + n);
    }
  };
  let levelIdx = clamp(opts.level != null ? opts.level : store.get('level', 1), 0, 2) | 0;
  let soundOn = store.get('sound', true) !== false;
  let musicOn = W ? false : store.get('music', true) !== false;
  const audio = createAudio({ sound: soundOn, music: musicOn });

  /* ---------------- materials + geometry helpers ---------------- */
  const grad = own(new THREE.DataTexture(new Uint8Array([80, 80, 80, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1));
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  const vcMat = own(new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: grad }));
  const inkMat = own(new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));
  const mats = new Map();
  function toon(color, extra) {
    const k = color + (extra ? JSON.stringify(extra) : '');
    if (!mats.has(k)) mats.set(k, own(new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: grad }, extra || {}))));
    return mats.get(k);
  }
  const basics = new Map();
  function basic(color, extra) {
    const k = color + (extra ? JSON.stringify(extra) : '');
    if (!basics.has(k)) basics.set(k, own(new THREE.MeshBasicMaterial(Object.assign({ color }, extra || {}))));
    return basics.get(k);
  }
  const _c = new THREE.Color(), _e = new THREE.Euler(), _q = new THREE.Quaternion();
  function part(geo, color, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
    _e.set(r[0], r[1], r[2]); _q.setFromEuler(_e);
    return { geo, color, m: new THREE.Matrix4().compose(V(p[0], p[1], p[2]), _q.clone(), V(s[0], s[1], s[2])) };
  }
  function merge(parts) {
    const gs = parts.map(pt => {
      const g = pt.geo.index ? pt.geo.toNonIndexed() : pt.geo.clone();
      g.applyMatrix4(pt.m);
      if (!g.attributes.normal) g.computeVertexNormals();
      return [g, pt.color];
    });
    let n = 0; for (const [g] of gs) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    let o = 0;
    for (const [g, c] of gs) {
      const cnt = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
      _c.set(c);
      for (let i = 0; i < cnt; i++) { col[(o + i) * 3] = _c.r; col[(o + i) * 3 + 1] = _c.g; col[(o + i) * 3 + 2] = _c.b; }
      o += cnt; g.dispose();
    }
    for (const pt of parts) pt.geo.dispose();
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.computeBoundingSphere();
    return own(out);
  }
  function inflate(geo, t) {
    const g = geo.clone();
    if (g.attributes.color) g.deleteAttribute('color');
    if (g.attributes.uv) g.deleteAttribute('uv');
    const p = g.attributes.position.array, nr = g.attributes.normal.array;
    for (let i = 0; i < p.length; i++) p[i] += nr[i] * t;
    g.computeBoundingSphere();
    return own(g);
  }
  const inkCache = new Map();
  function inked(geo, mat = vcMat, t = 0.05) {
    const g = new THREE.Group();
    const key = geo.uuid + ':' + t;
    if (!inkCache.has(key)) inkCache.set(key, inflate(geo, t));
    g.add(new THREE.Mesh(inkCache.get(key), inkMat), new THREE.Mesh(geo, mat));
    return g;
  }
  function roundedRect(hx, hz, r) {
    const s = new THREE.Shape();
    s.moveTo(-hx + r, -hz); s.lineTo(hx - r, -hz); s.absarc(hx - r, -hz + r, r, -PI / 2, 0, false);
    s.lineTo(hx, hz - r); s.absarc(hx - r, hz - r, r, 0, PI / 2, false);
    s.lineTo(-hx + r, hz); s.absarc(-hx + r, hz - r, r, PI / 2, PI, false);
    s.lineTo(-hx, -hz + r); s.absarc(-hx + r, -hz + r, r, PI, 1.5 * PI, false);
    return s;
  }
  function canvasTex(w, h, draw, repeat) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = own(new THREE.CanvasTexture(cv));
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
    t.anisotropy = 4;
    return t;
  }

  /* ---------------- scene graph ---------------- */
  const scene = W ? new THREE.Group() : new THREE.Scene();
  const env = W ? new THREE.Scene() : scene;          /* lights / room / sky: thrown away in world mode */
  scene.name = 'bumperCars';
  if (W) W.parent.add(scene);

  let renderer = null, ro = null;
  if (!W) {
    renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.75 : 2));
    const el = renderer.domElement;
    el.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
    container.appendChild(el);
  }
  const domEl = W ? W.renderer.domElement : renderer.domElement;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  const wcam = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  const camGoal = { pos: V(0, 20, 20), quat: new THREE.Quaternion() };
  const camCur = { pos: V(0, 20, 20), quat: new THREE.Quaternion() };
  let shakeT = 0, shakeAmp = 0;

  /* lights + room (standalone only, or thrown away) */
  env.add(new THREE.HemisphereLight(0xffffff, 0x3b3550, 1.15));
  const sun = new THREE.DirectionalLight(0xfff4e6, 2.1); sun.position.set(8, 20, 12); env.add(sun);
  if (!W) {
    scene.background = new THREE.Color('#14111c');
    scene.fog = new THREE.Fog('#14111c', 55, 120);
    const tiles = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#221e2c'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#2f2a3c'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
    }, 40);
    const ground = new THREE.Mesh(own(new THREE.PlaneGeometry(240, 240)), toon('#ffffff', { map: tiles }));
    ground.rotation.x = -PI / 2; ground.position.y = -0.02; env.add(ground);
    const stripes = canvasTex(512, 256, (g, w, h) => {
      for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#ec3013' : '#1b1824'; g.fillRect(i * w / 16, 0, w / 16, h); }
      g.fillStyle = '#ffd23a'; g.fillRect(0, h - 26, w, 26);
      g.fillStyle = '#1a1626'; g.fillRect(0, h - 30, w, 4);
    });
    const wallGeo = own(new THREE.PlaneGeometry(110, 22));
    const wallMat = toon('#ffffff', { map: stripes });
    [[0, 11, -34, 0], [-46, 11, 0, PI / 2], [46, 11, 0, -PI / 2]].forEach(([x, y, z, ry]) => {
      const m = new THREE.Mesh(wallGeo, wallMat); m.position.set(x, y, z); m.rotation.y = ry; env.add(m);
    });
    /* string lights between the back and side posts */
    const bulbs = [];
    const P = [[-ARENA.hx - 1.6, ARENA.hz + 1.6], [-ARENA.hx - 1.6, -ARENA.hz - 1.6], [ARENA.hx + 1.6, -ARENA.hz - 1.6], [ARENA.hx + 1.6, ARENA.hz + 1.6]];
    for (let s = 0; s < 3; s++) {
      const a = P[s], b = P[s + 1];
      for (let i = 0; i <= 18; i++) {
        const t = i / 18;
        bulbs.push([a[0] + (b[0] - a[0]) * t, 6.2 - Math.sin(t * PI) * 1.3, a[1] + (b[1] - a[1]) * t]);
      }
    }
    const bulbMesh = new THREE.InstancedMesh(own(new THREE.SphereGeometry(0.17, 8, 6)), basic('#ffffff'), bulbs.length);
    const pal = ['#ffd23a', '#ec3013', '#ffffff'];
    const mm = new THREE.Matrix4();
    bulbs.forEach((b, i) => { mm.makeTranslation(b[0], b[1], b[2]); bulbMesh.setMatrixAt(i, mm); bulbMesh.setColorAt(i, _c.set(pal[i % 3])); });
    env.add(bulbMesh);
  }

  /* ---------------- the rink (always: this is the playable object) ---------------- */
  const { hx, hz, cr } = ARENA;
  {
    const plate = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#4b5366'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#434a5c';
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        g.save(); g.translate(x * 32 + 16, y * 32 + 16); g.rotate((x + y) % 2 ? 0.7 : -0.7); g.fillRect(-9, -2.5, 18, 5); g.restore();
      }
      g.strokeStyle = '#363c4b'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
    }, 0.25);
    const floorGeo = own(new THREE.ShapeGeometry(roundedRect(hx + 0.2, hz + 0.2, cr + 0.2), 10));
    floorGeo.rotateX(-PI / 2);
    const floor = new THREE.Mesh(floorGeo, toon('#ffffff', { map: plate }));
    floor.position.y = 0.01; scene.add(floor);
    /* centre ring paint */
    const ring = new THREE.Mesh(own(new THREE.RingGeometry(2.6, 3.0, 40)), toon('#ffd23a'));
    ring.rotation.x = -PI / 2; ring.position.y = 0.03; scene.add(ring);
    /* skirt under the rail */
    const sk = roundedRect(hx + 1.0, hz + 1.0, cr + 1.0);
    sk.holes.push(roundedRect(hx + 0.1, hz + 0.1, cr + 0.1));
    const skGeo = own(new THREE.ExtrudeGeometry(sk, { depth: 0.42, bevelEnabled: false, curveSegments: 10 }));
    skGeo.rotateX(-PI / 2);
    scene.add(new THREE.Mesh(skGeo, toon('#24212d')));
    /* striped rubber rail */
    const pts = roundedRect(hx + 0.45, hz + 0.45, cr + 0.45).getSpacedPoints(160);
    pts.pop();
    const curve = new THREE.CatmullRomCurve3(pts.map(p => V(p.x, 0.62, p.y)), true);
    const RS = 8, TS = 200;
    const tube = new THREE.TubeGeometry(curve, TS, 0.45, RS, true);
    const tc = new Float32Array(tube.attributes.position.count * 3);
    const red = new THREE.Color('#ec3013'), wht = new THREE.Color('#f4efe6');
    for (let i = 0; i < tube.attributes.position.count; i++) {
      const seg = Math.floor(i / (RS + 1));
      const c = Math.floor(seg / 5) % 2 ? red : wht;
      tc[i * 3] = c.r; tc[i * 3 + 1] = c.g; tc[i * 3 + 2] = c.b;
    }
    tube.setAttribute('color', new THREE.BufferAttribute(tc, 3));
    own(tube);
    scene.add(inked(tube, vcMat, 0.07));
    /* corner posts + sign posts (one merged mesh) */
    const parts = [];
    const px = hx + 1.6, pz = hz + 1.6;
    for (const [x, z] of [[-px, -pz], [px, -pz], [-px, pz], [px, pz]]) {
      parts.push(part(new THREE.CylinderGeometry(0.22, 0.28, 6.4, 10), '#ffd23a', [x, 3.2, z]));
      parts.push(part(new THREE.SphereGeometry(0.42, 12, 8), '#ec3013', [x, 6.5, z]));
    }
    for (const x of [-4.2, 4.2]) parts.push(part(new THREE.CylinderGeometry(0.16, 0.16, 4, 8), '#1f1c26', [x, 2.3, -hz - 2.3]));
    scene.add(inked(merge(parts), vcMat, 0.06));
    /* sign */
    const signTex = canvasTex(1024, 220, (g, w, h) => {
      g.fillStyle = '#0e0c12'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ec3013'; g.fillRect(0, 0, 36, h);
      g.fillStyle = '#ffd23a'; g.fillRect(36, h - 16, w - 36, 16);
      g.fillStyle = '#ffffff'; g.textBaseline = 'middle';
      let fs = 138;
      do { g.font = '900 ' + fs + 'px Archivo, "Arial Black", Arial, sans-serif'; fs -= 4; } while (g.measureText('BUMPER CARS').width > w - 110 && fs > 40);
      g.fillText('BUMPER CARS', 70, h / 2 - 4);
    });
    const sign = new THREE.Mesh(own(new THREE.PlaneGeometry(11, 2.36)), basic('#ffffff', { map: signTex }));
    sign.position.set(0, 5.0, -hz - 2.25); scene.add(sign);
    const signBack = new THREE.Mesh(own(new THREE.BoxGeometry(11.3, 2.66, 0.2)), toon('#1a1626'));
    signBack.position.set(0, 5.0, -hz - 2.4); scene.add(signBack);
  }

  /* ---------------- effects: sparks, floating text, star ---------------- */
  const NSP = 140;
  const spPos = new Float32Array(NSP * 3), spCol = new Float32Array(NSP * 3), spVel = new Float32Array(NSP * 3), spLife = new Float32Array(NSP);
  for (let i = 0; i < NSP; i++) spPos[i * 3 + 1] = -99;
  const spGeo = own(new THREE.BufferGeometry());
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  spGeo.setAttribute('color', new THREE.BufferAttribute(spCol, 3));
  const sparks = new THREE.Points(spGeo, own(new THREE.PointsMaterial({ size: 0.32, vertexColors: true, sizeAttenuation: true, depthWrite: false })));
  sparks.frustumCulled = false; scene.add(sparks);
  let spNext = 0;
  function emit(x, y, z, n, color = '#ffd23a', speed = 6) {
    _c.set(color);
    for (let k = 0; k < n; k++) {
      const i = spNext; spNext = (spNext + 1) % NSP;
      spPos[i * 3] = x; spPos[i * 3 + 1] = y; spPos[i * 3 + 2] = z;
      const a = Math.random() * PI * 2, u = Math.random();
      spVel[i * 3] = Math.cos(a) * speed * (0.4 + u); spVel[i * 3 + 1] = 2 + Math.random() * speed; spVel[i * 3 + 2] = Math.sin(a) * speed * (0.4 + u);
      spCol[i * 3] = _c.r; spCol[i * 3 + 1] = _c.g; spCol[i * 3 + 2] = _c.b;
      spLife[i] = 0.35 + Math.random() * 0.35;
    }
  }
  function updateSparks(dt) {
    for (let i = 0; i < NSP; i++) {
      if (spLife[i] <= 0) continue;
      spLife[i] -= dt;
      if (spLife[i] <= 0) { spPos[i * 3 + 1] = -99; continue; }
      spVel[i * 3 + 1] -= 18 * dt;
      spPos[i * 3] += spVel[i * 3] * dt; spPos[i * 3 + 1] = Math.max(0.05, spPos[i * 3 + 1] + spVel[i * 3 + 1] * dt); spPos[i * 3 + 2] += spVel[i * 3 + 2] * dt;
    }
    spGeo.attributes.position.needsUpdate = true; spGeo.attributes.color.needsUpdate = true;
  }

  const textTex = new Map();
  function textTexture(txt, bg, fg) {
    const k = txt + bg + fg;
    if (!textTex.has(k)) {
      textTex.set(k, canvasTex(256, 96, (g, w, h) => {
        g.font = '900 54px Archivo, "Arial Black", Arial, sans-serif';
        const tw = Math.min(w - 8, g.measureText(txt).width + 30);
        g.fillStyle = '#1a1626'; g.fillRect((w - tw) / 2 - 4, 8, tw + 8, h - 16);
        g.fillStyle = bg; g.fillRect((w - tw) / 2, 12, tw, h - 24);
        g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(txt, w / 2, h / 2 + 2, w - 20);
      }));
    }
    return textTex.get(k);
  }
  const floats = [];
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Sprite(own(new THREE.SpriteMaterial({ depthTest: false, transparent: true })));
    s.visible = false; s.renderOrder = 10; s.scale.set(3.2, 1.2, 1); scene.add(s); floats.push({ s, t: 0 });
  }
  let floatNext = 0;
  function floatText(txt, x, z, bg = '#ffd23a', fg = '#1a1626') {
    const f = floats[floatNext]; floatNext = (floatNext + 1) % floats.length;
    f.s.material.map = textTexture(txt, bg, fg); f.s.material.needsUpdate = true;
    f.s.position.set(x, 3.6, z); f.t = 1.1; f.s.visible = true;
  }
  function updateFloats(dt) {
    for (const f of floats) {
      if (f.t <= 0) continue;
      f.t -= dt; f.s.position.y += dt * 1.8;
      f.s.material.opacity = clamp(f.t * 2, 0, 1);
      if (f.t <= 0) f.s.visible = false;
    }
  }

  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = PI / 2 + i * PI / 5, r = i % 2 ? 0.34 : 0.8;
    if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r); else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const starGeo = own(new THREE.ExtrudeGeometry(starShape, { depth: 0.24, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1 }));
  starGeo.center();
  const star = { mesh: inked(starGeo, toon('#ffd23a'), 0.06), on: false, x: 0, z: 0, timer: STAR_EVERY * 0.6 };
  star.mesh.visible = false; scene.add(star.mesh);

  /* ---------------- foxes ---------------- */
  const foxGeo = new Map();
  function placeholderFox(c, key) {
    const [fur, chest, outfit] = c.torso;
    const legC = c.legs || '#2b2730';
    if (!foxGeo.has(key)) {
      const coat = c.outfit === 'coat' || c.outfit === 'dress';
      const torso = [
        part(new THREE.CapsuleGeometry(0.42, 0.55, 4, 12), fur, [0, 0.55, 0]),
        part(new THREE.CylinderGeometry(0.46, coat ? 0.56 : 0.48, coat ? 0.85 : 0.6, 14), outfit, [0, coat ? 0.38 : 0.48, 0]),
        part(new THREE.SphereGeometry(0.26, 12, 8), chest, [0, 0.98, 0.26], [0, 0, 0], [1, 0.9, 0.6]),
        part(new THREE.ConeGeometry(0.24, 0.95, 10), fur, [0, 0.25, -0.62], [-1.15, 0, 0]),
        part(new THREE.SphereGeometry(0.16, 10, 8), chest, [0, 0.43, -1.02])
      ];
      if (c.outfit === 'vest') torso.push(part(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 14), '#1a1626', [0, 0.2, 0]));
      const eyes = c.eyes || '#1a1626';
      const head = [
        part(new THREE.SphereGeometry(0.45, 16, 12), fur, [0, 0, 0]),
        part(new THREE.ConeGeometry(0.2, 0.44, 10), chest, [0, -0.08, 0.5], [PI / 2, 0, 0]),
        part(new THREE.SphereGeometry(0.075, 8, 6), '#1a1626', [0, -0.08, 0.73]),
        part(new THREE.ConeGeometry(0.17, 0.4, 8), fur, [-0.26, 0.42, 0], [0, 0, 0.3]),
        part(new THREE.ConeGeometry(0.17, 0.4, 8), fur, [0.26, 0.42, 0], [0, 0, -0.3]),
        part(new THREE.SphereGeometry(0.2, 10, 8), chest, [-0.2, -0.16, 0.24], [0, 0, 0], [1, 0.8, 0.8]),
        part(new THREE.SphereGeometry(0.2, 10, 8), chest, [0.2, -0.16, 0.24], [0, 0, 0], [1, 0.8, 0.8]),
        part(new THREE.SphereGeometry(0.075, 8, 6), eyes, [-0.17, 0.1, 0.39]),
        part(new THREE.SphereGeometry(0.075, 8, 6), eyes, [0.17, 0.1, 0.39])
      ];
      if (c.shades) {
        head.push(part(new THREE.BoxGeometry(0.66, 0.15, 0.08), '#0d0b12', [0, 0.11, 0.42]));
        head.push(part(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), '#0d0b12', [-0.33, 0.11, 0.2], [PI / 2, 0, 0]));
        head.push(part(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), '#0d0b12', [0.33, 0.11, 0.2], [PI / 2, 0, 0]));
      }
      const arm = [
        part(new THREE.CapsuleGeometry(0.12, 0.45, 4, 8), outfit, [0, -0.3, 0]),
        part(new THREE.SphereGeometry(0.14, 10, 8), fur, [0, -0.66, 0])
      ];
      const leg = [
        part(new THREE.CapsuleGeometry(0.16, 0.5, 4, 8), legC, [0, -0.42, 0]),
        part(new THREE.SphereGeometry(0.19, 10, 8), '#2b2730', [0, -0.86, 0.08], [0, 0, 0], [1, 0.7, 1.4])
      ];
      foxGeo.set(key, { torso: merge(torso), head: merge(head), arm: merge(arm), leg: merge(leg) });
    }
    const G = foxGeo.get(key);
    const root = new THREE.Group();
    const legs = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(0.22 * s, 1.0, 0); g.add(inked(G.leg)); root.add(g); return g; });
    const body = new THREE.Group(); body.position.y = 1.0; body.add(inked(G.torso)); root.add(body);
    const head = new THREE.Group(); head.position.y = 1.32; head.add(inked(G.head)); body.add(head);
    const arms = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(0.52 * s, 0.86, 0); g.add(inked(G.arm)); body.add(g); return g; });
    root.userData.P = { body, head, arms, legs };
    return root;
  }
  /* the adapter: the world's fox maker when given, else the placeholder (same joints) */
  function makeFox(c, key) {
    if (opts.kit && typeof opts.kit.makeFox === 'function') {
      try {
        const f = opts.kit.makeFox({ torso: c.torso.slice(), outfit: c.outfit, mood: c.mood });
        if (f && f.userData && f.userData.P) { f.userData.kit = true; return f; }
      } catch (e) { console.warn('[bumperCars] kit.makeFox failed, using placeholder', e); }
    }
    return placeholderFox(c, key);
  }
  function poseSeated(fox, steer, jolt, dt) {
    if (fox.userData.kit && opts.kit && opts.kit.animFox) { try { opts.kit.animFox(fox, dt, 0); } catch (e) { /* ignore */ } }
    const P = fox.userData.P; if (!P) return;
    P.legs.forEach(l => { l.rotation.set(-1.45, 0, 0); });
    P.arms.forEach((a, i) => { a.rotation.set(-1.05 - jolt * 0.6, 0, (i ? -0.18 : 0.18) - steer * 0.35); });
    P.head.rotation.set(-jolt * 0.4, steer * 0.45, jolt * 0.25);
    P.body.rotation.set(-jolt * 0.25, 0, -steer * 0.08);
  }

  /* ---------------- cars ---------------- */
  const carGeo = new Map();
  const shadowGeo = own(new THREE.CircleGeometry(1.75, 24)); shadowGeo.rotateX(-PI / 2);
  const shadowMat = own(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
  const tipGeo = own(new THREE.SphereGeometry(0.14, 8, 6));
  const glowGeo = own(new THREE.TorusGeometry(0.95, 0.09, 6, 28)); glowGeo.rotateX(PI / 2);
  function carBody(c, key) {
    if (!carGeo.has(key)) {
      const dark = '#1f1c26';
      let parts;
      if (c.hover) {
        parts = [
          part(new THREE.CylinderGeometry(1.18, 0.86, 0.5, 28), c.car, [0, 0.72, 0]),
          part(new THREE.TorusGeometry(1.3, 0.24, 8, 32), '#3a344d', [0, 0.58, 0], [PI / 2, 0, 0]),
          part(new THREE.CylinderGeometry(0.95, 1.0, 1.15, 20, 1, false, PI / 2, PI), dark, [0, 1.5, -0.05]),
          part(new THREE.CylinderGeometry(0.97, 0.97, 0.12, 20, 1, false, PI / 2, PI), c.trim, [0, 2.1, -0.05]),
          part(new THREE.CapsuleGeometry(0.13, 0.75, 4, 8), c.car, [-0.82, 1.25, 0.1], [PI / 2, 0, 0]),
          part(new THREE.CapsuleGeometry(0.13, 0.75, 4, 8), c.car, [0.82, 1.25, 0.1], [PI / 2, 0, 0]),
          part(new THREE.CylinderGeometry(0.62, 0.62, 0.2, 16), dark, [0, 1.02, -0.2]),
          part(new THREE.SphereGeometry(0.12, 8, 6), c.trim, [-0.82, 1.3, 0.55]),
          part(new THREE.SphereGeometry(0.12, 8, 6), c.trim, [0.82, 1.3, 0.55])
        ];
      } else {
        parts = [
          part(new THREE.CylinderGeometry(1.12, 1.2, 0.55, 24), c.car, [0, 0.58, 0]),
          part(new THREE.TorusGeometry(1.3, 0.24, 8, 32), '#26232c', [0, 0.4, 0], [PI / 2, 0, 0]),
          part(new THREE.CylinderGeometry(1.14, 1.14, 0.1, 24), c.trim, [0, 0.82, 0]),
          part(new THREE.SphereGeometry(0.85, 16, 10), c.car, [0, 0.86, 0.5], [0, 0, 0], [1.12, 0.55, 0.9]),
          part(new THREE.CylinderGeometry(0.72, 0.78, 0.7, 16), dark, [0, 1.15, -0.8], [0, 0, 0], [1, 1, 0.42]),
          part(new THREE.CylinderGeometry(0.6, 0.6, 0.2, 16), dark, [0, 0.92, -0.25]),
          part(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6), dark, [0, 1.12, 0.5], [0.7, 0, 0]),
          part(new THREE.TorusGeometry(0.26, 0.05, 6, 16), dark, [0, 1.36, 0.3], [-0.9, 0, 0]),
          part(new THREE.CylinderGeometry(0.05, 0.05, 3.1, 6), '#c9c6cf', [0, 2.6, -0.98])
        ];
        if (c.cane) {
          parts.push(part(new THREE.CylinderGeometry(0.045, 0.045, 1.7, 6), '#ffffff', [0.78, 1.55, -0.55], [0, 0, -0.18]));
          parts.push(part(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 6), '#ec3013', [0.93, 2.3, -0.55], [0, 0, -0.18]));
        }
      }
      carGeo.set(key, merge(parts));
    }
    return carGeo.get(key);
  }

  let cars = [];
  let mode = 'cpu';
  function buildCars(m) {
    for (const c of cars) scene.remove(c.group);
    const keys = lineup(m);
    const spots = [[-6.5, 4.6], [6.5, -4.6], [6.5, 4.6], [-6.5, -4.6]];
    let humanN = 0;
    cars = keys.map((k, i) => {
      const cast = CAST[k];
      const human = (m === 'cpu' && i === 0) || (m === 'local' && i < 2) ? humanN++ : -1;
      const group = new THREE.Group();
      const body = new THREE.Group(); group.add(body);
      body.add(inked(carBody(cast, k), vcMat, 0.055));
      const fox = makeFox(cast, k);
      fox.scale.setScalar(0.68);
      fox.position.set(0, cast.hover ? 0.42 : 0.34, -0.3);
      body.add(fox);
      let tip = null, glow = null;
      if (cast.hover) { glow = new THREE.Mesh(glowGeo, basic(cast.trim)); glow.position.y = 0.38; body.add(glow); }
      else { tip = new THREE.Mesh(tipGeo, basic('#ffd23a')); tip.position.set(0, 4.18, -0.98); body.add(tip); }
      const shadow = new THREE.Mesh(shadowGeo, shadowMat); shadow.position.y = 0.04; group.add(shadow);
      const starIcon = inked(starGeo, toon('#ffd23a'), 0.06); starIcon.scale.setScalar(0.55); starIcon.position.y = 3.6; starIcon.visible = false; group.add(starIcon);
      scene.add(group);
      const [x, z] = spots[i];
      const lv = LEVELS[levelIdx];
      return {
        id: i, key: k, cast, name: cast.name, human, group, body, fox, tip, glow, starIcon,
        x, z, vx: 0, vz: 0, yaw: Math.atan2(-x, -z), spin: 0, stun: 0, boostT: 0, boostCd: 0, hornT: 0, hornCd: 0,
        starT: 0, safeT: 0, backT: 0, score: 0, hits: 0, tilt: 0, jolt: 0, steer: 0, flash: 0,
        maxMul: human >= 0 ? 1 : clamp(lv.speed + (cast.skill || 0), 0.6, 1.05),
        input: { x: 0, z: 0, mag: 0, brake: false }, ai: null, pairCd: {}
      };
    });
  }

  /* ---------------- input ---------------- */
  const keys = new Set();
  const keyExp = new Map();
  let keyupSeen = false;
  const sticks = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  const held = [{ brake: false }, { brake: false }];
  let ptr = null, ptrPoint = null;
  let clock = 0, lastInput = 0;
  const markInput = () => { lastInput = clock; };
  const ray = new THREE.Raycaster();
  const floorPlane = new THREE.Plane(V(0, 1, 0), 0);
  const _hit = V();
  function floorAt(e) {
    const r = domEl.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = -((e.clientY - r.top) / r.height) * 2 + 1;
    camera.updateMatrixWorld();
    ray.setFromCamera({ x: nx, y: ny }, camera);
    return ray.ray.intersectPlane(floorPlane, _hit) ? _hit.clone() : null;
  }
  function onDown(e) {
    if (W && e.target !== domEl) return;
    if (W) { e.preventDefault(); e.stopImmediatePropagation(); }
    audio.resume(); markInput();
    if (paused || !cars.some(c => c.human === 0)) return;
    ptr = { id: e.pointerId }; ptrPoint = floorAt(e);
    if (!W && domEl.setPointerCapture) { try { domEl.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } }
  }
  function onMove(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    ptrPoint = floorAt(e); markInput();
    if (W) e.stopImmediatePropagation();
  }
  function onUp(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    ptr = null; ptrPoint = null;
  }
  const DIRS = {
    p1: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'] },
    p2: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'] },
    solo: { up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'] }
  };
  const ACT = {
    p1: { boost: ['Space', 'Digit1', 'Numpad1', 'KeyJ'], brake: ['ShiftLeft', 'Digit2', 'Numpad2', 'KeyK'], horn: ['KeyH', 'Digit3', 'Numpad3', 'KeyL'] },
    p2: { boost: ['Enter', 'Digit8', 'Numpad8'], brake: ['ShiftRight', 'Digit9', 'Numpad9'], horn: ['Digit0', 'Numpad0', 'Slash'] }
  };
  function keyHandler(e) {
    const code = e.code || e.key;
    const down = e.type !== 'keyup';
    if (!down) { keyupSeen = true; keys.delete(code); keyExp.delete(code); return; }
    audio.resume(); markInput();
    const wasDown = keys.has(code);
    keys.add(code); keyExp.set(code, keyupSeen ? Infinity : clock + 0.6);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code) && !W) e.preventDefault();
    if (wasDown || paused) return;
    for (const [pi, set] of [[0, ACT.p1], [1, ACT.p2]]) {
      if (mode !== 'local' && pi === 1) continue;
      if (set.boost.includes(code)) doBoost(pi);
      if (set.horn.includes(code)) doHorn(pi);
    }
  }
  function onWinKey(e) {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    keyHandler(e);
  }
  const K = list => list.some(k => keys.has(k));
  function humanCar(p) { return cars.find(c => c.human === p); }
  function doBoost(p) {
    const c = humanCar(p); if (!c || phase !== 'play' || c.boostCd > 0) return;
    startBoost(c);
  }
  function startBoost(c) {
    c.boostT = CAR.boostT; c.boostCd = CAR.boostCd;
    c.vx += Math.sin(c.yaw) * 4; c.vz += Math.cos(c.yaw) * 4;
    audio.boost(); emit(c.x - Math.sin(c.yaw) * 1.4, 0.8, c.z - Math.cos(c.yaw) * 1.4, 14, '#ff8a1f', 4);
    emitNow();
  }
  function doHorn(p) { const c = humanCar(p); if (c) honk(c); }
  function honk(c) {
    if (c.hornCd > 0) return;
    c.hornCd = 0.5; c.hornT = 1.6;
    audio.horn(c.cast.hover ? 0.75 : c.key === 'PIP' ? 1.3 : 1);
    floatText('HONK', c.x, c.z, '#ffffff', '#1a1626');
  }

  /* ---------------- game state ---------------- */
  const roundLen = Math.max(5, +opts.roundTime || ROUND);
  let phase = 'count', countT = COUNT, tLeft = roundLen, playT = 0, paused = false, overT = 0;
  let result = null, msg = { text: '', id: 0 }, captionIdx = 0, captionT = 0, lastBeep = 0;
  const safe = { top: 0, bottom: 0, left: 0, right: 0 };

  function start(m) {
    mode = ['cpu', 'local', 'demo'].includes(m) ? m : 'cpu';
    buildCars(mode);
    phase = 'count'; countT = COUNT + 0.4; tLeft = roundLen; playT = 0; paused = false; overT = 0;
    result = null; lastBeep = 0; captionIdx = 0; captionT = 0;
    star.on = false; star.mesh.visible = false; star.timer = STAR_EVERY * 0.6;
    for (const c of cars) c.ai = null;
    ptr = null; ptrPoint = null; keys.clear();
    lastInput = clock;
    say(mode === 'demo' ? 'DEMO. Watch and learn.' : mode === 'local' ? '2 PLAYERS. Bump to score.' : 'Bump rivals to score.');
    emitNow();
  }
  function say(text) { msg = { text, id: msg.id + 1 }; emitNow(); }

  function finish() {
    phase = 'over'; overT = 0;
    const order = rank(cars);
    const rows = order.map((idx, place) => ({ name: cars[idx].name, color: cars[idx].cast.car, score: cars[idx].score, place: place + 1, human: cars[idx].human >= 0 }));
    const top = cars[order[0]];
    const tie = cars.filter(c => c.score === top.score).length > 1;
    if (mode === 'cpu') {
      const me = cars.find(c => c.human === 0);
      const place = order.indexOf(me.id) + 1;
      const rw = rewards(me.score, place, levelIdx);
      const prevBest = store.get('best', 0) | 0;
      const newBest = me.score > prevBest;
      if (newBest) store.set('best', me.score);
      store.gold(rw.gold);
      store.set('xp', (store.get('xp', 0) | 0) + rw.xp);
      const st = store.get('stars', [0, 0, 0]);
      if (Array.isArray(st) && rw.stars > (st[levelIdx] | 0)) { st[levelIdx] = rw.stars; store.set('stars', st); }
      store.set('played', (store.get('played', 0) | 0) + 1);
      if (place === 1) store.set('wins', (store.get('wins', 0) | 0) + 1);
      result = {
        title: place === 1 ? (tie ? 'TIED FOR FIRST' : 'YOU WIN') : 'PLACE ' + place + ' OF ' + cars.length,
        win: place === 1, place, score: me.score, best: Math.max(prevBest, me.score), newBest,
        gold: rw.gold, xp: rw.xp, stars: rw.stars, rows, demo: false, mode
      };
      if (place === 1) audio.win(); else audio.lose();
    } else {
      result = {
        title: tie ? 'A TIE' : top.name + ' WINS', win: true, place: 0, score: top.score, best: store.get('best', 0) | 0,
        newBest: false, gold: 0, xp: 0, stars: 0, rows, demo: mode === 'demo', mode
      };
      audio.win();
    }
    say(result.title);
    emitNow();
  }

  /* ---------------- physics ---------------- */
  function controlCar(c, dt) {
    const inp = c.input;
    if (phase !== 'play') { inp.x = 0; inp.z = 0; inp.mag = 0; inp.brake = false; return; }
    if (c.human >= 0) {
      const p = c.human;
      const d = mode === 'local' ? (p === 0 ? DIRS.p1 : DIRS.p2) : DIRS.solo;
      let x = (K(d.right) ? 1 : 0) - (K(d.left) ? 1 : 0), z = (K(d.down) ? 1 : 0) - (K(d.up) ? 1 : 0);
      let mag = x || z ? 1 : 0;
      const s = sticks[p];
      const sm = Math.hypot(s.x, s.y);
      if (sm > 0.15) { x = s.x; z = s.y; mag = Math.min(1, sm); }
      if (p === 0 && ptrPoint) {
        const dx = ptrPoint.x - c.x, dz = ptrPoint.z - c.z, dd = Math.hypot(dx, dz);
        if (dd > 0.9) { x = dx; z = dz; mag = clamp(dd / 2.5, 0.35, 1); } else mag = 0;
      }
      const l = Math.hypot(x, z) || 1;
      inp.x = x / l; inp.z = z / l; inp.mag = mag;
      inp.brake = held[p].brake || K((p === 0 ? ACT.p1 : ACT.p2).brake);
    } else {
      const others = cars.filter(o => o !== c);
      const a = aiControl(c, others, star.on ? star : null, LEVELS[levelIdx], c.cast, dt, Math.random);
      inp.x = a.x; inp.z = a.z; inp.mag = a.mag; inp.brake = a.brake;
      if (a.boost && c.boostCd <= 0) startBoost(c);
      if (a.horn) honk(c);
    }
  }
  function stepCar(c, dt) {
    const inp = c.input;
    c.stun = Math.max(0, c.stun - dt); c.boostT = Math.max(0, c.boostT - dt); c.boostCd = Math.max(0, c.boostCd - dt);
    c.hornT = Math.max(0, c.hornT - dt); c.hornCd = Math.max(0, c.hornCd - dt); c.starT = Math.max(0, c.starT - dt);
    c.safeT = Math.max(0, c.safeT - dt); c.backT = Math.max(0, c.backT - dt);
    const ctrl = c.stun > 0 ? 0.15 : 1;
    let fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    let steer = 0;
    if (inp.mag > 0.1) {
      const d = wrap(Math.atan2(inp.x, inp.z) - c.yaw);
      const rate = CAR.turn * (inp.brake ? 1.9 : 1) * ctrl;
      const turn = clamp(d, -rate * dt, rate * dt);
      c.yaw += turn; steer = clamp(d, -1, 1);
      fx = Math.sin(c.yaw); fz = Math.cos(c.yaw);
      const thrust = inp.brake ? 0 : CAR.accel * inp.mag * ctrl * (c.boostT > 0 ? 1.8 : 1) * Math.max(0.2, Math.cos(d));
      c.vx += fx * thrust * dt; c.vz += fz * thrust * dt;
    }
    c.steer += (steer - c.steer) * Math.min(1, dt * 8);
    c.yaw = wrap(c.yaw + c.spin * dt); c.spin *= Math.exp(-2.8 * dt);
    fx = Math.sin(c.yaw); fz = Math.cos(c.yaw);
    let f = c.vx * fx + c.vz * fz, l = c.vx * fz - c.vz * fx;
    const grip = CAR.grip * (c.stun > 0 ? 0.25 : 1) * (inp.brake ? 0.35 : 1);
    l *= Math.exp(-grip * dt);
    f *= Math.exp(-(CAR.drag + (inp.brake ? 4 : 0)) * dt);
    c.vx = fx * f + fz * l; c.vz = fz * f - fx * l;
    c.tilt += (clamp(-l * 0.03, -0.18, 0.18) - c.tilt) * Math.min(1, dt * 6);
    const sp = Math.hypot(c.vx, c.vz);
    const maxS = (c.boostT > 0 ? CAR.boostMax : CAR.max) * c.maxMul;
    if (sp > maxS) { const k = Math.max(maxS / sp, Math.exp(-2.5 * dt)); c.vx *= k; c.vz *= k; }
    c.x += c.vx * dt; c.z += c.vz * dt;
    /* rounded-rect wall */
    const ix = hx - CAR.r, iz = hz - CAR.r, rr = Math.max(cr - CAR.r, 0.5);
    const cx = clamp(c.x, -ix + rr, ix - rr), cz = clamp(c.z, -iz + rr, iz - rr);
    const dx = c.x - cx, dz = c.z - cz, dd = Math.hypot(dx, dz);
    if (dd > rr) {
      const nx = dx / dd, nz = dz / dd;
      c.x = cx + nx * rr; c.z = cz + nz * rr;
      const vn = c.vx * nx + c.vz * nz;
      if (vn > 0) {
        c.vx -= (1 + CAR.wallE) * vn * nx; c.vz -= (1 + CAR.wallE) * vn * nz;
        if (vn > 3) {
          c.jolt = Math.min(1, vn / 10); c.spin += (Math.random() - 0.5) * vn * 0.25;
          audio.wall(Math.min(1, vn / 12));
          emit(c.x + nx * CAR.r, 0.6, c.z + nz * CAR.r, Math.min(10, vn | 0), '#ffffff', 4);
        }
      }
    }
  }
  function collide() {
    const D = CAR.r * 2;
    for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i], b = cars[j];
      let dx = b.x - a.x, dz = b.z - a.z; let d = Math.hypot(dx, dz);
      if (d >= D) continue;
      if (d < 1e-4) { dx = 1; dz = 0; d = 1e-4; }
      const nx = dx / d, nz = dz / d;
      const push = (D - d) / 2;
      a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
      const sa = a.vx * nx + a.vz * nz, sb = -(b.vx * nx + b.vz * nz);
      const rel = sa + sb;
      if (rel <= 0) continue;
      const jimp = (1 + CAR.carE) * rel / 2;
      a.vx -= jimp * nx; a.vz -= jimp * nz; b.vx += jimp * nx; b.vz += jimp * nz;
      const key = i + '-' + j;
      const cd = a.pairCd[key] || 0;
      const cxp = (a.x + b.x) / 2, czp = (a.z + b.z) / 2;
      if (rel > 2.0) {
        audio.bump(rel / 13);
        emit(cxp, 0.7, czp, Math.min(26, 6 + rel * 1.4), '#ffd23a', 5);
        a.jolt = Math.min(1, rel / 12); b.jolt = Math.min(1, rel / 12);
        if (rel > 7 && (a.human >= 0 || b.human >= 0)) { shakeT = 0.3; shakeAmp = Math.min(0.5, rel * 0.03); }
        a.flash = b.flash = 0.25;
      }
      if (rel > 2.4 && clock > cd && phase === 'play') {
        a.pairCd[key] = clock + 0.5;
        const att = sa >= sb ? a : b, vic = att === a ? b : a;
        const approach = Math.max(sa, sb);
        /* direction from victim to attacker */
        const ux = att === a ? -nx : nx, uz = att === a ? -nz : nz;
        const vf = { x: Math.sin(vic.yaw), z: Math.cos(vic.yaw) };
        const facing = vf.x * ux + vf.z * uz;
        const cross = vf.x * uz - vf.z * ux;
        vic.spin += (cross > 0 ? -1 : 1) * Math.min(9, rel * 0.8) * (1 - Math.abs(facing) * 0.5);
        vic.stun = 0.3 + Math.min(0.5, rel * 0.03);
        if (approach > 2.4 && vic.safeT <= 0) { scoreHit(att, vic, approach, facing); vic.safeT = 0.9; }
        if (att.human < 0) att.backT = 0.5 + Math.random() * 0.5;
      }
    }
  }
  function scoreHit(att, vic, approach, facing) {
    const h = hitPoints(approach, facing, att.starT > 0);
    att.score += h.pts; att.hits++;
    floatText('+' + h.pts, vic.x, vic.z, att.cast.car === '#ffd23a' ? '#ffd23a' : '#ffffff', '#1a1626');
    if (att.human >= 0) audio.score(h.pts);
    say(att.name + ': ' + h.label + ' +' + h.pts);
  }
  function updateStar(dt) {
    if (phase !== 'play') return;
    if (!star.on) {
      star.timer -= dt;
      if (star.timer <= 0) {
        for (let tries = 0; tries < 20; tries++) {
          const x = (Math.random() * 2 - 1) * (hx - 3.5), z = (Math.random() * 2 - 1) * (hz - 3.5);
          if (cars.every(c => Math.hypot(c.x - x, c.z - z) > 4.5)) { star.x = x; star.z = z; star.on = true; break; }
        }
        if (star.on) { star.mesh.visible = true; say('Gold star on the floor. Grab it.'); }
        else star.timer = 1;
      }
    } else {
      for (const c of cars) {
        if (Math.hypot(c.x - star.x, c.z - star.z) < CAR.r + 0.7) {
          star.on = false; star.mesh.visible = false; star.timer = STAR_EVERY;
          c.starT = STAR_TIME; audio.star();
          emit(star.x, 1, star.z, 20, '#ffd23a', 5);
          say(c.name + ' has the STAR. Double points.');
          break;
        }
      }
    }
  }

  /* ---------------- camera fit ---------------- */
  const fitPts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [0, 1.2]) fitPts.push(V(sx * (hx + 1.1), y, sz * (hz + 1.1)));
  fitPts.push(V(0, 0, hz + 1.3), V(0, 0, -hz - 1.3));
  let lastW = 0, lastH = 0, lastFov = 0;
  function viewSize() {
    if (W) { const el = W.renderer.domElement; return [el.clientWidth || window.innerWidth, el.clientHeight || window.innerHeight]; }
    return [container.clientWidth || 1, container.clientHeight || 1];
  }
  function fit() {
    const [w, h] = viewSize();
    lastW = w; lastH = h;
    const portrait = h > w * 1.05;
    camera.fov = W ? (W.camera.fov || 50) : (portrait ? 56 : 40);
    lastFov = camera.fov;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const pitch = THREE.MathUtils.degToRad(portrait ? 66 : 52);
    const dir = V(0, Math.sin(pitch), Math.cos(pitch));
    const m = 8;
    let L = safe.left + m, R = w - safe.right - m, T = safe.top + m, B = h - safe.bottom - m;
    if (R - L < 60) { L = m; R = w - m; }
    if (B - T < 60) { T = m; B = h - m; }
    const fx0 = L / w * 2 - 1, fx1 = R / w * 2 - 1, fy0 = 1 - B / h * 2, fy1 = 1 - T / h * 2;
    const tanY = Math.tan(camera.fov * PI / 360), tanX = tanY * camera.aspect;
    const tgt = V(0, 0, 0); let d = 40;
    const p = V(), right = V(), up = V();
    for (let it = 0; it < 14; it++) {
      camera.position.copy(tgt).addScaledVector(dir, d); camera.lookAt(tgt); camera.updateMatrixWorld();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const q of fitPts) { p.copy(q).project(camera); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
      const s = Math.max((x1 - x0) / (fx1 - fx0), (y1 - y0) / (fy1 - fy0));
      const ex = ((x0 + x1) - (fx0 + fx1)) / 2, ey = ((y0 + y1) - (fy0 + fy1)) / 2;
      right.set(1, 0, 0).applyQuaternion(camera.quaternion); up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      tgt.addScaledVector(right, ex * d * tanX * 0.9).addScaledVector(up, ey * d * tanY * 0.9);
      d = clamp(d * (1 + (s - 1) * 0.85), 6, 300);
    }
    camera.position.copy(tgt).addScaledVector(dir, d); camera.lookAt(tgt);
    camGoal.pos.copy(camera.position); camGoal.quat.copy(camera.quaternion);
    camera.position.copy(camCur.pos); camera.quaternion.copy(camCur.quat);
  }
  function snapCam() { camCur.pos.copy(camGoal.pos); camCur.quat.copy(camGoal.quat); applyCam(0); }
  const _q2 = new THREE.Quaternion();
  function applyCam(dt) {
    const k = dt ? 1 - Math.exp(-5 * dt) : 1;
    camCur.pos.lerp(camGoal.pos, k); camCur.quat.slerp(camGoal.quat, k);
    camera.position.copy(camCur.pos); camera.quaternion.copy(camCur.quat);
    if (shakeT > 0) {
      shakeT -= dt;
      const a = shakeAmp * Math.max(0, shakeT / 0.3);
      camera.position.x += (Math.random() - 0.5) * a; camera.position.y += (Math.random() - 0.5) * a;
    }
    if (W) {
      const [w, h] = viewSize(); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
    if (W) {
      scene.updateWorldMatrix(true, false);
      wcam.position.copy(camera.position); scene.localToWorld(wcam.position);
      scene.getWorldQuaternion(_q2); wcam.quaternion.copy(_q2).multiply(camera.quaternion);
      wcam.fov = camera.fov; wcam.aspect = camera.aspect; wcam.near = camera.near; wcam.far = camera.far;
      wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
    }
  }
  function resize() {
    if (!renderer) return;
    const [w, h] = viewSize();
    renderer.setSize(w, h, false);
    fit();
  }

  /* ---------------- HUD ---------------- */
  let emitT = 0, lastHint = false;
  function hud() {
    const lv = LEVELS[levelIdx];
    const order = rank(cars);
    return {
      key: GAME.key, name: GAME.name, phase, mode, paused, world: !!W, touch,
      level: levelIdx, levelKey: lv.key, levelLabel: lv.label, boss: lv.boss,
      time: Math.max(0, Math.ceil(tLeft)), timeFrac: tLeft / roundLen,
      count: phase === 'count' ? Math.max(1, Math.min(COUNT, Math.ceil(countT - 0.4))) : 0,
      go: phase === 'play' && playT < 0.9,
      players: cars.map(c => ({
        id: c.id, name: c.name, color: c.cast.car, score: c.score, human: c.human,
        star: c.starT > 0, boost: c.boostCd <= 0 ? 1 : 1 - c.boostCd / CAR.boostCd, boosting: c.boostT > 0,
        leader: order[0] === c.id && c.score > 0
      })),
      humans: cars.filter(c => c.human >= 0).length,
      msg: Object.assign({}, msg),
      caption: mode === 'demo' ? CAPTIONS[captionIdx % CAPTIONS.length] : '',
      hint: phase === 'play' && mode !== 'demo' && !paused && clock - lastInput > 3,
      sound: soundOn, music: musicOn,
      result: result ? JSON.parse(JSON.stringify(result)) : null,
      best: store.get('best', 0) | 0,
      online: false
    };
  }
  function emitNow() { emitT = 0; try { onState(hud()); } catch (e) { console.error(e); } }

  /* ---------------- main loop ---------------- */
  let raf = 0, last = 0, alive = true;
  function frame(ts) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dtRaw = last ? (ts - last) / 1000 : 0.016; last = ts;
    const dt = Math.min(0.05, Math.max(0, dtRaw));
    clock += dt;
    /* size watch (world mode has no ResizeObserver of ours) */
    const [w, h] = viewSize();
    if (w !== lastW || h !== lastH || (W && W.camera.fov !== lastFov)) { if (renderer) renderer.setSize(w, h, false); fit(); }
    for (const [k, t] of keyExp) if (t < clock) { keys.delete(k); keyExp.delete(k); }

    if (!paused) {
      if (phase === 'count') {
        countT -= dt;
        const n = Math.ceil(countT - 0.4);
        if (n !== lastBeep && n >= 1 && n <= COUNT) { lastBeep = n; audio.beep(false); emitNow(); }
        if (countT <= 0.4) { phase = 'play'; playT = 0; audio.beep(true); emitNow(); }
      } else if (phase === 'play') {
        playT += dt; tLeft -= dt;
        const before = Math.ceil(tLeft + dt);
        if (tLeft <= 10 && Math.ceil(tLeft) !== before && tLeft > 0) audio.beep(false);
        if (tLeft <= 0) { tLeft = 0; finish(); }
      } else if (phase === 'over') {
        overT += dt;
        if (mode === 'demo' && overT > 5) start('demo');
      }
      if (mode === 'demo') { captionT += dt; if (captionT > 5.5) { captionT = 0; captionIdx++; emitNow(); } }
      const sub = 2, sdt = dt / sub;
      for (let s = 0; s < sub; s++) {
        for (const c of cars) { if (s === 0) controlCar(c, dt); stepCar(c, sdt); }
        collide();
      }
      updateStar(dt);
    }
    /* visuals */
    for (const c of cars) {
      c.group.position.set(c.x, 0, c.z);
      c.group.rotation.y = c.yaw;
      c.jolt *= Math.exp(-5 * dt); c.flash = Math.max(0, c.flash - dt);
      c.body.rotation.set(-c.jolt * 0.12, 0, c.tilt);
      c.body.position.y = c.cast.hover ? 0.12 + Math.sin(clock * 3 + c.id) * 0.07 : Math.abs(Math.sin(clock * 20)) * c.jolt * 0.08;
      poseSeated(c.fox, c.steer, c.jolt, dt);
      if (c.tip) { const s = c.flash > 0 || Math.random() < 0.04 ? 1.8 : 1; c.tip.scale.setScalar(s); if (s > 1 && Math.random() < 0.3) emit(c.x - Math.sin(c.yaw) * 0.98, 4.2, c.z - Math.cos(c.yaw) * 0.98, 2, '#ffffff', 2); }
      if (c.glow) c.glow.scale.setScalar(1 + Math.sin(clock * 8) * 0.04 + c.flash);
      c.starIcon.visible = c.starT > 0;
      if (c.starT > 0) c.starIcon.rotation.y += dt * 4;
      if (c.boostT > 0 && !paused) emit(c.x - Math.sin(c.yaw) * 1.5, 0.6, c.z - Math.cos(c.yaw) * 1.5, 1, '#ff8a1f', 2);
    }
    if (star.on) { star.mesh.position.set(star.x, 1.0 + Math.sin(clock * 3) * 0.2, star.z); star.mesh.rotation.y += dt * 2.5; }
    updateSparks(paused ? 0 : dt); updateFloats(dt);
    const me = cars.find(c => c.human === 0);
    if (me) audio.engine(Math.min(1, Math.hypot(me.vx, me.vz) / CAR.boostMax), phase === 'play' && !paused);
    else audio.engine(0, false);
    applyCam(dt);
    if (renderer) renderer.render(scene, camera);
    emitT += dt;
    const hint = phase === 'play' && mode !== 'demo' && clock - lastInput > 3;
    if (emitT > 0.1 || hint !== lastHint) { lastHint = hint; emitNow(); }
  }

  /* ---------------- wire up ---------------- */
  if (W) {
    window.addEventListener('pointerdown', onDown, true);
  } else {
    domEl.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onWinKey);
    window.addEventListener('keyup', onWinKey);
    ro = new ResizeObserver(resize); ro.observe(container);
  }
  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', onUp, true);
  const unlock = () => audio.resume();
  window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  window.addEventListener('keydown', unlock, { capture: true, passive: true });

  if (renderer) resize(); else fit();
  snapCam();
  start(opts.mode || (opts.demo ? 'demo' : 'cpu'));
  raf = requestAnimationFrame(frame);

  /* ---------------- API ---------------- */
  const api = {
    hud,
    setSafe(s = {}) {
      safe.top = Math.max(0, +s.top || 0); safe.bottom = Math.max(0, +s.bottom || 0);
      safe.left = Math.max(0, +s.left || 0); safe.right = Math.max(0, +s.right || 0);
      fit();
    },
    start(m) { audio.resume(); start(m || mode); },
    restart() { audio.resume(); start(mode); },
    key: keyHandler,
    get camera() { return W ? wcam : camera; },
    snapCam,
    /* page controls */
    stick(p, x, y) { const s = sticks[p | 0]; if (!s) return; s.x = clamp(+x || 0, -1, 1); s.y = clamp(+y || 0, -1, 1); if (x || y) markInput(); },
    btn(p, name, down) {
      audio.resume(); markInput();
      p = p | 0;
      if (name === 'boost' && down) doBoost(p);
      else if (name === 'horn' && down) doHorn(p);
      else if (name === 'brake' && held[p]) { held[p].brake = !!down; if (down && phase === 'play') audio.brake(); }
    },
    boost(p = 0) { api.btn(p, 'boost', true); },
    horn(p = 0) { api.btn(p, 'horn', true); },
    pause(on) { paused = !!on; if (paused) { sticks.forEach(s => { s.x = 0; s.y = 0; }); held.forEach(h => { h.brake = false; }); ptr = null; ptrPoint = null; } emitNow(); },
    menu(open) { api.pause(open); },
    setLevel(i) { levelIdx = clamp(i | 0, 0, 2); store.set('level', levelIdx); for (const c of cars) if (c.human < 0) c.maxMul = clamp(LEVELS[levelIdx].speed + (c.cast.skill || 0), 0.6, 1.05); emitNow(); },
    setMode(m) { start(m); },
    setSound(on) { soundOn = !!on; audio.setSound(soundOn); store.set('sound', soundOn); emitNow(); },
    setMusic(on) { musicOn = !!on; audio.setMusic(musicOn); if (!W) store.set('music', musicOn); emitNow(); },
    leave() { paused = true; phase = 'left'; audio.engine(0, false); emitNow(); },
    destroy() {
      if (!alive) return;
      alive = false; cancelAnimationFrame(raf);
      if (W) window.removeEventListener('pointerdown', onDown, true);
      else { domEl.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onWinKey); window.removeEventListener('keyup', onWinKey); }
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
      if (ro) ro.disconnect();
      audio.close();
      if (W) { if (scene.parent) scene.parent.remove(scene); }
      for (const o of owned) { try { o.dispose(); } catch (e) { /* ignore */ } }
      if (renderer) { renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); }
    }
  };
  return api;
}

export default createBumperCars;
