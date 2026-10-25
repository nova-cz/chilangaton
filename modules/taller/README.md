# Línea 2 · Taller (bicis dañadas y riesgo de pérdida)

Endpoints bajo `/api/v1/taller`: `GET /priority` (C2), `GET /loss-risk` (C6), `GET|POST /reports` (C4).

- Modo EJEMPLO (por defecto): responde con `shared/contracts/*.example.json`.
- Modo REAL: `DATA_DIR=data` con `data/trips/trips_2026-0X.parquet` (generar con `python prepare_data.py trips`).

Pruebas: `pytest modules/taller`.
