/* WOODSHOP: a wood furniture maker minigame for 8 GATES 3D.
   Each turn a fox builds the customer's order on the workbench in four stages:
   CUT (tap timing) -> SAND (hold + release) -> JOIN (tap timing) -> STAIN (hold + release).
   Works standalone (own renderer) or in WORLD MODE (opts.world = { renderer, camera, parent }). */
import * as THREE from '../../vendor/three/three.module.js';
import * as R from './woodshop-rules.js';
import { createAudio } from './woodshop-audio.js';

export const GAME = { key: 'woodshop', name: 'WOODSHOP', maxPlayers: 4 };

const BT = 1.3;                 /* bench top height */
const PLANK_Z = 0.15;
const PLANK_LEN = 4.6;
const INK_HEX = 0x1a1626;
const V3 = THREE.Vector3;

const LOOKS = {
  p1:    { torso: ['#e8682a', '#ec3013', '#ffffff'], outfit: 'vest', chip: '#ec3013' },
  p2:    { torso: ['#d98a3a', '#2f7fd6', '#ffffff'], outfit: 'tee',  chip: '#2f7fd6' },
  p3:    { torso: ['#c8642a', '#2f9e5a', '#ffd23a'], outfit: 'coat', chip: '#2f9e5a' },
  p4:    { torso: ['#e07a40', '#8a4fd0', '#ffffff'], outfit: 'dress', chip: '#8a4fd0' },
  pip:   { torso: ['#f2c230', '#ffd23a', '#ffffff'], outfit: 'tee',  chip: '#ffd23a', mood: 'happy' },
  hope:  { torso: ['#e07a2e', '#2f6fd6', '#ffffff'], outfit: 'coat', chip: '#5aa0ff', legs: '#2f6fd6', glasses: true, cane: true, mood: 'calm' },
  noble: { torso: ['#b8502a', '#2a2240', '#ec3013'], outfit: 'coat', chip: '#ec3013', redEyes: true, chair: true, mood: 'stern' },
};

export async function createWoodshop({ container, onState = () => {}, opts = {} }) {
  const W = opts.world || null;
  const kit = opts.kit || null;
  const save = opts.save || null;
  const touch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
  const audio = createAudio({ music: opts.music ?? !W, sound: opts.sound ?? true });

  /* ---------- renderer / scene ---------- */
  let renderer = null, root = null, env;
  const scene = new THREE.Group();
  scene.name = 'woodshop';
  if (W) {
    env = new THREE.Scene();          /* throw-away: room + lights never enter the town */
    W.parent.add(scene);
  } else {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !touch;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const cv = renderer.domElement;
    cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;';
    container.appendChild(cv);
    root = new THREE.Scene();
    root.background = new THREE.Color('#2b211c');
    root.add(scene);
    env = root;
  }
  const domEl = W ? W.renderer.domElement : renderer.domElement;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 300);
  const wcam = new THREE.PerspectiveCamera(45, 1, 0.1, 600);
  const camGoal = { pos: new V3(0, 6, 9), tgt: new V3(0, 1.5, 0) };
  const camCur = { pos: new V3(0, 6, 9), tgt: new V3(0, 1.5, 0) };
  let safe = { top: 0, bottom: 0, left: 0, right: 0 };
  let vw = 1, vh = 1;

  /* ---------- materials ---------- */
  const grad = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  const matCache = new Map();
  const toon = (hex) => {
    if (!matCache.has(hex)) matCache.set(hex, new THREE.MeshToonMaterial({ color: hex, gradientMap: grad }));
    return matCache.get(hex);
  };
  const newToon = (hex) => new THREE.MeshToonMaterial({ color: hex, gradientMap: grad });
  const INK = new THREE.MeshBasicMaterial({ color: INK_HEX, side: THREE.BackSide });
  const BASIC = (hex) => new THREE.MeshBasicMaterial({ color: hex });

  function ink(mesh, t = 0.03) {
    const g = mesh.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    const s = new V3(), c = new V3();
    g.boundingBox.getSize(s); g.boundingBox.getCenter(c);
    const sh = new THREE.Mesh(g, INK);
    const k = (d) => (Math.max(d, 1e-3) + 2 * t) / Math.max(d, 1e-3);
    sh.scale.set(k(s.x), k(s.y), k(s.z));
    sh.position.set(c.x * (1 - sh.scale.x), c.y * (1 - sh.scale.y), c.z * (1 - sh.scale.z));
    sh.userData.ink = true;
    sh.raycast = () => {};
    mesh.add(sh);
    return mesh;
  }
  function mesh(geo, mat, { x = 0, y = 0, z = 0, ink: k = 0.03, parent = null } = {}) {
    const m = new THREE.Mesh(geo, typeof mat === 'string' ? toon(mat) : mat);
    m.position.set(x, y, z);
    if (k) ink(m, k);
    if (parent) parent.add(m);
    return m;
  }
  const box = (w, h, d, mat, o) => mesh(new THREE.BoxGeometry(w, h, d), mat, o);
  const cyl = (rt, rb, h, mat, o, seg = 12) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, o);
  const sph = (r, mat, o) => mesh(new THREE.SphereGeometry(r, 14, 10), mat, o);

  /* ---------- room (standalone only) ---------- */
  if (!W) buildRoom(env);
  function buildRoom(S) {
    const hemi = new THREE.HemisphereLight(0xfff1dc, 0x5a4030, 1.6);
    S.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff4e6, 2.2);
    sun.position.set(5, 11, 7);
    sun.castShadow = !touch;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
    S.add(sun);
    const fill = new THREE.DirectionalLight(0xffd2a0, 0.6);
    fill.position.set(-6, 4, 3);
    S.add(fill);

    /* floor planks texture */
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const x = c.getContext('2d');
    for (let i = 0; i < 8; i++) {
      x.fillStyle = i % 2 ? '#b98754' : '#c59360';
      x.fillRect(0, i * 32, 256, 32);
      x.fillStyle = '#7a5232'; x.fillRect(0, i * 32, 256, 2);
      x.fillRect(((i * 97) % 200) + 20, i * 32, 2, 32);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 6);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshToonMaterial({ map: tex, gradientMap: grad }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    S.add(floor);

    const wall = box(26, 9, 0.4, '#e6d6b8', { y: 4.5, z: -6.5, ink: 0 }); S.add(wall);
    const wainscot = box(26, 1.4, 0.45, '#8a5a34', { y: 0.7, z: -6.45, ink: 0 }); S.add(wainscot);
    const lw = box(0.4, 9, 20, '#dccaa8', { x: -11, y: 4.5, z: 3, ink: 0 }); S.add(lw);
    const rw = box(0.4, 9, 20, '#dccaa8', { x: 11, y: 4.5, z: 3, ink: 0 }); S.add(rw);
    /* window */
    const win = box(3.6, 2.4, 0.1, BASIC('#a9dcff'), { x: 3.2, y: 4.6, z: -6.24, ink: 0 }); S.add(win);
    const wf = box(3.9, 0.2, 0.2, '#5a3a22', { x: 3.2, y: 4.6, z: -6.18, ink: 0 }); S.add(wf);
    const wf2 = box(0.2, 2.7, 0.2, '#5a3a22', { x: 3.2, y: 4.6, z: -6.18, ink: 0 }); S.add(wf2);
    /* pegboard with tools */
    const peg = box(4.6, 2.4, 0.12, '#6b4a2e', { x: -3.4, y: 4.4, z: -6.2, ink: 0.04 }); S.add(peg);
    const t1 = box(1.4, 0.5, 0.06, '#c9ced6', { x: -4.4, y: 4.9, z: -6.1, ink: 0.03 }); t1.rotation.z = 0.2; S.add(t1);
    const t2 = box(0.18, 1.1, 0.08, '#a0683a', { x: -3.1, y: 4.3, z: -6.1, ink: 0.03 }); S.add(t2);
    const t3 = box(0.6, 0.22, 0.1, '#5a5f6a', { x: -3.1, y: 4.9, z: -6.08, ink: 0.03 }); S.add(t3);
    const t4 = box(1.0, 0.12, 0.06, '#ffd23a', { x: -2.1, y: 3.8, z: -6.1, ink: 0.03 }); S.add(t4);
    const t5 = box(0.12, 0.8, 0.06, '#ffd23a', { x: -2.55, y: 4.2, z: -6.1, ink: 0.03 }); S.add(t5);
    /* lumber rack */
    for (let i = 0; i < 4; i++) {
      const lb = box(0.5, 0.18, 5.5, i % 2 ? '#d9a868' : '#c99556', { x: -9.6, y: 0.5 + i * 0.6, z: -1.5, ink: 0.03 });
      S.add(lb);
    }
    const rack = box(0.25, 3, 0.25, '#5a3a22', { x: -9.6, y: 1.5, z: -4.1, ink: 0.03 }); S.add(rack);
    const rack2 = box(0.25, 3, 0.25, '#5a3a22', { x: -9.6, y: 1.5, z: 1.1, ink: 0.03 }); S.add(rack2);
    /* hanging lamp */
    const cord = box(0.04, 2.4, 0.04, '#1a1626', { y: 7.6, z: 0, ink: 0 }); S.add(cord);
    const shade = cyl(0.25, 0.85, 0.6, '#2f7d6a', { y: 6.2, z: 0, ink: 0.04 }, 16); S.add(shade);
    const bulb = sph(0.2, BASIC('#fff2c0'), { y: 5.9, ink: 0 }); S.add(bulb);
    /* sawdust heap + log stack */
    const dust = sph(1, '#efd19a', { x: 2.2, y: -0.55, z: 3.2, ink: 0 }); dust.scale.set(1.2, 0.7, 0.9); S.add(dust);
    for (let i = 0; i < 3; i++) {
      const lg = cyl(0.35, 0.35, 2.2, '#8a5a30', { x: 8.6, y: 0.35 + (i === 2 ? 0.6 : 0), z: -3 + (i === 2 ? 0.35 : i * 0.72), ink: 0.03 });
      lg.rotation.x = Math.PI / 2; S.add(lg);
    }
    S.traverse(o => { if (o.isMesh && !o.userData.ink) { o.receiveShadow = true; } });
  }

  /* ---------- workbench (the playable object: lives in the group) ---------- */
  const bench = new THREE.Group();
  scene.add(bench);
  box(6.0, 0.24, 2.4, '#c98c4a', { y: BT - 0.12, parent: bench });
  box(5.6, 0.36, 0.1, '#a8703a', { y: BT - 0.42, z: 1.1, parent: bench });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.28, BT - 0.24, 0.28, '#8a5a30', { x: sx * 2.7, y: (BT - 0.24) / 2, z: sz * 0.95, parent: bench });
  box(5.4, 0.12, 2.0, '#a8703a', { y: 0.35, parent: bench });
  const vise = box(0.5, 0.4, 0.5, '#5a5f6a', { x: 2.75, y: BT - 0.05, z: 1.05, parent: bench });
  box(0.08, 0.08, 0.6, '#c9ced6', { x: 0, y: -0.05, z: 0.4, parent: vise });
  /* small clamp + square for flavour */
  box(0.7, 0.04, 0.12, '#ffd23a', { x: 2.3, y: BT + 0.02, z: -0.95, parent: bench });
  box(0.12, 0.04, 0.5, '#ffd23a', { x: 2.0, y: BT + 0.02, z: -0.76, parent: bench });
  /* display plinth for the last finished piece */
  const plinth = box(2.4, 0.3, 2.0, '#6b4a2e', { x: 4.9, y: 0.15, z: 1.0 });
  scene.add(plinth);

  /* meter on the bench apron, facing the player */
  const meter = new THREE.Group();
  meter.position.set(0, 0.86, 1.25); meter.rotation.x = -0.18;
  scene.add(meter);
  const MW = 4.4;
  box(MW + 0.2, 0.52, 0.06, '#111111', { parent: meter, ink: 0.03 });
  const zone = box(1, 0.36, 0.02, BASIC('#3fbf5a'), { z: 0.04, parent: meter, ink: 0 });
  const fillGeo = new THREE.BoxGeometry(1, 0.36, 0.02); fillGeo.translate(0.5, 0, 0);
  const fill = mesh(fillGeo, BASIC('#ffd23a'), { x: -MW / 2, z: 0.05, parent: meter, ink: 0 });
  const stainCanvas = document.createElement('canvas'); stainCanvas.width = 256; stainCanvas.height = 4;
  { const g2 = stainCanvas.getContext('2d');
    for (let i = 0; i < 256; i++) { g2.fillStyle = R.stainHex(i / 255); g2.fillRect(i, 0, 1, 4); } }
  const stainTex = new THREE.CanvasTexture(stainCanvas); stainTex.colorSpace = THREE.SRGBColorSpace;
  const stainBar = mesh(new THREE.PlaneGeometry(MW, 0.36), new THREE.MeshBasicMaterial({ map: stainTex }), { z: 0.045, parent: meter, ink: 0 });
  const tmark = box(0.07, 0.6, 0.03, BASIC('#ffffff'), { z: 0.07, parent: meter, ink: 0.015 });
  const needle = box(0.09, 0.68, 0.05, BASIC('#ffd23a'), { z: 0.09, parent: meter, ink: 0.02 });
  meter.visible = false;

  /* tools */
  const saw = new THREE.Group();
  box(0.05, 0.5, 1.1, '#d6dbe2', { parent: saw, ink: 0.025 });
  box(0.08, 0.08, 1.1, '#8d939c', { y: 0.27, parent: saw, ink: 0 });
  box(0.16, 0.44, 0.36, '#7a3b1e', { y: 0.12, z: 0.7, parent: saw, ink: 0.03 });
  const sawPtr = mesh(new THREE.ConeGeometry(0.16, 0.36, 4), '#ffd23a', { y: 0.78, parent: saw, ink: 0.025 });
  sawPtr.rotation.x = Math.PI;
  saw.visible = false; scene.add(saw);

  const markLine = box(0.04, 0.012, 0.82, BASIC('#ec3013'), { ink: 0 });
  const flag = mesh(new THREE.ConeGeometry(0.14, 0.34, 4), '#ec3013', { ink: 0.025 });
  flag.rotation.x = Math.PI;
  const guide = box(0.03, 0.014, 0.82, BASIC('#ffd23a'), { ink: 0 });
  [markLine, flag, guide].forEach(o => { o.visible = false; scene.add(o); });

  const sander = new THREE.Group();
  box(0.56, 0.17, 0.4, '#2f7fd6', { y: 0.06, parent: sander, ink: 0.03 });
  box(0.56, 0.05, 0.4, '#d8cfb6', { y: -0.06, parent: sander, ink: 0 });
  box(0.3, 0.1, 0.12, '#1a1626', { y: 0.19, parent: sander, ink: 0 });
  sander.visible = false; scene.add(sander);

  const hammer = new THREE.Group();
  box(0.22, 0.42, 0.22, '#5a5f6a', { parent: hammer, ink: 0.03 });
  const hh = cyl(0.045, 0.045, 0.9, '#a0683a', { z: 0.48, ink: 0.02 }); hh.rotation.x = Math.PI / 2; hammer.add(hh);
  hammer.visible = false; scene.add(hammer);

  const brush = new THREE.Group();
  const brushHandle = cyl(0.05, 0.05, 0.6, '#a0683a', { y: 0.42, ink: 0.02 }); brush.add(brushHandle);
  box(0.36, 0.08, 0.14, '#c9ced6', { y: 0.12, parent: brush, ink: 0.015 });
  const bristleMat = newToon('#f0cf96');
  box(0.34, 0.16, 0.12, bristleMat, { y: 0, parent: brush, ink: 0.015 });
  brush.visible = false; scene.add(brush);

  const ringMat = BASIC('#ffd23a');
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 6, 36), ringMat);
  ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
  const tring = new THREE.Mesh(new THREE.TorusGeometry(R.WINDOWS.join.target, 0.018, 6, 30), BASIC('#ffffff'));
  tring.rotation.x = -Math.PI / 2; tring.visible = false; scene.add(tring);

  /* particles: one instanced mesh */
  const PN = 70;
  const pMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff }), PN);
  pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  pMesh.frustumCulled = false;
  const pts = [];
  const _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new V3();
  for (let i = 0; i < PN; i++) { pts.push({ life: 0, p: new V3(), v: new V3(), s: 1 }); pMesh.setColorAt(i, _c.set('#f0d39a')); }
  scene.add(pMesh);
  let pNext = 0;
  function burst(pos, n, hex, power = 1.4, size = 1) {
    for (let k = 0; k < n; k++) {
      const P = pts[pNext]; pNext = (pNext + 1) % PN;
      P.life = 0.5 + Math.random() * 0.5; P.s = size * (0.6 + Math.random() * 0.8);
      P.p.copy(pos).add(new V3((Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.2));
      P.v.set((Math.random() - 0.5) * power * 2, Math.random() * power * 1.6 + 0.4, (Math.random() - 0.3) * power * 1.6);
      pMesh.setColorAt(pts.indexOf(P), _c.set(hex));
    }
    pMesh.instanceColor.needsUpdate = true;
  }
  function updateParticles(dt) {
    for (let i = 0; i < PN; i++) {
      const P = pts[i];
      if (P.life > 0) {
        P.life -= dt; P.v.y -= 7 * dt; P.p.addScaledVector(P.v, dt);
        if (P.p.y < 0.03) { P.p.y = 0.03; P.v.set(0, 0, 0); }
        const s = Math.max(0, Math.min(1, P.life * 3)) * P.s;
        _m.compose(P.p, _q, _s.set(s, s, s));
      } else _m.compose(P.p, _q, _s.set(0, 0, 0));
      pMesh.setMatrixAt(i, _m);
    }
    pMesh.instanceMatrix.needsUpdate = true;
  }

  /* ---------- tweens ---------- */
  let tweens = [];
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const back = (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
  function tween(d, fn, done, delay = 0) { tweens.push({ t: -delay, d, fn, done }); }
  function updateTweens(dt) {
    const list = tweens; tweens = [];
    for (const tw of list) {
      tw.t += dt;
      if (tw.t < 0) { tweens.push(tw); continue; }
      const k = Math.min(1, tw.t / tw.d);
      tw.fn(k);
      if (k >= 1) { if (tw.done) tw.done(); } else tweens.push(tw);
    }
  }

  /* ---------- foxes (adapter) ---------- */
  function placeholderFox(o) {
    const [fur, cloth, acc] = o.torso;
    const g = new THREE.Group();
    const legs = [], arms = [];
    for (const s of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(0.2 * s, 0.95, 0);
      mesh(new THREE.CapsuleGeometry(0.13, 0.55, 4, 8), o.legs || '#4a3226', { y: -0.44, parent: hip, ink: 0.025 });
      box(0.26, 0.12, 0.4, '#1a1626', { y: -0.88, z: 0.07, parent: hip, ink: 0 });
      g.add(hip); legs.push(hip);
    }
    const body = new THREE.Group(); body.position.y = 0.95; g.add(body);
    mesh(new THREE.CapsuleGeometry(0.38, 0.45, 4, 12), cloth, { y: 0.5, parent: body, ink: 0.03 });
    box(0.5, 0.1, 0.3, acc, { y: 0.88, z: 0.16, parent: body, ink: 0 });
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(0.5 * s, 0.84, 0);
      mesh(new THREE.CapsuleGeometry(0.1, 0.45, 4, 8), fur, { y: -0.3, parent: sh, ink: 0.022 });
      sph(0.12, '#f6e6d2', { y: -0.62, parent: sh, ink: 0 });
      body.add(sh); arms.push(sh);
    }
    const head = new THREE.Group(); head.position.y = 1.28; body.add(head);
    const skull = sph(0.36, fur, { parent: head, ink: 0.03 });
    skull.scale.set(1, 0.95, 0.95);
    const muz = sph(0.2, '#f6e6d2', { y: -0.1, z: 0.24, parent: head, ink: 0 }); muz.scale.set(1.1, 0.8, 1);
    const snout = mesh(new THREE.ConeGeometry(0.12, 0.3, 10), fur, { y: -0.04, z: 0.38, parent: head, ink: 0 });
    snout.rotation.x = Math.PI / 2;
    sph(0.05, '#1a1626', { y: -0.03, z: 0.54, parent: head, ink: 0 });
    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(0.13, 0.34, 4), fur, { x: 0.2 * s, y: 0.38, parent: head, ink: 0.02 });
      ear.rotation.z = -0.25 * s;
      sph(0.045, '#1a1626', { x: 0.13 * s, y: 0.07, z: 0.31, parent: head, ink: 0 });
    }
    const tail = new THREE.Group(); tail.position.set(0, 1.05, -0.32); g.add(tail);
    const tl = mesh(new THREE.CapsuleGeometry(0.14, 0.6, 4, 8), fur, { y: 0.0, z: -0.3, parent: tail, ink: 0.02 });
    tl.rotation.x = -1.0;
    sph(0.13, '#ffffff', { y: 0.28, z: -0.5, parent: tail, ink: 0 });
    g.userData.P = { body, head, arms, legs };
    g.userData.anchor = { eyes: new V3(0, 0.07, 0.33), eyeX: 0.13, hand: new V3(0, -0.62, 0) };
    g.userData.tail = tail;
    return g;
  }

  function localBox(obj) {
    obj.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert();
    const b = new THREE.Box3(), t = new THREE.Matrix4();
    obj.traverse(m => {
      if (!m.isMesh || m.userData.ink || !m.geometry) return;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      b.union(m.geometry.boundingBox.clone().applyMatrix4(t.multiplyMatrices(inv, m.matrixWorld)));
    });
    return b;
  }

  /* The ONE adapter: world kit fox when given, else the placeholder. Accessories are added here. */
  function makeFox(look) {
    let f;
    if (kit && kit.makeFox) {
      f = kit.makeFox({ torso: look.torso, outfit: look.outfit, mood: look.mood || 'happy' });
      f.userData.kit = true;
    } else f = placeholderFox(look);
    const P = f.userData.P;
    let A = f.userData.anchor;
    if (!A) {
      const hb = localBox(P.head), ab = localBox(P.arms[0]);
      const c = hb.getCenter(new V3()), s = hb.getSize(new V3());
      A = { eyes: new V3(c.x, c.y + s.y * 0.08, hb.max.z), eyeX: s.x * 0.18, hand: new V3(ab.getCenter(new V3()).x, ab.min.y, 0) };
    }
    if (look.glasses) {
      box(0.56, 0.13, 0.06, '#0d0d12', { x: A.eyes.x, y: A.eyes.y, z: A.eyes.z + 0.02, parent: P.head, ink: 0 });
      box(0.6, 0.03, 0.03, '#0d0d12', { x: A.eyes.x, y: A.eyes.y + 0.06, z: A.eyes.z + 0.02, parent: P.head, ink: 0 });
    }
    if (look.redEyes) {
      for (const s of [-1, 1]) sph(0.055, BASIC('#ff2a1a'), { x: A.eyes.x + A.eyeX * s, y: A.eyes.y, z: A.eyes.z + 0.01, parent: P.head, ink: 0 });
    }
    if (look.cane) {
      const cane = new THREE.Group(); cane.position.copy(A.hand); P.arms[0].add(cane);
      cyl(0.025, 0.025, 1.0, '#ffffff', { y: -0.4, z: 0.12, parent: cane, ink: 0.012 });
      cyl(0.026, 0.026, 0.22, '#ec3013', { y: -0.81, z: 0.12, parent: cane, ink: 0 });
      cane.rotation.x = 0.12;
    }
    if (look.chair) {
      const ch = new THREE.Group(); f.add(ch); f.userData.chair = ch;
      cyl(0.5, 0.42, 0.14, '#2a2240', { y: 0.78, ink: 0.03, parent: ch }, 18);
      box(0.8, 0.9, 0.12, '#2a2240', { y: 1.25, z: -0.42, parent: ch, ink: 0.03 });
      box(0.6, 0.06, 0.02, BASIC('#5ee7ff'), { y: 1.5, z: -0.35, parent: ch, ink: 0 });
      const glow = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 24), BASIC('#5ee7ff'));
      glow.rotation.x = -Math.PI / 2; glow.position.y = 0.66; ch.add(glow);
      cyl(0.12, 0.05, 0.4, '#5a5f6a', { y: 0.45, parent: ch, ink: 0.02 });
    }
    f.traverse(o => { if (o.isMesh && !o.userData.ink) o.castShadow = !touch && !W; });
    const P2 = f.userData.P;
    f.userData.base = {
      bodyY: P2.body.position.y,
      armZ: P2.arms.map(a => a.rotation.z), armX: P2.arms.map(a => a.rotation.x),
      legX: P2.legs.map(l => l.rotation.x), headX: P2.head.rotation.x,
    };
    return f;
  }

  const lerpAng = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };

  function animFox(F, dt) {
    const f = F.fox, P = f.userData.P, B = f.userData.base;
    const d = new V3().subVectors(F.goal, F.pos); d.y = 0;
    const dist = d.length();
    let speed = 0;
    if (dist > 0.04) {
      const step = Math.min(dist, 3.4 * dt);
      F.pos.addScaledVector(d.normalize(), step);
      speed = 3.4;
      F.yaw = lerpAng(F.yaw, Math.atan2(d.x, d.z), 1 - Math.exp(-12 * dt));
    } else F.yaw = lerpAng(F.yaw, F.face, 1 - Math.exp(-7 * dt));
    F.t += dt;
    f.position.copy(F.pos);
    f.rotation.y = F.yaw;
    const chair = f.userData.chair;
    if (chair) speed = 0;
    if (f.userData.kit && kit.animFox) kit.animFox(f, dt, speed);
    else {
      F.ph += dt * (speed ? 10 : 2.2);
      const w = speed ? 1 : 0;
      P.legs[0].rotation.x = Math.sin(F.ph) * 0.6 * w;
      P.legs[1].rotation.x = -Math.sin(F.ph) * 0.6 * w;
      P.arms[0].rotation.x = -Math.sin(F.ph) * 0.5 * w + (1 - w) * Math.sin(F.ph) * 0.05;
      P.arms[1].rotation.x = Math.sin(F.ph) * 0.5 * w - (1 - w) * Math.sin(F.ph) * 0.05;
      P.body.position.y = B.bodyY + (w ? Math.abs(Math.sin(F.ph)) * 0.06 : Math.sin(F.ph) * 0.015);
      P.head.rotation.x = B.headX;
      if (f.userData.tail) f.userData.tail.rotation.z = Math.sin(F.t * 3) * 0.2;
    }
    P.arms.forEach((a, i) => { a.rotation.z = B.armZ[i]; });
    poseAction(F);
    if (chair) {
      P.legs.forEach(l => { l.rotation.x = -1.45; });
      f.position.y = F.pos.y + 0.06 + Math.sin(F.t * 2.4) * 0.04;
    }
  }

  function flash(F, type, dur) { F.flash = type; F.flashT = dur; F.ft = 0; }
  function poseAction(F) {
    const P = F.fox.userData.P, B = F.fox.userData.base;
    let type = F.act;
    if (F.flashT > 0) type = F.flash;
    const t = F.t, A = P.arms;
    switch (type) {
      case 'reach': A[1].rotation.x = -1.1 + Math.sin(t * 3) * 0.05; A[0].rotation.x = -0.55; break;
      case 'saw': A[1].rotation.x = -1.25 + Math.sin(F.ft * 32) * 0.35; A[0].rotation.x = -0.7; break;
      case 'sand': A[0].rotation.x = -1.05 + Math.sin(t * 16) * 0.22; A[1].rotation.x = -1.05 - Math.sin(t * 16) * 0.22; break;
      case 'hammerUp': A[1].rotation.x = -2.5 + Math.sin(t * 4) * 0.08; A[0].rotation.x = -0.6; break;
      case 'hammer': A[1].rotation.x = -2.6 + Math.min(1, F.ft / 0.08) * 1.7; A[0].rotation.x = -0.6; break;
      case 'stain': A[1].rotation.x = -1.15; A[1].rotation.z = B.armZ[1] + Math.sin(t * 5) * 0.35; A[0].rotation.x = -0.4; break;
      case 'cheer':
        A[0].rotation.x = -2.9 + Math.sin(t * 12) * 0.15; A[1].rotation.x = -2.9 - Math.sin(t * 12) * 0.15;
        A[0].rotation.z = B.armZ[0] - 0.3; A[1].rotation.z = B.armZ[1] + 0.3;
        if (!F.fox.userData.chair) F.fox.position.y = F.pos.y + Math.abs(Math.sin(t * 8)) * 0.18;
        break;
      case 'slump': P.head.rotation.x = B.headX + 0.35; A[0].rotation.x = 0.1; A[1].rotation.x = 0.1; break;
      case 'wave': A[1].rotation.x = -2.7; A[1].rotation.z = B.armZ[1] + Math.sin(t * 9) * 0.4; break;
      default: break;
    }
  }

  /* ---------- game state ---------- */
  let match = null, mode = 'cpu';
  let cfg = { level: 'pip', players: 2, rounds: 3 };
  let foxes = [];
  let phase = 'ready', phaseT = 0;
  let stageIdx = 0, sub = 'intro', subT = 0, hits = [], stageScores = [];
  let cutIdx = 0, pegIdx = 0;
  let holding = false, holdV = 0, inZone = false;
  let sawX = 0, sawDir = 1, sawSpeed = 1.5, sawMin = 0, sawMax = 0, markX = 0, beepT = 0, lastSawX = 0;
  let ringR = 0.9, ringSpeed = 0.75, ringTick = 0;
  let plank = null, plankL = 0, offcuts = [], furn = null, display = null, splinters = [];
  let sandAcc = 100;
  let toast = null, toastT = 0, toastId = 0;
  let msg = '', paused = false, closed = false;
  let lastInput = performance.now();
  let cpu = { aim: 0, wait: 0 };
  let result = null, demoT = 0;
  let dirtyFlag = true, lastEmit = 0;
  const dirty = () => { dirtyFlag = true; };

  const seat = () => (match ? R.currentSeat(match) : null);
  const order = () => (match ? R.currentOrder(match) : null);
  const activeFox = () => foxes[match ? match.seats.indexOf(seat()) : 0];
  const human = () => { const s = seat(); return !!s && !s.cpu; };
  const stage = () => R.STAGES[stageIdx];

  const SLOT_ACTIVE = new V3(0, 0, -1.95);
  const SLOTS_WAIT = [new V3(-5.0, 0, -0.4), new V3(5.0, 0, -1.7), new V3(-6.1, 0, -1.9)];

  function clearFoxes() {
    foxes.forEach(F => { scene.remove(F.fox); if (!F.fox.userData.kit) disposeTree(F.fox); });
    foxes = [];
  }

  function seatsFor(m) {
    if (m === 'demo') return [
      { name: 'HOPE', cpu: true, level: 'hope', look: 'hope' },
      { name: 'NOBLE', cpu: true, level: 'noble', look: 'noble' },
    ];
    if (m === 'local') {
      const n = Math.max(2, Math.min(4, cfg.players | 0));
      return [...Array(n)].map((_, i) => ({ name: 'FOX ' + (i + 1), cpu: false, look: 'p' + (i + 1) }));
    }
    const L = R.LEVELS[cfg.level] || R.LEVELS.pip;
    return [
      { name: 'YOU', cpu: false, look: 'p1' },
      { name: L.name, cpu: true, level: L.id, look: L.id },
    ];
  }

  function start(m = mode, c = {}) {
    audio.holdStop();
    mode = ['cpu', 'local', 'demo'].includes(m) ? m : 'cpu';
    cfg = { ...cfg, ...c };
    closed = false; paused = false; result = null;
    match = R.newMatch({ seats: seatsFor(mode), rounds: mode === 'demo' ? 1 : Math.max(1, cfg.rounds | 0) });
    clearFoxes();
    match.seats.forEach((s, i) => {
      const fox = makeFox(LOOKS[s.look] || LOOKS.p1);
      scene.add(fox);
      const p = (i === 0 ? SLOT_ACTIVE : SLOTS_WAIT[(i - 1) % 3]).clone();
      foxes.push({ fox, pos: p.clone(), goal: p.clone(), yaw: 0, face: 0, t: Math.random() * 5, ph: Math.random() * 5, act: null, flash: null, flashT: 0, ft: 0 });
    });
    if (display) { scene.remove(display.group); disposeTree(display.group); display = null; }
    beginTurn();
    fitCam(); snapCam();
  }

  function arrangeFoxes() {
    const act = seat();
    let w = 0;
    match.seats.forEach((s, i) => {
      const F = foxes[i];
      if (s === act) { F.goal.copy(SLOT_ACTIVE); F.face = 0; F.act = null; }
      else {
        const p = SLOTS_WAIT[w++ % 3];
        F.goal.copy(p); F.face = Math.atan2(-p.x * 0.6, -p.z - 1.5); F.act = null;
      }
    });
  }

  function clearWork() {
    if (plank) { scene.remove(plank); disposeTree(plank); plank = null; }
    offcuts.forEach(o => { scene.remove(o); disposeTree(o); }); offcuts = [];
    if (furn) { scene.remove(furn.group); disposeTree(furn.group); furn = null; }
    [saw, sander, hammer, brush, ring, tring, markLine, flag, guide].forEach(o => { o.visible = false; });
    meter.visible = false;
  }

  function beginTurn() {
    clearWork();
    arrangeFoxes();
    stageIdx = 0; stageScores = []; hits = []; sandAcc = 100;
    phase = 'ready'; phaseT = 0; holding = false;
    plankL = -PLANK_LEN / 2;
    setPlank(PLANK_LEN, 0);
    const s = seat();
    if (mode === 'demo') msg = `DEMO: ${s.name} builds a ${order().name.toLowerCase()}. Open MENU to play.`;
    else if (s.cpu) msg = `${s.name} steps up to build the ${order().name.toLowerCase()}.`;
    else if (mode === 'local') msg = `${s.name}, your turn. Tap START to build the ${order().name.toLowerCase()}.`;
    else msg = `Your order: a ${order().name.toLowerCase()} in ${order().stainName.toLowerCase()}. Tap START.`;
    if (!s.cpu) flash(activeFox(), 'wave', 1.2);
    lastInput = performance.now();
    audio.sfx.turn();
    dirty();
  }

  function setPlank(len, roughK) {
    if (plank) { scene.remove(plank); disposeTree(plank); }
    plank = box(len, 0.14, 0.8, newToon(R.mixHex('#ecc890', '#a88a62', roughK)), { ink: 0.025 });
    plank.position.set(plankL + len / 2, BT + 0.07, PLANK_Z);
    plank.userData.len = len;
    plank.castShadow = !touch && !W;
    scene.add(plank);
  }

  function beginWork() {
    phase = 'work';
    enterStage(0);
  }

  function stageMsg() {
    const st = stage(), s = seat();
    if (mode === 'demo') return st.teach;
    if (s.cpu) return `${s.name} is on the ${st.label.toLowerCase()} stage. Watch the timing.`;
    return st.tip;
  }

  function enterStage(i) {
    stageIdx = i; sub = 'intro'; subT = 0; hits = []; holding = false; holdV = 0; inZone = false;
    const id = stage().id;
    const F = activeFox();
    msg = stageMsg();
    meter.visible = false; zone.visible = false; fill.visible = false; stainBar.visible = false; tmark.visible = false; needle.visible = false;
    if (id === 'cut') {
      cutIdx = 0; setupCut(); F.act = 'reach';
    } else if (id === 'sand') {
      const from = plank.position.x;
      tween(0.55, k => { plank.position.x = from + (0 - from) * ease(k); });
      plankL = -plank.userData.len / 2;
      splinters = [];
      for (let k = 0; k < 7; k++) {
        const sp = box(0.18, 0.05, 0.03, '#9a7a52', { ink: 0 });
        sp.position.set((Math.random() - 0.5) * (plank.userData.len - 0.4), 0.08, (Math.random() - 0.5) * 0.6);
        sp.rotation.y = Math.random() * 3; plank.add(sp); splinters.push(sp);
      }
      plank.material.color.set('#a88a62');
      sander.visible = true; sander.position.set(0, BT + 0.14 + 0.09, PLANK_Z);
      meter.visible = true; zone.visible = true; fill.visible = true; tmark.visible = true;
      const Z = R.WINDOWS.sand;
      zone.scale.x = (Z.tol * 2 + 0.04) * MW; zone.position.x = -MW / 2 + Z.target * MW;
      tmark.position.x = -MW / 2 + Z.target * MW;
      fill.scale.x = 0.001;
      F.act = 'reach';
    } else if (id === 'join') {
      buildFurn();
      F.act = 'hammerUp';
    } else if (id === 'stain') {
      brush.visible = true;
      meter.visible = true; stainBar.visible = true; tmark.visible = true; needle.visible = true;
      tmark.position.x = -MW / 2 + order().stainT * MW;
      needle.position.x = -MW / 2;
      bristleMat.color.set(R.stainHex(0));
      F.act = 'reach';
    }
    cpu.wait = (R.LEVELS[seat().level] || R.LEVELS.hope).think * (0.6 + Math.random() * 0.8);
    dirty();
  }

  function goActive() {
    sub = 'active'; subT = 0;
    const id = stage().id, s = seat();
    if (s.cpu) {
      if (id === 'cut') cpu.aim = Math.max(sawMin, Math.min(sawMax, R.cpuAim(s.level, 'cut', markX)));
      if (id === 'sand') cpu.aim = Math.max(0.25, R.cpuAim(s.level, 'sand', R.WINDOWS.sand.target));
      if (id === 'join') cpu.aim = R.cpuAim(s.level, 'join', R.WINDOWS.join.target);
      if (id === 'stain') cpu.aim = Math.max(0.05, R.cpuAim(s.level, 'stain', order().stainT));
    }
    dirty();
  }

  /* CUT */
  function setupCut() {
    const len = order().cuts[cutIdx];
    markX = plankL + len;
    const right = plankL + plank.userData.len;
    sawMin = Math.max(plankL + 0.15, markX - 1.05);
    sawMax = Math.min(right - 0.1, markX + 1.05);
    sawX = Math.random() < 0.5 ? sawMin : sawMax; sawDir = sawX === sawMin ? 1 : -1;
    lastSawX = sawX;
    sawSpeed = 1.45 + 0.28 * cutIdx + 0.12 * match.round;
    saw.visible = true; saw.position.set(sawX, BT + 0.14 + 0.29, PLANK_Z);
    markLine.visible = true; markLine.position.set(markX, BT + 0.146, PLANK_Z);
    flag.visible = true; flag.position.set(markX, BT + 0.55, PLANK_Z - 0.48);
    guide.visible = true; guide.position.set(sawX, BT + 0.147, PLANK_Z);
    sub = 'intro'; subT = 0;
  }
  function doCut() {
    const x = sawX;
    const acc = R.accuracy(x - markX, R.WINDOWS.cut);
    registerHit(acc);
    audio.sfx.saw();
    flash(activeFox(), 'saw', 0.45);
    burst(new V3(x, BT + 0.16, PLANK_Z + 0.3), 14, '#f0d39a', 1.1);
    const y0 = saw.position.y;
    tween(0.12, k => { saw.position.y = y0 - 0.14 * Math.sin(k * Math.PI); });
    markLine.visible = false; flag.visible = false;
    /* split the plank */
    const cutLen = Math.max(0.1, x - plankL);
    const restLen = plank.userData.len - cutLen;
    const oc = box(cutLen, 0.14, 0.8, newToon('#ecc890'), { ink: 0.025 });
    oc.position.set(plankL + cutLen / 2, BT + 0.07, PLANK_Z);
    scene.add(oc); offcuts.push(oc);
    const idx = offcuts.length - 1;
    const p0 = oc.position.clone(), p1 = new V3(-2.2, BT + 0.07 + idx * 0.15, -0.72);
    const r1 = (Math.random() - 0.5) * 0.3;
    tween(0.5, k => { const e = ease(k); oc.position.lerpVectors(p0, p1, e); oc.position.y += Math.sin(k * Math.PI) * 0.5; oc.rotation.y = r1 * e; }, null, 0.15);
    plankL = x;
    setPlank(restLen, 0);
    sub = 'resolve'; subT = 0;
  }

  /* SAND / STAIN: hold */
  function pressHold() {
    if (holding) return;
    holding = true; inZone = false;
    audio.holdStart(stage().id === 'sand' ? 'sand' : 'stain');
    activeFox().act = stage().id;
    dirty();
  }
  function releaseHold() {
    if (!holding) return;
    holding = false;
    audio.holdStop();
    const id = stage().id;
    let acc;
    if (id === 'sand') { acc = R.accuracy(holdV - R.WINDOWS.sand.target, R.WINDOWS.sand); sandAcc = acc; }
    else acc = R.accuracy(holdV - order().stainT, R.WINDOWS.stain);
    registerHit(acc);
    activeFox().act = 'reach';
    if (id === 'sand') audio.sfx.puff(); else audio.sfx.swoosh();
    sub = 'resolve'; subT = 0;
    dirty();
  }

  /* JOIN */
  function buildFurn() {
    const g = new THREE.Group(); g.position.set(0, 0, 0.05);
    const mat = newToon(R.mixHex('#ecc890', '#8a7a6a', (1 - sandAcc / 100) * 0.4));
    const parts = [], pegs = [];
    const P = (geo, x, y, z, rx = 0, rz = 0) => {
      const m = mesh(geo, mat, { x, y, z, ink: 0.025 }); m.rotation.x = rx; m.rotation.z = rz;
      m.castShadow = !touch && !W; g.add(m); parts.push({ m, home: m.position.clone(), rot: m.rotation.clone() });
    };
    const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    const id = order().id;
    if (id === 'stool') {
      P(new THREE.CylinderGeometry(0.72, 0.72, 0.14, 20), 0, BT + 1.0, 0);
      [0, 1, 2].forEach(k => { const a = Math.PI / 2 + k * 2.094; P(new THREE.CylinderGeometry(0.075, 0.09, 1.0, 8), Math.cos(a) * 0.48, BT + 0.5, Math.sin(a) * 0.48); pegs.push(new V3(Math.cos(a) * 0.48, BT + 1.07, Math.sin(a) * 0.48)); });
    } else if (id === 'table') {
      P(B(2.6, 0.14, 1.5), 0, BT + 1.0, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { P(B(0.14, 0.94, 0.14), sx * 1.1, BT + 0.47, sz * 0.58); pegs.push(new V3(sx * 1.1, BT + 1.07, sz * 0.58)); }
    } else if (id === 'shelf') {
      for (const sx of [-1, 1]) P(B(0.12, 1.6, 0.6), sx * 0.9, BT + 0.8, 0);
      [0.12, 0.8, 1.55].forEach(y => P(B(1.68, 0.1, 0.56), 0, BT + y, 0));
      pegs.push(new V3(-0.9, BT + 1.6, 0), new V3(0, BT + 1.6, 0), new V3(0.9, BT + 1.6, 0));
    } else if (id === 'chair') {
      P(B(1.2, 0.12, 1.1), 0, BT + 0.8, 0.05);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) P(B(0.12, 0.8, 0.12), sx * 0.52, BT + 0.4, 0.05 + sz * 0.46);
      for (const sx of [-1, 1]) P(B(0.12, 1.1, 0.12), sx * 0.52, BT + 1.41, -0.41);
      P(B(1.16, 0.34, 0.08), 0, BT + 1.7, -0.41);
      pegs.push(new V3(-0.52, BT + 0.86, 0.51), new V3(0.52, BT + 0.86, 0.51), new V3(-0.52, BT + 1.96, -0.41), new V3(0.52, BT + 1.96, -0.41));
    } else {
      P(B(2.8, 0.14, 0.8), 0, BT + 0.78, 0);
      for (const sx of [-1, 1]) P(B(0.14, 0.72, 0.7), sx * 1.15, BT + 0.36, 0);
      P(B(2.3, 0.12, 0.12), 0, BT + 0.25, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) pegs.push(new V3(sx * 1.15, BT + 0.85, sz * 0.22));
    }
    scene.add(g);
    /* fly parts in from the offcut pile and the sanded board */
    const srcs = [plank.position.clone(), ...offcuts.map(o => o.position.clone())];
    parts.forEach((p, i) => {
      const s = srcs[i % srcs.length].clone().sub(g.position);
      p.m.position.copy(s); p.m.scale.setScalar(0.4);
      tween(0.55, k => { const e = ease(k); p.m.position.lerpVectors(s, p.home, e); p.m.position.y += Math.sin(k * Math.PI) * 0.8; p.m.scale.setScalar(0.4 + 0.6 * back(k)); }, () => audio.sfx.knock(false), 0.08 * i);
    });
    tween(0.3, k => { const s = 1 - k; [plank, ...offcuts].forEach(o => o.scale.setScalar(Math.max(0.001, s))); }, () => {
      [plank, ...offcuts].forEach(o => { o.visible = false; });
    });
    const pegGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.36, 10);
    const pegMat = toon('#e9b878');
    const pegObjs = pegs.map(p => {
      const m = mesh(pegGeo, pegMat, { ink: 0.02 });
      m.position.copy(p).sub(g.position); m.position.y += 0.12;
      m.scale.setScalar(0.001); g.add(m);
      return { m, surf: p.clone(), base: m.position.y };
    });
    furn = { group: g, mat, parts, pegs: pegObjs, top: Math.max(...pegs.map(p => p.y)) };
    pegIdx = 0;
    subT = 0; sub = 'intro';
    furn.introLen = 0.6 + 0.08 * parts.length;
  }
  function setupPeg() {
    const p = furn.pegs[pegIdx];
    p.m.scale.setScalar(1);
    ringR = 0.9; ringSpeed = 0.72 + 0.08 * pegIdx + 0.08 * match.round; ringTick = 0;
    const wp = p.surf.clone().add(new V3(0, 0.31, 0));
    ring.position.copy(wp); tring.position.copy(wp);
    ring.visible = true; tring.visible = true;
    hammer.visible = true; hammer.position.set(wp.x, wp.y + 0.62, wp.z);
    hammer.rotation.set(0, 0, 0);
    setRing(ringR);
  }
  function setRing(r) {
    ring.geometry.dispose();
    ring.geometry = new THREE.TorusGeometry(Math.max(0.02, r), 0.035, 6, 36);
  }
  function doPeg(r) {
    const p = furn.pegs[pegIdx];
    const acc = r <= 0 ? 0 : R.accuracy(r - R.WINDOWS.join.target, R.WINDOWS.join);
    ring.visible = false; tring.visible = false;
    flash(activeFox(), 'hammer', 0.3);
    const top = p.surf.y + 0.3;
    const hy0 = hammer.position.y;
    tween(0.08, k => { hammer.position.y = hy0 + (top + 0.21 - hy0) * k; }, () => {
      audio.sfx.knock(acc >= 90);
      burst(new V3(p.surf.x, top, p.surf.z + 0.05), 6, '#e9b878', 0.8, 0.7);
      const y0 = p.m.position.y;
      tween(0.1, k => { p.m.position.y = y0 - 0.28 * (acc / 100) * k; });
      if (acc < 40) { p.m.rotation.z = (Math.random() < 0.5 ? -1 : 1) * 0.45; p.m.rotation.x = 0.2; }
      tween(0.25, k => { hammer.position.y = top + 0.21 + (hy0 - top - 0.21) * k; });
    });
    registerHit(acc);
    sub = 'resolve'; subT = 0;
  }

  function registerHit(acc) {
    hits.push(acc);
    const g = R.grade(acc);
    toast = { text: g, pts: acc, id: ++toastId }; toastT = 1.3;
    audio.sfx.grade(g);
    if (acc >= 90) flash(activeFox(), stage().id === 'join' ? 'hammer' : 'cheer', 0.5);
    dirty();
  }

  function finishStage() {
    const sc = hits.length ? Math.round(hits.reduce((a, b) => a + b, 0) / hits.length) : 0;
    stageScores[stageIdx] = sc;
    [saw, sander, hammer, brush, ring, tring, markLine, flag, guide].forEach(o => { o.visible = false; });
    meter.visible = false;
    if (stageIdx < R.STAGES.length - 1) enterStage(stageIdx + 1);
    else finishPiece();
  }

  function finishPiece() {
    const total = R.recordPiece(match, stageScores);
    phase = 'piece'; phaseT = 0;
    toast = { text: 'PIECE', pts: total, id: ++toastId, big: true }; toastT = 2.2;
    const F = activeFox();
    F.act = total >= 280 ? 'cheer' : total < 160 ? 'slump' : null;
    audio.sfx.piece();
    msg = total >= 340 ? 'A masterpiece. The customer is thrilled.' : total >= 260 ? 'Fine work. The customer pays in full.' : total >= 160 ? 'It stands up. The customer shrugs and pays.' : 'Wobbly. The customer asks for a discount.';
    const g = furn.group;
    tween(1.2, k => { g.rotation.y = ease(k) * Math.PI * 2; });
    dirty();
  }

  function shelvePiece() {
    if (display) { scene.remove(display.group); disposeTree(display.group); }
    const g = furn.group; furn = null;
    const p0 = g.position.clone(), p1 = new V3(4.9, 0.3 - BT * 0.75, 1.0);
    tween(0.6, k => { const e = ease(k); g.position.lerpVectors(p0, p1, e); g.position.y += Math.sin(k * Math.PI) * 0.6; g.scale.setScalar(1 - 0.25 * e); });
    display = { group: g };
  }

  function endMatch() {
    phase = 'results'; phaseT = 0;
    const rows = R.standings(match);
    const topScore = rows[0].total;
    const tied = rows.filter(r => r.total === topScore).length > 1;
    const winnerSeat = match.seats[rows[0].i];
    let you = null;
    if (mode === 'cpu') you = match.seats[0];
    else if (mode === 'local') you = winnerSeat;
    const won = mode === 'cpu' ? (!tied && winnerSeat === you) : (mode === 'local' && !tied);
    const youAvg = you ? you.total / Math.max(1, you.pieces.length) : 0;
    const st = you ? R.stars(youAvg) : 0;
    const rw = mode === 'demo' ? { gold: 0, xp: 0 } : R.rewards(won, st);
    const bestPiece = you ? Math.max(0, ...you.pieces.map(p => p.total)) : 0;
    let best = statGet('best', 0), newBest = false;
    if (mode !== 'demo' && bestPiece > best) { best = bestPiece; statSet('best', best); newBest = true; }
    if (rw.gold) addGold(rw.gold);
    if (rw.xp) statSet('xp', statGet('xp', 0) + rw.xp);
    if (won) statSet('wins', statGet('wins', 0) + 1);
    const title = tied ? 'DRAW' : mode === 'cpu' ? (won ? 'YOU WIN' : `${winnerSeat.name} WINS`) : `${winnerSeat.name} WINS`;
    result = {
      title, won, tied,
      rows: rows.map(r => ({ name: r.name, total: r.total, place: r.place, hex: (LOOKS[match.seats[r.i].look] || LOOKS.p1).chip })),
      score: you ? you.total : topScore, bestPiece, best, newBest,
      gold: rw.gold, xp: rw.xp, stars: st, demo: mode === 'demo',
    };
    match.seats.forEach((s, i) => { foxes[i].act = (s === winnerSeat && !tied) ? 'cheer' : 'slump'; });
    msg = mode === 'demo' ? 'Demo over. A new demo starts soon. Open MENU to play.' : title + '.';
    if (won || mode === 'demo') audio.sfx.win(); else audio.sfx.lose();
    demoT = 0;
    dirty();
  }

  /* ---------- save ---------- */
  function statGet(k, d) {
    try { if (save && save.stat) return save.stat('woodshop.' + k, d); const v = localStorage.getItem('woodshop.' + k); return v == null ? d : JSON.parse(v); }
    catch (e) { return d; }
  }
  function statSet(k, v) {
    try { if (save && save.setStat) return save.setStat('woodshop.' + k, v); localStorage.setItem('woodshop.' + k, JSON.stringify(v)); }
    catch (e) { /* storage blocked */ }
  }
  function addGold(n) {
    try { if (save && save.addGold) return save.addGold(n); statSet('gold', statGet('gold', 0) + n); }
    catch (e) { /* ignore */ }
  }

  /* ---------- input ---------- */
  function down() {
    if (closed) return;
    audio.unlock();
    lastInput = performance.now();
    if (paused || !match) return;
    if (phase === 'ready' && human() && phaseT > 0.25) { beginWork(); return; }
    if (phase !== 'work' || !human() || sub !== 'active') return;
    const id = stage().id;
    if (id === 'cut') doCut();
    else if (id === 'join') doPeg(ringR);
    else pressHold();
    dirty();
  }
  function up() {
    if (holding && human() && !paused) releaseHold();
  }
  function key(e) {
    const k = e.code || e.key;
    if (!(k === 'Space' || k === ' ' || k === 'Enter')) return;
    if (e.preventDefault) e.preventDefault();
    if (e.type === 'keyup') { up(); return; }
    if (e.repeat) return;
    if (holding) up(); else down();
  }

  let activePointer = null;
  const onPointerDown = (e) => {
    if (W) {
      if (e.target !== W.renderer.domElement) return;
      e.preventDefault(); e.stopImmediatePropagation();
    } else {
      try { container.focus({ preventScroll: true }); } catch (err) { /* old browsers */ }
    }
    activePointer = e.pointerId;
    down();
  };
  const onPointerUp = (e) => { if (activePointer === null || e.pointerId === activePointer) { activePointer = null; up(); } };
  const onKey = (e) => key(e);
  if (W) {
    window.addEventListener('pointerdown', onPointerDown, true);
  } else {
    domEl.addEventListener('pointerdown', onPointerDown);
    if (!container.hasAttribute('tabindex')) container.tabIndex = 0;
    container.addEventListener('keydown', onKey);
    container.addEventListener('keyup', onKey);
  }
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  /* ---------- camera fit ---------- */
  function framePoints() {
    const P = [];
    for (const sx of [-1, 1]) {
      P.push(new V3(sx * 3.0, BT, 1.2), new V3(sx * 3.0, BT, -1.2), new V3(sx * 2.4, 0.55, 1.35));
    }
    P.push(new V3(0, 3.05, -1.95), new V3(0, BT + 1.9, 0));
    return P;
  }
  function readSize() {
    if (W) { const el = W.renderer.domElement; return [el.clientWidth || window.innerWidth, el.clientHeight || window.innerHeight]; }
    return [container.clientWidth || 1, container.clientHeight || 1];
  }
  const _p = new V3();
  function placeCam(pos, tgt) { camera.position.copy(pos); camera.lookAt(tgt); camera.updateMatrixWorld(); }
  function bboxNDC(points) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of points) { _p.copy(p).project(camera); x0 = Math.min(x0, _p.x); x1 = Math.max(x1, _p.x); y0 = Math.min(y0, _p.y); y1 = Math.max(y1, _p.y); }
    return { x0, x1, y0, y1 };
  }
  function fitCam() {
    [vw, vh] = readSize();
    const aspect = vw / Math.max(1, vh);
    const portrait = aspect < 0.85;
    camera.fov = W ? (W.camera.fov || 50) : (portrait ? 52 : 40);
    camera.aspect = aspect; camera.updateProjectionMatrix();
    const elev = portrait ? 0.86 : 0.62;
    const dir = new V3(0, Math.sin(elev), Math.cos(elev));
    const pts = framePoints();
    const S = safe;
    let fx0 = -1 + 2 * S.left / vw, fx1 = 1 - 2 * S.right / vw;
    let fy0 = -1 + 2 * S.bottom / vh, fy1 = 1 - 2 * S.top / vh;
    if (fx1 - fx0 < 0.3) { fx0 = -1; fx1 = 1; }
    if (fy1 - fy0 < 0.3) { fy0 = -1; fy1 = 1; }
    const fw = (fx1 - fx0) * 0.94, fh = (fy1 - fy0) * 0.92;
    const cx = (fx0 + fx1) / 2, cy = (fy0 + fy1) / 2;
    const tgt = new V3(0, BT + 0.35, -0.1);
    let lo = 2, hi = 120;
    for (let i = 0; i < 26; i++) {
      const d = (lo + hi) / 2;
      placeCam(tgt.clone().addScaledVector(dir, d), tgt);
      const b = bboxNDC(pts);
      if (b.x1 - b.x0 <= fw && b.y1 - b.y0 <= fh) hi = d; else lo = d;
    }
    const d = hi;
    const pos = tgt.clone().addScaledVector(dir, d);
    const right = new V3(), upv = new V3();
    for (let it = 0; it < 4; it++) {
      placeCam(pos, tgt);
      const b = bboxNDC(pts);
      const dx = cx - (b.x0 + b.x1) / 2, dy = cy - (b.y0 + b.y1) / 2;
      const half = d * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      upv.setFromMatrixColumn(camera.matrixWorld, 1);
      const shift = right.multiplyScalar(-dx * half * aspect).add(upv.multiplyScalar(-dy * half));
      pos.add(shift); tgt.add(shift);
    }
    camGoal.pos.copy(pos); camGoal.tgt.copy(tgt);
  }
  function snapCam() {
    camCur.pos.copy(camGoal.pos); camCur.tgt.copy(camGoal.tgt);
    aimCam();
  }
  const _q2 = new THREE.Quaternion();
  function aimCam() {
    camera.position.copy(camCur.pos); camera.lookAt(camCur.tgt);
    camera.updateMatrixWorld();
    if (W) {
      scene.updateWorldMatrix(true, false);
      wcam.position.copy(camera.position); scene.localToWorld(wcam.position);
      scene.getWorldQuaternion(_q2); wcam.quaternion.copy(_q2).multiply(camera.quaternion);
      wcam.fov = camera.fov; wcam.aspect = camera.aspect; wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
    }
  }

  let ro = null;
  if (!W && window.ResizeObserver) {
    ro = new ResizeObserver(() => {
      const [w, h] = readSize();
      renderer.setSize(w, h, false);
      fitCam();
    });
    ro.observe(container);
  }
  if (!W) { const [w, h] = readSize(); renderer.setSize(w, h, false); }

  /* ---------- update ---------- */
  function update(dt) {
    updateTweens(dt);
    updateParticles(dt);
    foxes.forEach(F => { if (F.flashT > 0) { F.flashT -= dt; F.ft += dt; } animFox(F, dt); });
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) { toast = null; dirty(); } }
    if (!match || closed) return;
    phaseT += dt;
    const s = seat();

    if (phase === 'ready') {
      if (s.cpu && phaseT > 1.4) beginWork();
      return;
    }
    if (phase === 'piece') {
      if (phaseT > 2.3 && furn) shelvePiece();
      if (phaseT > 3.0) { if (R.advance(match)) endMatch(); else beginTurn(); }
      return;
    }
    if (phase === 'results') {
      if (mode === 'demo') { demoT += dt; if (demoT > 6) start('demo'); }
      return;
    }
    if (phase !== 'work') return;

    subT += dt;
    const id = stage().id;
    if (sub === 'intro') {
      const need = id === 'join' ? (pegIdx === 0 ? furn.introLen : 0.2) : id === 'cut' ? (cutIdx ? 0.15 : 0.45) : 0.6;
      if (subT >= need) { if (id === 'join') setupPeg(); goActive(); }
      return;
    }
    if (sub === 'resolve') {
      const need = id === 'cut' ? 0.55 : id === 'join' ? 0.5 : 0.8;
      if (subT >= need) {
        if (id === 'cut') { cutIdx++; if (cutIdx < order().cuts.length) setupCut(); else finishStage(); }
        else if (id === 'join') { pegIdx++; if (pegIdx < furn.pegs.length) { sub = 'intro'; subT = 0; } else finishStage(); }
        else finishStage();
      }
      return;
    }
    /* active */
    if (s.cpu && cpu.wait > 0) cpu.wait -= dt;
    if (id === 'cut') {
      lastSawX = sawX;
      sawX += sawDir * sawSpeed * dt;
      if (sawX > sawMax) { sawX = sawMax; sawDir = -1; }
      if (sawX < sawMin) { sawX = sawMin; sawDir = 1; }
      saw.position.x = sawX; guide.position.x = sawX;
      const dist = Math.abs(sawX - markX);
      beepT -= dt;
      if (beepT <= 0) { audio.sfx.beep(Math.max(0, 1 - dist)); beepT = 0.05 + dist * 0.35; }
      if (s.cpu && cpu.wait <= 0) {
        const a = Math.min(lastSawX, sawX) - 1e-4, b = Math.max(lastSawX, sawX) + 1e-4;
        if (cpu.aim >= a && cpu.aim <= b) { sawX = cpu.aim; doCut(); }
      }
    } else if (id === 'join') {
      ringR -= ringSpeed * dt;
      ringTick -= dt;
      if (ringTick <= 0) { audio.sfx.ring(Math.max(0, ringR)); ringTick = 0.09; }
      setRing(ringR);
      const hit = R.WINDOWS.join.target;
      ringMat.color.set(Math.abs(ringR - hit) < R.WINDOWS.join.tol + 0.02 ? '#3fbf5a' : '#ffd23a');
      if (s.cpu && ringR <= cpu.aim && cpu.aim > 0.01) doPeg(ringR);
      else if (ringR <= 0) doPeg(0);
    } else {
      /* sand / stain hold stages */
      if (s.cpu && !holding && cpu.wait <= 0) pressHold();
      if (holding) {
        const sp = 1 + 0.08 * match.round;
        if (id === 'sand') holdV += (0.16 + 0.25 * holdV + 0.75 * holdV * holdV) * dt * sp;
        else holdV += 0.34 * dt * sp;
        holdV = Math.min(1, holdV);
        audio.holdLevel(holdV);
        const tgt = id === 'sand' ? R.WINDOWS.sand.target : order().stainT;
        const w = id === 'sand' ? R.WINDOWS.sand.tol : R.WINDOWS.stain.tol;
        const nowIn = Math.abs(holdV - tgt) <= w;
        if (nowIn && !inZone) audio.sfx.zone();
        inZone = nowIn;
        if (id === 'sand') {
          fill.scale.x = Math.max(0.001, holdV * MW);
          sander.position.x = Math.sin(subT * 9) * Math.min(1.0, plank.userData.len / 2 - 0.35);
          plank.material.color.set(R.mixHex('#a88a62', '#f2d19c', Math.min(1, holdV / 0.84)));
          splinters.forEach((sp2, i) => { sp2.visible = holdV < 0.15 + i * 0.09; });
          plank.scale.y = holdV > 0.9 ? Math.max(0.45, 1 - (holdV - 0.9) * 5) : 1;
          if (Math.random() < 0.5) burst(new V3(sander.position.x, BT + 0.16, PLANK_Z + 0.2), 1, '#f0d39a', 0.6, 0.7);
        } else {
          const hex = R.stainHex(holdV);
          needle.position.x = -MW / 2 + holdV * MW;
          bristleMat.color.set(hex);
          furn.mat.color.set(R.mixHex(hex, '#8a7a6a', (1 - sandAcc / 100) * 0.35));
          const a = subT * 2.2;
          brush.position.set(Math.sin(a) * 0.9, furn.top + 0.1 + Math.abs(Math.sin(a * 2)) * 0.1, 0.05 + Math.cos(a) * 0.3);
        }
        if (s.cpu && holdV >= cpu.aim) releaseHold();
        else if (holdV >= 1) releaseHold();
      } else if (id === 'stain' && furn) {
        brush.position.set(0, furn.top + 0.35, 0.3);
      }
    }
  }

  function hintOn() {
    if (!match || paused || closed || !human()) return false;
    const idle = performance.now() - lastInput > 3000;
    if (phase === 'ready') return idle;
    return phase === 'work' && sub === 'active' && !holding && idle;
  }

  function hud() {
    if (!match) return { key: GAME.key, phase: 'loading' };
    const s = seat(), o = order();
    const st = phase === 'work' ? stage() : null;
    const isHuman = !s.cpu;
    let actionLabel = 'WAIT', actionOn = false;
    if (closed) { actionLabel = 'CLOSED'; }
    else if (phase === 'ready') { actionLabel = isHuman ? 'START' : `WATCH ${s.name}`; actionOn = isHuman; }
    else if (phase === 'work') {
      if (!isHuman) actionLabel = `WATCH ${s.name}`;
      else if (sub === 'active') { actionLabel = holding ? 'LET GO ON THE MARK' : st.verb; actionOn = true; }
      else actionLabel = st.verb;
    } else if (phase === 'piece') actionLabel = 'PIECE DONE';
    else if (phase === 'results') actionLabel = 'MATCH OVER';
    return {
      key: GAME.key,
      phase: closed ? 'closed' : phase,
      paused, mode, level: cfg.level, players: cfg.players, rounds: match.rounds,
      round: match.round + 1,
      seats: match.seats.map((x, i) => ({ name: x.name, total: x.total, cpu: !!x.cpu, active: x === s && phase !== 'results',
        hex: (LOOKS[x.look] || LOOKS.p1).chip, rank: x.cpu ? (R.LEVELS[x.level] || {}).rank || '' : '' })),
      turnName: s.name, turnCpu: !!s.cpu,
      order: { name: o.name, stain: o.stainName, stainHex: o.stainHex },
      stageIdx: phase === 'work' ? stageIdx : phase === 'ready' ? -1 : 4,
      stages: R.STAGES.map((x, i) => ({ label: x.label, score: stageScores[i] ?? null,
        state: phase === 'work' && i === stageIdx ? 'active' : stageScores[i] != null ? 'done' : 'todo' })),
      stageLabel: st ? st.label : phase === 'ready' ? 'READY' : phase === 'piece' ? 'DONE' : 'RESULTS',
      holdStage: !!(st && st.hold), holding,
      actionLabel, actionOn,
      msg, toast, hint: hintOn(),
      sound: audio.sound, music: audio.music,
      result: phase === 'results' ? result : null,
      gold: statGet('gold', 0), best: statGet('best', 0),
    };
  }
  function emit() { dirtyFlag = false; lastEmit = performance.now(); try { onState(hud()); } catch (e) { console.error(e); } }

  /* ---------- loop ---------- */
  let raf = 0, last = performance.now(), wasHint = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (W) {
      const [w, h] = readSize();
      if (w !== vw || h !== vh) fitCam();
    }
    if (!paused) update(dt); else updateTweens(0);
    const k = 1 - Math.exp(-5 * dt);
    camCur.pos.lerp(camGoal.pos, k); camCur.tgt.lerp(camGoal.tgt, k);
    if (W) { const [w, h] = readSize(); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); }
    aimCam();
    if (!W) renderer.render(root, camera);
    const h = hintOn();
    if (h !== wasHint) { wasHint = h; dirty(); }
    if (dirtyFlag || now - lastEmit > 100) emit();
  }

  function disposeTree(o) {
    o.traverse(m => {
      if (m.isMesh) {
        if (m.geometry && !m.userData.ink) m.geometry.dispose();
        if (m.material && ![...matCache.values()].includes(m.material) && m.material !== INK) m.material.dispose();
      }
    });
  }

  start('cpu');
  fitCam(); snapCam();
  raf = requestAnimationFrame(frame);

  const api = {
    hud,
    setSafe(s) { safe = { top: +s.top || 0, bottom: +s.bottom || 0, left: +s.left || 0, right: +s.right || 0 }; fitCam(); },
    start(m, c) { start(m, c); },
    restart() { start(mode, cfg); },
    key,
    get camera() { return W ? wcam : camera; },
    snapCam() { fitCam(); snapCam(); },
    down, up,
    act() { down(); up(); },
    pause(b = true) { paused = !!b; if (paused && holding) { holding = false; audio.holdStop(); } dirty(); },
    setSound(b) { audio.setSound(b); dirty(); },
    setMusic(b) { audio.unlock(); audio.setMusic(b); dirty(); },
    leave() { closed = true; audio.holdStop(); clearWork(); dirty(); },
    destroy() {
      cancelAnimationFrame(raf);
      if (W) window.removeEventListener('pointerdown', onPointerDown, true);
      else {
        domEl.removeEventListener('pointerdown', onPointerDown);
        container.removeEventListener('keydown', onKey);
        container.removeEventListener('keyup', onKey);
      }
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      if (ro) ro.disconnect();
      audio.close();
      clearFoxes();
      if (W) { W.parent.remove(scene); disposeTree(scene); }
      else { disposeTree(root); renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); }
      matCache.forEach(m => m.dispose()); INK.dispose(); grad.dispose(); stainTex.dispose();
    },
  };
  return api;
}

export default createWoodshop;
