"use client";

import { BikeIllustration } from "@/components/brand/bike-illustration";
import { cn } from "@/lib/cn";
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

/** Three.js se descarga solo cuando hace falta y nunca en el servidor. */
const BikeScene = dynamic(() => import("./bike-scene"), {
  ssr: false,
  loading: () => <BikeIllustration />,
});

function canUse3d() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

const subscribe = () => () => {};

/** Bici 3D de marca (Three.js). Sin WebGL o con movimiento reducido muestra la ilustración SVG. */
export function BikeHero({ className }: { className?: string }) {
  const enabled = useSyncExternalStore(subscribe, canUse3d, () => false);
  return (
    <div className={cn("relative", className)}>
      {enabled ? <BikeScene /> : <BikeIllustration />}
    </div>
  );
}
