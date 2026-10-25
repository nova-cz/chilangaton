# Línea 2 · Taller (bicis dañadas y riesgo de pérdida)

Endpoints bajo `/api/v1/taller`:

| Ruta | Qué devuelve | Contrato |
| --- | --- | --- |
| `GET /priority?at&limit&ids` | Estaciones para el taller, de mayor a menor prioridad (bicis ignoradas × salidas en pico) | C2 |
| `GET /ignored?at` | Bicis ignoradas y bicis sin movimiento 3+ días, con resumen | — |
| `GET /loss-risk?at&limit&ids` | Bicis que dejan de aparecer por estación y franja. Riesgo, no robo comprobado | C6 |
| `GET /validation` | ¿Las bicis ignoradas desaparecen más de 72 h más seguido que las demás? | — |
| `GET /reports?station_id`, `POST /reports` | Reportes de bicis dañadas (duplicados del mismo usuario en 30 min cuentan una vez) | C4 |

`ids=ce` (por defecto) pone el código CE del CSV en `station_id` (lo que ya leen las Líneas 1 y 3); `ids=feed` pone el
`station_id` del feed. El código CE viaja siempre en `short_name`. El mapa está en `real/stations_map.json`.

## Modos de datos

| Modo | Cuándo | Qué usa |
| --- | --- | --- |
| REAL en vivo | `DATA_DIR=data` con `data/trips/trips_*.parquet` | Calcula con los viajes (`at` en hora CDMX) |
| REAL snapshot | Sin `DATA_DIR` y con `real/c2_priority.json` | Foto exportada del 29 sep 7:45; ignora `at` |
| EJEMPLO | Sin nada de lo anterior, o `TALLER_MODE=ejemplo` | `shared/contracts/*.example.json` |

## Regenerar el snapshot

```
set "DATA_DIR=%CD%\data"
python -m modules.taller.export_real [--at 2026-09-29T07:45] [--skip-validation]
```

Escribe en `real/`: `c2_priority.json` y `.feed.json`, `c6_loss_risk.json` y `.feed.json`, y `validation.json`.

Pruebas: `pytest modules/taller`.

## Pendiente

- `empty_share` en C2: falta el feed de septiembre de la Línea 1.
- D5: regla "reporte y retiro del mismo usuario en 5 min" y confianza del reporte.
- Pantalla `/panel/taller` (D6).
