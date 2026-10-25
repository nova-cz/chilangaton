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
| EJEMPLO | Por defecto | `fixtures/` con valores inventados |
| VIVO | `LIVE=1` | Estaciones e inventario reales de ahorita desde el feed GBFS (dos JSON chicos); demanda aún de ejemplo |
| REAL | `LIVE=1 DATA_DIR=/ruta/a/data` | Lo anterior + demanda y duraciones reales de `data/trips/*.parquet` (rama `data`) |

Ejemplo: `LIVE=1 DATA_DIR=~/Desktop/chilangaton-data/data uvicorn services.api.main:app --reload`

La respuesta siempre dice en `mode` qué datos usó. Pendiente: restar las sospechosas reales de C2 (Línea 2) cuando exista su endpoint.
