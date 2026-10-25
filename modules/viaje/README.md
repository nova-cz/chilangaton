# Línea 3 · Viaje del ciclista

Motor de pronóstico (V2) y recomendación (V3). Funciona solo, con datos de ejemplo, sin esperar a otras líneas.

## Correr

```
pip install fastapi uvicorn numpy duckdb pandas pyarrow pytest
uvicorn modules.viaje.dev_main:app --reload --port 8003
```

Docs: http://localhost:8003/docs · Pruebas: `python -m pytest -q modules/viaje/tests`

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

- Modo **EJEMPLO** (por defecto): `fixtures/` con valores inventados. Las respuestas dicen `"mode": "EJEMPLO"`.
- Modo **REAL**: `DATA_DIR=/ruta/a/data uvicorn ...` usa `data/trips/*.parquet` (rama `data`) para el baseline y las duraciones.
  Pendiente al corte de las 13:00: leer estaciones de `data/stations.parquet` y el estado actual de C1/C2 reales.
