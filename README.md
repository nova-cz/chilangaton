# Equilibici · datos compartidos (rama `data`)

Esta rama solo guarda los datos del hackatón. No tiene código de la app.

## Cómo bajar los datos sin cambiar de rama

```
git fetch origin data
git checkout origin/data -- data/
git reset data/
```

Los archivos quedan en tu carpeta `data/` pero no se agregan a tu commit. En `main`, `data/` va en `.gitignore`.

## Qué hay

| Ruta | Qué es | Hora |
|---|---|---|
| `data/trips/trips_2026-07.parquet` … `trips_2026-09.parquet` | Viajes oficiales de ECOBICI con columnas iguales | `*_local` en hora CDMX, `*_utc` en UTC |
| `data/feed/feed_2026-08.parquet`, `feed_2026-09.parquet` | Historial del feed GBFS (MaxHalford, cada ~12 min) | UTC (`committed_at_utc`) |
| `data/stations.parquet` | Catálogo de estaciones y equivalencia CSV ↔ `station_id` (columna `key`) | — |
| `data/demo/feed_demo_day.parquet` | Feed del martes 29 sep 2026, 7–10 h | UTC |
| `data/demo/trips_demo_day.parquet` | Viajes de ese mismo rato | CDMX y UTC |
| `data/MANIFEST.md` | Filas, fechas y avisos de la última corrida | — |

Para unir viajes con estaciones usa `start_key` / `end_key` contra `stations.key`.

## Cómo regenerarlos

```
pip install duckdb pandas pyarrow requests
python prepare_data.py            # todo
python prepare_data.py demo       # solo el día demo (cambia DEMO_DAY en el script)
```

## Fuentes

- Viajes: https://ecobici.cdmx.gob.mx/datos-abiertos/
- Historial del feed: https://github.com/MaxHalford/bike-sharing-history (licencia MIT)
- Feed en vivo: https://gbfs.mex.lyftbikes.com/gbfs/gbfs.json

Reglas: nadie descarga datos por su cuenta; todo se guarda en UTC y se muestra en hora CDMX. GitHub rechaza archivos de más de 100 MB: si alguno pasa, va en Drive y aquí se deja la liga en `MANIFEST.md`.
