/* WORLD MODE test harness: a tiny "town" with its own renderer and camera.
   The croquet court is mounted on a parent Group at an offset and rotation, exactly like the 8 GATES world does it. */
import * as THREE from '../../vendor/three/three.module.js';
import { createCroquet, GAME } from './croquet.js';

export async function createWorldTest({ container, onChange = () => {} }) {
  const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const renderer = new THREE.WebGLRenderer({ antialias: !touch });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f3d9b1');
  scene.fog = new THREE.Fog('#f3d9b1', 60, 160);
  scene.add(new THREE.HemisphereLight('#fff6e8', '#7a6a4a', 1.4));
  const sun = new THREE.DirectionalLight('#ffe9c4', 2.2); sun.position.set(30, 40, 10); scene.add(sun);

  const mat = c => new THREE.MeshLambertMaterial({ color: c });
  const groundM = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat('#c9b48a'));
  groundM.rotation.x = -Math.PI / 2; groundM.position.y = -0.02; scene.add(groundM);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(8, 200), mat('#6d6a73'));
  road.rotation.x = -Math.PI / 2; road.position.set(-6, 0, 0); scene.add(road);
  /* a few town blocks */
  const cols = ['#e07a5f', '#3d405b', '#81b29a', '#f2cc8f', '#9a8c98'];
  for (let i = 0; i < 14; i++) {
    const w = 5 + (i % 3) * 2, h = 4 + (i * 7) % 9, x = (i % 2 ? -18 : 6) + (i % 4) * 2, z = -60 + i * 9;
    if (Math.abs(x - 20) < 14 && Math.abs(z + 15) < 16) continue;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat(cols[i % cols.length]));
    b.position.set(x - 30, h / 2, z); scene.add(b);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.75, 2.5, 4), mat('#8d3b2f'));
    roof.position.set(x - 30, h + 1.25, z); roof.rotation.y = Math.PI / 4; scene.add(roof);
  }
  /* paved plaza under the court so it is easy to see the offset */
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(16, 40), mat('#d8cfc0'));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(20, -0.01, -15); scene.add(plaza);

  /* the parent the world hands to the minigame */
  const parent = new THREE.Group();
  parent.position.set(20, 0, -15);
  parent.rotation.y = 0.9;
  scene.add(parent);

  const townCam = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
  const homePos = new THREE.Vector3(-14, 26, 32), homeLook = new THREE.Vector3(14, 0, -12);
  townCam.position.copy(homePos); townCam.lookAt(homeLook);
  const homeQuat = townCam.quaternion.clone();

  /* town tap markers: proves the minigame swallows its taps */
  let townTaps = 0;
  const ray = new THREE.Raycaster();
  const tapMarkers = [];
  renderer.domElement.addEventListener('pointerdown', e => {
    townTaps++;
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, townCam);
    const hit = ray.intersectObject(groundM)[0];
    if (hit) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), mat('#ec3013'));
      s.position.copy(hit.point); scene.add(s); tapMarkers.push(s);
      if (tapMarkers.length > 12) scene.remove(tapMarkers.shift());
    }
    onChange(state());
  });

  let game = null;
  const walker = {
    _croquet: {
      g: () => game,
      end: () => close(),
    },
  };
  function state() { return { open: !!game, townTaps }; }

  async function open() {
    if (game) return;
    game = await createCroquet({
      container: null,
      onState: h => window.dispatchEvent(new CustomEvent('8g:' + GAME.key, { detail: h })),
      opts: { world: { renderer, camera: townCam, parent } },
    });
    onChange(state());
  }
  function close() {
    if (!game) return;
    game.destroy(); game = null;
    window.dispatchEvent(new CustomEvent('8g:' + GAME.key, { detail: null }));
    onChange(state());
  }

  function onKey(e) { if (game) game.key(e); }
  window.addEventListener('keydown', onKey);

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    townCam.aspect = w / h; townCam.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  let raf = 0, last = performance.now(), alive = true;
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = 1 - Math.exp(-dt * 5);
    if (game) {
      const c = game.camera;
      townCam.position.lerp(c.position, k);
      townCam.quaternion.slerp(c.quaternion, k);
    } else {
      townCam.position.lerp(homePos, k);
      townCam.quaternion.slerp(homeQuat, k);
    }
    townCam.aspect = (container.clientWidth || 1) / (container.clientHeight || 1);
    townCam.updateProjectionMatrix();
    renderer.render(scene, townCam);
  }
  raf = requestAnimationFrame(frame);

  await open();

  return {
    world: walker,
    open, close,
    state,
    destroy() {
      alive = false; cancelAnimationFrame(raf); close();
      window.removeEventListener('keydown', onKey);
      ro.disconnect(); renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    },
  };
}
