// MERU 2.0 — step 1b BLOCKOUT. Builds the whole 900 m map in 3D straight from worlds/meru2-layout.js:
// painted ground (surfaces, roads, train line), the lake + Pearl Island (hills, valley, deep pond), every building as a block with
// a gold-framed door + NOW HIRING sign, the train track + stations, a skyline of glass towers, lamps along the foot paths, speakers
// with their 7 m voice triggers, zone labels. Orbit camera (drag / pinch / wheel), fly-to zones, day / night. Phone budget: one ground
// texture, instanced lamps + towers, ~200 draw calls.
import * as THREE from '../vendor/three/three.module.js';
import * as L from './meru2-layout.js';
import { buildCity } from './meru2-city.js';
import { buildTrain } from './meru2-train.js';
import { buildHeights } from './meru2-heights.js';
import { buildPaths } from './meru2-paths.js';

export async function createBlockout({ container, onState = () => {} }) {
  const touch = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(touch ? 1.5 : 2, devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !touch; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement); Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block', touchAction: 'none' });
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, 1, 4000);
  const hemi = new THREE.HemisphereLight(0xdfeeff, 0x6f7a5a, 1.1), sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
  sun.position.set(-300, 420, 200); sun.castShadow = !touch; Object.assign(sun.shadow.camera, { left: -500, right: 500, top: 500, bottom: -500, far: 1400 }); sun.shadow.mapSize.set(2048, 2048); scene.add(hemi, sun);
  const grad = (() => { const d = new Uint8Array([80, 170, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.needsUpdate = true; return t; })();
  const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...o });
  const CT = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const H = L.MAP.half, SZ = H * 2;
  try { if (document.fonts) await document.fonts.load('900 52px Archivo'); } catch (e) {}

  // ---------- ground: one painted texture ----------
  const SC = { stone: '#cfcac3', grass: '#9fc27f', grit: '#c9b48a', sand: '#ead9a6', wood: '#b08b5e', rug: '#8f6aa8' };
  const groundTex = CT(touch ? 2048 : 4096, touch ? 2048 : 4096, (g, w) => { const k = w / SZ, X = x => (x + H) * k, Z = z => (z + H) * k;
    g.fillStyle = SC.grass; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 4000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(60,100,40,0.10)' : 'rgba(255,255,220,0.08)'; g.beginPath(); g.arc(Math.random() * w, Math.random() * w, 2 + Math.random() * 10, 0, 7); g.fill(); }
    for (const S of L.SURFACES) { g.fillStyle = SC[S.s]; if (S.r) g.fillRect(X(S.r[0]), Z(S.r[2]), (S.r[1] - S.r[0]) * k, (S.r[3] - S.r[2]) * k); else { g.beginPath(); g.arc(X(S.c[0]), Z(S.c[1]), S.c[2] * k, 0, 7); g.fill(); } }
    g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 1; for (let x = -45; x <= 45; x += 3) { g.beginPath(); g.moveTo(X(x), Z(-40)); g.lineTo(X(x), Z(40)); g.stroke(); }   // plaza paving joints
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const r of L.ROADS) { const line = (col, wd, dash) => { g.strokeStyle = col; g.lineWidth = wd * k; g.setLineDash(dash || []); g.beginPath(); r.p.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.stroke(); g.setLineDash([]); };
      line('#e8e4dc', r.w + 3); line('#3d3b3a', r.w); line('#f5d35a', 0.35, [3 * k, 3 * k]); }
    for (const P of L.PATHS) { g.strokeStyle = 'rgba(120,96,70,0.35)'; g.lineWidth = 4 * k; g.beginPath(); P.p.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.stroke(); }
    for (const b of L.BUILDINGS) if (b.lot) { const r = b.lot.r; g.fillStyle = '#4a4745'; g.fillRect(X(r[0]), Z(r[2]), (r[1] - r[0]) * k, (r[3] - r[2]) * k); g.strokeStyle = '#f3f2f2'; g.lineWidth = 0.25 * k; for (let i = 1; i < b.lot.bays; i++) { const x = r[0] + (r[1] - r[0]) * i / b.lot.bays; g.beginPath(); g.moveTo(X(x), Z(r[2] + 1)); g.lineTo(X(x), Z(r[2] + 7)); g.stroke(); } }
    for (const w of L.WATER) { g.fillStyle = '#3c87b8'; g.beginPath(); g.ellipse(X(w.e[0]), Z(w.e[1]), w.e[2] * k, w.e[3] * k, 0, 0, 7); g.fill(); } });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(SZ, SZ), new THREE.MeshToonMaterial({ map: groundTex, gradientMap: grad })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(SZ * 5, SZ * 5), toon('#8fb26f')); outer.rotation.x = -Math.PI / 2; outer.position.y = -0.2; scene.add(outer);

  // ---------- lake water + Pearl Island ----------
  const wat = L.WATER[0].e, water = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshPhongMaterial({ color: 0x4aa3d8, transparent: true, opacity: 0.82, shininess: 90, specular: 0xffffff }));
  water.scale.set(wat[2], wat[3], 1); water.rotation.x = -Math.PI / 2; water.position.set(wat[0], 0.08, wat[1]); scene.add(water);
  const I = L.ISLAND, prof = I.prof;
  const isl = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 72), new THREE.MeshToonMaterial({ gradientMap: grad, vertexColors: true, side: THREE.DoubleSide }));
  { const pos = isl.geometry.attributes.position, col = []; const c = new THREE.Color(); for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), r = Math.hypot(pos.getX(i), pos.getZ(i)); c.set(r > I.hills[2] + 2 ? SC.sand : y > 9 ? '#7fa865' : y > 1 ? '#93ba73' : y < -2 ? '#5e6b5a' : '#a9c48a'); col.push(c.r, c.g, c.b); } isl.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
  isl.position.set(I.pond.x, 0, I.pond.z); isl.castShadow = isl.receiveShadow = true; scene.add(isl);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(I.pond.r, 40), new THREE.MeshPhongMaterial({ color: 0x15507d, shininess: 120, transparent: true, opacity: 0.92 })); pond.rotation.x = -Math.PI / 2; pond.position.set(I.pond.x, 0.4, I.pond.z); scene.add(pond);

  // ---------- step 2: the Town Square city centre (real shells, sliding doors, cutaway, plaza, cars) ----------
  const train = buildTrain({ THREE, scene, toon, grad, CT, L, touch });
  const city = buildCity({ THREE, scene, camera, toon, grad, CT, L, touch, avoid: (x, z, m) => train.keepOut(x, z, m) });
  const heights = buildHeights({ THREE, scene, toon, grad, CT, L, touch });   // step 3 part 4: hills, trails, decks, lighthouses
  const paths = buildPaths({ THREE, scene, toon, CT, L, touch, avoid: (x, z, m) => train.keepOut(x, z, m) || city.covers(x, z) });   // step 4: the four paths
  // ---------- buildings ----------
  const HGT = { tavern: 9, casino: 14, bowling: 10, itemshop: 6, armory: 6, fortune: 5, burgers: 6, police: 12, bank: 16, carRental: 5, crest: 34, lake: 46, barracks: 14, tankWorks: 12, tankRange: 10, defense: 6, museum: 10, permit: 5, cave: 18, blindSchool: 10, boatworks: 8, boathouse: 7, ferryDock: 3, skateGate: 4 };
  const COL = { tavern: '#b8936a', casino: '#3a2f4a', bowling: '#c94c3a', police: '#2e4a6b', bank: '#e9e3d6', crest: '#a9bccb', lake: '#8fb8cf', barracks: '#9b8f7d', tankWorks: '#6c7166', tankRange: '#7a7a63', defense: '#5f6b5a', museum: '#c9bba0', cave: '#6e6458', blindSchool: '#e8d9b8', boatworks: '#8b6a48', boathouse: '#7d5e43' };
  const gold = new THREE.MeshBasicMaterial({ color: 0xffc64a }), glass = new THREE.MeshPhongMaterial({ color: 0x9fd6ff, transparent: true, opacity: 0.45, shininess: 100 });
  const hireTex = CT(256, 96, (g, w, h) => { g.fillStyle = '#16a34a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = '900 38px Archivo, sans-serif'; g.textBaseline = 'middle'; g.fillText('NOW', 18, 30); g.fillText('HIRING', 18, 70); g.fillStyle = '#ffd23a'; g.fillRect(w - 50, 22, 30, 52); g.fillStyle = '#16a34a'; g.beginPath(); g.moveTo(w - 42, 32); g.lineTo(w - 26, 48); g.lineTo(w - 42, 64); g.fill(); });
  const hireMat = new THREE.MeshBasicMaterial({ map: hireTex }), FACE = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
  const label = (txt, col = '#201e1d', bg = '#ffffff', s = 1) => { const t = CT(512, 96, (g, w, h) => { g.font = '900 52px Archivo, sans-serif'; const tw = Math.min(w - 20, g.measureText(txt).width + 32); g.fillStyle = bg; g.fillRect(0, 10, tw, 76); g.fillStyle = col; g.fillRect(0, 10, 10, 76); g.fillStyle = bg === '#ffffff' ? '#201e1d' : '#ffffff'; g.textBaseline = 'middle'; g.fillText(txt, 22, 50, tw - 30); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); sp.scale.set(26 * s, 4.9 * s, 1); sp.center.set(0, 0.5); sp.renderOrder = 10; return sp; };
  const labels = new THREE.Group(), doorsG = new THREE.Group(), hires = []; scene.add(labels, doorsG);
  for (const b of L.BUILDINGS) { const [x0, x1, z0, z1] = b.f, w = x1 - x0, d = z1 - z0, cb = city.keys.has(b.key), h = cb ? city.heightOf(b.key) : HGT[b.key] || (b.key.startsWith('station') ? 8 : 7), st = b.key.startsWith('station');
    if (!cb && !b.open) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(st ? '#d9d4cc' : COL[b.key] || '#d6cfc4')); m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); m.castShadow = m.receiveShadow = true; scene.add(m);
    if (st) { const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 4, 0.8, d + 4), toon('#ec3013')); roof.position.set(m.position.x, h + 0.4, m.position.z); scene.add(roof); }
    if (b.door) { const [fx, fz] = FACE[b.face], dw = 4, dh = 4.5, g = new THREE.Group(); g.position.set(b.door[0] + fx * 0.15, 0, b.door[1] + fz * 0.15); g.rotation.y = Math.atan2(fx, fz); doorsG.add(g);
      for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.45, dh + 0.45, 0.4), gold); p.position.set(sx * (dw / 2 + 0.22), (dh + 0.45) / 2, 0); g.add(p); }
      const top = new THREE.Mesh(new THREE.BoxGeometry(dw + 0.9, 0.45, 0.4), gold); top.position.y = dh + 0.22; g.add(top);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(dw, dh), glass); gl.position.set(0, dh / 2, 0.05); g.add(gl);
      if (b.hiring) { const s = new THREE.Group(); s.position.set(dw / 2 + 2.2, 0, 1.2); g.add(s); const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.6, 0.15), toon('#201e1d')); post.position.y = 0.8; s.add(post); const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.82), hireMat); pl.position.y = 2.0; s.add(pl); const back = pl.clone(); back.rotation.y = Math.PI; s.add(back); hires.push({ b, s }); } } }
    const lb = label(b.label.toUpperCase(), st ? '#ec3013' : '#201e1d', '#ffffff', 0.55); lb.position.set(x0, h + 6, (z0 + z1) / 2); labels.add(lb); }
  // the cave mouth: rock face + broken columns
  { const c = L.BUILDINGS.find(b => b.key === 'cave'); if (c) { const [x0, x1, z0, z1] = c.f; const rock = toon('#6e6458'); for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(6 + Math.random() * 6), rock); r.position.set(x0 - 6 + Math.random() * 10, 4 + Math.random() * 8, z0 - 18 + i * 6); r.castShadow = true; scene.add(r); }
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(6, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x0b0a0a })); mouth.position.set(x1 + 0.2, 0, (z0 + z1) / 2); mouth.rotation.y = Math.PI / 2; scene.add(mouth);
    for (let i = 0; i < 8; i++) { const hgt = 2 + Math.random() * 6, col = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, hgt, 10), toon('#cfc2a4')); col.position.set(x1 + 6 + (i % 4) * 5, hgt / 2, z0 - 8 + Math.floor(i / 4) * 40 + Math.random() * 4); col.rotation.z = (Math.random() - 0.5) * 0.15; col.castShadow = true; scene.add(col); } } }

  // ---------- skyline towers (instanced, outside the ring road) ----------
  // step 9: glass towers get a world-space window grid (mullions by day, random lit windows at night) in the shader: no textures, 1 draw call
  const TWU = { uNight: { value: 0 }, uLit: { value: 0.45 } }, beaconPts = [];
  { const N = touch ? 70 : 120, geo = new THREE.BoxGeometry(1, 1, 1), mat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 80, specular: 0xffffff, emissive: 0x000000 });
    mat.onBeforeCompile = sh => { Object.assign(sh.uniforms, TWU);
      sh.vertexShader = 'varying vec3 vTW; varying vec3 vTN;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vec4 tw = vec4(transformed, 1.0);\n #ifdef USE_INSTANCING\n tw = instanceMatrix * tw;\n #endif\n vTW = (modelMatrix * tw).xyz; vTN = normal;');
      sh.fragmentShader = 'uniform float uNight; uniform float uLit; varying vec3 vTW; varying vec3 vTN;\n' + sh.fragmentShader
        .replace('#include <color_fragment>', '#include <color_fragment>\n float tSide = step(abs(vTN.y), 0.5); float tFace = abs(vTN.x) > 0.5 ? sign(vTN.x) * 2.0 : sign(vTN.z);\n vec2 tc = (abs(vTN.x) > 0.5 ? vTW.zy : vTW.xy) / vec2(3.2, 3.6); vec2 tf = fract(tc); vec2 tcell = floor(tc);\n float tWin = step(0.16, tf.x) * step(tf.x, 0.84) * step(0.2, tf.y) * step(tf.y, 0.8) * step(4.5, vTW.y) * tSide;\n float tH = fract(sin(dot(vec3(tcell, tFace), vec3(12.9898, 78.233, 37.719))) * 43758.5453);\n float tRow = fract(sin(dot(vec2(tcell.y, tFace + floor(vTW.x * 0.02 + vTW.z * 0.013)), vec2(7.13, 3.71))) * 9137.31);\n diffuseColor.rgb *= mix(1.0, mix(0.62, 1.0, tWin), tSide);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float tLit = step(1.0 - uLit * (0.55 + tRow * 0.9), tH);\n vec3 tCol = mix(vec3(1.0, 0.8, 0.48), vec3(0.72, 0.86, 1.0), step(0.72, fract(tH * 7.31)));\n totalEmissiveRadiance += tCol * tWin * tLit * uNight * (0.75 + 0.5 * fract(tH * 3.7));'); };
    const inst = new THREE.InstancedMesh(geo, mat, N); const TINT = ['#8fb3cc', '#9fbfd2', '#7d9fb8', '#a9b9c4', '#8aa6a8', '#b4c3cf'].map(c => new THREE.Color(c)); const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(); let n = 0, guard = 0;
    const segD = (x, z, p) => { let m = 1e9; for (let i = 0; i < p.length - 1; i++) { const [ax, az] = p[i], [bx, bz] = p[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); m = Math.min(m, Math.hypot(x - ax - dx * u, z - az - dz * u)); } return m; };
    const lines = [...L.ROADS.map(r => r.p), ...L.PATHS.map(r => r.p), L.TRAIN.line];
    const busy = (x, z) => lines.some(p => segD(x, z, p) < 24) || L.BUILDINGS.some(b => x > b.f[0] - 20 && x < b.f[1] + 20 && z > b.f[2] - 20 && z < b.f[3] + 20) || L.ZONES.some(Z => Z.r ? x > Z.r[0] - 12 && x < Z.r[1] + 12 && z > Z.r[2] - 12 && z < Z.r[3] + 12 : Math.hypot(x - Z.c[0], z - Z.c[1]) < Z.c[2] + 12) || L.WATER.some(w => ((x - w.e[0]) / (w.e[2] + 10)) ** 2 + ((z - w.e[1]) / (w.e[3] + 10)) ** 2 < 1);
    while (n < N && guard++ < 6000) { const x = (Math.random() * 2 - 1) * (H - 15), z = (Math.random() * 2 - 1) * (H - 15); if (busy(x, z) || Math.hypot(x, z) > H + 40) continue; const w = 12 + Math.random() * 16, h = 30 + Math.random() * (Math.hypot(x, z) < 260 ? 110 : 50); s.set(w, h, 12 + Math.random() * 16); p.set(x, h / 2, z); M4.compose(p, q, s); inst.setColorAt(n, TINT[n % TINT.length]); inst.setMatrixAt(n++, M4); if (h > 75) beaconPts.push(x, h + 1.2, z); }
    inst.count = n; inst.castShadow = true; scene.add(inst); var towers = inst; }

  // ---------- the train (step 2b): worlds/meru2-train.js ----------

  // ---------- lamps along the foot paths (instanced) ----------
  const lampPts = []; for (const P of L.PATHS) for (let k = 0; k < P.p.length - 1; k++) { const [x0, z0] = P.p[k], [x1, z1] = P.p[k + 1], len = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / len, nz = (x1 - x0) / len; for (let t = 6; t < len; t += 12) { const x = x0 + (x1 - x0) * t / len, z = z0 + (z1 - z0) * t / len; for (const q of [[x + nx * 4, z + nz * 4], [x - nx * 4, z - nz * 4]]) if (!city.covers(q[0], q[1]) && !paths.covers(q[0], q[1]) && !train.keepOut(q[0], q[1], 0) && !L.BUILDINGS.some(b => q[0] > b.f[0] - 1 && q[0] < b.f[1] + 1 && q[1] > b.f[2] - 1 && q[1] < b.f[3] + 1)) lampPts.push(q); } }
  const lampPost = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 5, 6), toon('#201e1d'), lampPts.length), lampHead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.45, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1c4 }), lampPts.length);
  { const M4 = new THREE.Matrix4(); lampPts.forEach(([x, z], i) => { M4.makeTranslation(x, 2.5, z); lampPost.setMatrixAt(i, M4); M4.makeTranslation(x, 5.1, z); lampHead.setMatrixAt(i, M4); }); scene.add(lampPost, lampHead); }
  const glowTex = CT(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,230,170,1)'); r.addColorStop(1, 'rgba(255,230,170,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  const poolTex = CT(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,214,150,0.5)'); r.addColorStop(0.5, 'rgba(255,214,150,0.18)'); r.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  const lampPool = new THREE.InstancedMesh(new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), lampPts.length);
  { const M4 = new THREE.Matrix4(); lampPts.forEach(([x, z], i) => { M4.makeTranslation(x, 0.07, z); lampPool.setMatrixAt(i, M4); }); lampPool.visible = false; scene.add(lampPool); }
  const glows = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lampPts.flatMap(([x, z]) => [x, 5.1, z]), 3)), new THREE.PointsMaterial({ map: glowTex, size: 5, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glows.visible = false; scene.add(glows);

  // ---------- speakers + 7 m voice triggers ----------
  const spk = new THREE.Group(), rings = new THREE.Group(); scene.add(spk, rings);
  for (const s of L.SPEAKERS) { if (!Array.isArray(s.at) || s.tier > 2) continue; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2, 10), toon(s.newAvatar ? '#ffffff' : s.tier === 1 ? '#ec3013' : '#201e1d')); c.position.set(s.at[0], 1, s.at[1]); c.userData.key = s.key; spk.add(c);
    const r = new THREE.Mesh(new THREE.RingGeometry(6.8, 7, 48), new THREE.MeshBasicMaterial({ color: 0xec3013, transparent: true, opacity: 0.6, depthWrite: false })); r.rotation.x = -Math.PI / 2; r.position.set(s.at[0], 0.15, s.at[1]); rings.add(r); }

  // ---------- zone labels ----------
  const zoneLabels = new THREE.Group(); scene.add(zoneLabels);
  for (const z of L.ZONES) { const [cx, cz] = z.r ? [(z.r[0] + z.r[1]) / 2, (z.r[2] + z.r[3]) / 2] : [z.c[0], z.c[1]]; const lb = label(z.label.toUpperCase(), z.busy ? '#ec3013' : '#ffd23a', '#201e1d', 1); lb.center.set(0.5, 0.5); lb.position.set(cx, 30, cz); zoneLabels.add(lb); }

  // ---------- sky, day / night ----------
  // step 9 pass 4: one sky canvas redrawn from a DAY -> DUSK -> NIGHT blend (t 0..1); setNight(on) eases through dusk in ~4 s
  const skyC = document.createElement('canvas'); skyC.width = 8; skyC.height = 256; const skyTex = new THREE.CanvasTexture(skyC); skyTex.colorSpace = THREE.SRGBColorSpace;
  const KF = [
    { sky: ['#5aa7e6', '#cfe8ff', '#fff3dc'], fog: '#cfe8ff', hi: 1.1, hc: '#dfeeff', hg: '#6f7a5a', si: 2.2, sc: '#fff1dc', sp: [-300, 420, 200], gr: '#ffffff', out: '#8fb26f', wat: '#4aa3d8' },
    { sky: ['#34407e', '#e9876a', '#ffc27a'], fog: '#d49a86', hi: 0.75, hc: '#ffcaa8', hg: '#4a3a40', si: 1.5, sc: '#ff9a55', sp: [-520, 110, 320], gr: '#f4d2c2', out: '#7f8a62', wat: '#5f7fb0' },
    { sky: ['#0b1230', '#26305e', '#5a4a6e'], fog: '#26305e', hi: 0.42, hc: '#7083c8', hg: '#1f2236', si: 0.25, sc: '#9fb4ff', sp: [300, 420, -200], gr: '#8a90aa', out: '#4a5a5a', wat: '#1d3f66' }];
  const cA = new THREE.Color(), cB = new THREE.Color(), lerpC = (a, b, u, out) => out.set(a).lerp(cB.set(b), u), mix = (a, b, u) => a + (b - a) * u;
  const TOD = { t: 0, goal: 0, lights: null };
  scene.fog = new THREE.Fog(0xcfe8ff, 500, 1700);
  // step 9 night sky: stars + moon (no fog), red aviation beacons on the tall towers (blink in tick)
  const nightSky = new THREE.Group(); nightSky.visible = false; scene.add(nightSky);
  { const P = []; for (let i = 0; i < (touch ? 500 : 900); i++) { const a = Math.random() * Math.PI * 2, e = 0.12 + Math.pow(Math.random(), 0.7) * 1.4, R = 2600; P.push(Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R); }
    const dot = CT(32, 32, (g, w) => { const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(220,230,255,0.6)'); r.addColorStop(1, 'rgba(220,230,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
    nightSky.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(P, 3)), new THREE.PointsMaterial({ map: dot, size: 3, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false, color: 0xdfe6ff })));
    const moonT = CT(128, 128, (g, w) => { const r = g.createRadialGradient(64, 64, 20, 64, 64, 64); r.addColorStop(0, 'rgba(255,248,226,1)'); r.addColorStop(0.36, 'rgba(255,248,226,1)'); r.addColorStop(0.42, 'rgba(200,210,255,0.35)'); r.addColorStop(1, 'rgba(160,180,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); g.fillStyle = 'rgba(190,180,160,0.35)'; for (const [x, y, s] of [[52, 54, 7], [72, 70, 5], [60, 78, 4], [76, 50, 3]]) { g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } });
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonT, fog: false, depthWrite: false, transparent: true })); moon.scale.set(380, 380, 1); moon.position.set(-1200, 1100, 1300); nightSky.add(moon); }
  const beacon = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(beaconPts, 3)), new THREE.PointsMaterial({ map: glowTex, color: 0xff3a2a, size: 5, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); beacon.visible = false; scene.add(beacon);
  function applyTime(t) { const k = t < 0.5 ? 0 : 1, u = t < 0.5 ? t * 2 : (t - 0.5) * 2, A = KF[k], B = KF[k + 1];
    const g = skyC.getContext('2d'), r = g.createLinearGradient(0, 0, 0, 256); [0, 0.72, 1].forEach((p, i) => r.addColorStop(p, '#' + lerpC(A.sky[i], B.sky[i], u, cA).getHexString())); g.fillStyle = r; g.fillRect(0, 0, 8, 256); skyTex.needsUpdate = true; scene.background = skyTex;
    lerpC(A.fog, B.fog, u, scene.fog.color); hemi.intensity = mix(A.hi, B.hi, u); lerpC(A.hc, B.hc, u, hemi.color); lerpC(A.hg, B.hg, u, hemi.groundColor);
    sun.intensity = mix(A.si, B.si, u); lerpC(A.sc, B.sc, u, sun.color); sun.position.set(mix(A.sp[0], B.sp[0], u), mix(A.sp[1], B.sp[1], u), mix(A.sp[2], B.sp[2], u));
    lerpC(A.gr, B.gr, u, ground.material.color); lerpC(A.out, B.out, u, outer.material.color); lerpC(A.wat, B.wat, u, water.material.color);
    const n = Math.max(0, Math.min(1, (t - 0.3) / 0.6)); TWU.uNight.value = n * n * (3 - 2 * n); towers.material.emissive.setRGB(0.14 * n, 0.2 * n, 0.29 * n);
    nightSky.visible = t > 0.55; nightSky.children.forEach(c => { c.material.opacity = Math.min(1, (t - 0.55) / 0.35); });
    const lit = t > 0.4; if (lit !== TOD.lights) { TOD.lights = lit; beacon.visible = lampPool.visible = glows.visible = lit; city.setNight(lit); train.setNight(lit); heights.setNight(lit); paths.setNight(lit); gold.color.set(lit ? 0xffd86b : 0xffc64a); } }
  function setNight(on, instant) { TOD.goal = on ? 1 : 0; if (instant) { TOD.t = TOD.goal; applyTime(TOD.t); } }
  function setTime(t) { TOD.goal = TOD.t = Math.max(0, Math.min(1, t)); applyTime(TOD.t); }
  setNight(false, true);

  // ---------- camera: orbit (drag), pinch / wheel zoom, fly to ----------
  const C = { tx: 0, tz: 40, yaw: -0.6, pitch: 0.95, dist: 620, goal: null };
  const el = renderer.domElement, ptr = new Map(); let pd = 0;
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY, e.button]); C.goal = null; });
  el.addEventListener('pointermove', e => { const p = ptr.get(e.pointerId); if (!p) return; const dx = e.clientX - p[0], dy = e.clientY - p[1]; p[0] = e.clientX; p[1] = e.clientY;
    if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pd) C.dist = THREE.MathUtils.clamp(C.dist * pd / d, 40, 1100); pd = d; return; }
    if (p[2] === 2 || e.shiftKey) { const s = C.dist / 700; C.tx -= (Math.cos(C.yaw) * dx + Math.sin(C.yaw) * dy) * s; C.tz -= (-Math.sin(C.yaw) * dx + Math.cos(C.yaw) * dy) * s; }
    else { C.yaw -= dx * 0.006; C.pitch = THREE.MathUtils.clamp(C.pitch + dy * 0.004, 0.18, 1.45); } });
  const up = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pd = 0; }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('wheel', e => { e.preventDefault(); C.dist = THREE.MathUtils.clamp(C.dist * (1 + Math.sign(e.deltaY) * 0.1), 40, 1100); C.goal = null; }, { passive: false });
  function flyTo(key) { if (key === 'all') { C.goal = { tx: 0, tz: 40, dist: 620, pitch: 0.95 }; return; } const z = L.ZONES.find(q => q.key === key); if (!z) return; const [cx, cz, s] = z.r ? [(z.r[0] + z.r[1]) / 2, (z.r[2] + z.r[3]) / 2, Math.max(z.r[1] - z.r[0], z.r[3] - z.r[2])] : [z.c[0], z.c[1], z.c[2] * 2]; C.goal = { tx: cx, tz: cz, dist: THREE.MathUtils.clamp(s * 1.25, 70, 700), pitch: 0.75 }; }
  function pan(dx, dz) { C.goal = null; C.tx += dx; C.tz += dz; }

  // ---------- loop ----------
  let raf = 0, last = performance.now(), dead = false, driver = null, driverErr = null;
  function size() { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(size); ro.observe(container); size();
  function frame(now) { if (dead) return; raf = requestAnimationFrame(frame); const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    if (C.goal) { const k = 1 - Math.exp(-dt * 3); for (const f of ['tx', 'tz', 'dist', 'pitch']) C[f] += (C.goal[f] - C[f]) * k; }
    if (TOD.t !== TOD.goal) { TOD.t = TOD.goal > TOD.t ? Math.min(TOD.goal, TOD.t + dt / 4) : Math.max(TOD.goal, TOD.t - dt / 4); applyTime(TOD.t); }
    train.tick(dt, now); if (beacon.visible) beacon.material.opacity = (now % 1600) < 500 ? 1 : 0.15;
    if (driver) { try { driver(dt, now); } catch (e) { if (!driverErr) console.warn('walk frame: ' + (e && e.stack || e)); driverErr = e; } } else { const cp = Math.cos(C.pitch), sp = Math.sin(C.pitch); camera.position.set(C.tx + Math.sin(C.yaw) * cp * C.dist, sp * C.dist + 4, C.tz + Math.cos(C.yaw) * cp * C.dist); camera.lookAt(C.tx, 0, C.tz); }
    city.tick(dt, now); heights.tick(dt); paths.tick(dt);
    for (const h of hires) h.s.rotation.y = Math.sin(now / 900) * 0.05;
    zoneLabels.children.forEach(s => s.scale.set(C.dist * 0.042 * 3, C.dist * 0.042 * 0.57, 1));
    labels.visible = driver ? false : C.dist < 420; zoneLabels.visible = !driver && zoneLabels.userData.on !== false;
    renderer.render(scene, camera); }
  raf = requestAnimationFrame(frame);
  onState({ ready: true, counts: { buildings: L.BUILDINGS.length, speakers: L.SPEAKERS.length, lamps: lampPts.length + city.stats.lamps, hiring: L.BUILDINGS.filter(b => b.hiring).length, doors: city.stats.doors, trees: city.stats.trees, cars: city.stats.cars } });
  const API = window.__meru2 = { flyTo, pan, setNight, setTime, time: () => TOD.t, water, show(what, on) { if (what === 'labels') zoneLabels.userData.on = on; ({ rings, labels: zoneLabels, speakers: spk, towers, doors: doorsG })[what].visible = on; },
    K: { THREE, scene, camera, renderer, toon, grad, CT, L, el, I }, city, train, heights, paths, spk, setDriver(fn) { driver = fn; }, orbit: C,
    zones: L.ZONES.map(z => ({ key: z.key, label: z.label })), destroy() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); el.remove(); } };   // window.__meru2 = test hook
  return API;
}
