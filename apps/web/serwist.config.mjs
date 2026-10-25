// Serwist en modo "configurator": compatible con el build de Turbopack de Next 16.
// Se ejecuta después de `next build` (ver script "build").
import { serwist } from "@serwist/next/config";

export default serwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});
