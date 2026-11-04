/*
 * El Vasco en 3D: personaje construido con geometría propia (sin modelos
 * externos), al estilo de la casona de Mopet. Rig por grupos: cabeza, cejas,
 * ojos, boca, brazos, torso. Animación procedural: respiración, parpadeo,
 * mirada que sigue el puntero, boca que habla, y gestos (saludar, encogerse
 * de hombros, negar, señalar, festejar).
 *
 * mountVasco(canvas, opts) → { setTalking, pulse, gesture, look, destroy }
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type GestureName = "wave" | "shrug" | "shake" | "point" | "cheer" | "nod" | "think";

export interface VascoHandle {
  /** Boca animada mientras habla. */
  setTalking(on: boolean): void;
  /** Golpe de boca (p. ej. en cada palabra). */
  pulse(): void;
  gesture(name: GestureName): void;
  /** Hacia dónde mira: coordenadas normalizadas [-1, 1] respecto del canvas. */
  look(nx: number, ny: number): void;
  /** Giro manual del personaje (arrastre). */
  spin(delta: number): void;
  destroy(): void;
}

interface Opts {
  reduced?: boolean;
  onReady?: () => void;
}

const C = {
  skin: "#ebbf9a",
  skinDark: "#d4a37f",
  hair: "#7a5733",
  beard: "#75553a",
  eye: "#2b1d12",
  mouth: "#5b1f24",
  teeth: "#f7f3ea",
  tongue: "#c0484f",
  shirt: "#6fb3e3",
  shirtDark: "#4e8fc2",
  shorts: "#141b2a",
  shoe: "#f4f4f2",
  sole: "#1a1a1a",
  socks: "#f4f4f2",
  neon: "#4dff9a",
};

const materials = new Map<string, THREE.MeshStandardMaterial>();
function M(color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const key = color + JSON.stringify(extra);
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...extra });
    materials.set(key, m);
  }
  return m;
}

const rbox = (w: number, h: number, d: number, r = 0.04) =>
  new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2.01, h / 2.01, d / 2.01));
const ball = (r: number, s = 32) => new THREE.SphereGeometry(r, s, Math.round(s * 0.75));
const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 6, 16);

function mesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const bump = (t: number) => Math.sin(clamp(t, 0, 1) * Math.PI); // 0→1→0

interface Pose {
  armL: THREE.Euler; // rotación del pivote del brazo izquierdo (del personaje)
  armR: THREE.Euler;
  forearmL: number; // flexión del codo (x)
  forearmR: number;
  head: THREE.Euler;
  browY: number; // elevación cejas
  browTilt: number; // inclinación (enojo/duda)
  torsoY: number; // hombros arriba
  torsoRotZ: number;
  mouthSmile: number; // 0..1
}

const REST: Pose = {
  armL: new THREE.Euler(0.08, 0, 0.12),
  armR: new THREE.Euler(0.08, 0, -0.12),
  forearmL: -0.25,
  forearmR: -0.25,
  head: new THREE.Euler(0, 0, 0),
  browY: 0,
  browTilt: 0,
  torsoY: 0,
  torsoRotZ: 0,
  mouthSmile: 0.6,
};

export function mountVasco(canvas: HTMLCanvasElement, opts: Opts = {}): VascoHandle {
  const reduced = !!opts.reduced;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 1.45, 5.2);
  camera.lookAt(0, 1.25, 0);

  // Luces: clave cálida, relleno frío, contraluz neón.
  scene.add(new THREE.HemisphereLight("#cfe6ff", "#0a1a12", 0.9));
  const key = new THREE.DirectionalLight("#fff4e6", 1.6);
  key.position.set(2.2, 4, 3.5);
  scene.add(key);
  const fill = new THREE.DirectionalLight("#7dd3fc", 0.5);
  fill.position.set(-3, 2, 2);
  scene.add(fill);
  const rim = new THREE.PointLight(C.neon, 18, 12, 2);
  rim.position.set(-1.6, 2.6, -1.8);
  scene.add(rim);
  const rim2 = new THREE.PointLight("#b8ff3b", 8, 10, 2);
  rim2.position.set(1.8, 0.8, -1.5);
  scene.add(rim2);

  // Sombra de contacto (falsa, barata): disco con gradiente radial.
  const shadowTex = canvasTexture(256, 256, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(0,0,0,0.75)");
    grd.addColorStop(0.6, "rgba(0,0,0,0.35)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.7),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  scene.add(shadow);

  // Anillo neón en el piso, marca de la casa.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.0, 64),
    new THREE.MeshBasicMaterial({ color: C.neon, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);

  // ---------- Personaje ----------
  const root = new THREE.Group();
  scene.add(root);
  const body = new THREE.Group(); // todo menos los pies: respira y se inclina
  root.add(body);

  // Pies y piernas
  const legs = new THREE.Group();
  root.add(legs);
  for (const side of [-1, 1]) {
    mesh(legs, capsule(0.1, 0.32), M(C.skinDark), side * 0.17, 0.42, 0);
    mesh(legs, capsule(0.105, 0.1), M(C.socks), side * 0.17, 0.2, 0);
    const shoe = mesh(legs, rbox(0.22, 0.12, 0.36, 0.06), M(C.shoe), side * 0.17, 0.07, 0.05);
    shoe.rotation.y = side * 0.08;
    mesh(legs, rbox(0.23, 0.04, 0.37, 0.02), M(C.sole), side * 0.17, 0.02, 0.05);
  }

  // Short y torso
  mesh(body, rbox(0.56, 0.34, 0.34, 0.09), M(C.shorts), 0, 0.72, 0);
  const torso = new THREE.Group();
  torso.position.y = 1.2;
  body.add(torso);
  mesh(torso, rbox(0.62, 0.64, 0.38, 0.16), M(C.shirt), 0, 0, 0);
  // Cuello en V y mangas
  mesh(torso, rbox(0.2, 0.05, 0.1, 0.02), M(C.shirtDark), 0, 0.31, 0.17);
  // Número y nombre en la espalda (textura canvas)
  const backTex = canvasTexture(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#ffffff";
    g.textAlign = "center";
    g.font = "900 72px Arial Black, Arial, sans-serif";
    g.fillText("VASCO", w / 2, 120);
    g.font = "900 300px Arial Black, Arial, sans-serif";
    g.fillText("10", w / 2, h - 80);
  });
  const back = mesh(
    torso,
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial({ map: backTex, transparent: true }),
    0,
    0,
    -0.205,
  );
  back.rotation.y = Math.PI;
  // Escudito en el pecho: el sol
  const sun = mesh(torso, new THREE.CircleGeometry(0.05, 24), M("#f5c842", { roughness: 0.5 }), -0.17, 0.14, 0.205);
  sun.renderOrder = 1;

  // Brazos: pivote en el hombro → brazo → pivote codo → antebrazo → mano
  function makeArm(side: -1 | 1) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.35, 1.5, 0);
    body.add(shoulder);
    mesh(shoulder, capsule(0.08, 0.2), M(C.shirtDark), 0, -0.11, 0);
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.27, 0);
    shoulder.add(elbow);
    mesh(elbow, capsule(0.075, 0.2), M(C.skin), 0, -0.13, 0);
    const hand = mesh(elbow, ball(0.1, 20), M(C.skin), 0, -0.3, 0);
    hand.scale.set(1, 1.05, 0.8);
    return { shoulder, elbow, hand };
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // Cuello y cabeza
  mesh(body, new THREE.CylinderGeometry(0.11, 0.13, 0.16, 20), M(C.skin), 0, 1.58, 0);
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.66, 0);
  body.add(headPivot);
  const head = new THREE.Group();
  head.position.set(0, 0.36, 0);
  headPivot.add(head);

  const skull = mesh(head, ball(0.42, 48), M(C.skin));
  skull.scale.set(0.95, 1.14, 0.94);

  // Pelo: casquete + flequillo con volumen
  // Corte corto: casquete solo arriba (los costados quedan al ras) y mechones con textura al frente
  const hairCap = mesh(head, new THREE.SphereGeometry(0.428, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2.35), M(C.hair, { roughness: 0.95 }), 0, 0.1, -0.03);
  hairCap.scale.set(0.97, 0.86, 0.98);
  // Sombra del rapado en los costados (fade): casquete muy fino, color intermedio
  const fade = mesh(head, new THREE.SphereGeometry(0.404, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2.7), M("#c79d78", { roughness: 1 }), 0, 0.08, -0.02);
  fade.scale.set(0.98, 1.0, 0.95);
  // Jopo: frente del pelo peinada hacia arriba, en dos capas suaves (pelo liso y corto)
  const quiff = mesh(head, rbox(0.52, 0.075, 0.2, 0.035), M(C.hair, { roughness: 0.95 }), 0, 0.37, 0.2);
  quiff.rotation.x = -0.55;
  const quiff2 = mesh(head, rbox(0.46, 0.06, 0.22, 0.03), M(C.hair, { roughness: 0.95 }), 0.02, 0.43, 0.06);
  quiff2.rotation.set(-0.2, 0, 0.04);
  // Orejas
  for (const side of [-1, 1]) {
    const ear = mesh(head, ball(0.075, 20), M(C.skin), side * 0.41, -0.02, -0.02);
    ear.scale.set(0.6, 1, 0.8);
  }

  // Barba candado: casquete inferior recortado + bigote
  const beard = mesh(head, new THREE.SphereGeometry(0.417, 48, 24, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4), M(C.beard, { roughness: 1, transparent: true, opacity: 0.7 }), 0, -0.04, 0.012);
  beard.scale.set(0.96, 1.15, 0.95);
  const mustache = mesh(head, rbox(0.17, 0.035, 0.05, 0.015), M(C.beard, { roughness: 1, transparent: true, opacity: 0.85 }), 0, -0.115, 0.4);
  mustache.rotation.x = 0.2;

  // Nariz
  const nose = mesh(head, ball(0.06, 20), M(C.skinDark), 0, -0.04, 0.42);
  nose.scale.set(0.9, 0.8, 1);

  // Ojos
  function makeEye(side: -1 | 1) {
    const g = new THREE.Group();
    g.position.set(side * 0.16, 0.07, 0.35);
    head.add(g);
    const white = mesh(g, ball(0.085, 24), M("#ffffff", { roughness: 0.3 }));
    white.scale.set(1, 1, 0.7);
    const iris = mesh(g, ball(0.045, 20), M("#4a2f1c", { roughness: 0.35 }), 0, 0, 0.055);
    const pupil = mesh(iris, ball(0.025, 16), M("#120a05", { roughness: 0.3 }), 0, 0, 0.03);
    mesh(pupil, ball(0.009, 10), M("#ffffff", { emissive: "#ffffff", emissiveIntensity: 1 }), 0.008, 0.01, 0.02);
    // párpado: media esfera de piel que baja al parpadear
    const lid = mesh(g, new THREE.SphereGeometry(0.092, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(C.skin), 0, 0, 0);
    lid.scale.set(1, 1, 0.75);
    lid.rotation.x = -Math.PI / 2 + 0.2; // apenas visible arriba
    return { g, iris, lid };
  }
  const eyeL = makeEye(-1);
  const eyeR = makeEye(1);

  // Cejas
  const browL = mesh(head, rbox(0.15, 0.03, 0.04, 0.015), M("#6b4a2c"), -0.16, 0.2, 0.37);
  const browR = mesh(head, rbox(0.15, 0.03, 0.04, 0.015), M("#6b4a2c"), 0.16, 0.2, 0.37);

  // Boca: cavidad oscura que se abre, dientes y lengua adentro, labio sonriente
  const mouth = new THREE.Group();
  mouth.position.set(0, -0.2, 0.41);
  head.add(mouth);
  const cavity = mesh(mouth, rbox(0.19, 0.045, 0.08, 0.022), M(C.mouth, { roughness: 1 }), 0, 0, 0);
  const teeth = mesh(mouth, rbox(0.15, 0.03, 0.03, 0.01), M(C.teeth, { roughness: 0.3 }), 0, 0.012, 0.02);
  const tongue = mesh(mouth, ball(0.04, 16), M(C.tongue), 0, -0.02, 0.0);
  tongue.scale.set(1.3, 0.6, 1);
  // comisuras (sonrisa): dos puntitos de barba que suben
  const smileL = mesh(mouth, ball(0.018, 10), M(C.beard), -0.1, 0.01, 0.0);
  const smileR = mesh(mouth, ball(0.018, 10), M(C.beard), 0.1, 0.01, 0.0);


  // ---------- Estado de animación ----------
  const state = {
    t0: performance.now(),
    talking: false,
    mouthOpen: 0,
    mouthTarget: 0,
    pulseUntil: 0,
    blinkAt: 1.5 + Math.random() * 2,
    blink: 0,
    look: new THREE.Vector2(0, 0),
    lookSmooth: new THREE.Vector2(0, 0),
    spin: 0,
    spinVel: 0,
    gesture: null as null | { name: GestureName; start: number; dur: number },
    entered: reduced,
    dead: false,
  };

  const pose: Pose = {
    armL: REST.armL.clone(),
    armR: REST.armR.clone(),
    forearmL: REST.forearmL,
    forearmR: REST.forearmR,
    head: REST.head.clone(),
    browY: 0,
    browTilt: 0,
    torsoY: 0,
    torsoRotZ: 0,
    mouthSmile: REST.mouthSmile,
  };

  const GESTURE_DUR: Record<GestureName, number> = {
    wave: 1.8,
    shrug: 1.6,
    shake: 1.3,
    point: 1.6,
    cheer: 1.5,
    nod: 1.0,
    think: 1.8,
  };

  function targetPose(now: number): Pose {
    const p: Pose = {
      armL: REST.armL.clone(),
      armR: REST.armR.clone(),
      forearmL: REST.forearmL,
      forearmR: REST.forearmR,
      head: new THREE.Euler(0, 0, 0),
      browY: 0,
      browTilt: 0,
      torsoY: 0,
      torsoRotZ: 0,
      mouthSmile: REST.mouthSmile,
    };
    const g = state.gesture;
    if (!g) return p;
    const u = clamp((now - g.start) / g.dur, 0, 1);
    const k = bump(u); // sube y baja
    const hold = easeInOut(clamp(u * 3, 0, 1)) * easeInOut(clamp((1 - u) * 3, 0, 1)); // meseta
    switch (g.name) {
      case "wave": {
        // brazo derecho arriba saludando
        p.armR.set(0.1, 0, -2.5 * hold);
        p.forearmR = -0.6 * hold + Math.sin(u * Math.PI * 7) * 0.45 * hold;
        p.head.z = -0.12 * hold;
        p.browY = 0.03 * hold;
        p.mouthSmile = 0.8;
        break;
      }
      case "shrug": {
        // los dos brazos abiertos, palmas arriba, hombros arriba, cejas arriba, cabeza ladeada
        p.armL.set(-0.6 * hold, 0, 1.35 * hold);
        p.armR.set(-0.6 * hold, 0, -1.35 * hold);
        p.forearmL = -1.7 * hold;
        p.forearmR = -1.7 * hold;
        p.torsoY = 0.07 * hold;
        p.head.z = 0.22 * hold;
        p.head.x = -0.08 * hold;
        p.browY = 0.06 * hold;
        p.browTilt = 0.25 * hold;
        p.mouthSmile = 0.1;
        break;
      }
      case "shake": {
        p.head.y = Math.sin(u * Math.PI * 6) * 0.45 * hold;
        p.browTilt = -0.2 * hold;
        p.browY = -0.02 * hold;
        p.mouthSmile = 0.05;
        break;
      }
      case "nod": {
        p.head.x = Math.sin(u * Math.PI * 4) * 0.22 * hold;
        p.mouthSmile = 0.7;
        break;
      }
      case "point": {
        // señala hacia la cámara (la agenda) con el brazo derecho
        p.armR.set(-1.5 * hold, 0, -0.25 * hold);
        p.forearmR = -0.15 * hold;
        p.head.x = 0.06 * hold;
        p.browY = 0.02 * hold;
        p.mouthSmile = 0.9;
        break;
      }
      case "cheer": {
        p.armL.set(0, 0, 2.6 * hold);
        p.armR.set(0, 0, -2.6 * hold);
        p.forearmL = -0.5 * hold;
        p.forearmR = -0.5 * hold;
        p.torsoY = 0.1 * k;
        p.head.x = -0.2 * hold;
        p.browY = 0.06 * hold;
        p.mouthSmile = 1;
        break;
      }
      case "think": {
        // mano derecha al mentón, mirada arriba
        p.armR.set(-0.9 * hold, 0.3 * hold, -0.5 * hold);
        p.forearmR = -2.3 * hold;
        p.head.x = -0.15 * hold;
        p.head.z = 0.1 * hold;
        p.browTilt = 0.3 * hold;
        p.browY = 0.03 * hold;
        p.mouthSmile = 0.2;
        break;
      }
    }
    return p;
  }

  const tmpE = new THREE.Euler();
  function lerpEuler(a: THREE.Euler, b: THREE.Euler, t: number) {
    tmpE.set(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
    a.copy(tmpE);
  }

  function resize() {
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 400;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // En vertical alejamos un poco para que entre entero.
    camera.position.z = camera.aspect < 0.8 ? 5.6 : 5.0;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  let last = performance.now();
  let raf = 0;
  let readyFired = false;

  function frame(nowMs: number) {
    if (state.dead) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (nowMs - last) / 1000);
    last = nowMs;
    const t = (nowMs - state.t0) / 1000;
    const s = reduced ? 0.4 : 1;

    // Entrada: cae, rebota, se acomoda.
    if (!state.entered) {
      const u = clamp(t / 1.1, 0, 1);
      const e = easeOutBack(u);
      root.position.y = lerp(-3.2, 0, e);
      const squash = u > 0.72 && u < 0.95 ? 1 - bump((u - 0.72) / 0.23) * 0.12 : 1;
      root.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
      if (u >= 1) {
        state.entered = true;
        root.scale.set(1, 1, 1);
        root.position.y = 0;
      }
    }
    if (state.entered && !readyFired) {
      readyFired = true;
      opts.onReady?.();
    }

    // Giro por arrastre con inercia + leve balanceo idle
    state.spin += state.spinVel * dt;
    state.spinVel *= Math.pow(0.02, dt);
    const idleYaw = Math.sin(t * 0.6) * 0.06 * s;
    root.rotation.y = state.spin + idleYaw;

    // Respiración
    const breath = Math.sin(t * 2.1) * 0.5 + 0.5;
    body.position.y = breath * 0.012 * s;
    torso.scale.set(1 + breath * 0.012 * s, 1 + breath * 0.02 * s, 1 + breath * 0.012 * s);

    // Pose objetivo (gesto) → interpolación suave
    const tp = targetPose(t);
    const k = 1 - Math.pow(0.001, dt); // ~rápido pero suave
    lerpEuler(pose.armL, tp.armL, k);
    lerpEuler(pose.armR, tp.armR, k);
    pose.forearmL = lerp(pose.forearmL, tp.forearmL, k);
    pose.forearmR = lerp(pose.forearmR, tp.forearmR, k);
    lerpEuler(pose.head, tp.head, k);
    pose.browY = lerp(pose.browY, tp.browY, k);
    pose.browTilt = lerp(pose.browTilt, tp.browTilt, k);
    pose.torsoY = lerp(pose.torsoY, tp.torsoY, k);
    pose.mouthSmile = lerp(pose.mouthSmile, tp.mouthSmile, k * 0.6);
    if (state.gesture && t - state.gesture.start > state.gesture.dur) state.gesture = null;

    // Brazos: balanceo idle + pose
    const swing = Math.sin(t * 2.1) * 0.05 * s;
    armL.shoulder.rotation.set(pose.armL.x + swing, pose.armL.y, pose.armL.z);
    armR.shoulder.rotation.set(pose.armR.x - swing, pose.armR.y, pose.armR.z);
    armL.elbow.rotation.x = pose.forearmL;
    armR.elbow.rotation.x = pose.forearmR;
    torso.position.y = 1.2 + pose.torsoY;
    armL.shoulder.position.y = 1.5 + pose.torsoY;
    armR.shoulder.position.y = 1.5 + pose.torsoY;
    headPivot.position.y = 1.66 + pose.torsoY * 0.6;

    // Mirada: la cabeza sigue el puntero, los ojos un poco más
    state.lookSmooth.lerp(state.look, 1 - Math.pow(0.002, dt));
    const lx = state.lookSmooth.x;
    const ly = state.lookSmooth.y;
    headPivot.rotation.set(
      pose.head.x + ly * 0.22 + Math.sin(t * 1.3) * 0.015 * s,
      pose.head.y + lx * 0.45,
      pose.head.z + Math.sin(t * 0.9) * 0.01 * s,
    );
    for (const e of [eyeL, eyeR]) {
      e.iris.position.x = lx * 0.028;
      e.iris.position.y = -ly * 0.02;
    }

    // Parpadeo
    if (t > state.blinkAt) {
      state.blink = 1;
      state.blinkAt = t + 2.2 + Math.random() * 3.5;
    }
    state.blink = Math.max(0, state.blink - dt * 7);
    const lidDown = state.blink > 0.5 ? (1 - state.blink) * 2 : state.blink * 2; // 0..1..0
    for (const e of [eyeL, eyeR]) {
      e.lid.rotation.x = -Math.PI / 2 + 0.2 + lidDown * 1.7;
    }

    // Cejas
    browL.position.y = 0.2 + pose.browY;
    browR.position.y = 0.2 + pose.browY;
    browL.rotation.z = 0.12 + pose.browTilt;
    browR.rotation.z = -0.12 - pose.browTilt * 0.4;

    // Boca
    if (state.talking) {
      const base = 0.25 + Math.abs(Math.sin(t * 13.7)) * 0.45 + Math.abs(Math.sin(t * 7.3)) * 0.25;
      state.mouthTarget = clamp(base + (nowMs < state.pulseUntil ? 0.35 : 0), 0, 1);
    } else {
      // En reposo sonríe un poco, con los dientes a la vista como en la foto
      state.mouthTarget = nowMs < state.pulseUntil ? 0.6 : 0.14;
    }
    state.mouthOpen = lerp(state.mouthOpen, state.mouthTarget, 1 - Math.pow(0.0005, dt));
    const open = state.mouthOpen;
    cavity.scale.set(1 + open * 0.15, 1 + open * 3.2, 1);
    cavity.position.y = -open * 0.055;
    teeth.position.y = 0.012 + open * 0.01;
    teeth.visible = open > 0.08;
    tongue.position.y = -0.02 - open * 0.1;
    tongue.visible = open > 0.3;
    const smile = pose.mouthSmile;
    smileL.position.set(-0.1 - smile * 0.02, 0.005 + smile * 0.03, 0);
    smileR.position.set(0.1 + smile * 0.02, 0.005 + smile * 0.03, 0);
    mustache.position.y = -0.13 - open * 0.01;

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    setTalking(on) {
      state.talking = on;
    },
    pulse() {
      state.pulseUntil = performance.now() + 110;
    },
    gesture(name) {
      state.gesture = { name, start: (performance.now() - state.t0) / 1000, dur: GESTURE_DUR[name] };
    },
    look(nx, ny) {
      state.look.set(clamp(nx, -1, 1), clamp(ny, -1, 1));
    },
    spin(delta) {
      state.spinVel += delta * 6;
    },
    destroy() {
      state.dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      for (const m of materials.values()) m.dispose();
      materials.clear();
      shadowTex.dispose();
      backTex.dispose();
      renderer.dispose();
    },
  };
}
