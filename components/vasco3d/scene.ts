/*
 * El Vasco en 3D: personaje construido con geometría propia (sin modelos
 * externos), al estilo de la casona de Mopet. Rig por grupos: cabeza, cejas,
 * ojos, boca, brazos, torso. Animación procedural: respiración, parpadeo,
 * sacadas de mirada, cejas, mirada que sigue el puntero, boca que habla y
 * gestos (saludar, encogerse de hombros, negar, señalar, festejar, pensar).
 *
 * Referencia: la foto del Vasco. Pelo castaño claro corto con jopo y costados
 * al ras, barba corta (pelusa) castaña, ojos marrones oscuros, cara alargada,
 * sonrisa con dientes.
 *
 * mountVasco(canvas, opts) → { setTalking, pulse, gesture, look, spin, destroy }
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type GestureName = "wave" | "shrug" | "shake" | "point" | "cheer" | "nod" | "think";

export interface VascoHandle {
  setTalking(on: boolean): void;
  pulse(): void;
  gesture(name: GestureName): void;
  look(nx: number, ny: number): void;
  spin(delta: number): void;
  destroy(): void;
}

interface Opts {
  reduced?: boolean;
  onReady?: () => void;
}

const C = {
  skin: "#e9bd98",
  skinShade: "#cf9c76",
  lip: "#c98a78",
  hair: "#6e4d2d",
  beard: "#5a3f27",
  mouth: "#4d1a1f",
  teeth: "#f6f1e8",
  tongue: "#b8464d",
  shirt: "#79b8e6",
  shirtDark: "#5a97c7",
  shorts: "#161c2b",
  shoe: "#f3f3f1",
  sole: "#1b1b1b",
  socks: "#f3f3f1",
  neon: "#4dff9a",
};

const disposables: Array<{ dispose(): void }> = [];
const materials = new Map<string, THREE.MeshStandardMaterial>();
function M(color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const key = color + JSON.stringify(extra);
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0, ...extra });
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
  tex.anisotropy = 8;
  disposables.push(tex);
  return tex;
}

// Ruido determinista barato para texturas
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Piel en UV de esfera: u=0.25 es el frente. Mejillas, ojeras suaves y, si se
 * pide, barba de pelusa (miles de trazos) en la zona baja del frente y los
 * costados de la mandíbula.
 */
function skinTexture(stubble: boolean) {
  return canvasTexture(1024, 512, (g, w, h) => {
    const base = g.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, "#edc4a1");
    base.addColorStop(0.55, C.skin);
    base.addColorStop(1, "#dcae88");
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const front = w * 0.25;
    for (const dx of [-0.085, 0.085]) {
      const grd = g.createRadialGradient(front + dx * w, h * 0.56, 4, front + dx * w, h * 0.56, w * 0.07);
      grd.addColorStop(0, "rgba(214,120,96,0.22)");
      grd.addColorStop(1, "rgba(214,120,96,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    }
    for (const dx of [-0.075, 0.075]) {
      const grd = g.createRadialGradient(front + dx * w, h * 0.47, 2, front + dx * w, h * 0.47, w * 0.045);
      grd.addColorStop(0, "rgba(120,70,60,0.16)");
      grd.addColorStop(1, "rgba(120,70,60,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    }
    const r = rng(7);
    for (let i = 0; i < 6000; i++) {
      const x = r() * w;
      const y = r() * h;
      g.fillStyle = r() > 0.5 ? "rgba(255,230,210,0.08)" : "rgba(150,90,60,0.07)";
      g.fillRect(x, y, 2, 2);
    }
    if (stubble) {
      const r2 = rng(99);
      for (let i = 0; i < 26000; i++) {
        const u = r2();
        const v = r2();
        const du = Math.abs(u - 0.25);
        if (du > 0.26 || v < 0.44 || v > 0.93) continue;
        let d = 1;
        d *= v < 0.6 ? (v - 0.44) / 0.16 : 1;
        d *= du > 0.2 ? 1 - (du - 0.2) / 0.06 : 1;
        if (v > 0.47 && v < 0.55 && du < 0.06) d = 1;
        if (v < 0.56 && du > 0.08 && du < 0.2) d *= 0.35;
        if (r2() > d) continue;
        const len = 1.5 + r2() * 2.5;
        const a = (r2() - 0.5) * 1.2 + Math.PI / 2;
        g.strokeStyle = `rgba(${(60 + r2() * 30) | 0},${(40 + r2() * 20) | 0},${(22 + r2() * 15) | 0},${0.45 + r2() * 0.4})`;
        g.lineWidth = 1.1;
        g.beginPath();
        g.moveTo(u * w, v * h);
        g.lineTo(u * w + Math.cos(a) * len, v * h + Math.sin(a) * len);
        g.stroke();
      }
      const shade = g.createLinearGradient(0, h * 0.5, 0, h * 0.9);
      shade.addColorStop(0, "rgba(70,45,25,0)");
      shade.addColorStop(0.35, "rgba(70,45,25,0.18)");
      shade.addColorStop(1, "rgba(70,45,25,0.22)");
      g.fillStyle = shade;
      g.fillRect(0, h * 0.5, w * 0.5, h * 0.4);
    }
  });
}

/** Pelo con hebras: líneas finas claras y oscuras sobre castaño. */
function hairTexture() {
  const tex = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = C.hair;
    g.fillRect(0, 0, w, h);
    const r = rng(3);
    for (let i = 0; i < 2600; i++) {
      const x = r() * w;
      const y = r() * h;
      const len = 14 + r() * 40;
      const a = Math.PI / 2 + (r() - 0.5) * 0.5;
      g.strokeStyle = r() > 0.5 ? `rgba(160,120,80,${0.25 + r() * 0.35})` : `rgba(50,32,16,${0.25 + r() * 0.4})`;
      g.lineWidth = 1 + r() * 1.5;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

/** Iris marrón oscuro con anillo exterior y vetas. */
function irisTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const grd = g.createRadialGradient(cx, cy, 10, cx, cy, w / 2);
    grd.addColorStop(0, "#1a0e07");
    grd.addColorStop(0.3, "#5a3a20");
    grd.addColorStop(0.75, "#4a2d17");
    grd.addColorStop(0.92, "#2a170a");
    grd.addColorStop(1, "#1a0e07");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    const r = rng(11);
    for (let i = 0; i < 160; i++) {
      const a = r() * Math.PI * 2;
      g.strokeStyle = r() > 0.5 ? "rgba(140,95,50,0.35)" : "rgba(20,10,5,0.4)";
      g.lineWidth = 1 + r();
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20);
      g.lineTo(cx + Math.cos(a) * (w / 2), cy + Math.sin(a) * (h / 2));
      g.stroke();
    }
  });
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const bump = (t: number) => Math.sin(clamp(t, 0, 1) * Math.PI);

interface Pose {
  armL: THREE.Euler;
  armR: THREE.Euler;
  forearmL: number;
  forearmR: number;
  head: THREE.Euler;
  browY: number;
  browTilt: number;
  torsoY: number;
  mouthSmile: number;
}

const REST = {
  armL: new THREE.Euler(0.06, 0, 0.18),
  armR: new THREE.Euler(0.06, 0, -0.18),
  forearm: -0.25,
  mouthSmile: 0.6,
};

export function mountVasco(canvas: HTMLCanvasElement, opts: Opts = {}): VascoHandle {
  const reduced = !!opts.reduced;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  const LOOK_Y = 1.42;

  scene.add(new THREE.HemisphereLight("#d9ecff", "#0b1a12", 0.75));
  const key = new THREE.DirectionalLight("#fff1e0", 1.9);
  key.position.set(2.5, 4.5, 3.5);
  scene.add(key);
  const fill = new THREE.DirectionalLight("#8ccfff", 0.45);
  fill.position.set(-3.5, 2, 2.5);
  scene.add(fill);
  const rim = new THREE.PointLight(C.neon, 22, 14, 2);
  rim.position.set(-1.8, 2.8, -2);
  scene.add(rim);
  const rim2 = new THREE.PointLight("#b8ff3b", 9, 10, 2);
  rim2.position.set(2, 0.9, -1.6);
  scene.add(rim2);

  const shadowTex = canvasTexture(256, 256, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(0,0,0,0.8)");
    grd.addColorStop(0.55, "rgba(0,0,0,0.35)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  scene.add(shadow);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.045, 72),
    new THREE.MeshBasicMaterial({ color: C.neon, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);

  // ---------- Materiales con textura ----------
  const skinMat = new THREE.MeshStandardMaterial({ map: skinTexture(false), roughness: 0.62, metalness: 0 });
  const faceMat = new THREE.MeshStandardMaterial({ map: skinTexture(true), roughness: 0.68, metalness: 0 });
  const hairMat = new THREE.MeshStandardMaterial({ map: hairTexture(), roughness: 0.92, metalness: 0 });
  const irisMat = new THREE.MeshStandardMaterial({ map: irisTexture(), roughness: 0.25, metalness: 0 });
  disposables.push(skinMat, faceMat, hairMat, irisMat);

  // ---------- Personaje ----------
  const root = new THREE.Group();
  scene.add(root);
  const body = new THREE.Group();
  root.add(body);

  const legs = new THREE.Group();
  root.add(legs);
  for (const side of [-1, 1]) {
    mesh(legs, capsule(0.095, 0.44), M(C.skinShade), side * 0.16, 0.52, 0);
    mesh(legs, capsule(0.1, 0.1), M(C.socks), side * 0.16, 0.2, 0);
    const shoe = mesh(legs, rbox(0.2, 0.11, 0.34, 0.06), M(C.shoe), side * 0.16, 0.065, 0.05);
    shoe.rotation.y = side * 0.07;
    mesh(legs, rbox(0.21, 0.035, 0.35, 0.02), M(C.sole), side * 0.16, 0.018, 0.05);
  }

  mesh(body, rbox(0.5, 0.32, 0.3, 0.08), M(C.shorts), 0, 0.88, 0);
  const torso = new THREE.Group();
  torso.position.y = 1.36;
  body.add(torso);
  const chest = mesh(torso, rbox(0.6, 0.68, 0.34, 0.15), M(C.shirt), 0, 0, 0);
  const collar = mesh(torso, new THREE.TorusGeometry(0.115, 0.022, 10, 36), M(C.shirtDark), 0, 0.33, 0.02);
  collar.rotation.x = Math.PI / 2;
  const backTex = canvasTexture(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#ffffff";
    g.textAlign = "center";
    g.font = "900 70px Arial Black, Arial, sans-serif";
    g.fillText("VASCO", w / 2, 120);
    g.font = "900 300px Arial Black, Arial, sans-serif";
    g.fillText("10", w / 2, h - 80);
  });
  const back = mesh(torso, new THREE.PlaneGeometry(0.46, 0.46), new THREE.MeshBasicMaterial({ map: backTex, transparent: true }), 0, -0.02, -0.175);
  back.rotation.y = Math.PI;
  mesh(torso, new THREE.CircleGeometry(0.045, 24), M("#f3c53f", { roughness: 0.5 }), -0.16, 0.16, 0.175);

  function makeArm(side: -1 | 1) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.37, 1.62, 0);
    body.add(shoulder);
    const sleeve = mesh(shoulder, capsule(0.075, 0.15), M(C.shirt), 0, -0.07, 0);
    sleeve.rotation.z = side * 0.05;
    mesh(shoulder, capsule(0.07, 0.14), skinMat, 0, -0.24, 0);
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.33, 0);
    shoulder.add(elbow);
    mesh(elbow, capsule(0.065, 0.22), skinMat, 0, -0.13, 0);
    const hand = mesh(elbow, ball(0.085, 20), skinMat, 0, -0.3, 0.01);
    hand.scale.set(0.95, 1.1, 0.7);
    return { shoulder, elbow, hand };
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  mesh(body, new THREE.CylinderGeometry(0.1, 0.12, 0.2, 24), skinMat, 0, 1.76, 0.01);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.84, 0);
  body.add(headPivot);
  const head = new THREE.Group();
  head.position.set(0, 0.34, 0);
  headPivot.add(head);
  const R = 0.34;
  const skull = mesh(head, ball(R, 64), skinMat);
  skull.scale.set(0.96, 1.08, 0.98);
  const jaw = mesh(head, ball(R * 0.9, 64), faceMat, 0, -0.14, 0.015);
  jaw.scale.set(0.9, 0.98, 0.92);

  const hairCap = mesh(head, new THREE.SphereGeometry(R * 1.02, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2.3), hairMat, 0, 0.065, -0.02);
  hairCap.scale.set(0.97, 0.9, 0.99);
  const fade = mesh(head, new THREE.SphereGeometry(R * 0.995, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2.0), M("#c9a07d", { roughness: 1 }), 0, 0.04, -0.015);
  fade.scale.set(0.975, 1.02, 0.985);
  // Jopo: volúmenes blandos (elipsoides) al frente del casquete, peinados hacia arriba
  const quiff = mesh(head, ball(0.2, 32), hairMat, 0, 0.27, 0.13);
  quiff.scale.set(1.15, 0.42, 0.8);
  quiff.rotation.x = -0.55;
  const quiff2 = mesh(head, ball(0.18, 32), hairMat, 0.03, 0.33, 0.02);
  quiff2.scale.set(1.2, 0.4, 0.9);
  quiff2.rotation.set(-0.25, 0, 0.05);
  const quiff3 = mesh(head, ball(0.12, 24), hairMat, -0.12, 0.31, 0.17);
  quiff3.scale.set(1, 0.45, 0.7);
  quiff3.rotation.set(-0.7, 0, -0.3);
  for (const side of [-1, 1]) {
    const sb = mesh(head, rbox(0.045, 0.13, 0.08, 0.02), M(C.beard, { transparent: true, opacity: 0.6, roughness: 1 }), side * 0.325, -0.01, 0.05);
    sb.rotation.y = side * 0.2;
  }

  for (const side of [-1, 1]) {
    const ear = mesh(head, ball(0.065, 20), skinMat, side * 0.33, 0.0, -0.02);
    ear.scale.set(0.5, 1, 0.75);
    const inner = mesh(head, ball(0.04, 16), M(C.skinShade), side * 0.335, 0.0, -0.01);
    inner.scale.set(0.35, 0.8, 0.6);
  }

  const bridge = mesh(head, capsule(0.028, 0.1), skinMat, 0, 0.0, 0.325);
  bridge.rotation.x = 0.35;
  const tip = mesh(head, ball(0.045, 20), skinMat, 0, -0.065, 0.345);
  tip.scale.set(1.05, 0.9, 1);
  for (const side of [-1, 1]) {
    const ala = mesh(head, ball(0.03, 14), skinMat, side * 0.04, -0.075, 0.325);
    ala.scale.set(1, 0.8, 0.9);
    mesh(head, ball(0.012, 10), M("#8a5a48"), side * 0.022, -0.095, 0.352);
  }

  function makeEye(side: -1 | 1) {
    const g = new THREE.Group();
    g.position.set(side * 0.125, 0.04, 0.275);
    head.add(g);
    const white = mesh(g, ball(0.062, 28), M("#f8f6f3", { roughness: 0.25 }));
    white.scale.set(1, 0.92, 0.7);
    const iris = mesh(g, ball(0.034, 24), irisMat, 0, 0, 0.038);
    iris.scale.set(1, 1, 0.55);
    const pupil = mesh(iris, ball(0.014, 14), M("#070402", { roughness: 0.2 }), 0, 0, 0.9 * 0.034);
    mesh(pupil, ball(0.007, 10), M("#ffffff", { emissive: "#ffffff", emissiveIntensity: 1.2 }), 0.008, 0.009, 0.01);
    const lid = mesh(g, new THREE.SphereGeometry(0.068, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), skinMat, 0, 0, 0);
    lid.scale.set(1.02, 0.95, 0.72);
    lid.rotation.x = -Math.PI / 2 + 0.35;
    const lash = mesh(g, new THREE.TorusGeometry(0.058, 0.006, 6, 24, Math.PI), M("#3a2516"), 0, 0.012, 0.012);
    lash.scale.set(1, 0.7, 0.4);
    const lower = mesh(g, new THREE.TorusGeometry(0.055, 0.006, 6, 24, Math.PI), M(C.skinShade), 0, -0.012, 0.012);
    lower.rotation.z = Math.PI;
    lower.scale.set(1, 0.5, 0.4);
    return { g, iris, lid, lash };
  }
  const eyeL = makeEye(-1);
  const eyeR = makeEye(1);

  function makeBrow(side: -1 | 1) {
    const b = new THREE.Group();
    b.position.set(side * 0.125, 0.14, 0.29);
    head.add(b);
    const m = mesh(b, rbox(0.13, 0.026, 0.035, 0.012), M("#5e4026", { roughness: 0.9 }), 0, 0, 0);
    m.rotation.z = side * 0.1;
    const tail = mesh(b, rbox(0.05, 0.02, 0.03, 0.01), M("#5e4026", { roughness: 0.9 }), side * 0.08, -0.012, -0.012);
    tail.rotation.set(0, side * -0.35, side * -0.3);
    return b;
  }
  const browL = makeBrow(-1);
  const browR = makeBrow(1);

  const mouth = new THREE.Group();
  mouth.position.set(0, -0.19, 0.305);
  head.add(mouth);
  const cavity = mesh(mouth, rbox(0.16, 0.03, 0.06, 0.015), M(C.mouth, { roughness: 1 }), 0, 0, 0);
  const teeth = mesh(mouth, rbox(0.13, 0.028, 0.03, 0.01), M(C.teeth, { roughness: 0.3 }), 0, 0.011, 0.014);
  const tongue = mesh(mouth, ball(0.035, 16), M(C.tongue), 0, -0.02, -0.005);
  tongue.scale.set(1.3, 0.6, 1);
  const lowerLip = mesh(mouth, capsule(0.016, 0.1), M(C.lip, { roughness: 0.6 }), 0, -0.028, 0.012);
  lowerLip.rotation.z = Math.PI / 2;
  const upperLip = mesh(mouth, capsule(0.011, 0.11), M(C.skinShade, { roughness: 0.7 }), 0, 0.026, 0.012);
  upperLip.rotation.z = Math.PI / 2;
  const smileL = mesh(mouth, ball(0.012, 10), M(C.skinShade), -0.09, 0.005, 0.0);
  const smileR = mesh(mouth, ball(0.012, 10), M(C.skinShade), 0.09, 0.005, 0.0);

  const state = {
    t0: performance.now(),
    talking: false,
    mouthOpen: 0,
    mouthTarget: 0,
    pulseUntil: 0,
    blinkAt: 1.2 + Math.random() * 2,
    blink: 0,
    look: new THREE.Vector2(0, 0),
    lookSmooth: new THREE.Vector2(0, 0),
    saccade: new THREE.Vector2(0, 0),
    saccadeAt: 2,
    lastPointer: 0,
    browRaiseAt: 4,
    browRaise: 0,
    spin: 0,
    spinVel: 0,
    gesture: null as null | { name: GestureName; start: number; dur: number },
    entered: reduced,
    dead: false,
  };

  const pose: Pose = {
    armL: REST.armL.clone(),
    armR: REST.armR.clone(),
    forearmL: REST.forearm,
    forearmR: REST.forearm,
    head: new THREE.Euler(0, 0, 0),
    browY: 0,
    browTilt: 0,
    torsoY: 0,
    mouthSmile: REST.mouthSmile,
  };

  const GESTURE_DUR: Record<GestureName, number> = {
    wave: 1.8,
    shrug: 1.7,
    shake: 1.3,
    point: 1.6,
    cheer: 1.5,
    nod: 1.0,
    think: 1.9,
  };

  function targetPose(now: number): Pose {
    const p: Pose = {
      armL: REST.armL.clone(),
      armR: REST.armR.clone(),
      forearmL: REST.forearm,
      forearmR: REST.forearm,
      head: new THREE.Euler(0, 0, 0),
      browY: 0,
      browTilt: 0,
      torsoY: 0,
      mouthSmile: REST.mouthSmile,
    };
    const g = state.gesture;
    if (!g) return p;
    const u = clamp((now - g.start) / g.dur, 0, 1);
    const k = bump(u);
    const hold = easeInOut(clamp(u * 3, 0, 1)) * easeInOut(clamp((1 - u) * 3, 0, 1));
    switch (g.name) {
      case "wave":
        p.armR.set(0.15, 0.3 * hold, -0.18 - 2.3 * hold);
        p.forearmR = -0.25 - 0.5 * hold + Math.sin(u * Math.PI * 7) * 0.45 * hold;
        p.head.z = -0.1 * hold;
        p.browY = 0.025 * hold;
        p.mouthSmile = 0.9;
        break;
      case "shrug": {
        // abre los brazos antes de doblar los codos, así el antebrazo sube por fuera del pecho
        const open = easeInOut(clamp(u * 4, 0, 1)) * easeInOut(clamp((1 - u) * 2.5, 0, 1));
        const bend = easeInOut(clamp((u - 0.12) * 3.5, 0, 1)) * easeInOut(clamp((1 - u) * 3, 0, 1));
        // codos afuera y antebrazos hacia afuera: las manos quedan separadas, palmas arriba
        p.armL.set(-0.3 * bend, -0.7 * bend, 0.18 + 1.25 * open);
        p.armR.set(-0.3 * bend, 0.7 * bend, -0.18 - 1.25 * open);
        p.forearmL = -0.25 - 1.5 * bend;
        p.forearmR = -0.25 - 1.5 * bend;
        p.torsoY = 0.06 * hold;
        p.head.z = 0.2 * hold;
        p.head.x = -0.06 * hold;
        p.browY = 0.05 * hold;
        p.browTilt = 0.28 * hold;
        p.mouthSmile = 0.15;
        break;
      }
      case "shake":
        p.head.y = Math.sin(u * Math.PI * 6) * 0.42 * hold;
        p.browTilt = -0.18 * hold;
        p.browY = -0.015 * hold;
        p.mouthSmile = 0.1;
        break;
      case "nod":
        p.head.x = Math.sin(u * Math.PI * 4) * 0.2 * hold;
        p.mouthSmile = 0.8;
        break;
      case "point":
        p.armR.set(-1.55 * hold, 0, -0.18 - 0.2 * hold);
        p.forearmR = -0.1 * hold;
        p.head.x = 0.05 * hold;
        p.browY = 0.02 * hold;
        p.mouthSmile = 0.95;
        break;
      case "cheer":
        p.armL.set(0, 0, 0.18 + 2.4 * hold);
        p.armR.set(0, 0, -0.18 - 2.4 * hold);
        p.forearmL = -0.25 - 0.4 * hold;
        p.forearmR = -0.25 - 0.4 * hold;
        p.torsoY = 0.09 * k;
        p.head.x = -0.18 * hold;
        p.browY = 0.05 * hold;
        p.mouthSmile = 1;
        break;
      case "think": {
        const open = easeInOut(clamp(u * 4, 0, 1)) * easeInOut(clamp((1 - u) * 2.5, 0, 1));
        const bend = easeInOut(clamp((u - 0.1) * 3.5, 0, 1)) * easeInOut(clamp((1 - u) * 3, 0, 1));
        p.armR.set(-0.55 * bend, 0.9 * bend, -0.18 - 0.75 * open);
        p.forearmR = -0.25 - 2.1 * bend;
        p.head.x = -0.14 * hold;
        p.head.z = 0.1 * hold;
        p.browTilt = 0.3 * hold;
        p.browY = 0.025 * hold;
        p.mouthSmile = 0.25;
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
    camera.position.set(0, LOOK_Y + 0.15, camera.aspect < 0.8 ? 6.4 : 5.6);
    camera.lookAt(0, LOOK_Y, 0);
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

    if (!state.entered) {
      const u = clamp(t / 1.1, 0, 1);
      const e = easeOutBack(u);
      root.position.y = lerp(-3.4, 0, e);
      const squash = u > 0.72 && u < 0.95 ? 1 - bump((u - 0.72) / 0.23) * 0.1 : 1;
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

    state.spin += state.spinVel * dt;
    state.spinVel *= Math.pow(0.02, dt);
    root.rotation.y = state.spin + Math.sin(t * 0.6) * 0.05 * s;

    const breath = Math.sin(t * 2.0) * 0.5 + 0.5;
    body.position.y = breath * 0.012 * s;
    body.rotation.z = Math.sin(t * 0.45) * 0.012 * s;
    chest.scale.set(1 + breath * 0.012 * s, 1 + breath * 0.018 * s, 1 + breath * 0.012 * s);

    const tp = targetPose(t);
    const k = 1 - Math.pow(0.001, dt);
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

    const swing = Math.sin(t * 2.0) * 0.04 * s;
    // Convención: en la pose, z positivo = brazo izquierdo hacia afuera, z negativo = derecho hacia afuera.
    // Con el orden de Euler XYZ el giro z del hombro va al revés, así que se invierte acá.
    armL.shoulder.rotation.set(pose.armL.x + swing, pose.armL.y, -pose.armL.z);
    armR.shoulder.rotation.set(pose.armR.x - swing, pose.armR.y, -pose.armR.z);
    armL.elbow.rotation.x = pose.forearmL;
    armR.elbow.rotation.x = pose.forearmR;
    torso.position.y = 1.36 + pose.torsoY;
    armL.shoulder.position.y = 1.62 + pose.torsoY;
    armR.shoulder.position.y = 1.62 + pose.torsoY;
    // el brazo nunca entra en el torso: la apertura lateral tiene un mínimo
    armL.shoulder.rotation.z = Math.min(armL.shoulder.rotation.z, -0.16);
    armR.shoulder.rotation.z = Math.max(armR.shoulder.rotation.z, 0.16);
    headPivot.position.y = 1.84 + pose.torsoY * 0.6;

    if (t - state.lastPointer > 2.5 && t > state.saccadeAt) {
      state.saccade.set((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.3);
      state.saccadeAt = t + 1.2 + Math.random() * 2.5;
    }
    const target = t - state.lastPointer > 2.5 ? state.saccade : state.look;
    state.lookSmooth.lerp(target, 1 - Math.pow(0.003, dt));
    const lx = state.lookSmooth.x;
    const ly = state.lookSmooth.y;
    headPivot.rotation.set(
      pose.head.x + ly * 0.2 + Math.sin(t * 1.3) * 0.012 * s,
      pose.head.y + lx * 0.42,
      pose.head.z + Math.sin(t * 0.9) * 0.01 * s,
    );
    for (const e of [eyeL, eyeR]) {
      e.iris.position.x = lx * 0.022;
      e.iris.position.y = -ly * 0.016;
    }

    if (t > state.blinkAt) {
      state.blink = 1;
      state.blinkAt = t + (Math.random() < 0.2 ? 0.35 : 2.4 + Math.random() * 3.5);
    }
    state.blink = Math.max(0, state.blink - dt * 7.5);
    const lidDown = state.blink > 0.5 ? (1 - state.blink) * 2 : state.blink * 2;
    for (const e of [eyeL, eyeR]) {
      e.lid.rotation.x = -Math.PI / 2 + 0.35 + lidDown * 1.55;
      e.lash.position.y = 0.012 - lidDown * 0.045;
    }

    if (t > state.browRaiseAt) {
      state.browRaise = 1;
      state.browRaiseAt = t + 5 + Math.random() * 6;
    }
    state.browRaise = Math.max(0, state.browRaise - dt * 1.4);
    const raise = bump(1 - state.browRaise) * 0.012;
    browL.position.y = 0.14 + pose.browY + raise;
    browR.position.y = 0.14 + pose.browY + raise;
    browL.rotation.z = pose.browTilt;
    browR.rotation.z = -pose.browTilt * 0.4;

    if (state.talking) {
      const base = 0.22 + Math.abs(Math.sin(t * 13.7)) * 0.45 + Math.abs(Math.sin(t * 7.3)) * 0.25;
      state.mouthTarget = clamp(base + (nowMs < state.pulseUntil ? 0.35 : 0), 0, 1);
    } else {
      state.mouthTarget = nowMs < state.pulseUntil ? 0.6 : 0.12;
    }
    state.mouthOpen = lerp(state.mouthOpen, state.mouthTarget, 1 - Math.pow(0.0005, dt));
    const open = state.mouthOpen;
    const smile = pose.mouthSmile;
    cavity.scale.set(1 + open * 0.12 + smile * 0.12, 1 + open * 3.6, 1);
    cavity.position.y = -open * 0.05;
    teeth.position.y = 0.011 + open * 0.008;
    teeth.visible = open > 0.07;
    tongue.position.y = -0.02 - open * 0.09;
    tongue.visible = open > 0.3;
    lowerLip.position.y = -0.028 - open * 0.1;
    lowerLip.scale.set(1, 1 + smile * 0.15, 1);
    upperLip.position.y = 0.026 + open * 0.004;
    smileL.position.set(-0.09 - smile * 0.015, 0.004 + smile * 0.022, 0);
    smileR.position.set(0.09 + smile * 0.015, 0.004 + smile * 0.022, 0);
    jaw.position.y = -0.14 - open * 0.025;

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  const handle: VascoHandle = {
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
      state.lastPointer = (performance.now() - state.t0) / 1000;
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
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      renderer.dispose();
    },
  };
  if (process.env.NODE_ENV !== "production") {
    (window as unknown as { __vasco?: VascoHandle }).__vasco = handle;
  }
  return handle;
}
