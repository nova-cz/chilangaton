# CLAUDE.md · Equilibici 2.0

Guía corta para personas y agentes. Lee también `docs/architecture.md` y `docs/frontend-roadmap.md`.

## Arquitectura
- **Web** `apps/web`: Next.js 16 App Router, React 19, TypeScript estricto, Tailwind 4 (tokens en `src/app/globals.css`), MapLibre GL 5, Serwist (PWA), lucide-react. `cacheComponents` activo.
  - Next 16 tiene cambios: consulta `apps/web/node_modules/next/dist/docs/` antes de usar APIs nuevas.
- **API** `services/api`: FastAPI + Pydantic. `main.py` monta `/health`, `/api/v1/demo/*` (solo con `DEMO_MODE`) y **todos** los `modules/<línea>/router.py` bajo `/api/v1`.
- **Despliegue**: Vercel (root `apps/web`) y Railway (`railway.json` en la raíz). Ver `docs/architecture.md`.

## Rutas y dueños
| Ruta | Dueño |
|---|---|
| `/app`, layout, colores, QR, PWA | Línea 4 (Miguel) — esqueleto |
| `/app/estacion/[id]`, `/app/viaje`, `/app/ajustes` | Línea 3 |
| `/app/anclaje`, `/app/ayuda`, `components/shared` accesibles | Línea 5 |
| `/app/mision/[id]`, `/panel/simulador` | Línea 4 |
| `/panel/bici-util`, `/panel/supervision` | Línea 1 |
| `/panel/taller` | Línea 2 |
| `/panel/casos` | Línea 5 |

Al crear tu ruta, pon `ready: true` en `apps/web/src/features/navigation/routes.ts`.

## Convenciones
- Cada quien edita solo `modules/<su_línea>/` y sus rutas. Nada de tocar módulos ajenos.
- Módulo API: `modules/<línea>/router.py` exporta `router = APIRouter(...)`; se monta solo. Prefijo `/api/v1`. Agrega `engine.py`, `tests/`, `fixtures/` según necesites.
- Errores API: `{"error": {"code", "message"}}`. Fetch desde web con `apiGet()` de `src/lib/api.ts`.
- UI: componentes base en `src/components/ui` (Button, Badge, Card, Segmented, StateMessage). Semáforo **siempre con texto**. Cada mapa tiene lista equivalente.
- Hora: se guarda en UTC, se muestra en hora CDMX.

## DEMO vs. real (regla de honestidad)
- `shared/fixtures/demo-stations.json` es inventado → se muestra con `<DemoBadge/>`. No es contrato.
- Resultados del simulador → `<SimulatedBadge/>`. Nunca cifras de relleno: usa `StateMessage kind="empty"` o `—`.
- Contratos reales (C1–C6): `shared/contracts/` (Pydantic + tipo TS + JSON de ejemplo), los define su dueño. Campos nuevos solo opcionales; nunca renombrar ni quitar en el día.

## Comandos
```bash
cd apps/web && npm run dev | npm run lint | npm run typecheck | npm run build
uvicorn services.api.main:app --reload   # desde la raíz, con .venv activo
pytest                                   # raíz: services/ y modules/
```

## Git
- GitHub Flow: rama por línea desde `origin/main`, PR pequeños en Draft, sin merge automático.
- Prohibido: push a `main`, `--force`, rebase de ramas ajenas, subir `.env`, tokens, `data/`, `appvieja/`, `inspogoal/` o capturas.

## Tareas Línea 4 (Miguel)
- **S1** ✅ esqueleto PWA + FastAPI modular + demo + config de despliegue.
- **S2** contraflujo (sep., 7–10 h, Anzures/Polanco/Reforma → Buenavista/San Rafael) · **S3** simulador 0/5/10/20% · **S4** `/panel/simulador` · **S5** misiones y puntos (P1) · **S6** arcos 3D deck.gl (P1). Detalle en `docs/frontend-roadmap.md`.

## Privacidad y seguridad
- Mínimo de datos; edad y género no entran a modelos. Ninguna alerta acusa a una persona.
- No hay integración oficial: no desbloqueamos bicis, no cerramos viajes, no damos recompensas reales.
- No usar logotipos oficiales. Secretos solo en variables de Vercel/Railway.
