# Roadmap Línea 4 (S2–S6) y contratos por coordinar

## Alcance y estado
| ID | Qué | Dónde | Hecho cuando |
|---|---|---|---|
| S2 | Análisis de contraflujo | `modules/distribucion/contraflujo.py` (+ notebook opcional) | Viajes de septiembre Anzures/Polanco/Reforma → Buenavista/San Rafael, 7–10 h; conclusión: ¿las misiones son viables? |
| S3 | Simulador del corredor | `modules/distribucion/engine.py` | Martes real 7–10 h; reproduce salidas/llegadas; 0/5/10/20 %; control "bicis recuperadas antes"; misma semilla = mismo resultado; métricas estación-hora vacía y llena |
| S4 | `/panel/simulador` | `apps/web/src/app/panel/simulador` | Gráfica de escenarios con supuestos visibles y `SimulatedBadge`; habilitar `ScenarioPicker enabled` |
| S5 (P1) | Misiones y puntos | `modules/distribucion/missions.py`, `/app/mision/[id]` | Misión punta a punta, puntos congelados al desbloquear, A→B→A sin puntos, doble envío sin doble pago, recompensas en días, ponderación por zona, bono de estación nueva |
| S6 (P1) | Arcos 3D de flujos | panel (deck.gl `ArcLayer` sobre MapLibre) | Misiones y déficit de Buenavista animados; versión 2D si falla |

Implementados S2, S3 y S4. S6 muestra arcos de promedios observados por zona, reproducción de la serie simulada y alternativa SVG 2D con tabla; S3 publica el déficit de Buenavista y San Rafael agregado, sin desglose por zona. La animación no representa viajes individuales ni misiones aceptadas. S5 conserva por ahora la interfaz DEMO local.

Datos: `git checkout origin/data -- data/ && git reset data/` (ver README de la rama `data`). Día demo: `data/demo/*_demo_day.parquet` (29 sep 2026).

## Contratos que hay que acordar (no definidos todavía)
Propuestas de la Línea 4; se congelan con el equipo, no unilateralmente.

| Contrato | Uso | Campos sugeridos |
|---|---|---|
| `GET /api/v1/simulation/results?scenario=` (L4 → panel) | S4 | `scenario`, `seed`, `assumptions{}`, `series[{ts, empty_stations, full_stations}]`, `totals{empty_hours, full_hours, bikes_moved}`, `label: "SIMULADO"` |
| `GET /api/v1/missions`, `POST /api/v1/missions/{id}/accept` (P1) | S5 | `id`, `from_station_id`, `to_station_id`, `window`, `reward_days`, `zone_weight`, `status` |
| C1 `useful_bikes` (L1 → L4) | Inventario inicial del simulador | ver plan unificado |
| C3 `forecast` (L3 → L4) | Elegibilidad de misiones | ver plan unificado |

## Integración pendiente del esqueleto
- Sustituir fixtures DEMO de `/app` por C1/C3 tras el corte A (`NEXT_PUBLIC_DATA_MODE=api`).
- Línea 5: reemplazar primitivas de `components/ui` por las accesibles de `components/shared` cuando existan.
- Crear proyectos en Vercel y Railway (requiere login de quien administre las cuentas).
