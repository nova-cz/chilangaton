# Arquitectura

```
Navegador (PWA) ──> Vercel: apps/web (Next.js)
                         │  NEXT_PUBLIC_DATA_MODE=demo → shared/fixtures (sin red)
                         │  NEXT_PUBLIC_DATA_MODE=api  → apiGet() ──┐
                                                                    ▼
                    Railway: services/api (FastAPI) ── /health, /docs
                         └─ /api/v1/<rutas de modules/*/router.py>
                         └─ /api/v1/demo/stations (solo DEMO_MODE=true)
```

## Web (`apps/web/src`)
| Carpeta | Contenido |
|---|---|
| `app/` | Rutas: `/` (portada + QR), `/app`, `/panel`, `/panel/simulador`, `manifest.ts`, `sw.ts`, `error.tsx`, `not-found.tsx` |
| `components/ui` | Primitivas (estilo shadcn, sin dependencias extra) |
| `components/map` | `StationMap` (MapLibre, solo cliente, 2D/3D, estados de carga/error) |
| `components/pwa` | Registro del service worker y QR |
| `features/*` | Lógica por funcionalidad (`app`, `panel`, `simulator`, `stations`, `navigation`, `demo`) |
| `lib/` | `config.ts` (env públicas), `api.ts` (cliente FastAPI), `cn.ts` |

**PWA**: `manifest.ts` + Serwist en modo *configurator* (`serwist.config.mjs`), compatible con el build de Turbopack: `next build && serwist build` genera `public/sw.js` (ignorado en git). El SW no se registra en `next dev`.

**Mapa**: MapLibre GL 5 con estilo OpenFreeMap Positron (sin API key, datos OSM). La vista 3D agrega una capa `fill-extrusion` con `render_height` de OpenStreetMap; si el estilo no trae la capa `building`, el botón 3D se deshabilita. Sin WebGL → estado de error con acceso a la lista. Cambiar estilo con `NEXT_PUBLIC_MAP_STYLE_URL`.

**S6 (pendiente)**: `@deck.gl/maplibre` (+ `@deck.gl/layers`, misma versión 9.x) como overlay intercalado (`interleaved: true`) añadido con `map.addControl(overlay)` dentro de `StationMap` (o un `FlowMap` hermano) y `ArcLayer` con origen/destino por estación. Solo en el panel; fallback 2D si no hay WebGL o con `prefers-reduced-motion`.

## API (`services/api`)
- `core/config.py`: variables `APP_ENV`, `DEMO_MODE`, `CORS_ORIGINS` (CSV), `ENABLED_MODULES` (CSV, vacío = todos). Ver `.env.example`.
- `core/modules.py`: descubre `modules/*/router.py`; un módulo que falla no tumba la API y aparece en `/health` → `modules.failed`.
- `core/errors.py`: formato único de error.

## Despliegue
**Vercel** (web): New Project → repo → *Root Directory* `apps/web` → Framework Next.js. Build `npm run build` (incluye Serwist). Variables: ver `apps/web/.env.example`. Deja activa la opción de incluir archivos fuera del root (lee `shared/fixtures`).

**Railway** (API): New Service → repo (root del repo). Usa `railway.json` (Railpack, `uvicorn services.api.main:app --host 0.0.0.0 --port $PORT`, healthcheck `/health`) y `.python-version`. Variables: `DEMO_MODE`, `CORS_ORIGINS=https://<tu-app>.vercel.app`.

Ninguno de los dos requiere secretos para S1.
