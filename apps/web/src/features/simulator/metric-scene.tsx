"use client";

import {
  AmbientLight, BufferGeometry, Color, DirectionalLight, Float32BufferAttribute,
  Group, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial,
  OrthographicCamera, Raycaster, Scene, SphereGeometry, TorusGeometry,
  Vector2, WebGLRenderer, type Material,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useEffect, useRef } from "react";
import { CHART_COLORS } from "./chart-palette";

interface Props {
  kind: "bars" | "ring";
  values: number[];
  selected: number;
  ratio?: number;
  maximum?: number;
  onSelect?: (index: number) => void;
  onUnavailable: () => void;
}

/** Escenas sin bucle permanente: solo renderizan al cambiar datos, selección o tamaño. */
export default function MetricScene(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  const runtime = useRef<{ update: () => void } | null>(null);
  const { kind, onUnavailable } = props;

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      onUnavailable();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0, 0);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
    container.appendChild(renderer.domElement);
    const scene = new Scene();
    scene.add(new AmbientLight(0xffffff, 1.7));
    const light = new DirectionalLight(0xffffff, 3);
    light.position.set(-3, 6, 7);
    scene.add(light);
    const camera = new OrthographicCamera(-4, 4, 3, -3, 0.1, 50);
    camera.position.set(0, kind === "bars" ? 4 : 0, 10);
    camera.lookAt(0, kind === "bars" ? 2 : 0, 0);
    const geometries: BufferGeometry[] = [];
    const materials: Material[] = [];
    const material = (color: string) => {
      const m = new MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.12 });
      materials.push(m);
      return m;
    };
    const bars: Mesh<RoundedBoxGeometry, MeshStandardMaterial>[] = [];
    const heights = [0, 0, 0, 0];
    const targets = [0, 0, 0, 0];
    const barGeometry = new RoundedBoxGeometry(0.8, 1, 0.55, 4, 0.08);
    geometries.push(barGeometry);
    const ring = new Group();
    scene.add(ring);
    const ringMaterials = [material("#cdee8a"), material("#a58bea")];
    const arcs: Mesh<TorusGeometry, MeshStandardMaterial>[] = [];
    const caps: Mesh<SphereGeometry, MeshStandardMaterial>[] = [];

    if (kind === "bars") {
      for (let i = 0; i < 4; i++) {
        const m = material(CHART_COLORS[i] ?? CHART_COLORS[0]);
        const bar = new Mesh(barGeometry, m);
        bar.userData.index = i;
        bars.push(bar);
        scene.add(bar);
      }
      const grid = new BufferGeometry();
      grid.setAttribute("position", new Float32BufferAttribute([0, 1.25, 2.5, 3.75].flatMap((y) => [-20, y, -0.65, 20, y, -0.65]), 3));
      const lines = new LineBasicMaterial({ color: "#afc8bc", transparent: true, opacity: 0.16 });
      geometries.push(grid);
      materials.push(lines);
      scene.add(new LineSegments(grid, lines));
    } else {
      ring.rotation.set(0.08, -0.12, 0);
      const capGeometry = new SphereGeometry(0.13, 16, 12);
      geometries.push(capGeometry);
      for (let i = 0; i < 2; i++) {
        const geometry = new TorusGeometry(1.55, 0.13, 12, 100);
        const arc = new Mesh(geometry, ringMaterials[i]);
        arcs.push(arc);
        ring.add(arc);
        for (let j = 0; j < 2; j++) {
          const cap = new Mesh(capGeometry, ringMaterials[i]);
          caps.push(cap);
          ring.add(cap);
        }
      }
    }

    let raf = 0;
    let from = [...heights];
    let started = performance.now();
    const draw = (now: number) => {
      const t = Math.min(1, (now - started) / 550);
      const ease = 1 - (1 - t) ** 3;
      bars.forEach((bar, i) => {
        const start = from[i] ?? 0;
        const height = start + ((targets[i] ?? 0) - start) * ease;
        heights[i] = height;
        bar.visible = height > 0;
        bar.scale.y = Math.max(0.0001, height);
        bar.position.y = height / 2;
      });
      ring.scale.setScalar(0.95 + ease * 0.05);
      renderer.render(scene, camera);
      raf = t < 1 ? requestAnimationFrame(draw) : 0;
    };
    const animate = () => {
      cancelAnimationFrame(raf);
      from = [...heights];
      started = performance.now();
      raf = requestAnimationFrame(draw);
    };
    const update = () => {
      const current = latest.current;
      const max = current.maximum ?? Math.max(1, ...current.values);
      bars.forEach((bar, i) => {
        targets[i] = (Math.max(0, current.values[i] ?? 0) / max) * 3.9;
        bar.material.emissive = new Color(CHART_COLORS[i]);
        bar.material.emissiveIntensity = i === current.selected ? 0.18 : 0;
        bar.material.opacity = i === current.selected ? 1 : 0.8;
        bar.material.transparent = true;
      });
      const ratio = Math.max(0, Math.min(1, current.ratio ?? 0));
      const portions = [ratio, 1 - ratio];
      arcs.forEach((arc, i) => {
        const start = Math.PI / 2 + (i === 0 ? 0 : ratio * Math.PI * 2) + 0.04;
        const portion = portions[i] ?? 0;
        const length = Math.max(0.001, portion * Math.PI * 2 - 0.08);
        arc.geometry.dispose();
        arc.geometry = new TorusGeometry(1.55, 0.13, 12, 100, length);
        arc.rotation.z = start;
        arc.visible = portion > 0;
        for (let j = 0; j < 2; j++) {
          const cap = caps[i * 2 + j];
          if (!cap) continue;
          const angle = start + j * length;
          cap.position.set(Math.cos(angle) * 1.55, Math.sin(angle) * 1.55, 0);
          cap.visible = arc.visible;
        }
      });
      animate();
    };
    runtime.current = { update };
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      if (!w || !h) return;
      const aspect = w / h;
      const vertical = kind === "ring" ? 4.1 : 5.7;
      camera.left = -(vertical * aspect) / 2;
      camera.right = (vertical * aspect) / 2;
      camera.top = vertical / 2;
      camera.bottom = -vertical / 2;
      camera.updateProjectionMatrix();
      bars.forEach((bar, i) => {
        bar.position.x = (i - 1.5) * ((vertical * aspect) / 4);
        bar.scale.x = (vertical * aspect) / 8;
      });
      // El anillo conserva proporciones aunque el contenedor sea estrecho.
      if (kind === "ring" && aspect < 1) {
        camera.top /= aspect;
        camera.bottom /= aspect;
        camera.left /= aspect;
        camera.right /= aspect;
        camera.updateProjectionMatrix();
      }
      renderer.setSize(w, h, false);
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    update();
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const pick = (event: PointerEvent | MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(bars, false)[0]?.object.userData.index as number | undefined;
    };
    const click = (event: MouseEvent) => {
      const index = pick(event);
      if (index !== undefined) latest.current.onSelect?.(index);
    };
    const hover = (event: PointerEvent) => { renderer.domElement.style.cursor = pick(event) === undefined ? "default" : "pointer"; };
    renderer.domElement.addEventListener("click", click);
    renderer.domElement.addEventListener("pointermove", hover);
    renderer.domElement.addEventListener("webglcontextlost", onUnavailable);
    return () => {
      runtime.current = null;
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener("click", click);
      renderer.domElement.removeEventListener("pointermove", hover);
      renderer.domElement.removeEventListener("webglcontextlost", onUnavailable);
      arcs.forEach((arc) => arc.geometry.dispose());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [kind, onUnavailable]);

  useEffect(() => {
    latest.current = props;
    runtime.current?.update();
  }, [props]);

  return <div ref={host} className="h-full w-full" aria-hidden="true" />;
}
