# Línea 1 · Bici Útil y supervisión

Medidor de bici útil (U2), reloj de 36 h (U3) e indicadores del contrato (U4). Funciona solo, con datos de ejemplo, sin esperar a otras líneas.

## Correr

```
uvicorn modules.bici_util.dev_main:app --reload --port 8001                 # EJEMPLO
DATA_DIR=data uvicorn modules.bici_util.dev_main:app --reload --port 8001   # REAL
```

Docs: http://localhost:8001/docs · Pruebas: `python -m pytest -q modules/bici_util`

## Endpoints (`/api/v1/bici-util`)

| Ruta | Para qué |
|---|---|
| `GET /stations?at` | Contrato **C1** (Líneas 3 y 4) y mapa/tabla de `/panel/bici-util` |
| `GET /stations/{id}?at` | Una estación |
| `GET /hourly` | Perfil del sistema por hora CDMX (días hábiles): gráfica del panel |
| `GET /clock?at&limit_h` | Reloj de 36 h: estaciones fuera de plazo con horas acumuladas |
| `GET /contract?at` | Los tres indicadores para `/panel/supervision` |

`at` fija la hora de la demo (hora CDMX), p. ej. `2026-09-29T08:00`. Sin `at`, la última foto.
Prueba rápida: `/api/v1/bici-util/stations/141?at=2026-09-29T08:00` (Buenavista CE-271-272).

## Pantallas (U5)

- `/panel/bici-util`: 4 KPI de la foto, mapa 2D (MapLibre, capa de círculos) con tabla equivalente, detalle por estación y gráfica por hora con versión en tabla.
- `/panel/supervision`: los 3 indicadores con "cumple / no cumple", estaciones vacías por hora contra 6% y tabla del reloj de 36 h.
- Datos: con `NEXT_PUBLIC_DATA_MODE=api` leen `/api/v1/bici-util/*`; si no, la foto REAL grabada en `apps/web/src/features/bici-util/demo-snapshot.json` (29 sep 8:00). Si la API falla, se muestra la foto grabada con etiqueta DEMO.
- Regenerar la foto: `DATA_DIR=data python -m modules.bici_util.export_demo`.
- Pasan axe-core (WCAG 2.2 AA) y no hay desborde horizontal a 375 px.

## Cómo calcula

- **IDs:** `station_id` es el del feed GBFS, no el código CE. Buenavista CE-271-272 es `141`; CE-014 Reforma–Río de Plata es `267`. El código CE va en `short_name`.
- **Bici útil** = `bikes_available − suspected_expected` (C2). Las deshabilitadas no se restan otra vez. Quien consume C1 **no** resta C2 de nuevo.
- **Estación cerrada** (`is_installed` o `is_renting` en falso): bici útil 0 y sus deshabilitadas no cuentan.
- **Servicio:** los indicadores excluyen 0:30–5:00 CDMX. De noche el feed marca el 99% de las estaciones como cerradas, así que el reloj ignora esas fotos en lugar de reiniciarse.
- **Reloj de 36 h:** horas seguidas con al menos una bici deshabilitada en una estación abierta. Un hueco del feed de más de 6 h corta la racha. El feed solo da conteos: no sabemos si es la misma bici.
- **% vacía:** fotos de estaciones abiertas en servicio con `bikes_available = 0`, contra el máximo de 6%.

## Datos

| Modo | Cómo se activa | Qué usa |
|---|---|---|
| EJEMPLO | Por defecto | 6 estaciones reales con fotos sintéticas (semilla fija) |
| REAL | `DATA_DIR=data` | `data/feed/*.parquet` (MaxHalford, UTC) |
| Sospechosas | `C2_FILE=ruta.json` | Sin esto, el ejemplo de `fixtures/` y la respuesta dice `c2_mode: EJEMPLO` |

## Cifras con el feed real (1 ago – 30 sep 2026)

| Indicador | Valor |
|---|---|
| % del tiempo con estaciones vacías | 14.0% (19.6% en 8:00 y 18:00) contra el máximo de 6% |
| Bici útil promedio a las 5:00 → 8:00 → 18:00 | 4,821 → 3,753 → 3,321 (pico = 69% de las 5:00) |
| % de ancladas deshabilitadas a las 8:00 / 18:00 | 14.4% / 21.2% |
| Episodios de más de 36 h en septiembre | 1,001 en 517 estaciones; 30 a 41 estaciones fuera de plazo a la vez |
| Buenavista (141) 29 sep 8:00 | 3 disponibles, 7 deshabilitadas, 48 h en el reloj; vacía 24% del tiempo a esa hora |

Pendiente: cuadrar contra la Fase 4 (16.2% vacía, 618 y 95 en el reloj) con sus scripts `extract_bsh.py` y `analyze_bsh.py`.
