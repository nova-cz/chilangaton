# Equilibici 2.0

Prototipo para el **Chilangotón 2026**: una PWA (app ciudadana `/app` + panel operativo `/panel`) sobre un motor en Python (FastAPI).
Proyecto independiente, **sin afiliación con ECOBICI**, su operador ni Semovi. Todo dato marcado **DEMO** es inventado; todo resultado marcado **SIMULADO** viene de un simulador.

## Arranque local

Requisitos: Node ≥ 20.9, Python ≥ 3.12.

```bash
# Web (http://localhost:3000)
cd apps/web
npm install
npm run dev

# API (http://localhost:8000/health · docs en /docs) — desde la raíz del repo
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
LIVE=1 uvicorn services.api.main:app --reload
```

Viaje consulta la API por defecto y actualiza el planeador cada minuto cuando no está corriendo el contador. El mapa de `/app` conserva sus 12 estaciones DEMO. Para ensayar sin API, inicia la web con `NEXT_PUBLIC_DATA_MODE=demo npm run dev`: se identifica como repetición histórica, no como estado en vivo. Si ya tienes `.env.local` con `NEXT_PUBLIC_DATA_MODE=demo`, cambia esa variable a `api` para conectarte al feed.

Verificación: `npm run lint && npm run typecheck && npm run build` (en `apps/web`) y `pytest` (en la raíz).

## Estructura

```
apps/web/            Next.js 16 (App Router) + Tailwind 4 + MapLibre + Serwist
services/api/        FastAPI: main.py, core/ (config, errores, cargador de módulos), routers/ (health, demo)
modules/<línea>/     Un paquete por línea con router.py (se monta solo en /api/v1)
shared/fixtures/     Datos DEMO compartidos por web y API
shared/contracts/    Contratos entre líneas (los publica cada dueño)
docs/                architecture.md · frontend-roadmap.md
```

Los datos reales viven en la rama `data` (ver su README); `data/` está en `.gitignore`.

Más detalle: [`docs/architecture.md`](docs/architecture.md) · Guía para agentes y equipo: [`CLAUDE.md`](CLAUDE.md).
