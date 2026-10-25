# Línea 5 · Regreso Seguro

Router FastAPI en `router.py` (`router`), montado bajo `/api/v1`. Todo en memoria (P0).

| Endpoint | Qué hace |
|---|---|
| `POST /returns` | "Anclé aquí": abre una verificación de 3 min contra el feed GBFS en vivo. Opcional: `baseline` con lo que la app veía al llegar |
| `GET /returns/stations` | Catálogo real de estaciones (GBFS, se renueva cada hora) para elegir dónde se ancló |
| `GET /returns/{id}` | La app la consulta (cada ~10 s) hasta que `status` deje de ser `revisando` |
| `POST /incidents` | Abre un caso (`robo`, `perdida`, `anclaje`, `viaje_largo`, `discrepancia`); si ya hay uno abierto de la misma bici o verificación, se suma |
| `GET /cases?state=&station_id=&open=` | Cola de casos (sin `user_hash`) |
| `GET /cases/count` | Contrato C5 para la Línea 1 |
| `GET /cases/{id}` | Ficha del caso con su historial |
| `POST /cases/{id}/transitions` | Mueve el caso; 409 si la transición no vale o la quiere hacer la app/sistema |
| `POST /cases/{id}/assign` | Asigna a un Guardián |
| `GET /scenarios` | Los 3 escenarios SIMULADOS de R4 (estación desconectada, sustracción, traslado a taller) |
| `POST /scenarios/{key}/run` | Crea un caso SIMULADO y lo lleva a su resultado esperado; no entra a C5 |

Estados de "Anclé aquí": `vemos_una_mas`, `sin_cambio`, `no_responde` (y `revisando` mientras corre la ventana). Nunca "viaje cerrado".

Los casos SIMULADOS llevan `simulated: true`, se muestran con la etiqueta SIMULADO y no cuentan en C5 ni en los indicadores del panel.

Pruebas: `python -m pytest modules/regreso` desde la raíz del repo.
