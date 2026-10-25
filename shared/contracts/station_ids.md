# Contrato de ids de estación

Las estaciones tienen dos ids y cada línea usaba uno distinto, así que los datos no se unían bien.

| Id | Ejemplo | Qué es |
| --- | --- | --- |
| **Código CE** (`short_name`) | `271-272`, `18` | El de los viajes (CSV) y el que va en el nombre de la estación (`CE-271-272 …`). Estable |
| `station_id` del feed | `141`, `10` | El id interno del GBFS. **No** coincide con el código CE |

## Regla

1. **La llave para unir datos entre líneas es el código CE**, normalizado: sin ceros a la izquierda y con las partes unidas por `-` (`CE-014` → `14`; `271-272` se queda igual). Ese campo se llama `short_name`.
2. **Todo contrato o endpoint que lleve una estación incluye `short_name`** (opcional en el esquema, obligatorio llenarlo cuando se conoce). Quien consume une por `short_name`, no por `station_id`.
3. `station_id` conserva el id propio del contrato, y cada contrato dice cuál es. No se renombra ni se cambia durante el día.
4. Para traducir, se usa **un solo mapa**: `shared/contracts/stations_map.json` y los helpers de `shared/contracts/station_ids.py` (`station_key`, `ce_to_feed`, `feed_to_ce`). Nadie vuelve a escribir su propia traducción.

## Qué lleva cada contrato en `station_id`

| Contrato | Dueño | `station_id` | `short_name` | Cambio pendiente |
| --- | --- | --- | --- | --- |
| C1 `useful_bikes` | Línea 1 | feed | ya existe (opcional) | Llenarlo siempre |
| C2 `priority` | Línea 2 | código CE (`?ids=feed` da el del feed) | sí, siempre | — |
| C3 `forecast` | Línea 3 | código CE | agregarlo (igual al `station_id`) | Agregarlo |
| C4 `reports` | Línea 2 define | el que mande quien escribe; se acepta CE o feed | — | Quien escriba debe mandar el CE |
| C5 `cases_count` | Línea 5 | feed | **no existe** | Agregar `short_name` opcional y llenarlo |
| C6 `loss_risk` | Línea 2 | código CE (`?ids=feed` da el del feed) | sí, siempre | — |

## Qué hace falta de cada línea

- **Línea 1:** llenar siempre `short_name` en C1. Ya traduce C2 con `C2_IDS=ce`; que use `station_ids.station_key` en vez de su copia.
- **Línea 3:** agregar `short_name` en C3. Ya usa el código CE.
- **Línea 5:** agregar `short_name` en C5 (se saca del catálogo GBFS que ya lee: `StationInfo.code`). Es lo único que le falta a la Línea 1 para unir los casos.

## Normalización: ya coinciden

`station_ids.station_key` da el mismo resultado que `station_key()` de la Línea 1, la Línea 3 y `prepare_data.py` para códigos (`014`, `271-272`, `CE-271-272`, `271.0`); además acepta el nombre completo del feed. Hay una prueba que lo verifica.

## Ojo

- Una estación nueva que no esté en el mapa se queda con su código CE y `ce_to_feed` devuelve `None`. Actualizar el mapa con `station_information.json` cuando haya estaciones nuevas.
- `Estación maratón` y otras sin código CE no tienen par; se ignoran.
