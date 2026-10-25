---
name: equilibici-design
description: Sistema de diseño de Equilibici para el front (apps/web). Úsala al crear o editar pantallas, componentes, mapas o animaciones de /app y /panel, para mantener paleta, tipografía, mapa 3D (MapLibre), bici 3D (Three.js) y reglas DEMO.
---

# Equilibici · diseño del front

Lee antes `CLAUDE.md`. Esta skill resume **cómo se ve y se construye** la UI; no la repitas ni la reinventes. Trabaja solo en tus rutas y no cambies tokens ni componentes base sin avisar.

## Ahorra tokens
- No explores todo el repo. Abre solo los archivos de la tabla "Dónde está" que necesites.
- Reutiliza antes de crear: `components/ui/*` ya tiene Button, Badge, Card, Segmented, Ring/Metric, StateMessage.
- Verifica con `npm run lint && npm run typecheck` (rápidos). `npm run build` solo al final, con el dev server detenido (comparten `.next`).
- Capturas: una por estado clave (390×844 y 1440×900), no una por cambio.

## Paleta (tokens en `src/app/globals.css`, nunca hex sueltos en componentes)
| Uso | Token |
|---|---|
| Verde principal / acción | `brand-500` `#009b4d` · texto verde sobre blanco `brand-600` |
| Verde oscuro (barras, CTA base, tarjetas oscuras) | `brand-900` `#063f2e` |
| Pasteles de tarjeta | `brand-100`, `lime-100`, `mist-100` |
| CTA sobre fondo oscuro | `lime-300` (Button `variant="lime"`) |
| Texto | `ink`, `ink-muted`, `ink-soft` · fondo `surface` |
| Semáforo | `brand-500/400` ok · `warning-500` poco · `danger-500` crítico |

Reglas: semáforo **siempre con texto** (nunca solo color) · contraste AA (`warning-700`, `danger-700` para texto) · tarjetas redondeadas (`rounded-3xl`, sheets `--radius-sheet`) · números grandes con unidad pequeña (`Metric`) · iconos `lucide-react` · nada de fotos, logos ni modelos de terceros.

## Superficies y layout móvil (390×844 primero)
- `glass`: vidrio para header, búsqueda y chips sobre el mapa. `opaque-pane`: casi opaco para sheet, nav y paneles con texto (el mapa no debe transparentarse bajo el texto).
- **Nada se encima**: una sola columna en el header (marca → búsqueda → chips). Los controles flotantes del mapa (2D/3D, encuadrar) van **dentro del bottom sheet**, pegados a su borde superior; no los posiciones con `top-[Npx]`.
- Probar 320, 360, 390, 768 y 1440. Chips y botones sin `overflow` que corte sombras; en <371 px se oculta lo secundario.
- Safe areas: `pt-safe`, `pb-safe`. Alto con `dvh`, nunca `vh`.

## Movimiento
- Keyframes en `globals.css`: `animate-rise` (entrada con escalonado vía `animationDelay`), `animate-pop` (resorte al seleccionar), `animate-sheet-in`. Duración 200–450 ms, curva `cubic-bezier(0.22,1,0.36,1)`.
- `prefers-reduced-motion` ya reduce transiciones globales; en JS (mapa, Three) revisa `matchMedia("(prefers-reduced-motion: reduce)")` y salta la animación.
- Anima solo `transform` y `opacity`.

## Mapa 3D (MapLibre)
- Archivos: `components/map/station-map.tsx` (cámara, columnas, marcadores) y `components/map/brand-style.ts` (estilo, luz, bruma, edificios).
- Estilo: Positron recoloreado en `applyBrandStyle` (grises cálidos, verdes suaves). Cambia colores allí, no en el componente.
- Cámara 3D por defecto `pitch 60 / bearing -20`; los edificios solo existen desde zoom ≈13. `view3d` por defecto es `false` en el componente (lo usa `/panel` en 2D); `/app` pasa `true`.
- Estaciones = columnas `fill-extrusion` (altura = bicis × 7 m, mínimo 4 m) + marcador HTML con el número, elevado según zoom y pitch (`updateLifts`).
- **Siempre protege el estilo remoto**: `map.getStyle()?.…` y `isStyleLoaded()`; con internet lento puede ser `undefined`.
- Todo mapa necesita su lista equivalente y etiqueta DEMO visible.

## Bici 3D (Three.js)
- Archivos: `components/three/bike-scene.tsx` (escena) y `components/three/bike-hero.tsx` (wrapper). Usa `<BikeHero className="h-44 w-full" />`; no importes `three` en otros sitios.
- Carga perezosa (`dynamic`, `ssr:false`); sin WebGL o con reduced motion muestra `BikeIllustration` (SVG).
- Modelo propio con primitivas (tubos, toroides, cilindros) en `brand-500`, `brand-900`, `lime-300`. Para nuevos modelos: mismas primitivas y paleta, helper `tube(a,b,r,mat,…)`, y **liberar** geometrías, materiales y renderer al desmontar. Pausar el render fuera de pantalla (`IntersectionObserver`).

## Patrones de pantalla
- **Bottom sheet** (`features/app/bottom-sheet.tsx`): dos alturas (compacta/expandida), arrastre con velocidad, botón-asa accesible. Altura expandida = espacio disponible − 188 px (no tapa header ni chips).
- **Tarjetas de dato**: pastel + número `text-4xl/5xl` + etiqueta pequeña; barras `brand-900` con CTA lima.
- **Chips de filtro** (`filter-chips.tsx`): `role="radiogroup"`, con conteo real.
- **Navegación inferior** con indicador deslizante (`bottom-nav.tsx`); rutas de otras líneas se muestran deshabilitadas hasta `ready: true`.

## Honestidad de datos
- Fixtures de `shared/fixtures/` → `<DemoBadge/>` visible. Simulador → `<SimulatedBadge/>`. Sin cifras inventadas: usa `—` o `StateMessage kind="empty"`.
- No prometas recompensas, desbloqueos ni integración con ECOBICI.
- Prohibido subir `.env`, `data/`, `appvieja/`, `inspogoal/` o capturas.

## Dónde está
`globals.css` (tokens, utilidades) · `components/ui/` · `components/brand/` (logo, SVG) · `components/map/` · `components/three/` · `features/app/` (pantalla `/app`) · `features/stations/status.ts` (semáforo).

## Antes de abrir el PR
1. Sin hex nuevos ni librerías nuevas sin avisar. 2. Se ve bien a 320 y 1440, sin elementos encimados. 3. Reduced motion y sin WebGL funcionan. 4. DEMO visible y texto en cada semáforo. 5. `lint` + `typecheck` (+ `build`). 6. PR pequeño en Draft, sin `--force`, sin merge a `main`.
