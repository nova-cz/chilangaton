"use client";

import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  MeshBasicMaterial,
  type BufferGeometry,
  type Material,
  type Object3D,
  type Texture,
} from "three";
import { useEffect, useRef } from "react";

/** Paleta de marca (tokens de globals.css). */
const C = {
  frame: "#009b4d",
  frameDark: "#063f2e",
  lime: "#cdee8a",
  tire: "#0f2a20",
  steel: "#c9d6cf",
  pastel: ["#ddf3e4", "#f1fadc", "#eceffa", "#b9e6c9", "#ffffff"],
  ground: "#e9f1ec",
};

const Y_AXIS = new Vector3(0, 1, 0);

/** Cilindro entre dos puntos. */
function tube(a: Vector3, b: Vector3, radius: number, material: Material, parent: Object3D, geometries: BufferGeometry[]) {
  const dir = new Vector3().subVectors(b, a);
  const geometry = new CylinderGeometry(radius, radius, dir.length(), 10);
  geometries.push(geometry);
  const mesh = new Mesh(geometry, material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.copy(new Quaternion().setFromUnitVectors(Y_AXIS, dir.normalize()));
  parent.add(mesh);
  return mesh;
}

type Materials = Record<"frame" | "frameDark" | "lime" | "limeSoft" | "tire" | "steel", Material>;

function makeWheel(materials: Materials, geometries: BufferGeometry[]) {
  const wheel = new Group();
  const tire = new TorusGeometry(0.34, 0.034, 10, 40);
  const rim = new TorusGeometry(0.295, 0.012, 8, 40);
  const hub = new CylinderGeometry(0.035, 0.035, 0.1, 12);
  geometries.push(tire, rim, hub);
  wheel.add(new Mesh(tire, materials.tire));
  wheel.add(new Mesh(rim, materials.lime));
  const hubMesh = new Mesh(hub, materials.steel);
  hubMesh.rotation.x = Math.PI / 2;
  wheel.add(hubMesh);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const end = new Vector3(Math.cos(angle) * 0.3, Math.sin(angle) * 0.3, 0);
    tube(new Vector3(), end, 0.004, materials.steel, wheel, geometries);
  }
  return wheel;
}

function buildBike(materials: Materials, geometries: BufferGeometry[]) {
  const bike = new Group();
  const rearHub = new Vector3(-0.52, 0.34, 0);
  const frontHub = new Vector3(0.52, 0.34, 0);
  const bb = new Vector3(-0.04, 0.28, 0);
  const seatTop = new Vector3(-0.2, 0.8, 0);
  const headTop = new Vector3(0.36, 0.82, 0);
  const headBottom = new Vector3(0.4, 0.66, 0);

  const rearWheel = makeWheel(materials, geometries);
  const frontWheel = makeWheel(materials, geometries);
  rearWheel.position.copy(rearHub);
  frontWheel.position.copy(frontHub);
  bike.add(rearWheel, frontWheel);
  const wheels = [rearWheel, frontWheel];

  const frame = materials.frame;
  tube(bb, seatTop, 0.026, frame, bike, geometries);
  tube(bb, headBottom, 0.032, frame, bike, geometries);
  tube(seatTop, headTop, 0.026, frame, bike, geometries);
  tube(headBottom, headTop, 0.036, materials.frameDark, bike, geometries);
  for (const z of [0.05, -0.05]) {
    tube(rearHub.clone().setZ(z), bb.clone().setZ(z), 0.017, frame, bike, geometries);
    tube(rearHub.clone().setZ(z), seatTop.clone().setZ(z * 0.4), 0.014, frame, bike, geometries);
    tube(headBottom.clone().setZ(z), frontHub.clone().setZ(z), 0.017, materials.frameDark, bike, geometries);
  }

  // Manubrio, tija y sillín.
  const stemTop = new Vector3(0.33, 0.95, 0);
  tube(headTop, stemTop, 0.02, materials.frameDark, bike, geometries);
  tube(stemTop.clone().setZ(-0.26), stemTop.clone().setZ(0.26), 0.017, materials.frameDark, bike, geometries);
  for (const z of [0.27, -0.27]) {
    const grip = new CylinderGeometry(0.024, 0.024, 0.09, 10);
    geometries.push(grip);
    const mesh = new Mesh(grip, materials.lime);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(0.33, 0.95, z);
    bike.add(mesh);
  }
  tube(seatTop, new Vector3(-0.22, 0.92, 0), 0.02, materials.steel, bike, geometries);
  const saddle = new BoxGeometry(0.28, 0.05, 0.14);
  geometries.push(saddle);
  const saddleMesh = new Mesh(saddle, materials.frameDark);
  saddleMesh.position.set(-0.2, 0.95, 0);
  bike.add(saddleMesh);

  // Canasta delantera en lima.
  const basket = new BoxGeometry(0.26, 0.15, 0.34);
  geometries.push(basket);
  const basketMesh = new Mesh(basket, materials.limeSoft);
  basketMesh.position.set(0.55, 0.84, 0);
  bike.add(basketMesh);
  tube(headTop, new Vector3(0.5, 0.78, 0), 0.016, materials.steel, bike, geometries);

  // Plato y pedales.
  const ring = new TorusGeometry(0.085, 0.012, 8, 24);
  geometries.push(ring);
  const ringMesh = new Mesh(ring, materials.steel);
  ringMesh.position.set(bb.x, bb.y, 0.07);
  bike.add(ringMesh);
  const crank = new Group();
  crank.position.copy(bb);
  const arm = new Vector3(0.11, -0.09, 0);
  tube(new Vector3(0, 0, 0.09), new Vector3(arm.x, arm.y, 0.09), 0.014, materials.steel, crank, geometries);
  tube(new Vector3(0, 0, -0.09), new Vector3(-arm.x, -arm.y, -0.09), 0.014, materials.steel, crank, geometries);
  const pedal = new BoxGeometry(0.1, 0.02, 0.06);
  geometries.push(pedal);
  const p1 = new Mesh(pedal, materials.frameDark);
  p1.position.set(arm.x, arm.y, 0.13);
  const p2 = new Mesh(pedal, materials.frameDark);
  p2.position.set(-arm.x, -arm.y, -0.13);
  crank.add(p1, p2);
  bike.add(crank);

  return { bike, wheels, crank };
}

/** Mini ciudad low-poly detrás de la bici (bloques procedurales, determinista). */
function buildCity(geometries: BufferGeometry[], materials: Material[]) {
  const city = new Group();
  const mats = C.pastel.map((hex) => {
    const m = new MeshStandardMaterial({ color: new Color(hex), roughness: 0.85, flatShading: true });
    materials.push(m);
    return m;
  });
  const blocks: Array<[number, number, number, number, number]> = [
    // x, z, ancho, alto, material
    [-1.0, -0.95, 0.5, 1.15, 0],
    [-0.4, -1.12, 0.42, 0.7, 2],
    [0.15, -1.0, 0.5, 1.5, 3],
    [0.75, -1.1, 0.4, 0.85, 1],
    [1.25, -0.8, 0.5, 1.05, 4],
    [-1.45, -0.3, 0.42, 0.65, 1],
    [1.6, -0.15, 0.4, 0.55, 2],
    [-1.55, 0.45, 0.36, 0.45, 0],
  ];
  for (const [x, z, w, h, m] of blocks) {
    const geometry = new BoxGeometry(w, h, w);
    geometries.push(geometry);
    const material = mats[m];
    if (!material) continue;
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, h / 2 + 0.04, z);
    city.add(mesh);
  }
  return city;
}

function shadowTexture(): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, "rgba(6,63,46,0.38)");
  g.addColorStop(1, "rgba(6,63,46,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}

/** Escena Three.js: bici low-poly de marca girando lento sobre una plataforma con mini ciudad. */
export default function BikeScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block";

    const geometries: BufferGeometry[] = [];
    const materialList: Material[] = [];
    const std = (hex: string, extra: Partial<{ metalness: number; roughness: number; transparent: boolean; opacity: number }> = {}) => {
      const m = new MeshStandardMaterial({ color: new Color(hex), roughness: 0.5, metalness: 0.15, ...extra });
      materialList.push(m);
      return m;
    };
    const materials: Materials = {
      frame: std(C.frame, { roughness: 0.35, metalness: 0.3 }),
      frameDark: std(C.frameDark, { roughness: 0.5 }),
      lime: std(C.lime, { roughness: 0.4 }),
      limeSoft: std(C.lime, { roughness: 0.6, transparent: true, opacity: 0.8 }),
      tire: std(C.tire, { roughness: 0.9, metalness: 0 }),
      steel: std(C.steel, { roughness: 0.3, metalness: 0.7 }),
    };

    const scene = new Scene();
    scene.add(new HemisphereLight(0xffffff, 0xcfe8d6, 1.6));
    scene.add(new AmbientLight(0xffffff, 0.35));
    const sun = new DirectionalLight(0xfff4dc, 2.4);
    sun.position.set(3, 5, 3);
    scene.add(sun);

    const stage = new Group();
    scene.add(stage);

    const diskGeometry = new CylinderGeometry(1.9, 1.95, 0.08, 48);
    geometries.push(diskGeometry);
    const disk = new Mesh(diskGeometry, std(C.ground, { roughness: 0.9, metalness: 0 }));
    disk.position.y = -0.04;
    stage.add(disk);

    stage.add(buildCity(geometries, materialList));

    const { bike, wheels, crank } = buildBike(materials, geometries);
    bike.position.set(0, 0.04, 0.2);
    stage.add(bike);

    const shadowMap = shadowTexture();
    const shadowGeometry = new PlaneGeometry(1.9, 0.9);
    geometries.push(shadowGeometry);
    const shadowMaterial = new MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false });
    materialList.push(shadowMaterial);
    const shadow = new Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.045, 0.2);
    stage.add(shadow);

    const camera = new PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0.4, 2.1, 5.2);
    camera.lookAt(0, 0.55, 0);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let raf = 0;
    let visible = true;
    let last = performance.now();
    stage.rotation.y = -0.6;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      stage.rotation.y += dt * 0.35;
      for (const wheel of wheels) wheel.rotation.z -= dt * 2.4;
      crank.rotation.z -= dt * 2.4;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    io.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      observer.disconnect();
      for (const g of geometries) g.dispose();
      for (const m of materialList) m.dispose();
      shadowMap.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="size-full" aria-hidden />;
}
