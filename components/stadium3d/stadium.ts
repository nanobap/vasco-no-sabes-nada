/*
 * Estadio 3D procedural (sin modelos externos): campo con rayas, arcos, un
 * anillo de tribunas en tres bandejas con público teñido con los colores de
 * cada equipo, cuatro torres de luz, un marcador gigante con los dos escudos,
 * y los escudos enfrentados flotando sobre el círculo central.
 *
 * mountStadium(canvas, opts) → { setProgress(p), destroy() }
 * `p` (0..1) mueve la cámara desde una vista aérea hasta el nivel del césped.
 */
import * as THREE from "three";

export interface StadiumOpts {
  homeCrest: string;
  awayCrest: string;
  homeColor: string;
  awayColor: string;
  homeName: string;
  awayName: string;
  kickoff: string; // HH:mm
  score?: string | null; // "2-1" si terminó
  competition: string;
  reduced?: boolean;
}

export interface StadiumHandle {
  setProgress(p: number): void;
  destroy(): void;
}

const disposables: Array<{ dispose(): void }> = [];

function tex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  disposables.push(t);
  return t;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Césped con rayas de corte y líneas reglamentarias (105x68). */
function pitchTexture() {
  return tex(1050, 680, (g, w, h) => {
    for (let i = 0; i < 14; i++) {
      g.fillStyle = i % 2 ? "#1f6b3a" : "#247a43";
      g.fillRect((i * w) / 14, 0, w / 14 + 1, h);
    }
    g.strokeStyle = "rgba(255,255,255,0.92)";
    g.lineWidth = 4;
    const m = 30;
    g.strokeRect(m, m, w - 2 * m, h - 2 * m);
    g.beginPath();
    g.moveTo(w / 2, m);
    g.lineTo(w / 2, h - m);
    g.stroke();
    g.beginPath();
    g.arc(w / 2, h / 2, 91.5, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(w / 2, h / 2, 5, 0, Math.PI * 2);
    g.fillStyle = "#fff";
    g.fill();
    // áreas
    for (const side of [0, 1]) {
      const x = side ? w - m : m;
      const dir = side ? -1 : 1;
      g.strokeRect(side ? x - 165 : x, h / 2 - 201.5, 165, 403);
      g.strokeRect(side ? x - 55 : x, h / 2 - 91.5, 55, 183);
      g.beginPath();
      g.arc(x + dir * 110, h / 2, 91.5, side ? Math.PI * 0.63 : -Math.PI * 0.37, side ? Math.PI * 1.37 : Math.PI * 0.37);
      g.stroke();
      g.beginPath();
      g.arc(x + dir * 110, h / 2, 4, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** Público: puntitos de colores (mayoría del color del equipo, resto variado). */
function crowdTexture(color: string, seed: number) {
  const t = tex(256, 128, (g, w, h) => {
    g.fillStyle = "#101418";
    g.fillRect(0, 0, w, h);
    const r = rng(seed);
    const others = ["#f2f2f2", "#1b1b1b", "#d9c27a", "#7a7a7a", "#3b3b3b"];
    for (let i = 0; i < 2600; i++) {
      const x = r() * w;
      const y = r() * h;
      const c = r() < 0.62 ? color : others[(r() * others.length) | 0];
      g.fillStyle = c;
      g.globalAlpha = 0.55 + r() * 0.45;
      g.fillRect(x, y, 2.2, 2.6);
    }
    g.globalAlpha = 1;
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.09, 0.09);
  return t;
}

function ellipsePoints(rx: number, rz: number, from: number, to: number, n = 40) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = from + ((to - from) * i) / n;
    pts.push(new THREE.Vector2(Math.cos(a) * rx, Math.sin(a) * rz));
  }
  return pts;
}

/** Media bandeja de tribuna (anillo elíptico de `from` a `to`), extruida en altura. */
function tierHalf(rxIn: number, rzIn: number, width: number, height: number, from: number, to: number) {
  const outer = ellipsePoints(rxIn + width, rzIn + width, from, to);
  const inner = ellipsePoints(rxIn, rzIn, to, from);
  const shape = new THREE.Shape([...outer, ...inner]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 1 });
  geo.rotateX(-Math.PI / 2); // extruye en +z → la giramos para que crezca en +y
  geo.translate(0, height, 0);
  // tras rotar, la profundidad quedó invertida en y; corregimos
  geo.scale(1, -1, 1);
  geo.computeVertexNormals();
  disposables.push(geo);
  return geo;
}

export function mountStadium(canvas: HTMLCanvasElement, o: StadiumOpts): StadiumHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05080c, 0.0032);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 600);

  // Luces: noche de partido
  scene.add(new THREE.HemisphereLight("#bfe3ff", "#12241a", 1.0));
  const sun = new THREE.DirectionalLight("#fff6e8", 2.4);
  sun.position.set(40, 90, 50);
  scene.add(sun);
  const towerPos = [
    [-70, 0, -48],
    [70, 0, -48],
    [-70, 0, 48],
    [70, 0, 48],
  ];
  for (const [x, , z] of towerPos) {
    const spot = new THREE.SpotLight("#ffffff", 4200, 300, 0.6, 0.6, 1.5);
    spot.position.set(x, 46, z);
    spot.target.position.set(x * 0.15, 0, z * 0.15);
    scene.add(spot, spot.target);
  }

  // Campo
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(105, 68), new THREE.MeshStandardMaterial({ map: pitchTexture(), roughness: 0.95 }));
  pitch.rotation.x = -Math.PI / 2;
  scene.add(pitch);
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(124, 86), new THREE.MeshStandardMaterial({ color: "#1b5d33", roughness: 1 }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.02;
  scene.add(apron);

  // Arcos
  const postMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.4 });
  const netMat = new THREE.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.18, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const x = side * 52.5;
    const g = new THREE.Group();
    for (const dz of [-3.66, 3.66]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.44, 10), postMat);
      post.position.set(x, 1.22, dz);
      g.add(post);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7.32, 10), postMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(x, 2.44, 0);
    g.add(bar);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(7.32, 2.44), netMat);
    net.position.set(x + side * 1.6, 1.22, 0);
    net.rotation.y = Math.PI / 2;
    g.add(net);
    scene.add(g);
  }

  // Tribunas: 3 bandejas, mitad local (x<0) y mitad visitante (x>0)
  const homeCrowd = crowdTexture(o.homeColor, 5);
  const awayCrowd = crowdTexture(o.awayColor, 9);
  const concrete = new THREE.MeshStandardMaterial({ color: "#3a424d", roughness: 0.9 });
  const tiers = [
    { rx: 66, rz: 46, w: 14, h: 7 },
    { rx: 81, rz: 61, w: 14, h: 9 },
    { rx: 96, rz: 76, w: 13, h: 10 },
  ];
  let baseY = 0;
  tiers.forEach((t, i) => {
    for (const half of [0, 1]) {
      const from = half ? -Math.PI / 2 : Math.PI / 2;
      const to = half ? Math.PI / 2 : (Math.PI * 3) / 2;
      const geo = tierHalf(t.rx, t.rz, t.w, t.h, from, to);
      const crowd = new THREE.MeshStandardMaterial({ map: half ? awayCrowd : homeCrowd, roughness: 1 });
      const m = new THREE.Mesh(geo, [crowd, concrete]);
      // la cara superior (grupo 0 en Extrude = tapas) lleva público; el resto, hormigón
      m.position.y = baseY;
      scene.add(m);
    }
    baseY += t.h * 0.92;
    void i;
  });
  // Techo voladizo sobre la última bandeja
  const roofGeo = tierHalf(104, 84, 9, 1.2, 0, Math.PI * 2);
  const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: "#0f1319", roughness: 0.6, metalness: 0.3 }));
  roof.position.y = baseY + 9;
  scene.add(roof);

  // Torres de luz
  for (const [x, , z] of towerPos) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 46, 10), new THREE.MeshStandardMaterial({ color: "#3b424c", roughness: 0.7, metalness: 0.4 }));
    pole.position.set(x, 23, z);
    scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(7, 3.5, 1.2), new THREE.MeshStandardMaterial({ color: "#f4f6ff", emissive: "#ffffff", emissiveIntensity: 2.2 }));
    head.position.set(x, 46, z);
    head.lookAt(0, 0, 0);
    scene.add(head);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.12, depthWrite: false }));
    glow.position.set(x, 46, z);
    glow.lookAt(0, 0, 0);
    scene.add(glow);
  }

  // Marcador gigante detrás del arco visitante (lado +x)
  const board = new THREE.Group();
  board.position.set(112, baseY + 6, 0);
  board.rotation.y = -Math.PI / 2;
  scene.add(board);
  const boardCanvas = document.createElement("canvas");
  boardCanvas.width = 1024;
  boardCanvas.height = 512;
  const boardTex = new THREE.CanvasTexture(boardCanvas);
  boardTex.colorSpace = THREE.SRGBColorSpace;
  disposables.push(boardTex);
  const drawBoard = (hc?: HTMLImageElement, ac?: HTMLImageElement) => {
    const g = boardCanvas.getContext("2d")!;
    const w = boardCanvas.width;
    const h = boardCanvas.height;
    g.fillStyle = "#05080c";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#0d141c";
    g.fillRect(16, 16, w - 32, h - 32);
    g.textAlign = "center";
    g.fillStyle = "#4dff9a";
    g.font = "900 34px Arial Black, Arial, sans-serif";
    g.fillText(o.competition.toUpperCase(), w / 2, 70);
    if (hc) g.drawImage(hc, 120, 110, 220, 220);
    if (ac) g.drawImage(ac, w - 340, 110, 220, 220);
    g.fillStyle = "#f3f6fa";
    g.font = "900 150px Arial Black, Arial, sans-serif";
    g.fillText(o.score ?? o.kickoff, w / 2, 280);
    g.font = "700 30px Arial, sans-serif";
    g.fillStyle = "#b5c0cd";
    g.fillText(o.score ? "FINAL" : "HORA URUGUAYA", w / 2, 330);
    g.font = "900 36px Arial Black, Arial, sans-serif";
    g.fillStyle = "#ffffff";
    g.fillText(o.homeName.toUpperCase(), 230, 400);
    g.fillText(o.awayName.toUpperCase(), w - 230, 400);
    g.fillStyle = "#4dff9a";
    g.font = "900 28px Arial Black, Arial, sans-serif";
    g.fillText("VASCO, NO SABÉS NADA", w / 2, 470);
    boardTex.needsUpdate = true;
  };
  drawBoard();
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(44, 22), new THREE.MeshBasicMaterial({ map: boardTex }));
  board.add(boardMesh);
  const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(46, 24, 1.5), new THREE.MeshStandardMaterial({ color: "#161b22", roughness: 0.6 }));
  boardFrame.position.z = -1;
  board.add(boardFrame);
  const boardGlow = new THREE.PointLight("#9fd4ff", 60, 60, 2);
  boardGlow.position.set(104, baseY + 6, 0);
  scene.add(boardGlow);

  // Escudos enfrentados sobre el círculo central
  const loader = new THREE.TextureLoader();
  const crestGroup = new THREE.Group();
  scene.add(crestGroup);
  const crestMeshes: THREE.Mesh[] = [];
  const makeCrest = (url: string, x: number, color: string, img: (i: HTMLImageElement) => void) => {
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), mat);
    m.position.set(x, 9, 0);
    crestGroup.add(m);
    crestMeshes.push(m);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(8, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(x, 0.05, 0);
    crestGroup.add(disc);
    const halo = new THREE.PointLight(color, 120, 40, 2);
    halo.position.set(x, 6, 0);
    crestGroup.add(halo);
    loader.load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      mat.map = t;
      mat.opacity = 1;
      mat.needsUpdate = true;
      disposables.push(t);
      img(t.image as HTMLImageElement);
    });
  };
  let homeImg: HTMLImageElement | undefined;
  let awayImg: HTMLImageElement | undefined;
  makeCrest(o.homeCrest, -11, o.homeColor, (i) => {
    homeImg = i;
    drawBoard(homeImg, awayImg);
  });
  makeCrest(o.awayCrest, 11, o.awayColor, (i) => {
    awayImg = i;
    drawBoard(homeImg, awayImg);
  });
  const vsTex = tex(256, 128, (g, w, h) => {
    g.fillStyle = "#4dff9a";
    g.textAlign = "center";
    g.font = "900 96px Arial Black, Arial, sans-serif";
    g.fillText("VS", w / 2, h / 2 + 34);
  });
  const vs = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: vsTex, transparent: true, depthWrite: false }));
  vs.position.set(0, 8, 0);
  crestGroup.add(vs);

  // Cámara: trayecto con el scroll
  const KEYS = [
    { pos: new THREE.Vector3(-70, 110, 100), look: new THREE.Vector3(0, 0, 0) },
    { pos: new THREE.Vector3(-18, 34, 88), look: new THREE.Vector3(0, 6, 0) },
    { pos: new THREE.Vector3(-4, 7, 44), look: new THREE.Vector3(8, 8, -4) },
  ];
  let progress = 0;
  let smooth = 0;
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  function place(p: number, t: number) {
    const seg = p < 0.5 ? 0 : 1;
    const u = (p - seg * 0.5) / 0.5;
    const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    const a = KEYS[seg];
    const b = KEYS[seg + 1];
    camPos.lerpVectors(a.pos, b.pos, e);
    camLook.lerpVectors(a.look, b.look, e);
    // leve órbita viva
    const wob = o.reduced ? 0 : 1;
    tmpA.set(Math.sin(t * 0.25) * 3 * wob, Math.sin(t * 0.4) * 1.2 * wob, Math.cos(t * 0.25) * 3 * wob);
    tmpB.copy(camPos).add(tmpA);
    camera.position.copy(tmpB);
    camera.lookAt(camLook);
  }

  function resize() {
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 55 : 42;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  let dead = false;
  let raf = 0;
  let last = performance.now();
  const t0 = last;
  function frame(now: number) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - t0) / 1000;
    smooth += (progress - smooth) * (1 - Math.pow(0.002, dt));
    place(smooth, t);
    // escudos flotan y miran a la cámara
    crestMeshes.forEach((m, i) => {
      m.position.y = 9 + Math.sin(t * 1.1 + i) * 0.5;
      m.lookAt(camera.position);
    });
    vs.position.y = 8 + Math.sin(t * 1.4) * 0.3;
    vs.lookAt(camera.position);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    setProgress(p) {
      progress = Math.min(1, Math.max(0, p));
    },
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      renderer.dispose();
    },
  };
}
