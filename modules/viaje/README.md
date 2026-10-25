# Línea 3 · Viaje del ciclista

Motor de pronóstico (V2) y recomendación (V3). Funciona solo, con datos de ejemplo, sin esperar a otras líneas.

## Correr

Sigue la estructura de la API común (`services/api`, rama de Miguel): `services/api/main.py` monta solo
este `router.py` en `/api/v1`. Desde la raíz del repo:

```
pip install -r requirements-dev.txt
uvicorn services.api.main:app --reload
```

Docs: http://localhost:8000/docs · Pruebas: `pytest modules/viaje`


## Endpoints (`/api/v1/viaje`)

| Ruta | Para qué pantalla |
|---|---|
| `GET /nearby?lat&lon&at` | `/app` inicio: lista de estaciones cercanas con bicis útiles, semáforo y texto |
| `GET /stations/{id}/forecast?at` | `/app/estacion/[id]` y contrato **C3** para la Línea 4 |
| `GET /recommendations?origin&destination&at&walk_to_origin&max_walk&accept_alt&avoid_effort` | `/app/viaje`: probabilidad en origen y destino, alternativas con minutos de gracia y consejo en texto |

`at` fija la hora de la demo (hora CDMX), por ejemplo `2026-09-29T07:45`. Sin `at` usa la hora actual.

Prueba rápida: `/api/v1/viaje/recommendations?origin=271&destination=14&at=2026-09-29T07:45`

## Cómo calcula

- Baseline: salidas y llegadas promedio por estación, bloque de 15 min y tipo de día (28 días).
- Inventario inicial: `useful_bikes` (C1, Línea 1) − `suspected_expected` (C2, Línea 2), recortado a la capacidad efectiva (capacidad − anclajes descompuestos).
- 500 escenarios Poisson hasta la hora de llegada → `p_useful_bike` y `p_free_dock`.
- Semáforo: verde ≥ 80%, amarillo 50–80%, rojo < 50% (a calibrar). Siempre con texto.
- Alternativas: estaciones a ≤ `max_walk` min caminando del destino (75 m/min), con más probabilidad de lugar; puntaje = probabilidad − 0.03 × minutos caminando.
- Gracia: el mayor entre 10 min y el doble del desvío.
- Duración del viaje: mediana real entre el par de estaciones; si no hay, distancia a 12 km/h.
- Preferencias: `avoid_effort` limita la caminata a 2 min; `accept_alt=false` no ofrece alternativas.

## Datos

| Modo | Cómo se activa | Qué usa |
|---|---|---|
| **REAL** | Existe `modules/viaje/real/` (se genera abajo) | Viajes de sep 2026 (baseline de 28 días y duraciones) + estado del feed el martes 29 a las 7:45 |
| EJEMPLO | No existe `real/`, o `VIAJE_MODE=ejemplo` | `fixtures/` con 6 estaciones inventadas (pruebas y respaldo) |
| VIVO | `LIVE=1` | Estado de ahorita desde el feed GBFS; demanda de ejemplo |

### Generar `real/` con los archivos del Drive

Baja del Drive del equipo a `data/` (no se sube a git): `public_data_web_2026-09.csv`,
`public_data_web_2026-08_2.csv`, `Sep.parquet` y `station_information.json`. Luego, desde la raíz:

```
python -m modules.viaje.build_real --trips data/public_data_web_2026-09.csv data/public_data_web_2026-08_2.csv --feed data/Sep.parquet --info data/station_information.json
python -m modules.viaje.export_demo     # actualiza el escenario de la web (modo demo)
```

`real/` sí se sube: son promedios por estación y bloque, sin bicis, edades ni géneros. `real/meta.json`
dice qué archivos se usaron y trae avisos (códigos sin pareja, huecos del feed).
En modo REAL el `station_id` es el número de la estación (el del letrero), p. ej. `271`.

La respuesta siempre dice en `mode` qué datos usó. Pendiente: restar las sospechosas reales de C2 (Línea 2):
basta con dejar `real/c2_priority.json` (`[{station_id, suspected_expected}]`).
