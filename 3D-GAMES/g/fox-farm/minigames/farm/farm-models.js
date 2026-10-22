/* FOX FARM: toon materials, instanced crop parts, fox adapter, crows, the room (standalone only). */
import * as THREE from '../../vendor/three/three.module.js';

export const INK = 0x1a1626;
let GRAD = null;
export function gradientMap() {
  if (GRAD) return GRAD;
  const d = new Uint8Array([90, 170, 255]);
  GRAD = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.generateMipmaps = false; GRAD.needsUpdate = true;
  return GRAD;
}
export function toon(color, extra = {}) { return new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), ...extra }); }
const INK_MAT = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });

/* back-face shell: push every vertex along its normal */
export function shellGeo(geo, t = 0.04) {
  const g = geo.clone();
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * t, p.getY(i) + n.getY(i) * t, p.getZ(i) + n.getZ(i) * t);
  p.needsUpdate = true;
  return g;
}
export function withInk(mesh, t = 0.04) {
  const o = new THREE.Mesh(shellGeo(mesh.geometry, t), INK_MAT);
  o.raycast = () => {};
  mesh.add(o);
  return mesh;
}

/* merge geometries (position + normal + optional color) into one non-indexed geometry */
export function merge(list) {
  const parts = list.map(({ geo, color }) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (color !== undefined) {
      const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    }
    return g;
  });
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    if (!parts.every(g => g.attributes[name])) continue;
    const total = parts.reduce((s, g) => s + g.attributes[name].array.length, 0);
    const arr = new Float32Array(total); let o = 0;
    for (const g of parts) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  return out;
}
const T = (g, x = 0, y = 0, z = 0) => g.translate(x, y, z);

/* ---------------- instanced batches ---------------- */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
export class Batch {
  constructor(parent, geo, { max = 64, ink = 0.035, side, basic = false, opacity } = {}) {
    const mat = basic ? new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: opacity !== undefined, opacity: opacity ?? 1 })
      : toon(0xffffff, side ? { side } : {});
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, _c.set(0xffffff));
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.mesh.raycast = () => {};
    parent.add(this.mesh);
    if (ink) {
      this.ink = new THREE.InstancedMesh(shellGeo(geo, ink), INK_MAT, max);
      this.ink.instanceMatrix = this.mesh.instanceMatrix;
      this.ink.frustumCulled = false; this.ink.count = 0; this.ink.raycast = () => {};
      parent.add(this.ink);
    }
    this.max = max; this.n = 0;
  }
  begin() { this.n = 0; }
  add(x, y, z, { rx = 0, ry = 0, rz = 0, s = 1, sx, sy, sz, color = 0xffffff } = {}) {
    if (this.n >= this.max) return;
    _p.set(x, y, z); _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')); _s.set(sx ?? s, sy ?? s, sz ?? s);
    _m.compose(_p, _q, _s);
    this.mesh.setMatrixAt(this.n, _m);
    this.mesh.setColorAt(this.n, _c.set(color));
    this.n++;
  }
  end() {
    this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    if (this.ink) this.ink.count = this.n;
  }
}

export function cropGeometries() {
  return {
    bed: new THREE.SphereGeometry(0.92, 16, 8).scale(1, 0.26, 1),
    seed: new THREE.SphereGeometry(0.09, 8, 6).scale(1, 0.7, 1.3),
    leaf: T(new THREE.SphereGeometry(0.16, 10, 6).scale(1, 0.25, 2.2), 0, 0, 0.32),
    lettuce: new THREE.SphereGeometry(0.36, 14, 10),
    lettuceLeaf: T(new THREE.SphereGeometry(0.3, 12, 8).scale(1.1, 0.75, 0.55), 0, 0, 0.12),
    frond: T(new THREE.ConeGeometry(0.075, 0.7, 6), 0, 0.35, 0),
    carrotTop: T(new THREE.CylinderGeometry(0.18, 0.15, 0.2, 10), 0, 0.06, 0),
    carrot: T(new THREE.ConeGeometry(0.18, 0.8, 10).rotateX(Math.PI), 0, -0.4, 0),
    stalk: T(new THREE.CylinderGeometry(0.07, 0.1, 1, 7), 0, 0.5, 0),
    cornLeaf: T(new THREE.SphereGeometry(0.12, 8, 6).scale(1, 0.22, 6), 0, 0, 0.62),
    cob: new THREE.CapsuleGeometry(0.13, 0.42, 4, 10),
    husk: T(new THREE.SphereGeometry(0.17, 10, 8).scale(1, 2.0, 1), 0, -0.12, 0),
    tassel: T(new THREE.ConeGeometry(0.12, 0.4, 6), 0, 0.2, 0),
    drop: merge([{ geo: new THREE.SphereGeometry(0.16, 12, 8) }, { geo: T(new THREE.ConeGeometry(0.115, 0.26, 12), 0, 0.17, 0) }]),
    star: new THREE.OctahedronGeometry(0.2),
    ring: new THREE.TorusGeometry(1.0, 0.07, 6, 28).rotateX(Math.PI / 2),
    dash: new THREE.BoxGeometry(1, 1, 1),
  };
}

/* ---------------- fox adapter ---------------- */
/* Uses the world's kit when given; otherwise a simple placeholder fox with the same joints. */
export function makeFox(opts = {}, kit = null) {
  const torso = opts.torso || [0xf07a2a, 0xfff3e0, 0x2f6fd8];
  let fox;
  if (kit && kit.makeFox) {
    fox = kit.makeFox({ torso, outfit: opts.outfit || 'vest', mood: opts.mood || 'happy' });
    fox.userData.kit = true;
  } else fox = placeholderFox(torso, opts);
  const P = fox.userData.P;
  /* accessories */
  if (opts.sunglasses && P && P.head) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.08), toon(0x111111));
    g.position.set(0, 0.06, 0.36); P.head.add(g);
  }
  if (opts.cane && P && P.arms) {
    const c = new THREE.Group();
    const stick = new THREE.Mesh(T(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), 0, -0.75, 0), toon(0xffffff));
    const tip = new THREE.Mesh(T(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6), 0, -1.4, 0), toon(0xec3013));
    c.add(withInk(stick, 0.02), tip); c.position.set(0, -0.62, 0.08); c.rotation.x = 0.35;
    P.arms[1].add(c); fox.userData.cane = c;
  }
  if (opts.redEyes && P && P.head) {
    const m = new THREE.MeshBasicMaterial({ color: 0xff2a10 });
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), m); e.position.set(sx * 0.14, 0.1, 0.37); P.head.add(e); }
  }
  if (opts.chair) {
    const ch = new THREE.Group();
    const seat = withInk(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.95), toon(0x2b2d3a)), 0.03);
    seat.position.y = 0.72;
    const back = withInk(new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.16), toon(0x2b2d3a)), 0.03);
    back.position.set(0, 1.25, -0.45);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 6, 20).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xec3013 }));
    ring.position.y = 0.35;
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.55 }));
    glow.position.y = 0.06;
    ch.add(seat, back, ring, glow);
    fox.add(ch); fox.userData.chair = ch;
    if (P && P.legs) P.legs.forEach(l => { l.rotation.x = -1.45; });
    if (P && P.body) fox.userData.sitLift = 0.12;
  }
  /* watering can, shown only while watering */
  if (P && P.arms) {
    const can = new THREE.Group();
    const body = withInk(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.34, 10), toon(0x6bb7ff)), 0.025);
    const spout = new THREE.Mesh(T(new THREE.CylinderGeometry(0.03, 0.05, 0.4, 6), 0, 0.2, 0).rotateX(1.0), toon(0x6bb7ff));
    spout.position.set(0, 0.05, 0.18);
    can.add(body, spout); can.position.set(0, -0.78, 0.12); can.visible = false;
    P.arms[0].add(can); fox.userData.can = can;
  }
  return fox;
}

function placeholderFox(torso, opts) {
  const [c1, c2, c3] = torso;
  const fox = new THREE.Group();
  const furM = toon(c1), bellyM = toon(c2), outfitM = toon(c3), darkM = toon(0x2a1d1a), legM = toon(opts.legColor ?? 0x3a2a24);
  const eyeM = toon(opts.redEyes ? 0xff2a10 : 0x111111);
  const body = new THREE.Group(); body.position.y = 0.95; fox.add(body);
  body.add(withInk(new THREE.Mesh(T(new THREE.CapsuleGeometry(0.42, 0.55, 4, 12), 0, 0.5, 0), furM)));
  const belly = new THREE.Mesh(T(new THREE.SphereGeometry(0.3, 10, 8).scale(1, 1.3, 0.6), 0, 0.45, 0.24), bellyM); body.add(belly);
  const outfit = withInk(new THREE.Mesh(T(new THREE.CylinderGeometry(0.47, 0.5, 0.55, 14, 1, true), 0, 0.42, 0), outfitM), 0.02);
  outfit.material = outfitM.clone(); outfit.material.side = THREE.DoubleSide; body.add(outfit);
  const head = new THREE.Group(); head.position.y = 1.32; body.add(head);
  head.add(withInk(new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), furM)));
  const snout = withInk(new THREE.Mesh(T(new THREE.ConeGeometry(0.2, 0.42, 10).rotateX(Math.PI / 2), 0, -0.08, 0.5), bellyM), 0.025); head.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), darkM); nose.position.set(0, -0.08, 0.72); head.add(nose);
  for (const sx of [-1, 1]) {
    const ear = withInk(new THREE.Mesh(T(new THREE.ConeGeometry(0.16, 0.42, 4), 0, 0.2, 0), furM), 0.025);
    ear.position.set(sx * 0.24, 0.3, -0.02); ear.rotation.z = -sx * 0.3; head.add(ear);
    if (!opts.sunglasses) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeM); eye.position.set(sx * 0.15, 0.08, 0.37); head.add(eye); }
  }
  const arms = [], legs = [];
  for (const sx of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(sx * 0.5, 0.9, 0); body.add(a);
    a.add(withInk(new THREE.Mesh(T(new THREE.CapsuleGeometry(0.11, 0.5, 3, 8), 0, -0.32, 0), furM), 0.025));
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), darkM); paw.position.y = -0.66; a.add(paw);
    arms.push(a);
    const l = new THREE.Group(); l.position.set(sx * 0.2, 0.95, 0); fox.add(l);
    l.add(withInk(new THREE.Mesh(T(new THREE.CapsuleGeometry(0.13, 0.55, 3, 8), 0, -0.45, 0), legM), 0.025));
    const foot = new THREE.Mesh(T(new THREE.SphereGeometry(0.16, 8, 6).scale(1, 0.6, 1.4), 0, -0.88, 0.06), darkM); l.add(foot);
    legs.push(l);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.25, -0.38); body.add(tail);
  tail.add(withInk(new THREE.Mesh(T(new THREE.SphereGeometry(0.22, 10, 8).scale(1, 1, 2.6), 0, 0.15, -0.5), furM)));
  const tip = new THREE.Mesh(T(new THREE.SphereGeometry(0.15, 8, 6).scale(1, 1, 1.4), 0, 0.22, -1.0), bellyM); tail.add(tip);
  tail.rotation.x = 0.5;
  fox.userData.P = { body, head, arms, legs, tail };
  return fox;
}

/* walk / idle / work poses through the shared joints only */
export function poseFox(fox, { t, walking, speed = 1, act = null, actT = 0, kit = null, dt = 0 }) {
  const P = fox.userData.P; if (!P) return;
  const sit = !!fox.userData.chair;
  if (fox.userData.kit && kit && kit.animFox && !act) { kit.animFox(fox, dt, walking ? speed : 0); }
  else if (P.legs && !sit) {
    const sw = walking ? Math.sin(t * 11 * speed) * 0.7 : 0;
    P.legs[0].rotation.x = sw; P.legs[1].rotation.x = -sw;
    if (P.arms) { P.arms[0].rotation.x = -sw * 0.8; P.arms[1].rotation.x = sw * 0.8; }
  }
  if (P.body) {
    P.body.rotation.x = 0;
    if (!fox.userData.kit || act) P.body.position.y = (sit ? 0.95 + (fox.userData.sitLift || 0) : 0.95) + (walking && !sit ? Math.abs(Math.sin(t * 11 * speed)) * 0.08 : Math.sin(t * 2) * 0.015);
  }
  if (sit && P.body) {
    const bob = Math.sin(t * 2.5) * 0.06;
    P.body.position.y += bob;
    if (!fox.userData.kit && P.legs) P.legs.forEach(l => { l.position.y = 0.95 + (fox.userData.sitLift || 0) + bob; });
    if (fox.userData.chair) fox.userData.chair.position.y = bob;
  }
  if (P.tail) P.tail.rotation.y = Math.sin(t * (walking ? 9 : 3)) * 0.35;
  if (fox.userData.can) fox.userData.can.visible = act === 'water';
  if (act && P.arms && P.body) {
    const k = Math.sin(Math.min(1, actT) * Math.PI);
    if (act === 'water') { P.arms[0].rotation.x = -1.3; P.arms[1].rotation.x = -0.4; if (fox.userData.can) fox.userData.can.rotation.x = 0.6 * k; }
    else if (act === 'none' || act === 'shoo') { P.arms[0].rotation.x = -2.6 * k; P.arms[1].rotation.x = -2.6 * k; P.arms[0].rotation.z = -0.5 * k; P.arms[1].rotation.z = 0.5 * k; }
    else { P.body.rotation.x = 0.45 * k; P.arms[0].rotation.x = -1.4 * k; P.arms[1].rotation.x = -1.4 * k; }
  } else if (P.arms) { P.arms[0].rotation.z = 0; P.arms[1].rotation.z = 0; }
  if (fox.userData.cane && walking) fox.userData.cane.rotation.x = 0.35 + Math.sin(t * 11 * speed) * 0.25;
}

/* ---------------- crow ---------------- */
export function makeCrow() {
  const g = new THREE.Group();
  const black = toon(0x23202b), beakM = toon(0xffa62b);
  const body = withInk(new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10).scale(1, 0.85, 1.35), black), 0.03);
  body.position.y = 0.32; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), black); head.position.set(0, 0.58, 0.32); g.add(head);
  const beak = new THREE.Mesh(T(new THREE.ConeGeometry(0.07, 0.24, 6).rotateX(Math.PI / 2), 0, 0, 0.12), beakM); beak.position.set(0, 0.56, 0.48); g.add(beak);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), eyeM); e.position.set(sx * 0.11, 0.64, 0.45); g.add(e); }
  const wings = [-1, 1].map(sx => {
    const w = new THREE.Group(); w.position.set(sx * 0.25, 0.4, 0);
    const m = new THREE.Mesh(T(new THREE.BoxGeometry(0.6, 0.06, 0.4), sx * 0.3, 0, 0), black); w.add(m); g.add(w); return w;
  });
  g.userData.wings = wings; g.userData.head = head;
  return g;
}

/* ---------------- text sprites ---------------- */
const texCache = new Map();
export function textSprite(text, { color = '#ffffff', bg = null, size = 64, w = 256, h = 96, font = '800' } = {}) {
  const key = [text, color, bg, size, w, h].join('|');
  let tex = texCache.get(key);
  if (!tex) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = '#3a3836'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6); }
    x.font = `${font} ${size}px Archivo, "Arial Black", sans-serif`;
    x.textAlign = bg ? 'left' : 'center'; x.textBaseline = 'middle';
    if (!bg) { x.lineWidth = 12; x.strokeStyle = '#1a1626'; x.strokeText(text, w / 2, h / 2); }
    x.fillStyle = color; x.fillText(text, bg ? 18 : w / 2, h / 2 + 2);
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    texCache.set(key, tex);
  }
  return tex;
}

/* ---------------- the room (standalone only) ---------------- */
export function buildRoom(room, { touch = false } = {}) {
  room.background = new THREE.Color(0x9fdcff);
  room.fog = new THREE.Fog(0x9fdcff, 60, 140);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x6d8f4a, 1.6); room.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2); sun.position.set(-18, 30, 14); room.add(sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(120, 40).rotateX(-Math.PI / 2), toon(0x8fd16a));
  ground.position.y = -0.02; room.add(ground);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(4, 60).rotateX(-Math.PI / 2), toon(0xd9b98a));
  path.position.set(0, -0.01, 34); room.add(path);
  /* hills */
  const hills = merge([
    { geo: new THREE.SphereGeometry(30, 20, 10).scale(1.6, 0.4, 1).translate(-40, -3, -70), color: 0x6fbf55 },
    { geo: new THREE.SphereGeometry(26, 20, 10).scale(1.5, 0.45, 1).translate(30, -3, -78), color: 0x5aa847 },
    { geo: new THREE.SphereGeometry(22, 20, 10).scale(1.6, 0.35, 1).translate(70, -3, -40), color: 0x78c75c },
    { geo: new THREE.SphereGeometry(22, 20, 10).scale(1.6, 0.35, 1).translate(-75, -3, -30), color: 0x78c75c },
  ]);
  room.add(new THREE.Mesh(hills, toon(0xffffff, { vertexColors: true })));
  /* barn */
  const barn = new THREE.Group(); barn.position.set(-24, 0, -26); barn.rotation.y = 0.5;
  const walls = withInk(new THREE.Mesh(T(new THREE.BoxGeometry(8, 6, 7), 0, 3, 0), toon(0xd8402b)), 0.08);
  const roofShape = new THREE.Shape(); roofShape.moveTo(-4.6, 0); roofShape.lineTo(0, 3.4); roofShape.lineTo(4.6, 0); roofShape.lineTo(-4.6, 0);
  const roof = withInk(new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 7.6, bevelEnabled: false }).translate(0, 6, -3.8), toon(0x3b3340)), 0.08);
  const door = new THREE.Mesh(T(new THREE.BoxGeometry(3, 3.8, 0.2), 0, 1.9, 3.55), toon(0xffffff));
  const doorIn = new THREE.Mesh(T(new THREE.BoxGeometry(2.4, 3.2, 0.2), 0, 1.9, 3.62), toon(0xa5301f));
  barn.add(walls, roof, door, doorIn); room.add(barn);
  /* silo */
  const silo = withInk(new THREE.Mesh(T(new THREE.CylinderGeometry(2, 2, 9, 16), 0, 4.5, 0), toon(0xe8e3d6)), 0.08);
  const dome = new THREE.Mesh(T(new THREE.SphereGeometry(2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 9, 0), toon(0x8c8f99));
  silo.position.set(-16, 0, -30); dome.position.copy(silo.position); room.add(silo, dome);
  /* trees */
  const trees = [];
  [[22, -24], [28, -16], [-34, -8], [34, 4], [-30, 10], [18, -34]].forEach(([x, z], i) => {
    const s = 1 + (i % 3) * 0.25;
    trees.push({ geo: new THREE.CylinderGeometry(0.4 * s, 0.55 * s, 3 * s, 8).translate(x, 1.5 * s, z), color: 0x7a5232 });
    trees.push({ geo: new THREE.SphereGeometry(2.4 * s, 12, 10).translate(x, 4.2 * s, z), color: 0x3f9b47 });
    trees.push({ geo: new THREE.SphereGeometry(1.7 * s, 12, 10).translate(x + 1.2 * s, 5.4 * s, z + 0.4), color: 0x52b357 });
  });
  room.add(withInk(new THREE.Mesh(merge(trees), toon(0xffffff, { vertexColors: true })), 0.06));
  /* clouds */
  const cl = [];
  [[-30, 34, -60], [10, 40, -80], [45, 30, -50], [-60, 36, -40]].forEach(([x, y, z]) => {
    for (let k = 0; k < 3; k++) cl.push({ geo: new THREE.SphereGeometry(4 - k * 0.6, 10, 8).scale(1.4, 0.8, 1).translate(x + k * 4, y + (k % 2), z), color: 0xffffff });
  });
  room.add(new THREE.Mesh(merge(cl), new THREE.MeshBasicMaterial({ vertexColors: true })));
  /* corn fields: instanced stalks around the farm */
  const spots = [];
  const addField = (x0, x1, z0, z1, step = 1.6) => {
    for (let x = x0; x <= x1; x += step) for (let z = z0; z <= z1; z += step * 1.25) spots.push([x + (Math.random() - 0.5) * 0.5, z + (Math.random() - 0.5) * 0.5]);
  };
  addField(-26, 26, -30, -17);
  addField(-34, -18, -14, 14);
  addField(18, 34, -14, 14);
  const N = touch ? Math.min(spots.length, 420) : spots.length;
  const stalkG = T(new THREE.CylinderGeometry(0.08, 0.12, 3.2, 6), 0, 1.6, 0);
  const leafG = merge([
    { geo: T(new THREE.SphereGeometry(0.14, 6, 4).scale(1, 0.2, 6), 0, 0, 0.75).rotateX(-0.6).translate(0, 1.3, 0) },
    { geo: T(new THREE.SphereGeometry(0.14, 6, 4).scale(1, 0.2, 6), 0, 0, 0.75).rotateX(-0.6).rotateY(Math.PI * 0.9).translate(0, 1.9, 0) },
    { geo: T(new THREE.SphereGeometry(0.14, 6, 4).scale(1, 0.2, 5), 0, 0, 0.6).rotateX(-0.7).rotateY(Math.PI * 1.6).translate(0, 2.5, 0) },
  ]);
  const cobG = new THREE.CapsuleGeometry(0.16, 0.5, 3, 8).rotateZ(0.35).translate(0.2, 2.1, 0);
  const tasselG = T(new THREE.ConeGeometry(0.16, 0.6, 5), 0, 3.4, 0);
  const meshes = [[stalkG, 0x5fa83e], [leafG, 0x76c34a], [cobG, 0xffd23a], [tasselG, 0xe3c27a]].map(([g, c]) => {
    const im = new THREE.InstancedMesh(g, toon(c), N); room.add(im); return im;
  });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < N; i++) {
    const [x, z] = spots[i], s = 0.85 + Math.random() * 0.35;
    q.setFromEuler(e.set((Math.random() - 0.5) * 0.12, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.12));
    m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s, s));
    meshes.forEach(im => im.setMatrixAt(i, m));
  }
  return { sun, hemi };
}
